
/**
 * Module dependencies.
 */

var debug = require('debug')('mydb')
  , monk = require('monk')
  , EventEmitter = require('events').EventEmitter;

/**
 * Module exports.
 */

module.exports = Connection;

/**
 * Connection constructor
 */

function Connection (manager, sid, name, params, socket) {
  this.manager = manager;
  this.sid = sid;
  this.name = name;
  this.params = params;
  this.socket = socket;
  this.socket.setMaxListeners(Infinity);
  this.open = true;
  this.socket.on('disconnect', this.onDisconnect.bind(this));
}

/**
 * Subscribes to a documents changes.
 *
 * @param {String} collection name
 * @param {String} hex representation of objectid
 * @param {String} fields
 * @api private
 */

Connection.prototype.subscribe = function (col, id, fields) {
  debug('subscribing to document "%s" from collection "%s"', id, col);

  var fields = monk.util.fields(fields)
    , inclusive
    , self = this;

  for (var i in fields) {
    if (-1 == fields[i]) {
      inclusive = false;
    } else {
      inclusive = true;
    }
    break;
  }

  this.id = id;
  this.manager.mongo.get(col).findOne(id, { fields: fields }, function (err, doc) {
    if (err) {
      return debug('doc fetch error', err);
    }

    // send doc payload
    self.socket.emit(self.name + '#payload', doc);

    // set up subscription
    if (self.manager.subs['ev-' + id]) return;
    self.onOp = function (data, query) {
      debug('got %j (%j) for subscription %s', data, query, id);

      // filter by subscribed fields
      if (null != inclusive) {
        if (inclusive) {
          var newQuery = {};

          for (var i in fields) {
            if (null != data[i]) {
              newQuery[i] = data[i];
            }
          }

          data = newQuery;
        } else {
          for (var i in data) {
            if (fields[i]) {
              delete data[i];
            }
          }
        }
      }

      if (Object.keys(data).length) {
        // reduce needless traffic
        delete query._id;
        self.socket.emit(self.name + '#op', query, data);
      }
    };
    self.subscription = self.manager.subscribe(id, self.onOp);
  });
};

/**
 * Called upon disconnect.
 *
 * @api private
 */

Connection.prototype.onDisconnect = function () {
  this.open = false;
  if (this.subscription) this.subscription.remove(this.onOp);
  this.emit('disconnect');
};

/**
 * Inherits from EventEmitter
 */

Connection.prototype.__proto__ = EventEmitter.prototype;
