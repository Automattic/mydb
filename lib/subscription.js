
/**
 * Module dependencies
 */

var debug = require('debug')('mydb')
  , EventEmitter = require('events').EventEmitter;

/**
 * Module exports.
 */

module.exports = Subscription;

/**
 * Subscription constructor.
 *
 * @param {Redis} redis client
 * @param {String} name
 * @param {Function} callback
 */

function Subscription (manager, name, fn) {
  this.manager = manager;
  this.name = name;
  this.fn = fn;
  this.count = 0;
  this.subscriber = this.manager.subscriber;
  this.onMessage = this.onMessage.bind(this);
}

/**
 * Inherits from EventEmitter.
 */

Subscription.prototype.__proto__ = EventEmitter.prototype;

/**
 * Sets up redis subscription.
 *
 * @api private
 */

Subscription.prototype.setup = function(){
  var self = this;
  this.subscriber.on('message', this.onMessage);
  this.subscriber.subscribe(this.name, function(err){
    if (err) {
      debug('subscription to "%s" failed with %j', self.name, err);
    } else {
      debug('subscription to "%s" successful', self.name);
    }
  });
};

/**
 * Tears down redis subscription.
 *
 * @api private
 */

Subscription.prototype.teardown = function(){
  this.subscriber.removeListener('message', this.onMessage);
  this.subscriber.unsubscribe(this.name);
};

/**
 * Handles an incoming redis message and performs decoding.
 *
 * @api private
 */

Subscription.prototype.onMessage = function(ev, msg){
  if (ev == this.name) {
    var obj = JSON.parse(msg);
    var data = obj.pop();
    var query = obj.pop();
    this.emit('msg', data, query);
  }
};

/**
 * Increase ref count.
 */

Subscription.prototype.add = function(fn){
  if (!this.listeners('msg').length) this.setup();
  this.on('msg', fn);
};

/**
 * Decrease ref count.
 */

Subscription.prototype.remove = function (fn) {
  this.removeListener('msg', fn);
  if (!this.listeners('msg').length) this.teardown();
};
