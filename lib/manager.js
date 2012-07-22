
/**
 * Module dependencies.
 */

var monk = require('monk')
  , redis = require('redis')
  , sio = require('socket.io')
  , Promise = monk.Promise
  , Subscription = require('./subscription')
  , Connection = require('./connection')
  , Collection = require('./collection')
  , debug = require('debug')('mydb')

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

  if (!(app instanceof sio.Manager)) {
    app = sio.listen(app);
  }

  if (!(db instanceof monk)) {
    debug('connecting monk to "%s"', db);
    db = monk(db);
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
  this.publisher = opts.redisPublisher || redis.createClient();

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
          } else if (promise instanceof Promise) {
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
}

/**
 * Subscribes to an event.
 *
 * @param {String} event name
 * @param {Function} listener
 */

Manager.prototype.subscribe = function (ev, fn) {
  return new Subscription(this, ev, fn);
};

/**
 * Publishes an event.
 *
 * @param {String} ev name
 * @param {Object} obj
 * @return {Manager} for chaining
 */

Manager.prototype.publish = function (ev, obj) {
  debug('publishing %j to "%s"', obj, ev);
  this.publisher.publish(ev, JSON.stringify(obj));
  return this;
};

/**
 * Gets a collection
 *
 * @param {String} collection
 * @api public
 */

Manager.prototype.get = function (name) {
  if (!this.collections[name]) {
    var collection = new Collection(this, this.mongo, name);
    this.collections[name] = collection;
    var self = this;
    collection.on('op', function (id, update) {
      self.publish('op:' + id, update);
    });
  }
  return this.collections[name];
}

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
  } else {
    if (this.dbs[name]) return this.dbs[name];
  }
}

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
      return ''
        + (optional ? '' : slash)
        + '(?:'
        + (optional ? slash : '')
        + (format || '') + (capture || (format && '([^/.]+?)' || '([^/]+?)')) + ')'
        + (optional || '');
    })
    .replace(/([\/.])/g, '\\$1')
    .replace(/\*/g, '(.*)');
  return new RegExp('^' + path + '$', sensitive ? '' : 'i');
}
