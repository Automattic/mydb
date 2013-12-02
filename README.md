# mydb

  MyDB realtime server.

## Example

```js
var http = require('http').Server();
var mydb = require('mydb')(http);
http.listen(3000);
```

  That's all there's to it. Point your
  [mydb-client](http://github.com/cloudup/mydb-client) to it, and 
  hook up MongoDB events through
  [mydb-driver](http://github.com/cloudup/mydb-driver]) or by setting
  up [mydb-tail](http://github.com/cloudup/mydb-tail).

## API

### mydb(server)

  Attaches the mydb server to a `http.Server`.
