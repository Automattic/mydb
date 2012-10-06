
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
  new Client(socket);
};
