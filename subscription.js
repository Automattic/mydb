
/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter
  , debug = require('debug')('mydb-subscription');

/**
 * Subscription.
 *
 * @param {Server} server
 * @param {String} subscription id
 * @api public
 */

function Subscription(server, id){
  this.server = server;
  this.redis = server.redis;
  this.sub = server.redisSub;
  this.mongo = server.mongo;
  this.id = id;
  this.get();
  this.onMessage = this.onMessage.bind(this);
}

/**
 * Inherits from `EventEmitter`.
 */

Subscription.prototype.__proto__ = EventEmitter.prototype;

/**
 * Retrieves the document id and fields from redis.
 *
 * @api private
 */

Subscription.prototype.get = function(){
  var self = this;
  this.readyState = 'discoverying';
  this.redis.get(this.id, function(err, data){
    if (err) return self.emit('error', err);
    var obj;
    try {
      obj = JSON.parse(data);
    } catch(e) {
      return self.emit('error', err);
    }
    self.oid = data.i;
    self.fields = data.f || {};
    self.subscribe();
  });
};

/**
 * Subscribes to redis.
 *
 * @api private
 */

Subscription.prototype.subscribe = function(){
  var self = this;
  this.readyState = 'subscribing';
  this.sub.subscribe(this.id, function(err){
    if (err) return self.emit('error', err);
    self.readyState = 'subscribed';
    self.fetch();
  });
  this.sub.on('message', this.onMessage);
};

/**
 * Fetch the payload.
 *
 * @api private
 */

Subscription.prototype.fetch = function(){
  // fetch from mongo
};

/**
 * Destroys the subscription.
 *
 * @api private
 */

Subscription.prototype.destroy = function(){
  if ('subscribing' == this.readyState || 'subscribed' == this.readyState) {
    var self = this;
    this.readyState = 'unsubscribing';
    this.sub.unsubscribe(this.id, function(err){
      if (err) return self.emit('error', err);
      self.readyState = 'unsubscribed';
    });
    this.sub.removeListener('message', this.onMessage);
  } else {
    debug('ignoring destroy - current state is "%s"', this.readyState);
  }
};
