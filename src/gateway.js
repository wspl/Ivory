/**
 * Gateway Module
 */
import bunyan from 'bunyan';

import cache from './cache';
import reverse from './reverse';
/**
 * Initialize log module
 */
const log = bunyan.createLogger({name: "gateway"});

/**
 * Koa Middleware - Ivory Gateway
 *
 * @return {Middleware Function}
 * @api public
 */
export default function Gateway () {
  return function *() {
    if (this.vhost.cache) {
      return cache;
    }
  }
}
