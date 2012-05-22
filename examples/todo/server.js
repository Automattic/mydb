
/**
 * Module dependencies.
 */

var express = require('express')
  , mydb = require('mydb')
  , http = require('http')

/**
 * Initialize app.
 */

var app = express(server);

/**
 * HTTP server.
 */

var server = http.createServer(app);

/**
 * Initialize mydb.
 */

var db = mydb(server, 'localhost/mychat');

/**
 * Get todos collection
 */

var todos = db.get('todos');
todos.index('slug');

/**
 * Define database actions.
 */

db('/:slug', function (conn, expose) {
  var obj = { slug: conn.params.slug };
  expose(todos.findAndModify(obj, { $set: obj }, { upsert: true }));
});

/**
 * Configure app.
 */

app.set('views', __dirname);
app.set('view engine', 'jade');

/**
 * Configure middleware.
 */

app.use(express.static(__dirname + '/public'));
app.use(express.bodyParser());

/**
 * Define route.
 */

app.get('/:path?', function (req, res, next) {
  res.render('index');
});

/**
 * Create an item.
 */

app.post('/item', function (req, res, next) {
  todos.updateById(
      req.body.id
    , { $push: { items: { _id: todos.id(), text: req.body.text } } }
    , function (err) {
        if (err) return next(err);
        res.send(200);
      });
});

/**
 * Delete an item.
 */

app.del('/item/:id/:item', function (req, res, next) {
  todos.updateById(
      req.params.id
    , { $pull: { items: { _id: todos.id(req.params.item) } } }
    , function (err) {
        if (err) return next(err);
        res.send(200);
      });
});

/**
 * Listen.
 */

if (!module.parent) {
  server.listen(3000, function (err) {
    if (err) throw err;
    var addr = this.address();
    console.log('  app listening on ' + addr.address + ':' 
      + addr.port);
  });
}

/**
 * Module exports.
 */

module.exports = server;
