
/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter;
var redis = require('redis').createClient;
var minify = require('mongo-minify');
var clone = require('clone-component');
var debug = require('debug')('mydb:subscription');

/**
 * Module exports.
 */

module.exports = Subscription;

/**
 * Subscription.
 *
 * @param {Server} server
 * @param {String} subscription id
 * @param {String} document id
 * @param {Object} fields
 * @api public
 */

function Subscription(server, id, oid, fields){
  this.server = server;
  this.redis = server.redisSub;
  this.id = id;
  this.oid = oid;
  this.fields = fields || {};
  this.ops = [];
  this.shouldBuffer = true;
  this.onpacket = this.onpacket.bind(this);
  this.subscribe();
}

/**
 * Inherits from `EventEmitter`.
 */

Subscription.prototype.__proto__ = EventEmitter.prototype;

/**
 * Subscribes to redis.
 *
 * @api private
 */

Subscription.prototype.subscribe = function(){
  var self = this;
  this.readyState = 'subscribing';

  if (!this.server.subscriptions[this.oid]) {
    debug('redis subscribe %s', this.oid);
    this.server.subscriptions[this.oid] = 0;
    this.redis.subscribe(this.oid, function(err){
      if (err) return self.emit('error', err);
      self.readyState = 'subscribed';
      self.emit('subscribed');
    });
  } else {
    this.readyState = 'subscribed';
    process.nextTick(function(){
      self.emit('subscribed');
    });
  }

  var n = ++this.server.subscriptions[this.oid];
  debug('%d active subscriptions for "%s"', n, this.oid);

  this.server.on(this.oid, this.onpacket);
};

/**
 * Subscribe to `op` events.
 *
 * @api public
 */

Subscription.prototype.op = function(fn){
  this.emit('attach');
  this.on('op', fn);
  this.shouldBuffer = false;
  if (this.ops.length) {
    for (var i = 0; i < this.ops.length; i++) {
      this.emit('op', this.ops[i]);
    }
    this.ops = [];
  }
};

/**
 * Handle packets for this document.
 *
 * @api private
 */

Subscription.prototype.onpacket = function(obj){
  // minify query based on subscription fields restrictions
  obj = clone(obj);
  var qry = minify(obj[1], this.fields);

  if (Object.keys(qry).length) {
    if (obj[0]._id) {
      debug('stripping `_id` from filter');
      delete obj[0]._id;
    }

    obj[1] = qry;

    if (this.shouldBuffer) {
      debug('buffering op %j until payload is obtained', obj);
      this.ops.push(obj);
    } else {
      debug('emitting op %j', obj);
      this.emit('op', obj);
    }
  } else {
    debug('operation %j ignored minified with %j', obj[1], this.fields);
  }
};

/**
 * Destroys the subscription.
 *
 * @api private
 */

Subscription.prototype.destroy = function(){
  if ('subscribing' == this.readyState || 'subscribed' == this.readyState) {
    debug('destroying "%s" (state: %s)', this.id, this.readyState);
    var self = this;
    delete this.ops;
    delete this.payload;

    this.server.removeListener(this.oid, this.onpacket);

    // remove channel subscription if needed
    this.server.subscriptions[this.oid]--;
    if (!this.server.subscriptions[this.oid]) {
      debug('redis unsubscribe %s', this.oid);
      this.redis.unsubscribe(this.oid, function(){
        debug('confirmed "%s" unsubscription', self.oid);
      });
    }

    // change ready state
    this.readyState = 'unsubscribed';
    this.emit('destroy');

    // remove all listeners
    this.removeAllListeners();
  } else {
    debug('ignoring destroy - current state is "%s"', this.readyState);
  }
};
