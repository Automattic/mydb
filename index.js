
/**
 * Module dependencies.
 */

var engine = require('engine.io')
  , redis = require('redis')
  , monk = require('monk')
  , Client = require('./client')
  , Subscription = require('./subscription')
  , debug = require('debug')('mydb');

/**
 * Module exports.
 */

module.exports = Server;

/**
 * Server.
 *
 * Options
 *  - `redis` main redis client
 *  - `redisSub` redis pub/sub mode client (or uri)
 *  - `mongo` monk client (or uri)
 *
 * @param {http.Server} http server to attach to
 * @param {Object} options
 * @api private
 */

function Server(http, opts){
  if (!(this instanceof Server)) return new Server(http, opts);

  // redis
  if ('object' != typeof opts.redis) {
    var uri = parse(opts.redis || 'localhost:6379');
    this.redis = redis(uri.name, uri.port);
  }

  // redis sub
  if ('object' != typeof opts.redisSub) {
    var uri = parse(opts.redisSub || 'localhost:6379');
    this.redisSub = redis(uri.name, uri.port);
  }

  // mongodb
  if ('object' != typeof opts.mongo) {
    this.mongo = monk(opts.mongo || 'localhost/27017');
  }

  this.http = http;
  this.engine = engine.attach(http);
  this.engine.on('connection', this.onConnection.bind(this));
}

/**
 * Called upon each connection.
 *
 * @param {Socket} engine.io socket
 * @api private
 */

Server.prototype.onConnection = function(socket){
  new Client(this, socket);
};
