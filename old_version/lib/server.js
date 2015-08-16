'use strict';

let connect = require('connect');
let http = require('http');
let https = require('https');
var compression = require('compression');

let proxy = require('./proxy');
let cache = require('./cache');
let gateway = require('./gateway');
let vhost = require('./vhost');
let log = require('./log');
let utils = require('./utils');

let app = connect();

app.use(compression());
app.use(vhost.load);
app.use(gateway);
app.use(proxy);

let init = function (callback) {
  vhost.init(function () {
    cache.sslCerts.init(callback);
  });
}

let sslOptions = {
  SNICallback: function (domain, callback) {
    callback(null, cache.sslCerts.get(domain));
  }
}

init(function (err) {
  if (!err) {
    http.createServer(app).listen(80);
    https.createServer(sslOptions, app).listen(443);
  } else {
    log.e('There are some errors.');
  }
});