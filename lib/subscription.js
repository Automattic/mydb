
/**
 * Module dependencies
 */

var debug = require('debug')('mydb')
  , EventEmitter = require('events').EventEmitter

/**
 * Module exports.
 */

module.exports = Subscription;

/**
 * Subscriptions event emitter.
 */

var subscriptions = new EventEmitter;

/**
 * Whether subscriptions are initialized
 */

var init = false;

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

  if (!init) {
    debug('setting up subscriptions message handler');
    this.subscriber.on('message', function (ev, msg) {
      if (subscriptions.listeners(ev).length) {
        subscriptions.emit(ev, JSON.parse(msg));
      } else {
        debug('ignoring message to "%s" (%s) - no listeners', ev, msg);
      }
    });
    init = true;
  }

  if (!subscriptions.listeners(name).length) {
    debug('adding redis subscription to "%s"', name);
    this.subscriber.subscribe(name, function (err) {
      if (err) {
        return debug('subscription error %j', err);
      }
      debug('subscription to "%s" successful', name);
    });
  }

  subscriptions.on(name, fn);
}

/**
 * Removes the subscription.
 */

Subscription.prototype.destroy = function () {
  subscriptions.removeListener(this.name, this.fn);
  if (!subscriptions.listeners(this.name).length) {
    this.subscriber.unsubscribe(this.name);
  }
};

