
/**
 * Module dependencies.
 */

var url = require('url');
var uid = require('uid2');
var Subscription = require('./subscription');
var EventEmitter = require('events').EventEmitter;
var debug = require('debug')('mydb:client');

/**
 * Module exports.
 */

module.exports = Client;

/**
 * Client constructor.
 *
 * @param {Server} originating server
 * @param {Socket} engine.io socket
 * @param {Socket} mydb id
 * @api public
 */

function Client(server, socket){
  this.server = server;
  this.socket = socket;
  this.subscriptions = {};

  // attach events
  socket.on('message', this.onMessage.bind(this));
  socket.on('close', this.onClose.bind(this));

  // socket id
  this.id = this.sid();
  debug('initialized client with sid "%s"', this.id);
};

/**
 * Inherits from `EventEmitter`.
 */

Client.prototype.__proto__ = EventEmitter.prototype;

/**
 * Gets the mydb socket id from URL
 * or generates one and informs the client.
 *
 * @api public
 */

Client.prototype.sid = function(){
  var uri = this.socket.request.url;
  var query = url.parse(uri, true).query;

  if (query && query.mydb_id){
    return query.mydb_id;
  } else {
    var id = String(Math.random()).substr(3) + String(Math.random()).substr(3);
    this.send({ e: 'i', i: id });
    return id;
  }
};

/**
 * Tests if the client is writable.
 *
 * @return {Boolean} writable state
 * @api public
 */

Client.prototype.open = function(){
  return 'open' == this.socket.readyState;
};

/**
 * Sends a packet to the client.
 *
 * @api private
 */

Client.prototype.send = function(obj){
  this.socket.send(JSON.stringify(obj));
};

/**
 * Called with each socket message.
 *
 * @param {String} message
 * @api private
 */

Client.prototype.onMessage = function(msg){
  var packet;

  try {
    packet = JSON.parse(msg);
  } catch(e){
    debug('bad message "%s" received from client', msg);
    this.socket.close();
    return;
  }

  this.onPacket(packet);
};

/**
 * Called with each received packet.
 *
 * @api private
 */

Client.prototype.onPacket = function(packet){
  switch (packet.e) {
    case 'subscribe':
      debug('got subscription packet to "%s"', packet.i);
      return this.subscribe(packet.i);

    case 'unsubscribe':
      debug('got unsubscription packet to "%s"', packet.i);
      return this.unsubscribe(packet.i);

    default:
      debug('unknown packet type "%s"', packet.i);
  }
};

/**
 * Adds a subscription.
 *
 * @param {Subscription} subscription
 * @api private
 */

Client.prototype.add = function(sub){
  var id = sub.id;
  debug('adding subscription "%s"', id);
  if (this.subscriptions[id]) {
    debug('subscription already exists - destroying');
    sub.destroy();
  } else {
    var self = this;
    sub.op(function(obj){
      self.onOp(sub, obj);
    });
    sub.on('error', function(err){
      self.onSubscriptionError(sub, err);
    });
    sub.on('destroy', function(){
      self.onSubscriptionDestroy(sub);
    });
    this.subscriptions[id] = sub;
    this.emit('subscription', sub);
  }
};

/**
 * Destroys a subscription.
 *
 * @param {String} id
 * @api private
 */

Client.prototype.unsubscribe = function(id){
  var sub = this.subscriptions[id];
  if (sub) {
    sub.destroy();
  } else {
    debug('subscription "%s" not found for destroying', id);
  }
};

/**
 * Destroys subscriptions.
 *
 * @api private
 */

Client.prototype.destroy = function(){
  debug('destroying all subscriptions');
  for (var i in this.subscriptions) {
    this.subscriptions[i].destroy();
  }
};

/**
 * Called upon subscription error.
 *
 * @param {Subscription} sub
 * @api private
 */

Client.prototype.onSubscriptionError = function(sub, err){
  debug('subscription "%s" error %s', sub.id, err.stack);
  sub.destroy();
};

/**
 * Called upon a subscription destroyed.
 *
 * @param {Subscription} sub
 * @api private
 */

Client.prototype.onSubscriptionDestroy = function(sub){
  delete this.subscriptions[sub.id];

  if (this.open()){
    debug('acknowledging subscription removal "%s"', sub.id);
    this.send({ e: 'u', i: sub.id });
  }
};

/**
 * Called when the socket closes.
 *
 * @api private
 */

Client.prototype.onClose = function(){
  this.destroy();
  this.emit('close');
};

/**
 * Writes an operation to the client.
 *
 * @param {Array} operation array (`[query, op]`)
 * @api private
 */

Client.prototype.onOp = function(sub, obj){
  debug('sending op for subscription %s', sub.id);
  this.send({ e: 'o', i: sub.id, d: obj });
};
