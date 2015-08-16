'use strict';

let request = require('request');

let log = require('./log');
let utils = require('./utils');
let cache = require('./cache');
let vhost = require('./vhost');

let config = require('../config');

let mirrorCacheExtname = {};
let localCacheExtname = {
  js: true,
  css: true
};

let maxAgeMs = config.cacheAge * 1000;

let mirrorExtnames = new Set(utils.loadAsset('mirror_extnames').split(/\r\n|\n/));

let exportPage = function (req, res, args) {
  args = utils.makeHeaders(args);
  res.writeHead(200, args.headers);
  res.end(args.body);
}

let newCacheRequest = function (req, res) {
  request(req.requestUrl, {
    encoding: null,
    headers: req.headers,
    gzip: true
  }, function (err, targetRes, body) {
    delete targetRes.headers['content-encoding'];
    exportPage(req, res, {
      headers: targetRes.headers,
      body: body,
      maxAge: config.cacheAge,
      isHit: false
    });
    targetRes.headers['expires'] = new Date(Date.now() + maxAgeMs).toUTCString();
    delete targetRes.headers['cache-control'];
    delete targetRes.headers['date'];
    cache.web(req.requestKey).set(body, targetRes.headers, config.cacheAge);
  });
}

let oldCacheRequest = function (req, res, result, headers) {
  try {
    exportPage(req, res, {
      headers: headers,
      body: result,
      maxAge: config.cacheAge,
      isHit: true
    });
  } catch (e) {
    log.e(e);
  }
}

let redirectRequest = function (req, res) {
  res.writeHead(301, {
    Location: req.config.redirectMirrors + req.url
  });
  res.end();
}

let reverseHeader = function (req) {
  let headers = req.headers;
  headers['x-real-ip'] =
      utils.ipNormalize((headers['x-forwarded-for'] || '').split(',')[0]
                     || req.connection.remoteAddress
                     || req.socket.remoteAddress
                     || req.connection.socket.remoteAddress);
  headers['x-forwarded-for'] = headers['x-real-ip'];

  return headers;
}

module.exports = function (req, res, next) {
  req.extname = utils.getExtname(req.url);
  req.requestHost = req.headers.host;
  req.requestUrl = req.target + req.url;
  req.requestKey = `${req.requestHost}#${req.requestUrl}`;
  req.headers = reverseHeader(req);

  if (localCacheExtname[req.extname]) {
    //console.log(req.config)
    //cache.web(req.requestKey).get(function (err, result, headers) {
    let result = cache.web(req.requestKey).get();
    //console.log(result);
    if (result) {
      // Read Cache
      console.log('Hit Cache: ' + req.url);
      oldCacheRequest(req, res, result.body, result.infos);
    } else {
      // New Cache
      console.log('New Cache: ' + req.requestKey);
      newCacheRequest(req, res);
    }
    //});
  } else if (mirrorExtnames.has(req.extname)) {
    // 301 Redirect
    console.log('301 Redirect: //mirrors' + req.url);
    redirectRequest(req, res);
  } else {
    // Direct ( Nothing to do )
    console.log('Direct to : ' + req.target);
    next();
  }
}
