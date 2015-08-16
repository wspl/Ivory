/**
 * Cache Module
 */
import path from 'path';
import url from 'url';
import LRU from 'lru-cache';
import bunyan from 'bunyan';
import md5 from 'md5';

import reverse from './reverse';
/**
 * Initialize log module
 */
const log = bunyan.createLogger({name: "cache"});

/**
 * Initialize lru-cache module
 */
const cache = LRU();

/**
 * The default useless fileds of HTTP header from source.
 */
const uselessFileds = new Set(['date', 'connection', 'vary', 'expires',
    'cache-control', 'server', 'content-length', 'content-encoding']);
/**
 * Koa Middleware - Ivory Cache
 *
 * @return {GeneratorFunction}
 * @api public
 */
export default function Cache () {
  return function *(next) {
    const ctx = this;
    /** If this do not need to cache **/
    if (!this.vhost.cache) yield next;

    /** Start Cache **/
    this.cache = loadRule(this); // Load the rule of cache action

    if (this.cache.local) {
      this.cache.key = md5(this.href);
      if (cache.has(this.cache.key)) {
        /** HIT CACHE **/
        hitCache(this);
      } else {
        /** MISS CACHE **/
        yield next;
        missCache(this);
      }
    } else if (this.cache.remote) {
      /** REMOTE CACHE **/
      remoteRedirect(this);
    } else {
      /** DIRECT WITHOUT CACHE **/
      yield next;
      directExport(this);
    }
  }
}
/**
 * Export page directly
 *
 * @param {Object} ctx
 */
const directExport = function (ctx) {
  log.info('DIRECT!');
  uselessFileds.forEach((filed) => delete ctx.response.header[filed]);
  ctx.cache.enabled = false;
  ctx.cache.isHit = false;
  ctx.set(cacheHeaders(ctx));
}

/**
 * Redirect resources to remote server
 *
 * @param {Object} ctx
 */
const remoteRedirect = function (ctx) {
  log.info('REMOTE CACHE!');
  ctx.redirect(ctx.cache.remote.target + ctx.url);
}

/**
 * Export page from cache
 *
 * @param {Object} ctx
 */
const hitCache = function (ctx) {
  log.info('HIT CACHE!');
  ctx.cache.enabled = true;
  ctx.cache.isHit = true;
  ctx.set(cacheHeaders(ctx));
  ctx.set(cache.get(ctx.cache.key).header);
  ctx.body = cache.get(ctx.cache.key).body;
}

/**
 * Create cache after the page has exported
 *
 * @param {Object} ctx
 */
const missCache = function (ctx) {
  log.info('MISS CACHE!');

  uselessFileds.forEach((filed) => delete ctx.reverse.res.headers[filed]);
  uselessFileds.forEach((filed) => delete ctx.response.header[filed]);

  const cacheObj = {
    header: ctx.reverse.res.headers,
    body: ctx.body
  }

  cache.set(ctx.cache.key, cacheObj, 1000 * toSec(ctx.cache.local.maxAge));

  ctx.cache.isHit = false;
  ctx.cache.enabled = true;
  ctx.set(cacheHeaders(ctx));
}

/**
 * Generate a header fragment for control cache
 *
 * @param {Object} ctx
 * @return {Object}
 */
const cacheHeaders = function (ctx) {
  const headers = {};

  if (ctx.cache.isHit) {
    headers['x-cache'] = `HIT from IvoryTest`;
  } else {
    headers['x-cache'] = `MISS from IvoryTest`;
  }

  if (ctx.cache.enabled) {
    const maxAge = toSec(ctx.cache.local.maxAge);
    headers['cache-control'] = `max-age=${maxAge}`;
  } else {
    headers['cache-control'] = 'no-cache, must-revalidate, max-age=0';
  }

  return headers;
}

/**
 * Load cache rule
 *
 * @param {Object} ctx
 * @return {Object}
 */
const loadRule = function (ctx) {
  ctx.extname = getExtname(ctx.url);

  let defaultSection = {};

  for (const section of ctx.vhost.cache) {
    if (section.filter === 'default') {
      defaultSection = section;
    }
    if (filters[section.filter] && filters[section.filter](ctx)) {
      return section;
    }
  }

  return defaultSection;
}

/**
 * Get extension name from url
 *
 * @param {String} str
 * @return {String}
 */
const getExtname = (str) => path.extname(url.parse(str).pathname).substr(1);

/**
 * list of extension names of filters
 */
const filtersExtname = {
  'static-requirement': new Set(['css', 'js']),
  'static-attachment': new Set(['doc', 'mida', 'xls', 'rar', 'm4v', 'pdf',  'webp',
      'ttf',  'pptx', 'rtf', 'jpg',  'pls', 'eot',  'mp4',   'tgz', 'csv',  'midi',
      'xlsx', 'gzip', 'm4a', 'jpeg', 'ppt', 'woff', 'class', 'gz',  'pict', 'exe',
      'swf',  'docx', 'flv', 'ogg',  'gif', 'tif',  'otf',   'jar', 'ico',  'tiff',
      'svg',  'bz2',  'zip', 'png',  'eps', 'svgz', 'bzip',  'mp3', 'bmp',  'ejs' ])
}

/**
 * Preset filters
 */
const filters = {
  'static-requirement': function (ctx) {
    return filtersExtname['static-requirement'].has(ctx.extname);
  },
  'static-attachment': function (ctx) {
    return filtersExtname['static-attachment'].has(ctx.extname);
  }
}

/**
 * Convert string format time to ms
 */
const toSec = function (str) {
  const num = parseInt(str);
  const unit = str.replace(num, '').replace(/\s+/g,'');
  const equalOf = {
    'days': 86400,
    'day': 86400,
    'hr': 3600,
    'hrs': 3600,
    'min': 60,
    'sec': 1,
  }
  return num * (equalOf[unit] || 1);
}
