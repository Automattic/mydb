
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

  it('initializing mydb', function (done) {
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
          col.updateById(doc._id, { $set: { nice: 'try' } });
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
            expect(v.items).to.be.an('array');
            expect(v.items[0]).to.be('try');

            col.updateById(doc._id, { $push: { items: 'try 2' } });
            ops.once('items', 'push', function (v) {
              expect(v.items[1]).to.be('try');
              done();
            });
          });
        });
      });
    });
  });

});
