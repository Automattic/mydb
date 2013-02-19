
/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter;
var redis = require('redis').createClient;
var minify = require('mongo-minify');
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
  this.fields = fields;
  this.ops = [];
  this.shouldBuffer = true;
  this.onmessage = this.onmessage.bind(this);
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
  debug('subscribing to redis ops for "%s"', this.id);
  var self = this;
  this.readyState = 'subscribing';

  if (!this.server.subscriptions[this.oid]) {
    this.server.subscriptions[this.oid] = 0;
    this.redis.subscribe(this.oid, function(err){
      if (err) return self.emit('error', err);
      self.readyState = 'subscribed';
    });
  } else {
    this.readyState = 'subscribed';
  }

  var n = this.server.subscriptions[this.oid]++;
  debug('%d active subscriptions for "%s"', n, this.oid);

  // add `message` handler
  this.redis.on('message', this.onmessage);
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
  this.emitOps();
};

/**
 * Called for all subscriptions messages.
 *
 * @api private
 */

Subscription.prototype.onmessage = function(channel, message){
  if (this.oid == channel) {
    var obj;

    try {
      obj = JSON.parse(message);
    } catch(e){
      this.emit('error', e);
      return;
    }

    // minify query based on subscription fields restrictions
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
  }
};

/**
 * Emits buffered `op` events.
 *
 * @api private
 */

Subscription.prototype.emitOps = function(){
  if (this.ops.length) {
    for (var i = 0; i < this.ops.length; i++) {
      this.emit('op', this.ops[i]);
    }
    this.ops = [];
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
    this.ops = null;
    this.payload = null;

    // remove channel subscription if needed
    this.server.subscriptions[this.oid]--;
    if (!this.server.subscriptions[this.oid]) {
      this.redis.unsubscribe(this.oid, function(){
        debug('confirmed "%s" unsubscription', self.oid);
      });
    }

    // remove `message` listener
    this.redis.removeListener('message', this.onmessage);

    // change ready state
    this.readyState = 'unsubscribed';
    this.emit('destroy');

    // remove all listeners
    this.removeAllListeners();
  } else {
    debug('ignoring destroy - current state is "%s"', this.readyState);
  }
};
