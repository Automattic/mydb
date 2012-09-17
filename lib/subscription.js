
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
 * @param {Manager} manager
 * @param {String} name
 */

function Subscription (manager, name, fn) {
  this.manager = manager;
  this.name = name;
  this.fn = fn;
  this.subscriber = this.manager.subscriber;

  if (!this.manager.subscriptions) {
    debug('setting up subscriptions message handler');
    var subscriptions = this.manager.subscriptions = new EventEmitter;
    this.subscriber.on('message', function (ev, msg) {
      if (subscriptions.listeners(ev).length) {
        subscriptions.emit(ev, JSON.parse(msg));
      } else {
        debug('ignoring message to "%s" (%s) - no listeners', ev, msg);
      }
    });
  }

  if (!this.manager.subscriptions.listeners(name).length) {
    debug('subscribing to "%s"', name);
    this.subscriber.subscribe(name, function (err) {
      if (err) {
        return debug('subscription error %j', err);
      }
      debug('subscription to "%s" successful', name);
    });
  }

  this.manager.subscriptions.on(name, fn);
}

/**
 * Removes the subscription.
 */

Subscription.prototype.destroy = function () {
  this.manager.subscriptions.removeListener(this.name, this.fn);
  if (!this.manager.subscriptions.listeners(this.name).length) {
    this.subscriber.unsubscribe(this.name);
  }
};
