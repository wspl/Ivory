/**
 * Reverse Proxy Module
 */
import coRequest from 'co-request';

/**
 * Initialization co-request with options
 */
const request = coRequest.defaults({ jar: true });

/**
 * Pipe a request object to co-request
 * (Thanks to greim: https://github.com/greim)
 *
 * @param {Object} readable
 * @param {Function} requestThunk
 * @return {Function}
 * @api private
 */
const pipeRequest = function (readable, requestThunk) {
  return function (cb) {
    readable.pipe(requestThunk(cb));
  }
}

/**
 * Koa Middleware - Ivory Reverse Proxy
 *
 * @return {GeneratorFunction}
 * @api public
 */
export default function ReverseProxy () {
  return function *() {
    try {
      const href = this.vhost.reverse.target + this.request.url;

      delete this.request.header['if-modified-since'];
      delete this.request.header['if-none-match'];

      const opt = {
        url: href,
        headers: this.request.header,
        gzip: true,
        //encoding: null,
        method: this.request.method,
        body: this.body
      };

      const res = yield pipeRequest(this.req, request(opt));

      this.body = res.body;

      this.status = res.statusCode;

      this.set(res.headers);

      this.reverse = {};
      this.reverse.res = res;
    } catch (e) {
      console.log(e.message);
      this.status = 500;
    }
  }
}
