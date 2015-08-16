/**
 * Virtual Host Module
 */
import fs from 'fs';
import yaml from 'js-yaml';
import bunyan from 'bunyan';

/**
 * Initialize log module
 */
const log = bunyan.createLogger({name: "vhost"});

/**
 * The storage of vhost configures.
 */
const vhosts = new Map();

/**
 * Load single vhost configuration file
 *
 * @param {String} filePath
 */
const loadVirtualHost = function (filePath) {
  try {
    const vhost = yaml.safeLoad(fs.readFileSync(filePath, 'utf8'));

    if (typeof vhost.host === 'string') {
      vhosts.set(vhost.host, vhost);
    } else if (typeof vhost.host[0] === 'string') {
      for (const host of vhost.host) {
        vhosts.set(host, vhost);
      }
    }
  } catch (e) {
    log.error(e.message);
  }
}

/**
 * Load vhost configuration files
 *
 * @api private
 */
const loadAllVirtualHosts = function () {
  try {
    const vhostsDirPath = './vhosts/';
    const vhostsDirFiles = fs.readdirSync(vhostsDirPath);

    for (const file of vhostsDirFiles) {
      if (/^.+\.yaml$/.test(file)) {
        loadVirtualHost(vhostsDirPath + file);
      }
    }
  } catch (e) {
    log.error(e.message);
  }
}

/**
 * Koa Middleware - Ivory Virtual Host
 *
 * @return {GeneratorFunction}
 * @api public
 */
export default function VirtualHost () {
  loadAllVirtualHosts();
  if (vhosts.size > 0) {
    log.info(`${vhosts.size} virtual hosts have been loaded.`);
  } else {
    log.error('Cannot find any available virtual host configuration file.');
  }

  return function *(next) {
    const host = this.header.host;
    if (vhosts.has(host)) {
      this.vhost = vhosts.get(this.header.host);
      yield next;
    } else {
      this.status = 400;
    }
  }
}
