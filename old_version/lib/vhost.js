'use strict';

let fs = require('fs');
let readline = require('readline');
let minimist = require('minimist');

let log = require('./log');
let utils = require('./utils');

let config = require('../config');

const VHOST_CONFIG_TEMPLATE = {

  http: {
    host: 'ant.moe',
    port: 80,

    targetHost: '192.243.119.74',
    targetPort: 80,

    SSL: false,

    redirectMirrors: 'http://antmoe.b0.upaiyun.com',

    optimize: {
      gzip: true,

      js_compress: true,
      css_compress: true,
      html_compress: true,

      js_uglify: false,
    }
  },

  https: {
    host: 'ant.moe',
    port: 443,

    targetHost: '192.243.119.74',
    targetPort: 443,

    SSL: {
      cert: '/home/sample.crt',
      key: '/home/sample.key'
    },

    redirectMirrors: 'https://antmoe.b0.upaiyun.com'
  }

};

let vhosts = new Map();
let hostsEnabledSSL = [];

module.exports = {

  init: function (callback) {
    fs.readdir('../vhosts', function (err, files) {
      if (!err) {
        for (let file of files) {
          let vhostConfig = JSON.parse(fs.readFileSync('../vhosts/' + file));
          vhosts.set(vhostConfig.host, vhostConfig);
          if (vhostConfig.SSL) {
            hostsEnabledSSL.push(vhostConfig.host);
          }
        }
        log.i('All vhosts initialized!')
        callback();
        //console.log(vhosts);
      } else {
        log.e(err);
        callback(err);
      }
    })
  },

  load: function (req, res, next) {
    req.config = vhosts.get(req.headers.host);
    req.target = `http://${req.config.targetHost}:${req.config.targetPort}`;
    //console.log(req.config);
    next();
  },

  getHostsEnabledSSL: function () {
    return hostsEnabledSSL;
  },

  getSSL: function (host, callback) {
    fs.readFile(vhosts.get(host).SSL.cert, function (err, certContent) {
      fs.readFile(vhosts.get(host).SSL.key, function (err, keyContent) {
        //fs.readFile(vhosts[host].SSL.ca, function (err, caContent) {
          if (!err) {
            callback(null, certContent, keyContent);
          } else {
            log.e(err);
            callback(err);
          }
        //});
      });
    });
  }
};