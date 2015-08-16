var LRU = require("lru-cache")
  , options = { max: 500
              , length: function (n) { return n * 2 }
              , dispose: function (key, n) { n.close() }
              , maxAge: 1000 * 60 * 60 }
  , cache = LRU(options);

cache.set("key", "value");
console.log(cache.get("key"));
