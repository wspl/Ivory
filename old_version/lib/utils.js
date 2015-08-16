'use strict';

let fs = require('fs');
let url = require('url');
let path = require('path');

let log = require('./log');

let config = require('../config');

module.exports = {
  loadAsset: function (name) {
    try {
      return fs.readFileSync(`../assets/${name}`).toString();
    } catch (e) {
      log.e('Cannot load Asset File: ' + e.message);
    }
  },
  getExtname: function (str) {
    return path.extname(url.parse(str).pathname).substr(1);
  },
  ipNormalize: function (ip) {
    if (ip.indexOf('.') !== -1) {
      // ipv4
      return ip.replace('::ffff:', '');
    } else {
      // ipv6
      return ip;
    }
  },
  makeHeaders: function (args) {
    args.headers['server'] = 'Ivory/0.0.1';
    args.headers['via'] = `1.1 ${config.nodeName} (Ivory/0.0.1)`;

    if (args.isHit) {
      args.headers['x-cache'] = `HIT from ${config.nodeName}`;
    } else {
      args.headers['x-cache'] = `MISS from ${config.nodeName}`;
    }
    if (args.maxAge) {
      args.headers['cache-control'] = `max-age=${args.maxAge}`;
    } else {
      args.headers['cache-control'] = 'no-cache, must-revalidate, max-age=0';
    }

    return args;
  }
}

