'use strict';

let fs = require('fs');
let httpProxy = require('http-proxy');
let async = require('async');

let utils = require('./utils');

let proxy = httpProxy.createProxyServer({});

module.exports = function (req, res) {
  proxy.web(req, res, {target: req.target});
}

proxy.on('error', function (err, req, res) {
  res.end();
});

proxy.on('proxyRes', function (proxyRes, req, res) {
  res.headers = utils.makeHeaders({
    headers: proxyRes.headers,
    isHit: false
  });
});
