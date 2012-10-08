
/**
 * Test dependencies.
 */

var http = require('http').Server
  , express = require('express')
  , server = require('..')
  , expect = require('expect.js')
  , expose = require('mydb-expose')
  , client = require('mydb-client')
  , driver = require('mydb-driver');

/**
 * Connect to MongoDB.
 */

var mongo = driver(process.env.MONGO_URI || 'localhost/mydb');
var posts = mongo.get('posts-' + Date.now());

/**
 * Helper to create express app.
 */

function create(){
  return express()
    .use(express.cookieParser())
    .use(express.session({ secret: 'test' }))
    .use(expose());
}

/**
 * Test.
 */

describe('mydb', function(){

  describe('exports', function(){
    it('Server', function(){
      expect(server).to.be.a('function');
    });

    it('Client', function(){
      expect(server.Client).to.be.a('function');
    });

    it('Subscription', function(){
      expect(server.Subscription).to.be.a('function');
    });
  });

  describe('attaching', function(){
    it('should work without `new`', function(){
      var httpServer = http();
      var mydb = server(httpServer);
      expect(mydb).to.be.an(server);
    });
  });

  describe('exposing', function(){
    it('should expose docs', function(done){
      var app = create();
      var httpServer = http(app);
      var mydb = server(httpServer);

      posts.insert({ title: 'Test' });

      app.get('/somedoc', function(req, res){
        res.send(posts.findOne({ title: 'Test' }));
      });

      httpServer.listen(function(){
        var db = client('ws://localhost:' + httpServer.address().port);
        var doc = db.get('/somedoc', function(){
          expect(doc.title).to.be('Test');
          done();
        });
      });
    });

    it('should emit doc events', function(done){
      var app = create();
      var httpServer = http(app);
      var mydb = server(httpServer);

      posts.insert({ title: 'Tobi' });

      app.get('/doc', function(req, res){
        res.send(posts.findOne({ title: 'Tobi' }));
      });

      httpServer.listen(function(){
        var db = client('ws://localhost:' + httpServer.address().port);
        var doc = db.get('/doc', function(){
          expect(doc.title).to.be('Tobi');
          doc.on('title', function(v){
            expect(v).to.be('Woot');
            expect(doc.title).to.be('Woot');
            done();
          });
          posts.update(doc._id, { $set: { title: 'Woot' } });
        });
      });
    });

    it('should emit custom op events', function(done){
      var app = create();
      var httpServer = http(app);
      var mydb = server(httpServer);
      var count = 2;

      posts.insert({ test: 'test' });

      app.get('/doc', function(req, res){
        res.send(posts.findOne({ test: 'test' }));
      });

      httpServer.listen(function(){
        var db = client('ws://localhost:' + httpServer.address().port);
        var doc = db.get('/doc', function(){
          doc.on('likes', function(v){
            expect(v).to.eql(['tobi']);
            --count || done();
          });
          doc.on('likes', 'push', function(v){
            expect(v).to.eql('tobi');
            --count || done();
          });
          posts.update(doc._id, { $push: { likes: 'tobi' } });
        });
      });
    });

    it('should send partial data', function(){
      var app = create();
      var httpServer = http(app);
      var mydb = server(httpServer);
      var count = 2;

      posts.insert({ test: 'test', likes: ['a'], dislikes: ['a'] });

      app.get('/doc', function(req, res){
        res.send(posts.findOne({ test: 'test' }, '-dislikes'));
      });

      httpServer.listen(function(){
        var db = client('ws://localhost:' + httpServer.address().port);
        var doc = db.get('/doc', function(){
          expect(doc.test).to.be('test');
          expect(doc.likes).to.eql(['a']);
          expect(doc.dislikes).to.be(undefined);

          posts.update(doc._id, { $push: { likes: 'b', dislikes: 'b' } });
          posts.update(doc._id, { $set: { test: 'a' } });

          var updatedLikes = false;

          posts.on('likes', 'push', function(v){
            expect(v).to.be('b');
            updatedLikes = true;
          });

          posts.on('dislikes', 'push', function(){
            done(new Error('Unexpected'));
          });

          doc.on('test', function(){
            expect(doc.likes).to.eql(['a', 'b']);
            expect(doc.dislikes).to.be(undefined);
            expect(updatedLikes).to.be(true);
          });
        });
      });
    });
  });

});
