
# mydb

MyDB allows you to easily expose MongoDB documents to clients with
to realtime events / synchronization.

## A quick example

**server.js (Node.JS)**

```js
var express = require('express')
  , app = express.createServer()
  , mydb = require('mydb.io')(app)

// colors collection
var colors = mydb.get('colors')
colors.index('sid');

// demo database
mydb('/demo', function (conn, expose) {
  expose(colors.findAndModify({ sid: conn.sid }, {}, { upsert: true }));
});

app.use(express.bodyParser());

// regular route
app.get('/', function (req, res, next) {
  res.send('index.html');
});

app.post('/add-color', function (req, res, next) {
  colors.updateById(req.body._id, { colors: { $push: req.body.title } });
  res.send(200);
});
```

**index.html (Browser)**

```html
<!doctype html>
<title>Colors app</title>
<script src="/socket.io/socket.io.js"></script>
<script src="/superagent.js"></script>
<script src="/mydb.js"></script>
<script>
function add (color, bg) {
  var li = document.createElement('li');
  li.style.backgroundColor = bg;
  return li;
}
mydb('/demo', function (doc, ops) {
  doc.colors.forEach(function (color) {
    add(color, 'gray');
  });
  ops.on('colors', 'push', function () {
    add(color, 'yellow');
  });
  document.getElementById('test').onclick = function () {
    request.post('/add-color', {
        title: prompt('What color do you want to add?')
      , _id: doc._id
    });
    return false;
  }
});
</script>
<ul id="colors"></ul>
<a href="#" id="test">Add color</a>
```
