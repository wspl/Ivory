'use strict';

let fs = require('fs');
let async = require('async');
let md5 = require('MD5');
let request = require('request');
let tls = require('tls');
let lru = require('lru-cache');

let log = require('./log');
let vhost = require('./vhost');

let config = require('../config');

const PREFIX = config.cachePrefix;
const PREFIX_WEBCACHE = `${PREFIX}_web`;

let sslCerts = new Map();

sslCerts.init = function (callback) {
  let hosts = vhost.getHostsEnabledSSL();
  async.each(hosts, function (host, callback) {
    vhost.getSSL(host, function (err, cert, key) {
      sslCerts.set(host,
        tls.createSecureContext({
          cert: cert, key: key
        }).context
      );
      callback();
    })
  }, function () {
    log.i('All certs loaded!')
    callback();
  });
}

exports.sslCerts = sslCerts;

let lruCache = lru();

const webCache = function (key) {
  let infosKey = `${key}_infos`;

  return {
    set: function (buf, infos, expire) {
      /*
      redis.set(key, buf);
      redis.set(infosKey, JSON.stringify(infos));
      redis.expire(key, expire);
      redis.expire(infosKey, expire);
      return 1; */
      lruCache.set(key, {
        infos: infos,
        body: buf
      }, expire);
      console.log(expire);
    },
    get: function () {
      /*
      redis.get(key, function (err, buf) {
        redis.get(infosKey, function (err, infos) {
          callback(err, buf, JSON.parse(infos));
        })
      }); */
      return lruCache.get(key);
    },
    destory: function () {
      return lruCache.del(key);
    }
  };
}

exports.web = function(requestKey) {
  let id = md5(`IVORY__${requestKey}__IVORY`).toUpperCase();
  let key = `${PREFIX_WEBCACHE}_${id}`;

  return {
    set: function (buf, infos, expire) {
      return webCache(key).set(buf, infos, expire);
    },
    get: function (callback) {
      return webCache(key).get();
    }
  }
}
