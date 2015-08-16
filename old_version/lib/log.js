'use strict';

const colors = require('colors');
const moment = require('moment');

const printLog = function(t){
  let time = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
  console.log(`[${time}]${t}`);
}

let log = function (t) {
  printLog(t);
}

log.w = function (t) {
  printLog('[Warning] '.orange + t);
}

log.e = function (t) {
  t = t.toString().replace(/^\s*Error:\s*/, '');
  printLog('[Error] '.red + t);
}

log.i = function (t) {
  printLog('[Info] '.green + t);
}

module.exports = log;