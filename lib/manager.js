
/**
 * Module dependencies.
 */

var driver = require('mydb-driver')
  , redis = require('redis')
  , http = require('http')
  , sio = require('socket.io')
  , Promise = driver.Promise
  , Subscription = require('./subscription')
  , Connection = require('./connection')
  , Collection = require('./collection')
  , Database = require('./database')
  , debug = require('debug')('mydb');

/**
 * Module exports.
 */

module.exports = Manager;

/**
 * Database Manager constructor.
 *
 * @param {http.Server|io.Manager} http server to listen on, or socket.io
 * @param {String} mongo uri or mongoskin db
 * @param {Object} options
 * @api public
 */

function Manager (app, db, opts) {
  if (!(this instanceof Manager)) {
    return new Manager(app, db, opts);
  }

  opts = opts || {};

  if (!app.sockets) {
    app = sio.listen(app);
  }

  if (!(db instanceof driver)) {
    debug('connecting driver to "%s"', db);
    db = driver(db, { redis: opts.redisPublisher });
  }

  // set up socket.io listener
  this.io = app;
  this.sockets = this.io.of('/mydb');
  this.sockets.on('connection', this.onConnection.bind(this));

  // dbs
  this.dbs = {};
  this.patterns = {};

  // mongo
  this.mongo = db;
  this.collections = {};

  // redis
  this.subscriber = opts.redisSubscriber || redis.createClient();
  this.subs = {};

  debug('initialized mydb');

  // make sure the instance becomes the db getter/setter
  var fn = this.handle.bind(this);
  fn.__proto__ = this;
  return fn;
}

/**
 * Socket.IO connection handler.
 */

Manager.prototype.onConnection = function (connection) {
  var self = this;
  connection.on('db', function (sid, name) {
    debug('got incoming connection for db "%s" from sid "%s"', name, sid);
    patterns:
    for (var i in self.patterns) {
      var match;
      if (match = self.patterns[i].match.exec(name)) {
        var params = {};
        for (var ii = 0, l = self.patterns[i].keys.length; ii < l; ii++) {
          if (!self.patterns[i].keys[ii].optional && null == match[ii + 1]) {
            continue patterns;
          }
          params[self.patterns[i].keys[ii].name] = match[ii + 1];
        }
        debug('matched "%s"', i);
        var conn = new Connection(self, sid, name, params, connection);

        self.dbs[i].onConnection(conn);
        connection.on('disconnect', self.dbs[i].onDisconnection.bind(self.dbs[i], conn));

        self.patterns[i].handler(conn, function expose (col, promise, fields) {
          if (col instanceof Promise) {
            promise = col;
            col = promise.col.name;
          }

          if (null == promise) {
            return debug('null exposure');
          }

          if (promise._id) {
            conn.subscribe(col, promise._id.toString(), fields);
          } else if (promise instanceof Error) {
            debug('error - handle me');
          } else if ('string' == typeof promise) {
            conn.subscribe(col, promise, fields);
          } else if (promise.fulfill) {
            debug('waiting on promise success');
            promise.on('success', function (doc) {
              conn.subscribe(col, doc._id.toString(), fields);
            });
          } else if (promise.toHexString) {
            conn.subscribe(col, promise.toString(), fields);
          } else {
            debug('unknown exposure "%s"', promise);
          }
        });
      }
    }
  });
};

/**
 * Subscribes to an event.
 *
 * @param {String} event name
 * @param {Function} listener
 */

Manager.prototype.subscribe = function (ev, fn) {
  if (!this.subs['ev-' + ev]) {
    this.subs['ev-' + ev] = new Subscription(this, ev);
  }
  this.subs['ev-' + ev].add(fn);
  return this.subs['ev-' + ev];
};

/**
 * Gets a collection
 *
 * @param {String} collection
 * @api public
 */

Manager.prototype.get = function (name) {
  return this.mongo.get(name);
};

/**
 * Gets/creates a new route handler.
 *
 * @param {String} handler name
 * @param {Function} handler fn (only if setting)
 * @api private
 */

Manager.prototype.handle = function (name, handler) {
  if (name && handler) {
    this.patterns[name] = {
        keys: []
      , handler: handler
    };
    this.patterns[name].match = normalize(
        name
      , this.patterns[name].keys
      , true
      , true
    );
    this.dbs[name] = new Database(name);
  }
  return this.dbs[name];
};

/**
 * Normalize the given path string,
 * returning a regular expression.
 *
 * An empty array should be passed,
 * which will contain the placeholder
 * key names. For example "/user/:id" will
 * then contain ["id"].
 *
 * @param  {String|RegExp} path
 * @param  {Array} keys
 * @param  {Boolean} sensitive
 * @param  {Boolean} strict
 * @return {RegExp}
 * @api private
 */

function normalize (path, keys, sensitive, strict) {
  if (path instanceof RegExp) return path;
  path = path
    .concat(strict ? '' : '/?')
    .replace(/\/\(/g, '(?:/')
    .replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?/g,
    function(_, slash, format, key, capture, optional){
      keys.push({ name: key, optional: !! optional });
      slash = slash || '';
      return '' +
        (optional ? '' : slash) +
        '(?:' +
        (optional ? slash : '') +
        (format || '') + (capture || (format && '([^/.]+?)' || '([^/]+?)')) + ')' +
        (optional || '');
    })
    .replace(/([\/.])/g, '\\$1')
    .replace(/\*/g, '(.*)');
  return new RegExp('^' + path + '$', sensitive ? '' : 'i');
}
