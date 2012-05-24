
/**
 * Test dependencies.
 */

var mydb = require('../lib/mydb')
  , client = require('mydb-client')
  , express = require('express')
  , expect = require('expect.js')

/**
 * Test.
 */

describe('mydb', function () {

  describe('manager', function () {
    it('initialization', function (done) {
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb')

      // random col
      var col = db.get('mydb-' + Date.now())

      app.listen(5000, function () {
        var cl = client('http://localhost:5000/mydb');

        db('/', function (conn, expose) {
          expose(col.insert({ nice: 'try' }));
        });

        cl('/', function (doc) {
          expect(doc.nice).to.be('try');
          done();
        });
      });
    });

    it('doc proxy method', function (done) {
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb')

      // random col
      var col = db.get('mydb-' + Date.now())

      app.listen(7000, function () {
        var cl = client('http://localhost:7000/mydb');

        db('/', function (conn, expose) {
          expose(col.insert({ nice: 'try' }));
        });

        cl.doc('/', function (doc) {
          expect(doc.nice).to.be('try');
          done();
        });
      });
    });
  });

  describe('exposing', function () {
    it('hex string and collection', function (done) {
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb')

      // random col
      var colName = 'mydb-' + Date.now()
        , col = db.get(colName)

      app.listen(9001, function () {
        var cl = client('http://localhost:9001/mydb')
          , id

        db('/', function (conn, expose) {
          col.insert({ tobi: 'woot' }, function (err, doc) {
            id = doc._id.toString();
            expose(colName, id);
          });
        });

        cl('/', function (doc, ops) {
          expect(doc.tobi).to.eql('woot');
          col.updateById(id, { $set: { tobi: 'test' } });
          ops.on('tobi', function (v) {
            console.log(v);
            expect(v).to.be('test');
            done();
          });
        });
      });
    });

    it('findAndModify upsert', function (done) {
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb')

      // random col
      var colName = 'mydb-' + Date.now()
        , col = db.get(colName)

      app.listen(9002, function () {
        var cl = client('http://localhost:9002/mydb')
          , id

        db('/', function (conn, expose) {
          var d = col.findAndModify({ test: 'fam' }, { test: 'fam' }, { upsert: true });
          expose(d);
        });

        cl('/', function (doc, ops) {
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
        , db = mydb(app, 'localhost/mydb')

      // random col
      var colName = 'mydb-' + Date.now()
        , col = db.get(colName)

      app.listen(9003, function () {
        var cl = client('http://localhost:9003/mydb')
          , id

        db('/', function (conn, expose) {
          col.insert({ expose: 'findOne' }, function (err, doc) {
            expect(err).to.be(null);
            expose(col.findOne({ _id: doc._id }));
          });
        });

        cl('/', function (doc, ops) {
          expect(doc.expose).to.eql('findOne');
          done();
        });
      });
    });

    it('insert promise', function (done) {
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb')

      // random col
      var colName = 'mydb-' + Date.now()
        , col = db.get(colName)

      app.listen(9004, function () {
        var cl = client('http://localhost:9004/mydb')
          , id

        db('/', function (conn, expose) {
          expose(col.insert({ expose: 'insert' }));
        });

        cl('/', function (doc, ops) {
          expect(doc.expose).to.eql('insert');
          done();
        });
      });
    });
  });

  describe('document', function () {
    it('operation event', function (done) {
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb')

      // random col
      var col = db.get('mydb-' + Date.now())

      app.listen(6001, function () {
        var cl = client('http://localhost:6001/mydb');

        db('/', function (conn, expose) {
          expose(col.insert({ nice: 'try' }));
        });

        var docu = cl('/', function (doc, ops) {
          expect(doc.nice).to.be('try');
          col.updateById(doc._id, { $set: { nice: 'tries' } });
          docu.once('op', function (op) {
            expect(op.$set).to.eql({ nice: 'tries' });
            done();
          });
        });
      });
    });
  });

  describe('operations', function () {
    it('set', function (done) {
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb')

      // random col
      var col = db.get('mydb-' + Date.now())

      app.listen(5001, function () {
        var cl = client('http://localhost:5001/mydb');

        db('/', function (conn, expose) {
          expose(col.insert({ nice: 'try' }));
        });

        cl('/', function (doc, ops) {
          expect(doc.nice).to.be('try');
          col.updateById(doc._id, { $set: { nice: 'tries' } });
          ops.on('nice', function (v) {
            expect(v).to.equal('tries');
            expect(doc.nice).to.equal('tries');
            done();
          });
        });
      });
    });

    it('push', function (done) {
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb')

      // random col
      var col = db.get('mydb-' + Date.now())

      app.listen(5002, function () {
        var cl = client('http://localhost:5002/mydb');

        db('/', function (conn, expose) {
          expose(col.insert({ nice: 'try' }));
        });

        cl('/', function (doc, ops) {
          expect(doc.nice).to.be('try');
          col.updateById(doc._id, { $push: { items: 'try' } });
          ops.once('items', 'push', function (v) {
            expect(v).to.be('try');
            expect(doc.items).to.be.an('array');
            expect(doc.items[0]).to.be('try');

            col.updateById(doc._id, { $push: { items: 'try 2' } });
            ops.once('items', 'push', function (v) {
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
        , db = mydb(app, 'localhost/mydb')

      var col = db.get('mydb-' + Date.now());

      app.listen(8000, function () {
        var cl = client('http://localhost:8000/mydb');

        db('/', function (conn, expose) {
          expose(col.insert({}));
        });

        cl('/', function (doc, ops) {
          col.update({ _id: doc._id }, { $push: { unknown: 'test' } });
          ops.once('unknown', 'push', function (v) {
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
        , db = mydb(app, 'localhost/mydb')

      // random col
      var col = db.get('mydb-' + Date.now())

      app.listen(5003, function () {
        var cl = client('http://localhost:5003/mydb');

        db('/', function (conn, expose) {
          expose(col.insert({ count: 4 }));
        });

        cl('/', function (doc, ops) {
          expect(doc.count).to.be(4);
          col.updateById(doc._id, { $inc: { count: 1 } });
          ops.once('count', 'inc', function (v) {
            expect(v).to.be(1);
            expect(doc.count).to.be(5);
            done();
          });
        });
      });
    });

    it('unset', function (done) {
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb')

      // random col
      var col = db.get('mydb-' + Date.now())

      app.listen(5004, function () {
        var cl = client('http://localhost:5004/mydb');

        db('/', function (conn, expose) {
          expose(col.insert({ a: 'b', c: 'd' }));
        });

        cl('/', function (doc, ops) {
          expect(doc.a).to.be('b');
          expect(doc.c).to.be('d');
          col.updateById(doc._id, { $unset: { c: 1 } });
          ops.once('c', 'unset', function () {
            expect(doc.a).to.be('b');
            expect(doc.c).to.be(undefined);
            done();
          });
        });
      });
    });

    it('pushAll', function (done) {
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb')

      // random col
      var col = db.get('mydb-' + Date.now())

      app.listen(5005, function () {
        var cl = client('http://localhost:5005/mydb');

        db('/', function (conn, expose) {
          expose(col.insert({ ferrets: ['a', 'b', 'c'] }));
        });

        cl('/', function (doc, ops) {
          expect(doc.ferrets).to.eql(['a', 'b', 'c']);
          col.updateById(doc._id, { $pushAll: { ferrets: ['d', 'e'] } });

          // push all gets expressed in the client as multiple pushes
          var total = 0;
          ops.on('ferrets', 'push', function (v) {
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
        , db = mydb(app, 'localhost/mydb')

      // random col
      var col = db.get('mydb-' + Date.now())

      app.listen(5105, function () {
        var cl = client('http://localhost:5105/mydb');

        db('/', function (conn, expose) {
          expose(col.insert({}));
        });

        cl('/', function (doc, ops) {
          col.updateById(doc._id, { $pushAll: { ferrets: ['d', 'e'] } });

          var total = 0;

          ops.on('ferrets', 'push', function (v) {
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
        , db = mydb(app, 'localhost/mydb')

      // random col
      var col = db.get('mydb-' + Date.now())

      app.listen(5006, function () {
        var cl = client('http://localhost:5006/mydb');

        db('/', function (conn, expose) {
          expose(col.insert({ set: ['a', 'b', 'c'] }));
        });

        var docu = cl('/', function (doc, ops) {
          col.updateById(doc._id, { $addToSet: { set: 'd' } });
          ops.once('set', 'push', function () {
            expect(doc.set).to.contain('d');
            col.updateById(doc._id, { $addToSet: { set: 'd' } });

            var ignorePush = false;

            ops.once('set', 'push', function () {
              if (!ignorePush) {
                done(new Error('Unexpected push event'));
              }
            });

            docu.once('noop', function (v) {
              expect(v.$addToSet).to.eql({ set: 'd' });

              process.nextTick(function () {
                // prevent check from triggering for subsequent ops
                ignorePush = true;

                col.updateById(doc._id, { $addToSet: {
                  set: { $each: ['e', 'b', 'f'] } }
                });

                var total = 0;

                ops.on('set', 'push', function (v) {
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
        , db = mydb(app, 'localhost/mydb')

      // random col
      var col = db.get('mydb-' + Date.now())

      app.listen(5007, function () {
        var cl = client('http://localhost:5007/mydb');

        db('/', function (conn, expose) {
          expose(col.insert({}));
        });

        cl('/', function (doc, ops) {
          col.updateById(doc._id, { $addToSet: { a: 'b' } });
          ops.on('a', 'push', function (v) {
            expect(v).to.be('b');
            expect(doc.a).to.be.an('array');
            expect(doc.a).to.eql(['b']);

            col.updateById(doc._id, { $addToSet: { b: { $each: [1, 2] } } });

            var total = 0;

            ops.on('b', 'push', function (v) {
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
        , db = mydb(app, 'localhost/mydb')

      // random col
      var col = db.get('mydb-' + Date.now())

      app.listen(5008, function () {
        var cl = client('http://localhost:5008/mydb');

        db('/', function (conn, expose) {
          expose(col.insert({ animals: [
              { type: 'ferret', name: 'tobi' }
            , { type: 'dog', name: 'raul' }
            , { type: 'ferret', name: 'locki' }
          ]}));
        });

        cl('/', function (doc, ops) {
          expect(doc.animals).to.eql([
              { type: 'ferret', name: 'tobi' }
            , { type: 'dog', name: 'raul' }
            , { type: 'ferret', name: 'locki' }
          ]);
          col.updateById(doc._id, { $pull: { animals: { type: 'ferret' } } });
          var total = 0
          ops.on('animals', 'pull', function (v) {
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
        , db = mydb(app, 'localhost/mydb')

      // random col
      var col = db.get('mydb-' + Date.now())

      app.listen(5009, function () {
        var cl = client('http://localhost:5009/mydb');

        db('/', function (conn, expose) {
          expose(col.insert({ numbers: [1, 2, 3, 1] }));
        });

        cl('/', function (doc, ops) {
          expect(doc.numbers).to.eql([1, 2, 3, 1]);
          col.updateById(doc._id, { $pullAll: { numbers: [1, 3] } });
          var total = 0
          ops.on('numbers', 'pull', function (v) {
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
        , db = mydb(app, 'localhost/mydb')

      // random col
      var col = db.get('mydb-' + Date.now())

      app.listen(5010, function () {
        var cl = client('http://localhost:5010/mydb');

        db('/', function (conn, expose) {
          expose(col.insert({ numbers: [1, 2, 3, 4, 5] }));
        });

        cl('/', function (doc, ops) {
          expect(doc.numbers).to.eql([1, 2, 3, 4, 5]);
          col.updateById(doc._id, { $pop: { numbers: 1 } });
          ops.once('numbers', 'pull', function (v) {
            expect(v).to.be(5);
            expect(doc.numbers).to.eql([1, 2, 3, 4]);

            col.updateById(doc._id, { $pop: { numbers: -1 } });
            ops.once('numbers', 'pull', function (v) {
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
        , db = mydb(app, 'localhost/mydb')

      // random col
      var col = db.get('mydb-' + Date.now())

      app.listen(5011, function () {
        var cl = client('http://localhost:5011/mydb');

        db('/', function (conn, expose) {
          expose(col.insert({ a: { b: 'c' } }));
        });

        cl('/', function (doc, ops) {
          expect(doc.a).to.eql({ b: 'c' });
          col.updateById(doc._id, { $rename: { a: 'c' } });
          var unset = false;
          ops.on('a', 'unset', function () {
            unset = true;
          });
          ops.on('c', function (v) {
            expect(unset).to.be(true);
            expect(v).to.eql({ b: 'c' });
            expect(doc.a).to.be(undefined);
            expect(doc.c).to.eql({ b: 'c' });
            done();
          });
        });
      });
    });
  });

  describe('multiple documents over a same socket', function () {
    it('should receive isolated events', function (done) {
      var app = express.createServer()
        , db = mydb(app, 'localhost/mydb')

      // random col
      var col = db.get('mydb-' + Date.now())

      app.listen(11000, function () {
        var cl = client('http://localhost:11000/mydb');

        db('/a', function (conn, expose) {
          expose(col.insert({ multiple: 'a' }));
        });

        db('/b', function (conn, expose) {
          expose(col.insert({ multiple: 'b' }));
        });

        var total = 2;

        cl('/a', function (doc, ops) {
          expect(doc.multiple).to.be('a');
          ops.on('multiple', function (v) {
            expect(v).to.be('aa');
            --total || done();
          });
          col.updateById(doc._id, { $set: { multiple: 'aa' } });
        });

        cl('/b', function (doc, ops) {
          expect(doc.multiple).to.be('b');
          ops.on('multiple', function (v) {
            expect(v).to.be('bb');
            --total || done();
          });
          col.updateById(doc._id, { $set: { multiple: 'bb' } });
        });
      });
    });
  });

});
