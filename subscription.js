
/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter
  , minify = require('mongo-minify')
  , debug = require('debug')('mydb:subscription');

/**
 * Module exports.
 */

module.exports = Subscription;

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
  this.sub.setMaxListeners(0);
  this.mongo = server.mongo;
  this.id = id;
  this.get();
  this.ops = [];
  this.onMessage = this.onMessage.bind(this);
  this.once('payload', this.emitOps.bind(this));
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
  debug('getting details for "%s"', this.id);
  var self = this;
  this.readyState = 'discoverying';
  this.redis.get(this.id, function(err, data){
    if (!data) err = new Error('No subscription "' + self.id + '"');
    if (err) return self.emit('error', err);
    var obj;
    try {
      obj = JSON.parse(data);
    } catch(e) {
      return self.emit('error', err);
    }
    debug('"%s" is "%s.%s" (%j)', self.id, obj.c, obj.i, obj.f || {});
    self.oid = obj.i;
    self.fields = obj.f || {};
    self.col = obj.c;
    self.subscribe();
  });
};

/**
 * Subscribes to redis.
 *
 * @api private
 */

Subscription.prototype.subscribe = function(){
  debug('subscribing to redis ops for "%s"', this.oid);
  var self = this;
  this.readyState = 'subscribing';
  this.sub.subscribe(this.oid, function(err){
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
  debug('fetching payload for "%s.%s"', this.col, this.oid);
  var opts = { fields: this.fields };
  var self = this;
  this.mongo.get(this.col).findById(this.oid, opts, function(err, doc){
    if ('subscribed' != self.readyState) return;
    if (!doc) {
      var msg = 'Document "' + self.col + '.' + self.id + '" not found';
      err = new Error(msg);
    }
    if (err) {
      self.unsubscribe();
      return self.emit('error', err);
    }
    debug('retrieved document "%s.%s"', self.col, self.id);
    self.payload = doc;
    self.emit('payload', doc);
  });
};

/**
 * Called for all subscriptions messages.
 *
 * @api private
 */

Subscription.prototype.onMessage = function(channel, message){
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

      if (this.payload) {
        debug('emitting op %j', obj);
        this.emit('op', obj);
      } else {
        debug('buffering op %j until payload is obtained', obj);
        this.ops.push(obj);
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
    this.readyState = 'unsubscribing';
    this.ops = null;
    this.payload = null;
    this.sub.unsubscribe(this.id, function(err){
      if (err) return self.emit('error', err);
      self.readyState = 'unsubscribed';
      self.emit('destroy');
    });
    this.sub.removeListener('message', this.onMessage);
  } else {
    debug('ignoring destroy - current state is "%s"', this.readyState);
  }
};
