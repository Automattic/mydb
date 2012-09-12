
/**
 * Module dependencies.
 */

var MonkCollection = require('monk').Collection
  , update = MonkCollection.prototype.update
  , debug = require('debug')('mydb')

/**
 * Module exports
 */

module.exports = Collection;

/**
 * Collection that overrides monk.Collection
 *
 * @param {Manager} mydb manager
 * @param {monk.Manager} db manager
 * @param {String} name
 * @api public
 */

function Collection (mydb, db, name) {
  this.mydb = mydb;
  MonkCollection.call(this, db, name);
}

/**
 * Inherits from monk.Collection
 */

Collection.prototype.__proto__ = MonkCollection.prototype;

/**
 * Overrides updates
 *
 * @param {Object} search query
 * @param {Object} update obj
 * @param {Object|String|Array} optional, options or fields
 * @param {Function} callback
 * @return {Promise}
 * @api public
 */

Collection.prototype.update = function (search, updates, opts, fn) {
  var promise = update.call(this, search, updates, opts, fn);

  if (search._id) {
    var self = this;
    debug('waiting on update success to emit op');
    promise.on('success', function () {
      debug('emitting op %j for "%s"', updates, search._id);
      self.emit('op', search._id.toString(), updates);
    });
  }

  return promise;
};
