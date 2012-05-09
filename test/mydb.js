
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
  });

});
