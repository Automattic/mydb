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
  [mydb-driver](http://github.com/cloudup/mydb-driver) or by setting
  up [mydb-tail](http://github.com/cloudup/mydb-tail).

  To expose documents with express that you can request with MyDB on the frontend, use [mydb-expose](https://github.com/cloudup/mydb-expose#example).

## API

### mydb(server)

  Attaches the mydb server to a `http.Server`.

## Testing
In order to run the tests
* Start Redis: `redis-server`
* Start MongoDB: `mongod`
* Run the tests: `make test`

## License

MIT
