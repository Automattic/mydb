
# mydb

  MyDB realtime server.

## Example

```js
var http = require('http').Server();
var mydb = require('mydb-server')(http);
http.listen(3000);
```

  That's all there's to it. Point your
  [mydb-client](http://github.com/learnboost/mydb-client) to it, and 
  hook up MongoDB events through
  [mydb-driver](http://github.com/learnboost/mydb-driver]) or by setting
  up [mydb-slave](http://github.com/learnboost/mydb-slave).

## API

### mydb(server)

  Attaches the mydb server to a `http.Server`.
