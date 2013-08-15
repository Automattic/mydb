
/**
 * Module dependencies.
 */

var engine = require('engine.io');
var redis = require('redis');
var url = require('url');
var crypto = require('crypto');
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
  var uri = parse(opts.redis || 'localhost:6379');
  uri.port = uri.port || 6379;
  this.redis = redis.createClient(uri.port, uri.host);
  this.redisSub = redis.createClient(uri.port, uri.host);
  this.redisSub.on('message', this.onpub.bind(this));
  this.redisSub.setMaxListeners(0);
  this.redisUri = uri;
  this.subscriptions = {};

  // secret for validating subscription payloads
  this.secret = opts.secret || 'youareagoodmydbcracker';

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

  // hijack again
  var self  = this;
  var listeners = http.listeners('request').slice();
  http.removeAllListeners('request');
  http.on('request', function(req, res){
    if (0 == req.url.indexOf('/mydb/')) {
      debug('intercepting mydb api request');
      self.onrequest(req, res);
    } else {
      for (var i = 0, l = listeners.length; i < l; i++) {
        listeners[i].call(http, req, res);
      }
    }
  });
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
  var client = new Client(this, socket);
  var id = client.id;
  debug('initializing new client %s', id);

  var self = this;
  this.ids[id] = client;

  // handle client close
  client.on('close', this.onclose.bind(this, client));

  // add pending subscriptions
  if (this.pending[id]) {
    debug('flushing pending subscriptions to client %s', id);
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

Server.prototype.subscribe = function(data, fn){
  var sid = data.socket_id;
  var sub = new Subscription(
    this,
    data.subscription_id,
    data.document_id,
    data.fields
  );
  debug('subscription "%s" for socket id "%s"', sub.id, sid);
  var start = Date.now();

  if (this.ids[sid]) {
    this.ids[sid].add(sub);
  } else {
    this.buffer(sid, sub);
  }

  sub.once('error', onerror);
  sub.on('subscribed', onsubscribe);

  function onerror(err){
    sub.removeListener('subscribed', onsubscribe);
    fn(err);
  }

  function onsubscribe(){
    debug('subscribe took %dms', Date.now() - start);
    sub.removeListener('error', onerror);
    fn(null);
  }
};

/**
 * Handle an incoming HTTP request.
 *
 * @param {String} socket id
 * @api private
 */

Server.prototype.onrequest = function(req, res){
  if ('/mydb/subscribe' != req.url) return;
  if ('POST' != req.method) {
    res.writeHead(400);
    res.end('Method unsupported');
    return;
  }

  var signature = req.headers['x-mydb-signature'];
  if (!signature) {
    res.writeHead(400);
    res.end('Missing `X-MyDB-Signature` header');
    return;
  }

  var body = '';
  var self = this;

  function ondata(data){
    body += data;
  }

  function onend(){
    cleanup();

    if (signature != sign(body, self.secret)) {
      debug('bad signature');
      res.writeHead(403);
      res.end('Bad signature');
      return;
    }

    var data;
    try {
      data = JSON.parse(body);
    } catch(e){
      debug('json parse error');
      res.writeHead(400);
      res.end('Bad JSON body');
      return;
   }

    self.subscribe(data, function(err){
      if (err) {
        debug('subscription error %j', err);
        res.writeHead(500);
        res.end('Subscription error');
        return;
      }

      res.writeHead(200);
      res.end();
    });
  }

  function cleanup(){
    req.removeListener('data', ondata);
    req.removeListener('end', onend);
    req.removeListener('error', onerror);
  }

  function onerror(){
    debug('request error');
    cleanup();
  }

  req.setEncoding('utf8');
  req.on('end', onend);
  req.on('data', ondata);
  req.on('error', onerror);
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
 * Called upon redis subscriber message.
 *
 * @api private
 */

Server.prototype.onpub = function(channel, msg){
  var obj;

  if (!this.subscriptions[channel]) return;

  try {
    obj = JSON.parse(msg);
  } catch(e){
    debug('json parse error');
    this.emit('error', e);
    return;
  }

  this.emit(channel, obj);
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
 * HMac signing helper.
 *
 * @param {String} data
 * @param {String} secret
 * @api private
 */

function sign(data, secret){
  return crypto
  .createHmac('sha1', secret)
  .update(data)
  .digest('hex');
}
