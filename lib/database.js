
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
  if (!this.routes[uri]) this.routes[uri] = [];
  this.routes[uri].push(conn);
  if (1 == this.routes[uri].length) this.emit('join', conn);
};

/**
 * Called upon a socket disconnection.
 *
 * @param {Connection} connection
 * @api private
 */

Database.prototype.onDisconnection = function(conn){
  var uri = conn.name;
  this.routes[uri].splice(this.routes[uri].indexOf(conn), 1);
  if (!this.routes[uri].length) this.emit('leave', conn);
};
