
/**
 * Test dependencies.
 */

var http = require('http').Server;
var express = require('express');
var server = require('..');
var Subscription = require('../subscription');
var expect = require('expect.js');
var expose = require('mydb-expose');
var client = require('mydb-client');
var driver = require('mydb-driver');
var request = require('supertest');

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
    .use(expose({ mongo: mongo }));
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

    it('should handle errors', function(done){
      var app = create();
      var httpServer = http(app);
      var mydb = server(httpServer);

      httpServer.listen(function(){
        var db = client('ws://localhost:' + httpServer.address().port);
        var doc = db.get('/wtf', function(err){
          expect(err).to.be.an(Error);
          expect(err.url).to.match(/\/wtf/);
          expect(err.status).to.be(404);
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

    it('should emit root-level doc events', function(done){
      var app = create();
      var httpServer = http(app);
      var mydb = server(httpServer);

      posts.insert({ title: 'Tobi', tags: [
        { name: 'Games', slug: '/slug' },
        { name: 'Movies', slug: '/movies' },
        { name: 'Code', slug: '/code' }
      ] });

      app.get('/doc', function(req, res){
        res.send(posts.findOne({ title: 'Tobi' }));
      });

      httpServer.listen(function(){
        var db = client('ws://localhost:' + httpServer.address().port);
        var doc = db.get('/doc', function(){
          expect(doc.title).to.be('Tobi');
          expect(doc.tags.length).to.be(3);
          expect(doc.tags[0].name).to.be('Games');
          var count = 3;
          doc.on('tags.0.slug', function(v, op){
            expect(v).to.be('/foo');
            expect(op.op).to.be('$set');
            expect(op.key).to.be('tags.0.slug');
            expect(op.value).to.be('/foo');
            --count || done();
          });
          doc.on('tags.0', function(v, op){
            expect(v.name).to.be('Games');
            expect(v.slug).to.be('/foo');
            expect(op.op).to.be('$set');
            expect(op.key).to.be('tags.0.slug');
            expect(op.value).to.be('/foo');
            --count || done();
          });
          doc.on('tags', function(v, op){
            expect(v.length).to.be(3);
            expect(v[0].name).to.be('Games');
            expect(v[0].slug).to.be('/foo');
            expect(op.op).to.be('$set');
            expect(op.key).to.be('tags.0.slug');
            expect(op.value).to.be('/foo');
            --count || done();
          });
          posts.update({ _id: doc._id, 'tags.name': 'Games' }, { $set: { 'tags.$.slug': '/foo' } });
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

    it('should send partial data', function(done){
      var app = create();
      var httpServer = http(app);
      var mydb = server(httpServer);
      var count = 2;

      posts.insert({ test: 'ha', likes: ['a'], dislikes: ['a'] });

      app.get('/doc', function(req, res){
        res.send(posts.findOne({ test: 'ha' }, '-dislikes'));
      });

      httpServer.listen(function(){
        var db = client('ws://localhost:' + httpServer.address().port);
        var doc = db.get('/doc', function(){
          expect(doc.test).to.be('ha');
          expect(doc.likes).to.eql(['a']);
          expect(doc.dislikes).to.be(undefined);

          posts.update(doc._id, { $push: { likes: 'b', dislikes: 'b' } });
          posts.update(doc._id, { $set: { test: 'a' } });

          var updatedLikes = false;

          doc.on('likes', 'push', function(v){
            expect(v).to.be('b');
            updatedLikes = true;
          });

          doc.on('dislikes', 'push', function(){
            done(new Error('Unexpected'));
          });

          doc.on('test', function(){
            expect(doc.likes).to.eql(['a', 'b']);
            expect(doc.dislikes).to.be(undefined);
            expect(updatedLikes).to.be(true);
            done();
          });
        });
      });
    });

    it('should destroy a subscription', function(done){
      var app = create();
      var httpServer = http(app);
      var mydb = server(httpServer);

      posts.insert({ haha: 'test' });
      posts.insert({ haha: 'test2' });

      app.get('/', function(req, res){
        res.send(posts.findOne({ haha: 'test' }));
      });

      app.get('/test', function(req, res){
        res.send(posts.findOne({ haha: 'test2' }));
      });

      httpServer.listen(function(){
        var db = client('ws://localhost:' + httpServer.address().port);
        var doc1 = db.get('/', function(){
          expect(doc1.haha).to.be('test');
          doc1.on('haha', function(){
            done(new Error('Unexpected'));
          });
          var doc2 = db.get('/test', function(){
            expect(doc2._id).to.not.be(doc1._id);
            expect(doc2.haha).to.be('test2');
            doc2.on('haha', function(v){
              expect(v).to.be('woot2');
              done();
            });

            var id1 = doc1._id;
            var id2 = doc2._id;

            doc1.destroy(function(){
              expect(doc1._id).to.be(undefined);

              // we send two operations in a row
              // we complete the test upon getting the doc2 change
              // so that we ensure doc1 got ignored by the destroyed
              // subscription
              posts.update(id1, { $set: { haha: 'woot1' } });
              posts.update(id2, { $set: { haha: 'woot2' } });
            });
          });
        });
      });
    });

    it('should destroy in unloaded state', function(done){
      var app = create();
      var httpServer = http(app);
      var mydb = server(httpServer);

      posts.insert({ x: 'y' });

      app.get('/', function(req, res){
        res.send(posts.findOne({ x: 'y' }));
      });

      httpServer.listen(function(){
        var db = client('ws://localhost:' + httpServer.address().port);
        var doc1 = db.get('/', function(){
          done(new Error('Nope'));
        });
        doc1.ready(function(){
          done(new Error('Nope'));
        });
        doc1.destroy();
        doc1.load('/', function(){
          expect(doc1.x).to.be('y');
          done();
        });
      });
    });

    it('should destroy listeners', function(done){
      var app = create();
      var httpServer = http(app);
      var mydb = server(httpServer);
      httpServer.listen(function(){
        var db = client('ws://localhost:' + httpServer.address().port);
        var doc1 = db.get('/');
        expect(doc1.$readyState()).to.be('unloaded');
        doc1.destroy(function(){
          expect(doc1.$readyState()).to.be('unloaded');
          done();
        });
      });
    });

    it('should get a field when the document is ready', function(done){
      var app = create();
      var httpServer = http(app);
      var mydb = server(httpServer);

      posts.insert({ tobi: 'a' });

      app.get('/', function(req, res){
        res.send(posts.findOne({ tobi: 'a' }));
      });

      httpServer.listen(function(){
        var db = client('ws://localhost:' + httpServer.address().port);
        var doc = db.get('/');
        doc.get('tobi', function(v){
          expect(v).to.be('a');
          expect(doc.tobi).to.be('a');
          done();
        });
      });
    });

    it('should get a field when a ready and subsequent changes', function(done){
      var app = create();
      var httpServer = http(app);
      var mydb = server(httpServer);

      posts.insert({ tobi: '£' });

      app.get('/', function(req, res){
        res.send(posts.findOne({ tobi: '£' }));
      });

      httpServer.listen(function(){
        var db = client('ws://localhost:' + httpServer.address().port);
        var doc = db.get('/');
        var i = 0;
        var vals = ['£', 'pp'];
        doc.upon('tobi', function(v){
          expect(v).to.be(vals[i++]);
          if (i == 2) done();
        });
        doc.ready(function(){
          posts.update(doc._id, { $set: { tobi: 'pp' } });
        });
      });
    });

    it('should loop through existing properties and new ones', function(done){
      var app = create();
      var httpServer = http(app);
      var mydb = server(httpServer);

      posts.insert({ jane_loki: ['a', 'b', 'c'], tests: 'array' });

      app.get('/', function(req, res){
        res.send(posts.findOne({ tests: 'array' }));
      });

      httpServer.listen(function(){
        var db = client('ws://localhost:' + httpServer.address().port);
        var doc = db.get('/');
        var i = 0;
        var vals = ['a', 'b', 'c', 'd', 'e'];
        doc.each('jane_loki', function(v){
          expect(v).to.be(vals[i++]);
          if (i == 5) done();
        });
        doc.ready(function(){
          posts.update(doc._id, { $push: { jane_loki: 'd' } });
          posts.update(doc._id, { $push: { jane_loki: 'e' } });
        });
      });
    });

    it('should do a single unique subscription on the server', function(done){
      var app = create();
      var httpServer = http(app);
      var mydb = server(httpServer);

      posts.insert({ some_random: 'stuff', arr: [] });

      app.get('/', function(req, res){
        res.send(200);
      });

      app.get('/1', function(req, res){
        res.send(posts.findOne({ some_random: 'stuff' }));
      });

      app.get('/2', function(req, res){
        res.send(posts.findOne({ some_random: 'stuff' }));
      });

      app.get('/3', function(req, res){
        res.send(posts.findOne({ some_random: 'stuff' }));
      });

      httpServer.listen(function(){
        request(app)
        .get('/')
        .end(function(err, res){
          if (err) return done(err);
          var db = client('ws://localhost:' + httpServer.address().port, {
            headers: {
              Cookie: res.headers['set-cookie'][0].split(';')[0]
            }
          });
          var total = 2;

          var doc1 = db.get();
          var doc2 = db.get();
          var doc3 = db.get();

          doc1.load('/1', function(){
            // we make sure payload gets copied over
            doc2.load('/2', function(){
              --total || subscribed();
            });
            doc3.load('/3', function(){
              --total || subscribed();
            });
          });

          var subscriptions = 0;
          var shouldDestroy = false;

          mydb.on('client', function(client){
            client.on('subscription', function(sub){
              subscriptions++;
              sub.on('destroy', function(){
                expect(shouldDestroy).to.be(true);
                done();
              });
              if (subscriptions > 1) done(new Error('Unexpected'));
            });
          });
          function subscribed(){
            expect(subscriptions).to.be(1);

            // we make sure payload got copied over
            expect(doc1.some_random).to.be('stuff');
            expect(doc2.some_random).to.be('stuff');
            expect(doc3.some_random).to.be('stuff');

            posts.update(doc1._id, { $push: { arr: 'test' } });

            // we make sure payloads are cloned, so each array has
            // to have only one item
            var totalArrs = 3;
            doc1.on('arr', arr);
            doc2.on('arr', arr);
            doc3.on('arr', arr);

            function arr(){
              if (--totalArrs) return;
              expect(doc1.arr).to.eql(['test']);
              expect(doc2.arr).to.eql(['test']);
              expect(doc3.arr).to.eql(['test']);

              expect(doc1.arr).not.to.be(doc2.arr);
              expect(doc1.arr).not.to.be(doc3.arr);

              doc1.destroy();
              setTimeout(function(){
                doc2.destroy();
                setTimeout(function(){
                  shouldDestroy = true;
                  doc3.destroy();
                }, 50);
              }, 50);
            }
          }
        });
      });
    });

    it('session', function(done){
      var app = create();
      var httpServer = http(app);
      var mydb = server(httpServer);

      app.get('/', function(req, res){
        res.send(200);
      });

      app.post('/test', function(req, res){
        req.session.set('testing', 'something');
        res.send(200);
      });

      httpServer.listen(function(){
        request(app)
        .get('/')
        .end(function(err, res){
          var cookie = res.headers['set-cookie'][0].split(';')[0];
          var db = client('ws://localhost:' + httpServer.address().port, {
            headers: { Cookie: cookie }
          });
          var doc = db.get('/session', function(){
            request(app)
            .post('/test')
            .set('Cookie', cookie)
            .end(function(err){
              if (err) return done(err);
            });
          });
          doc.on('testing', function(v){
            expect(v).to.be('something');
            done();
          });
        });
      });
    });
  });

  describe('preloading and buffering', function(){
    it('should preload ops until subscription', function(done){
      var app = create();
      var httpServer = http(app);
      var mydb = server(httpServer);

      posts.insert({ haha: 'yep' });

      app.get('/', function(req, res, next){
        posts.findOne({ haha: 'yep' }, function(err, post){
          if (err) return done(err);
          res.subscribe(post._id, function(err, sid){
            if (err) return done(err);
            res.send({
              sid: sid,
              socketid: req.mydb_socketid,
              doc: post
            });
          });
        });
      });

      httpServer.listen(function(){
        var port = httpServer.address().port;
        request(app)
        .get('/')
        .expect(200)
        .end(function(err, res){
          if (err) return done(err);
          var body = res.body;

          // make sure subscription exists
          var subs = mydb.pending[body.socketid];
          var sub = subs[0];
          expect(subs.length).to.be(1);
          expect(sub).to.be.a(Subscription);
          expect(sub.id).to.be(body.sid);
          expect(sub.ops.length).to.be(0);

          // change `haha`
          posts.update(body.doc._id, { $set: { haha: 'nope' } }, function(err){
            if (err) return done(err);

            setTimeout(function(){
              // make sure the op was consumed
              expect(sub.ops.length).to.be(1);

              var db = client('ws://localhost:' + port, { sid: body.socketid });
              db.preload({
                url: '/woot',
                sid: body.sid,
                doc: body.doc
              });

              var doc = db.get('/woot', function(){
                expect(doc.haha).to.be('yep');
                doc.once('haha', function(v){
                  expect(v).to.be('nope');
                  expect(mydb.pending[body.socketid]).to.be(undefined);
                  posts.update(body.doc._id, { $set: { haha: 'yup again' } });
                  doc.once('haha', function(v){
                    expect(v).to.be('yup again');
                    done();
                  });
                });
              });
            }, 100);
          });
        });
      });
    });
  });

  describe('pseudo-events', function(){
    it('$rename', function(done){
      var app = create();
      var httpServer = http(app);
      var mydb = server(httpServer);

      posts.insert({ testing: 'rename' });

      app.get('/', function(req, res){
        res.send(posts.findOne({ testing: 'rename' }));
      });

      httpServer.listen(function(){
        var db = client('ws://localhost:' + httpServer.address().port);
        var total = 2;
        var doc = db.get('/', function(){
          posts.update(doc._id, { $rename: { testing: 'woot' } });
          doc.on('testing', 'unset', function(){
            --total || done();
          });
          doc.on('woot', function(v){
            expect(v).to.be('rename');
            --total || done();
          });
        });
      });
    });

    it('$pull with many matches', function(done){
      var app = create();
      var httpServer = http(app);
      var mydb = server(httpServer);

      posts.insert({ letspull: [1,2,1], pull: 'emall' });

      app.get('/', function(req, res){
        res.send(posts.findOne({ pull: 'emall' }));
      });

      httpServer.listen(function(){
        var db = client('ws://localhost:' + httpServer.address().port);
        var doc = db.get('/', function(){
          var total = 2;
          posts.update(doc._id, { $pull: { letspull: 1 } });
          doc.on('letspull', 'pull', function(v){
            expect(v).to.be(1);
            --total || done();
          });
        });
      });
    });

    it('should wipe doc on destroy', function(done){
      var app = create();
      var httpServer = http(app);
      var mydb = server(httpServer);

      posts.insert({ a: 'b', shouldbe: 'gone' });
      posts.insert({ shouldbe: 'there' });

      app.get('/', function(req, res){
        res.send(posts.findOne({ shouldbe: 'gone' }));
      });

      app.get('/2', function(req, res){
        res.send(posts.findOne({ shouldbe: 'there' }));
      });

      httpServer.listen(function(){
        var db = client('ws://localhost:' + httpServer.address().port);
        var doc = db.get('/', function(){
          doc.destroy(function(){
            doc.load('/2', function(){
              expect(doc.a).to.be(undefined);
              expect(doc.shouldbe).to.be('there');
              done();
            });
          });
        });
      });
    });

    it('should override existing loading state', function(done){
      var app = create();
      var httpServer = http(app);
      var mydb = server(httpServer);

      posts.insert({ a: 'tale' });
      posts.insert({ a: 'different tale' });

      app.get('/', function(req, res){
        res.send(posts.findOne({ a: 'tale' }));
      });

      app.get('/2', function(req, res){
        res.send(posts.findOne({ a: 'different tale' }));
      });

      httpServer.listen(function(){
        var db = client('ws://localhost:' + httpServer.address().port);
        var doc = db.get('/', function(){
          done(new Error('Unexpected'));
        });
        doc.load('/2', function(){
          expect(doc.a).to.be('different tale');
          done();
        });
      });
    });
  });

});
