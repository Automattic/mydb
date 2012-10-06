
/**
 * Module dependencies.
 */

var Subscription = require('./subscription')
  , debug = require('debug')('mydb:client');

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
      return this.subscribe(packet.i);

    case 'unsubscribe':
      return this.unsubscribe(packet.i);

    default:
      debug('unknown packet type "%s"', packet.i);
  }
};

/**
 * Creates a subscription.
 *
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
 * Destroys subscriptions.
 *
 * @api private
 */

Client.prototype.destroy = function(){
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
  this.destroy();
  if (this.open()) {
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
  this.send({ e: 'p', i: sub.id, d: obj.d });
};
