
/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter

/**
 * Module exports.
 */

module.exports = Promise;

/**
 * Promise constructor.
 *
 * @param {String} type
 * @api public
 */

function Promise (type) {
  this.type = type;
  // for practical purposes
  this.fulfill = this.fulfill.bind(this);
}

/**
 * Inherits from EventEmitter.
 */

Promise.prototype.__proto__ = EventEmitter.prototype;

/**
 * Fulfills the promise.
 *
 * @api public
 */

Promise.prototype.fulfill = function (err, data) {
  this.fulfilled = true;
  if (err) {
    this.emit('error', err);
  } else {
    this.emit('success', data);
  }
  this.emit('complete', err, data);
};
