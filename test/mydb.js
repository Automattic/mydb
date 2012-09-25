
/**
 * Test dependencies.
 */

var mydb = require('../lib/mydb')
  , client = require('mydb-client')
  , express = require('express')
  , expect = require('expect.js')
  , sio = require('socket.io-client');

/**
 * Test.
 */

describe('mydb', function () {

  describe('manager', function () {
    it('initialization', function (done) {
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb');

      // random col
      var col = db.get('mydb-' + Date.now());

      app.listen(5000, function () {
        var cl = client('http://localhost:5000/mydb');

        db('/', function (conn, expose) {
          expose(col.insert({ nice: 'try' }));
        });

        var doc = cl('/', function () {
          expect(doc.nice).to.be('try');
          done();
        });
      });
    });

    it('doc proxy method', function (done) {
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb');

      // random col
      var col = db.get('mydb-' + Date.now());

      app.listen(7000, function () {
        var cl = client('http://localhost:7000/mydb');

        db('/', function (conn, expose) {
          expose(col.insert({ nice: 'try' }));
        });

        var doc = cl.doc('/', function () {
          expect(doc.nice).to.be('try');
          done();
        });
      });
    });
  });

  describe('exposing', function () {
    it('hex string and collection', function (done) {
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb');

      // random col
      var colName = 'mydb-' + Date.now()
        , col = db.get(colName);

      app.listen(9001, function () {
        var cl = client('http://localhost:9001/mydb')
          , id;

        db('/', function (conn, expose) {
          col.insert({ tobi: 'woot' }, function (err, doc) {
            id = doc._id.toString();
            expose(colName, id);
          });
        });

        var doc = cl('/', function () {
          expect(doc.tobi).to.eql('woot');
          col.updateById(id, { $set: { tobi: 'test' } });
          doc.on('tobi', function (v) {
            expect(v).to.be('test');
            done();
          });
        });
      });
    });

    it('findAndModify upsert', function (done) {
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb');

      // random col
      var colName = 'mydb-' + Date.now()
        , col = db.get(colName);

      app.listen(9002, function () {
        var cl = client('http://localhost:9002/mydb')
          , id;

        db('/', function (conn, expose) {
          var d = col.findAndModify({ test: 'fam' }, { test: 'fam' }, { upsert: true });
          expose(d);
        });

        var doc = cl('/', function () {
          expect(doc.test).to.eql('fam');
          col.findById(doc._id, function (err, d) {
            expect(err).to.be(null);
            expect(d.test).to.be('fam');
            done();
          });
        });
      });
    });

    it('findOne promise', function (done) {
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb');

      // random col
      var colName = 'mydb-' + Date.now()
        , col = db.get(colName);

      app.listen(9003, function () {
        var cl = client('http://localhost:9003/mydb')
          , id;

        db('/', function (conn, expose) {
          col.insert({ expose: 'findOne' }, function (err, doc) {
            expect(err).to.be(null);
            expose(col.findOne({ _id: doc._id }));
          });
        });

        var doc = cl('/', function () {
          expect(doc.expose).to.eql('findOne');
          done();
        });
      });
    });

    it('insert promise', function (done) {
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb');

      // random col
      var colName = 'mydb-' + Date.now()
        , col = db.get(colName);

      app.listen(9004, function () {
        var cl = client('http://localhost:9004/mydb')
          , id;

        db('/', function (conn, expose) {
          expose(col.insert({ expose: 'insert' }));
        });

        var doc = cl('/', function () {
          expect(doc.expose).to.eql('insert');
          done();
        });
      });
    });
  });

  describe('document', function () {
    it('operation event', function (done) {
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb');

      // random col
      var col = db.get('mydb-' + Date.now());

      app.listen(6001, function () {
        var cl = client('http://localhost:6001/mydb');

        db('/', function (conn, expose) {
          expose(col.insert({ nice: 'try' }));
        });

        var doc = cl('/', function () {
          expect(doc.nice).to.be('try');
          col.updateById(doc._id, { $set: { nice: 'tries' } });
          doc.once('op', function (op) {
            expect(op.$set).to.eql({ nice: 'tries' });
            done();
          });
        });
      });
    });

    it('late load', function (done) {
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb');

      // random col
      var col = db.get('mydb-' + Date.now());

      app.listen(6002, function () {
        var cl = client('http://localhost:6002/mydb');

        db('/lazy', function (conn, expose) {
          expose(col.insert({ nice: 'try' }));
        });

        var doc = cl();
        setTimeout(function () {
          doc.load('/lazy');
          doc.ready(function () {
            expect(doc.nice);
            done();
          });
        }, 20);
      });
    });

    it('upon', function(done){
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb');

      // random col
      var col = db.get('mydb-' + Date.now());

      app.listen(6003, function () {
        var cl = client('http://localhost:6003/mydb');

        db('/upon', function (conn, expose) {
          expose(col.insert({ some: false, falsy: 0, whoop: true }));
        });

        var doc = cl('/upon');
        var total = 3;
        doc.upon('some', function(v){
          expect(v).to.be(false);
          --total || next();
        });
        doc.upon('falsy', function(v){
          expect(v).to.be(0);
          --total || next();
        });
        doc.upon('whoop', function(v){
          expect(v).to.be(true);
          --total || next();
        });

        function next(){
          // should be first called with undefined, then with 0
          var calls = 0;
          doc.upon('something_new', function(v){
            calls++;
            switch (calls) {
              case 1:
                expect(v).to.be(undefined);
                break;

              case 2:
                expect(v).to.be(0);
                done();
            }
          });
          col.update(doc._id, { $set: { something_new: 0 } }, function(err){
            expect(err).to.be(null);
          });
        }
      });
    });

    it('each', function(done){
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb');

      // random col
      var col = db.get('mydb-' + Date.now());

      app.listen(6303, function () {
        var cl = client('http://localhost:6303/mydb');
        var values = ['a', 'b', 'c', 'd'];

        db('/each', function (conn, expose) {
          expose(col.insert({ some: values }));
        });

        var doc = cl('/each');
        expect(doc.isReady).to.be(false);
        var i = 0;
        doc.each('some', function(v){
          expect(doc.isReady).to.be(true);
          expect(v).to.equal(values[i++]);
          if (i == 4) {
            values.push('e');
            col.update(doc._id, { $push: { some: 'e' } });
          }
          if (i == 5) next();
        });

        function next(){
          var i = 0;
          var values = [{ a: 'b' }, { c: 'd' }];
          doc.each('empty', function(v){
            expect(v).to.eql(values[i++]);
            if (i == 2) done();
          });
          col.update(doc._id, { $push: { empty: { a: 'b' } } });
          col.update(doc._id, { $push: { empty: { c: 'd' } } });
        }
      });
    });
  });

  describe('operations', function () {
    it('set', function (done) {
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb');

      // random col
      var col = db.get('mydb-' + Date.now());

      app.listen(5001, function () {
        var cl = client('http://localhost:5001/mydb');

        db('/', function (conn, expose) {
          expose(col.insert({ nice: 'try' }));
        });

        var doc = cl('/', function () {
          expect(doc.nice).to.be('try');
          col.updateById(doc._id, { $set: { nice: 'tries' } });
          doc.on('nice', function (v) {
            expect(v).to.equal('tries');
            expect(doc.nice).to.equal('tries');
            done();
          });
        });
      });
    });

    it('push', function (done) {
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb');

      // random col
      var col = db.get('mydb-' + Date.now());

      app.listen(5002, function () {
        var cl = client('http://localhost:5002/mydb');

        db('/', function (conn, expose) {
          expose(col.insert({ nice: 'try' }));
        });

        var doc = cl('/', function () {
          expect(doc.nice).to.be('try');
          col.updateById(doc._id, { $push: { items: 'try' } });
          doc.once('items', 'push', function (v) {
            expect(v).to.be('try');
            expect(doc.items).to.be.an('array');
            expect(doc.items[0]).to.be('try');

            col.updateById(doc._id, { $push: { items: 'try 2' } });
            doc.once('items', 'push', function (v) {
              expect(v).to.be('try 2');
              expect(doc.items[1]).to.be('try 2');
              done();
            });
          });
        });
      });
    });

    it('push (unset)', function (done) {
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb');

      var col = db.get('mydb-' + Date.now());

      app.listen(8000, function () {
        var cl = client('http://localhost:8000/mydb');

        db('/', function (conn, expose) {
          expose(col.insert({}));
        });

        var doc = cl('/', function () {
          col.update({ _id: doc._id }, { $push: { unknown: 'test' } });
          doc.once('unknown', 'push', function (v) {
            expect(v).to.equal('test');
            expect(doc.unknown).to.be.an('array');
            expect(doc.unknown).to.eql(['test']);
            done();
          });
        });
      });
    });

    it('inc', function (done) {
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb');

      // random col
      var col = db.get('mydb-' + Date.now());

      app.listen(5003, function () {
        var cl = client('http://localhost:5003/mydb');

        db('/', function (conn, expose) {
          expose(col.insert({ count: 4 }));
        });

        var doc = cl('/', function () {
          expect(doc.count).to.be(4);
          col.updateById(doc._id, { $inc: { count: 1 } });
          doc.once('count', 'inc', function (v) {
            expect(v).to.be(1);
            expect(doc.count).to.be(5);
            done();
          });
        });
      });
    });

    it('unset', function (done) {
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb');

      // random col
      var col = db.get('mydb-' + Date.now());

      app.listen(5004, function () {
        var cl = client('http://localhost:5004/mydb');

        db('/', function (conn, expose) {
          expose(col.insert({ a: 'b', c: 'd' }));
        });

        var doc = cl('/', function () {
          expect(doc.a).to.be('b');
          expect(doc.c).to.be('d');
          col.updateById(doc._id, { $unset: { c: 1 } });
          doc.once('c', 'unset', function () {
            expect(doc.a).to.be('b');
            expect(doc.c).to.be(undefined);
            done();
          });
        });
      });
    });

    it('pushAll', function (done) {
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb');

      // random col
      var col = db.get('mydb-' + Date.now());

      app.listen(5005, function () {
        var cl = client('http://localhost:5005/mydb');

        db('/', function (conn, expose) {
          expose(col.insert({ ferrets: ['a', 'b', 'c'] }));
        });

        var doc = cl('/', function () {
          expect(doc.ferrets).to.eql(['a', 'b', 'c']);
          col.updateById(doc._id, { $pushAll: { ferrets: ['d', 'e'] } });

          // push all gets expressed in the client as multiple pushes
          var total = 0;
          doc.on('ferrets', 'push', function (v) {
            switch (++total) {
              case 1:
                expect(v).to.be('d');
                expect(doc.ferrets).to.eql(['a', 'b', 'c', 'd']);
                break;

              case 2:
                expect(v).to.be('e');
                expect(doc.ferrets).to.eql(['a', 'b', 'c', 'd', 'e']);
                done();
                break;

              default:
                done(new Error('Unexpected'));
            }
          });
        });
      });
    });

    it('pushAll (unset)', function (done) {
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb');

      // random col
      var col = db.get('mydb-' + Date.now());

      app.listen(5105, function () {
        var cl = client('http://localhost:5105/mydb');

        db('/', function (conn, expose) {
          expose(col.insert({}));
        });

        var doc = cl('/', function () {
          col.updateById(doc._id, { $pushAll: { ferrets: ['d', 'e'] } });

          var total = 0;

          doc.on('ferrets', 'push', function (v) {
            switch (++total) {
              case 1:
                expect(v).to.be('d');
                expect(doc.ferrets).to.be.an('array');
                expect(doc.ferrets).to.eql(['d']);
                break;

              case 2:
                expect(v).to.be('e');
                expect(doc.ferrets).to.be.an('array');
                expect(doc.ferrets).to.eql(['d', 'e']);
                done();
                break;

              default:
                done(new Error('Unexpected'));
            }
          });
        });
      });
    });

    it('addToSet', function (done) {
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb');

      // random col
      var col = db.get('mydb-' + Date.now());

      app.listen(5006, function () {
        var cl = client('http://localhost:5006/mydb');

        db('/', function (conn, expose) {
          expose(col.insert({ set: ['a', 'b', 'c'] }));
        });

        var doc = cl('/', function () {
          col.updateById(doc._id, { $addToSet: { set: 'd' } });
          doc.once('set', 'push', function () {
            expect(doc.set).to.contain('d');
            col.updateById(doc._id, { $addToSet: { set: 'd' } });

            var ignorePush = false;

            doc.once('set', 'push', function () {
              if (!ignorePush) {
                done(new Error('Unexpected push event'));
              }
            });

            doc.once('noop', function (v) {
              expect(v.$addToSet).to.eql({ set: 'd' });

              process.nextTick(function () {
                // prevent check from triggering for subsequent ops
                ignorePush = true;

                col.updateById(doc._id, { $addToSet: {
                  set: { $each: ['e', 'b', 'f'] } }
                });

                var total = 0;

                doc.on('set', 'push', function (v) {
                  switch (++total) {
                    case 1:
                      expect(v).to.equal('e');
                      break;

                    case 2:
                      expect(v).to.equal('f');
                      done();
                      break;

                    default:
                      done(new Error('Unexpected push event'));
                  }
                });
              });
            });
          });
        });
      });
    });

    it('addToSet (unset)', function (done) {
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb');

      // random col
      var col = db.get('mydb-' + Date.now());

      app.listen(5007, function () {
        var cl = client('http://localhost:5007/mydb');

        db('/', function (conn, expose) {
          expose(col.insert({}));
        });

        var doc = cl('/', function () {
          col.updateById(doc._id, { $addToSet: { a: 'b' } });
          doc.on('a', 'push', function (v) {
            expect(v).to.be('b');
            expect(doc.a).to.be.an('array');
            expect(doc.a).to.eql(['b']);

            col.updateById(doc._id, { $addToSet: { b: { $each: [1, 2] } } });

            var total = 0;

            doc.on('b', 'push', function (v) {
              switch (++total) {
                case 1:
                  expect(v).to.be(1);
                  expect(doc.b).to.be.an('array');
                  expect(doc.b).to.eql([1]);
                  break;

                case 2:
                  expect(v).to.be(2);
                  expect(doc.b).to.be.an('array');
                  expect(doc.b).to.eql([1, 2]);
                  done();
                  break;
              }
            });
          });
        });
      });
    });

    it('pull', function (done) {
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb');

      // random col
      var col = db.get('mydb-' + Date.now());

      app.listen(5008, function () {
        var cl = client('http://localhost:5008/mydb');

        db('/', function (conn, expose) {
          expose(col.insert({ animals: [
              { type: 'ferret', name: 'tobi' }
            , { type: 'dog', name: 'raul' }
            , { type: 'ferret', name: 'locki' }
          ]}));
        });

        var doc = cl('/', function () {
          expect(doc.animals).to.eql([
              { type: 'ferret', name: 'tobi' }
            , { type: 'dog', name: 'raul' }
            , { type: 'ferret', name: 'locki' }
          ]);
          col.updateById(doc._id, { $pull: { animals: { type: 'ferret' } } });
          var total = 0;
          doc.on('animals', 'pull', function (v) {
            switch (++total) {
              case 1:
                expect(v).to.eql({ type: 'ferret', name: 'tobi' });
                expect(doc.animals).to.eql([
                    { type: 'dog', name: 'raul' }
                  , { type: 'ferret', name: 'locki' }
                ]);
                break;

              case 2:
                expect(v).to.eql({ type: 'ferret', name: 'locki' });
                expect(doc.animals).to.eql([
                  { type: 'dog', name: 'raul' }
                ]);
                done();
                break;
            }
          });
        });
      });
    });

    it('pullAll', function (done) {
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb');

      // random col
      var col = db.get('mydb-' + Date.now());

      app.listen(5009, function () {
        var cl = client('http://localhost:5009/mydb');

        db('/', function (conn, expose) {
          expose(col.insert({ numbers: [1, 2, 3, 1] }));
        });

        var doc = cl('/', function () {
          expect(doc.numbers).to.eql([1, 2, 3, 1]);
          col.updateById(doc._id, { $pullAll: { numbers: [1, 3] } });
          var total = 0;
          doc.on('numbers', 'pull', function (v) {
            switch (++total) {
              case 1:
                expect(v).to.eql(1);
                expect(doc.numbers).to.eql([2, 3, 1]);
                break;

              case 2:
                expect(v).to.eql(3);
                expect(doc.numbers).to.eql([2, 1]);
                break;

              case 3:
                expect(v).to.eql(1);
                expect(doc.numbers).to.eql([2]);
                done();
                break;
            }
          });
        });
      });
    });

    it('pop', function (done) {
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb');

      // random col
      var col = db.get('mydb-' + Date.now());

      app.listen(5010, function () {
        var cl = client('http://localhost:5010/mydb');

        db('/', function (conn, expose) {
          expose(col.insert({ numbers: [1, 2, 3, 4, 5] }));
        });

        var doc = cl('/', function () {
          expect(doc.numbers).to.eql([1, 2, 3, 4, 5]);
          col.updateById(doc._id, { $pop: { numbers: 1 } });
          doc.once('numbers', 'pull', function (v) {
            expect(v).to.be(5);
            expect(doc.numbers).to.eql([1, 2, 3, 4]);

            col.updateById(doc._id, { $pop: { numbers: -1 } });
            doc.once('numbers', 'pull', function (v) {
              expect(v).to.be(1);
              expect(doc.numbers).to.eql([2, 3, 4]);
              done();
            });
          });
        });
      });
    });

    it('rename', function (done) {
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb');

      // random col
      var col = db.get('mydb-' + Date.now());

      app.listen(5011, function () {
        var cl = client('http://localhost:5011/mydb');

        db('/', function (conn, expose) {
          expose(col.insert({ a: { b: 'c' } }));
        });

        var doc = cl('/', function () {
          expect(doc.a).to.eql({ b: 'c' });
          col.updateById(doc._id, { $rename: { a: 'c' } });
          var unset = false;
          doc.on('a', 'unset', function () {
            unset = true;
          });
          doc.on('c', function (v) {
            expect(unset).to.be(true);
            expect(v).to.eql({ b: 'c' });
            expect(doc.a).to.be(undefined);
            expect(doc.c).to.eql({ b: 'c' });
            done();
          });
        });
      });
    });

    //it('positional operator', function(done){
      //var app = express.createServer()
        //, db = mydb(app, 'localhost/mydb');

      //// random col
      //var col = db.get('mydb-' + Date.now());
      //var tj = col.id();
      //var jane = col.id();
      //var tobi = col.id();

      //app.listen(15011, function () {
        //var cl = client('http://localhost:15011/mydb');

        //db('/', function (conn, expose) {
          //expose(col.insert({
            //people: [
              //{ _id: tobi, name: 'Tobi' },
              //{ _id: tj, name: 'Tj' },
              //{ _id: jane, name: 'Jane' }
            //]
          //}));
        //});

        //var doc = cl('/', function () {
          //expect(doc.people).to.be.an(Array);
          //col.update({ _id: doc._id, 'people._id': tj }, { $set: { 'people.$.name': 'Holowaychuk', 'people.$.owner': true } });
          //doc.on('people.owner', function (v) {
            //expect(doc.people).to.eql([
              //{ _id: tobi, name: 'Tobi' },
              //{ _id: tj, name: 'Holowaychuk', owner: true },
              //{ _id: jane, name: 'Jane' }
            //]);
            ////done();
          //});
        //});
      //});
    //});
  });

  describe('multiple documents over a same socket', function () {
    it('should receive isolated events', function (done) {
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb');

      // random col
      var col = db.get('mydb-' + Date.now());

      app.listen(11000, function () {
        var cl = client('http://localhost:11000/mydb');

        db('/a', function (conn, expose) {
          expose(col.insert({ multiple: 'a' }));
        });

        db('/b', function (conn, expose) {
          expose(col.insert({ multiple: 'b' }));
        });

        var total = 2;

        var doc = cl('/a', function () {
          expect(doc.multiple).to.be('a');
          doc.on('multiple', function (v) {
            expect(v).to.be('aa');
            --total || done();
          });
          col.updateById(doc._id, { $set: { multiple: 'aa' } });
        });

        var doc2 = cl('/b', function () {
          expect(doc2.multiple).to.be('b');
          doc2.on('multiple', function (v) {
            expect(v).to.be('bb');
            --total || done();
          });
          col.updateById(doc2._id, { $set: { multiple: 'bb' } });
        });
      });
    });

    it('should handle multiple instances of same endpoint', function(done){
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb');

      // random col
      var col = db.get('mydb-' + Date.now());

      app.listen(11001, function () {
        var cl = client('http://localhost:11001/mydb');

        db('/a', function (conn, expose) {
          expose(col.insert({ multiple: 'a' }));
        });

        var total = 0;

        var doc1 = cl('/a', function(){
          var doc2 = cl('/a', function(){
            var doc3 = cl('/a', function(){

              doc1.on('multiple', function(){
                total++;
                expect(doc1.multiple).to.be('haha');
              });

              doc2.on('multiple', function(){
                total++;
                expect(doc2.multiple).to.be('haha');
              });

              doc3.on('multiple', function(){
                total++;
                expect(doc3.multiple).to.be('haha');
              });

              // we set a timeout to try to avoid a regression of multiple
              // callbacks per document
              setTimeout(function(){
                expect(total).to.be(3);
                done();
              }, 200);

              col.update(doc1._id, { $set: { multiple: 'haha' } });
            });
          });
        });
      });
    });
  });

  describe('presence', function(){
    it('should fire join/leave events', function(done){
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb');

      // random col
      var col = db.get('mydb-' + Date.now());

      app.listen(9023, function () {
        // quick hack to have the same sid
        document = { cookie: 'mydb=woot' };

        var cl = client(io('http://localhost:9023/mydb'))
          , cl2 = client(io('http://localhost:9023/mydb'))
          , connections = []
          , joins = []
          , disconnections = []
          , leaves = []

        delete global.document;

        var tobi = db('/tobi', function (conn, expose) {
          connections.push(conn.sid);
          conn.on('disconnect', function(){
            disconnections.push(conn.sid);
          });
          expose(col.insert({ test: '0' }));
        });

        tobi.on('join', function(conn){
          joins.push(conn.sid);
        });

        tobi.on('leave', function(conn){
          leaves.push(conn.sid);
        });

        var l1 = cl('/tobi', function(){
          var l2 = cl2('/tobi', function(){
            l1.socket.socket.disconnect();
            l2.socket.socket.disconnect();
            setTimeout(function(){
              expect(connections).to.eql(['woot', 'woot']);
              expect(disconnections).to.eql(['woot', 'woot']);
              expect(joins).to.eql(['woot']);
              expect(leaves).to.eql(['woot']);
              done();
            }, 100);
          });
        });
      });
    });
  });

});

/**
 * Helper to create a new socket.io client.
 *
 * @return {sio.Socket}
 * @api private
 */

function io(url){
  return sio.connect(url, { 'force new connection': true });
};
