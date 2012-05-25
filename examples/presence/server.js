
/**
 * Module dependencies.
 */

var express = require('express')
  , mydb = require('mydb')
  , http = require('http')
  , passport = require('passport')
  , Twitter = require('passport-twitter').Strategy
  , debug = require('debug')('mypresence')

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

var db = mydb(server, 'localhost/mypresence');

/**
 * Get todos collection
 */

var users = db.get('users')
  , rooms = db.get('rooms')
  , sessions = db.get('sessions')

// users indexes
users.index('id');

// rooms indexes
rooms.index('name');

/**
 * Define database actions.
 */

db('/', function (conn, expose) {
  var obj = { name: '/main' };
  expose(rooms.findAndModify(obj, { $set: obj }, { upsert: true }));
});

db('/session/:rid/:uid', function (conn, expose) {
  var obj = { sid: conn.sid };

  conn.on('disconnect', function () {
    users.update(conn.params.uid, { $inc: { connections: -1 } });
  });

  // add user to users set if not present
  rooms.update(conn.params.rid, { $addToSet: { 
    users: rooms.id(conn.params.uid)
  }});

  // increase connections count
  users.update(conn.params.uid, { $inc: { connections: 1 } })

  expose(users.findById(conn.params.uid));
});

db('/user/:uid', function (conn, expose) {
  expose(users.findById(conn.params.uid));
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
app.use(express.cookieParser('meli'));
app.use(express.session({ secret: 'meli' }));
app.use(express.bodyParser());
app.use(passport.initialize());
app.use(passport.session());

/**
 * Configure passport
 */

passport.use(new Twitter({
    consumerKey: process.env.TWITTER_CONSUMER_KEY
  , consumerSecret: process.env.TWITTER_CONSUMER_SECRET
  , callbackURL: 'http://passport.local/oauth/twitter/callback'
}, onTwitter));

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (id, done) {
  users.findById(id, done);
});

/**
 * Twitter callback.
 *
 * @api private
 */

function onTwitter (token, secret, profile, done) {
  users.findOne({ id_str: profile._json.id_str }, function (err, user) {
    if (err) return done(err);
    if (user) {
      debug('existing twitter profile');
      users.update(user._id, { $set: { connections: 0 } });
      done(null, user._id);
    } else {
      debug('inserting twitter profile');
      users.insert({
          name: profile._json.name
        , avatar: profile._json.profile_image_url_https
        , id_str: profile._json.id_str
        , bio: profile._json.description
        , connections: 0
      }, function (err, doc) {
        if (err) return done(err);
        done(null, doc._id);
      });
    }
  });
}

/**
 * Define route.
 */

app.get('/', function (req, res, next) {
  if (!req.user) {
    passport.authenticate('twitter')(req, res, next);
  } else {
    res.render('index', { id: req.user._id });
  }
});

/**
 * Change bio.
 */

app.post('/bio', function (req, res, next) {
  users.update(req.user._id, { $set: { bio: req.body.bio } }, function (err) {
    if (err) return next(err);
    res.send(200);
  });
});

/**
 * Twitter OAuth route.
 */

app.get('/oauth/twitter/callback', passport.authenticate('twitter',{
    successRedirect: '/'
  , failureRedirect: '/'
}));

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
