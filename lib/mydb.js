
/**
 * Module dependencies.
 */

var sio = require('socket.io')
  , http = require('http')
  , redis = require('redis')
  , monk = require('monk')
  , debug = require('debug')('mydb')
  , EventEmitter = require('events').EventEmitter

/**
 * Module exports.
 */

module.exports = exports = require('./manager');

/**
 * Expose Collection
 *
 * @api public
 */

exports.Collection = require('./collection');

/**
 * Expose Connection.
 *
 * @api public
 */

exports.Connection = require('./connection');

/**
 * Expose Database.
 *
 * @api public
 */

exports.Database = require('./database');
