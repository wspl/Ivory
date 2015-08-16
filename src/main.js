/**
 * Ivory Server - Main
 */
import http from 'http';
import https from 'https';
import koa from 'koa';
import compress from 'koa-compress';
import etag from 'koa-etag';

import vhost from './vhost';
import cache from './cache';
import reverse from './reverse';

const app = koa();

app.use(function *(next){
  const start = new Date;
  yield next;
  const ms = new Date - start;
  console.log('%s %s - %s', this.method, this.url, ms);
});

/**
 * Mount Middlewares
 */
//app.use(etag());
app.use(compress());
app.use(vhost());
app.use(cache());
app.use(reverse());

http.createServer(app.callback()).listen(80);
//https.createServer(options, app.callback()).listen(443);
