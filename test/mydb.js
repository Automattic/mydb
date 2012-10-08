
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
var posts = mongo.get('posts');

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
  });

});
