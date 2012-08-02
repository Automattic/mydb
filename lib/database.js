
/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter;

/**
 * Module exports.
 */

module.exports = Database;

/**
 * Database constructor
 *
 * @param {String} route name
 * @api public
 */

function Database(name){
  this.name = name;
  this.routes = {};
};

/**
 * Inherits from EventEmitter.
 */

Database.prototype.__proto__ = EventEmitter.prototype;

/**
 * Called upon a socket connection.
 *
 * @param {Connection} connection
 * @api private
 */

Database.prototype.onConnection = function(conn){
  var uri = conn.name;
  var sid = conn.sid;
  if (!this.routes[uri]) this.routes[uri] = {};
  if (!this.routes[uri][sid]) this.routes[uri][sid] = 0;
  this.routes[uri][sid]++;
  if (1 == this.routes[uri][sid]) this.emit('join', conn);
};

/**
 * Called upon a socket disconnection.
 *
 * @param {Connection} connection
 * @api private
 */

Database.prototype.onDisconnection = function(conn){
  var uri = conn.name
    , sid = conn.sid
  if (!this.routes[uri] || !this.routes[uri][sid]) return;
  this.routes[uri][sid]--;
  if (!this.routes[uri][sid]) this.emit('leave', conn);
};
