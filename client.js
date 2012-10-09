
/**
 * Module dependencies.
 */

var Subscription = require('./subscription')
  , debug = require('debug')('mydb:client');

/**
 * Module exports.
 */

module.exports = Client;

/**
 * Client constructor.
 *
 * @param {Server} originating server
 * @param {Socket} engine.io socket
 * @api public
 */

function Client(server, socket){
  this.server = server;
  this.socket = socket;
  this.subscriptions = {};

  // attach events
  socket.on('message', this.onMessage.bind(this));
  socket.on('close', this.onClose.bind(this));
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
 * Creates a subscription.
 *
 * @param {String} id
 * @api private
 */

Client.prototype.subscribe = function(id){
  var sub = new Subscription(this.server, id);
  var self = this;
  this.subscriptions[id] = sub;
  sub.on('payload', function(obj){
    self.onPayload(sub, obj);
  });
  sub.on('op', function(obj){
    self.onOp(sub, obj);
  });
  sub.on('error', function(err){
    self.onError(sub, err);
  });
  sub.on('destroy', this.onDestroy.bind(this, sub));
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
    debug('subscription "%s" not found for destroying');
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

Client.prototype.onError = function(){
  debug('subscription error');
  this.destroy();
  if (this.open()) {
    debug('telling socket to close');
    this.socket.close();
  }
};

/**
 * Called upon a subscription destroyed.
 *
 * @param {Subscription} sub
 * @api private
 */

Client.prototype.onDestroy = function(sub){
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
};

/**
 * Writes an operation to the client.
 *
 * @param {Array} operation array (`[query, op]`)
 * @api private
 */

Client.prototype.onOp = function(sub, obj){
  this.send({ e: 'o', i: sub.id, d: obj });
};

/**
 * Writes the payload to the client.
 *
 * @api private
 */

Client.prototype.onPayload = function(sub, obj){
  this.send({ e: 'p', i: sub.id, d: obj });
};
