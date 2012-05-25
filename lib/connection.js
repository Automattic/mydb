
/**
 * Module dependencies.
 */

var debug = require('debug')('mydb')
  , monk = require('monk')
  , EventEmitter = require('events').EventEmitter

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
    , self = this

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
    self.subscription = self.manager.subscribe('op:' + id, function (obj) {
      debug('got %j for objectid subscription "%s"', obj, id);

      // filter by subscribed fields
      if (null != inclusive) {
        if (inclusive) {
          var newQuery = {};

          for (var i in fields) {
            if (null != obj[i]) {
              newQuery[i] = obj[i];
            }
          }

          obj = newQuery;
        } else {
          for (var i in obj) {
            if (fields[i]) {
              delete obj[i];
            }
          }
        }
      }

      if (Object.keys(obj).length) {
        self.socket.emit(self.name + '#op', obj);
      }
    });
  });
};

/**
 * Called upon disconnect.
 *
 * @api private
 */

Connection.prototype.onDisconnect = function () {
  this.open = false;
  if (this.subscription) {
    this.subscription.destroy();
  }
};

/**
 * Inherits from EventEmitter
 */

Connection.prototype.__proto__ = EventEmitter.prototype;
