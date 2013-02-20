
/**
 * Module dependencies.
 */

var engine = require('engine.io');
var redis = require('redis').createClient;
var url = require('url');
var Client = require('./client');
var Subscription = require('./subscription');
var EventEmitter = require('events').EventEmitter;
var debug = require('debug')('mydb');

/**
 * Module exports.
 */

module.exports = exports = Server;

/**
 * Exports `Client`.
 */

exports.Client = Client;

/**
 * Exports `Subscription`
 */

exports.Subscription = Subscription;

/**
 * Server.
 *
 * Options
 *  - `redis` main redis client
 *  - `subTimeout` subscription timeout if no client connects (`60000`)
 *  - `engine` options to pass to engine.io
 *
 * @param {http.Server} http server to attach to
 * @param {Object} options
 * @api private
 */

function Server(http, opts){
  if (!(this instanceof Server)) return new Server(http, opts);

  opts = opts || {};

  // redis
  this.redis = opts.redis;
  this.subscriptions = {};
  if ('object' != typeof opts.redis) {
    var uri = parse(this.redis || 'localhost:6379');
    this.redis = redis(uri.port, uri.host);
  }

  // use a separate client for all mongo ops
  this.redisSub = clone(this.redis);

  // subscription timeout
  this.subTimeout = null == opts.subTimeout ? 60000 : opts.subTimeout;

  // sids
  this.ids = {};

  // pending subscriptions
  this.pending = {};

  // initialize engine server
  this.http = http;
  this.engine = engine.attach(http, opts.engine);
  this.engine.on('connection', this.onConnection.bind(this));

  // capture SUBSCRIBE packets
  this.subscribe();
}

/**
 * Inherits from `EventEmitter`.
 */

Server.prototype.__proto__ = EventEmitter.prototype;

/**
 * Called upon each connection.
 *
 * @param {Socket} engine.io socket
 * @api private
 */

Server.prototype.onConnection = function(socket){
  debug('initializing new client');

  var client = new Client(this, socket);
  var id = client.id;
  var self = this;
  this.ids[id] = client;

  // handle client close
  client.on('close', this.onclose.bind(this, client));

  // add pending subscriptions
  if (this.pending[id]) {
    this.pending[id].forEach(function(sub){
      client.add(sub);
    });
    delete this.pending[id];
  }

  this.emit('client', client);
};

/**
 * Called upon client close.
 *
 * @param {Client} client
 * @api private
 */

Server.prototype.onclose = function(client){
  var id = client.id;
  debug('client "%s" close', id);

  // destroy pending subscriptions
  if (this.pending[id]) {
    debug('destroying pending subscriptions');
    this.pending[id].forEach(function(sus){
      sus.destroy();
    });
    delete this.pending[id];
  }

  // remove from list of open clients
  delete this.ids[id];
};

/**
 * Capture SUBSCRIBE packets.
 *
 * @api private
 */

Server.prototype.subscribe = function(){
  var sub = clone(this.redis);
  var self = this;
  sub.subscribe('MYDB_SUBSCRIBE');
  sub.on('message', function(channel, packet){
    var data = JSON.parse(packet);
    var sid = data.s;

    var sub = new Subscription(self, data.h, data.i, data.f);
    debug('subscription "%s" for socket id "%s"', sub.id, sid);

    if (self.ids[sid]) {
      self.ids[sid].add(sub);
    } else {
      self.buffer(sid, sub);
    }
  });
};

/**
 * Buffers a subscription.
 *
 * @param {String} socket id
 * @param {Subscription} subscription
 * @api private
 */

Server.prototype.buffer = function(sid, sub){
  var self = this;
  debug('adding subscription to pending cache for "%s"', sid);
  this.pending[sid] = this.pending[sid] || [];
  this.pending[sid].push(sub);

  // handle subscription errors while pending
  function onerror(err){
    debug('subscription "%s" error %s in pending state', sub.id, err.stack);
    sub.destroy();
  }
  sub.on('error', onerror);

  // handle destroy callback from either `error` or timeout
  function ondestroy(){
    debug('removing subscription from pending cache');
    var index = self.pending[sid].indexOf(sub);
    self.pending[sid].splice(index, 1);
  }
  sub.on('destroy', ondestroy);

  // subscription timeout
  var timer = setTimeout(function(){
    debug('timeout elapsed for subscription');
    if (self.pending[sid]) {
      debug('subscription still pending - destroying');
      sub.destroy();
    } else {
      debug('subscription has been claimed - ignoring');
    }
  }, this.subTimeout);

  // cleanup
  sub.once('attach', function(){
    sub.removeListener('error', onerror);
    sub.removeListener('destroy', ondestroy);
    clearTimeout(timer);
  });
};

/**
 * Connection URI parsing utility.
 *
 * @param {String} uri
 * @return {Object} `name: 'localhost', port: 6379`
 * @api private
 */

function parse(uri){
  var pieces = uri.split(':');
  var host = pieces.shift();
  var port = pieces.pop();
  return { host: host, port: port };
}

/**
 * Utility to clone a redis connection.
 *
 * @param {RedisClient} client
 * @return {RedisClient} cloned client
 * @api private
 */

function clone(client){
  var stream = client.stream;
  return redis(stream.remotePort, stream.remoteAddress);
}
