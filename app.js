var express = require('express'),
    routes = require('./routes'),
    http = require('http'),
    path = require('path'),
    redisHelper = require('./helpers/redis'),
    brewmanager = require('./brewmanager-redis');

var db = redisHelper.getConnection();
var manager = new brewmanager.BrewManager();

function attachBrewManager(req, res, next) {
  req.manager = manager;
  next();
}

function onlineTracker(req, res, next) {
  db.zadd('online', Date.now(), req.ip, next);
}

var app = express();
app.configure(function() {
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(attachBrewManager);
  app.use(app.router);
  app.use(require('stylus').middleware(__dirname + '/public'));
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function() {
  app.use(express.errorHandler());
});

app.get('/', onlineTracker, routes.index);

var server = http.createServer(app);
server.listen(app.get('port'), function() {
  console.log("Express server listening on port " + app.get('port'));
});

var io = require('socket.io').listen(server);
io.configure(function() {
  io.set('log level', 2);
  // This uses Redis for pubsub as well as storing any client data there
  // rather than in memory. Nice because it then persists across restarts.
  var RedisStore = require('socket.io/lib/stores/redis');
  io.set('store', new RedisStore({
    redis: redisHelper.redis,
    redisPub: redisHelper.getConnection(),
    redisSub: redisHelper.getConnection(),
    redisClient: redisHelper.getConnection()
  }));
});
io.sockets.on('connection', function(socket) {
  manager.getRecentBrews(function(err, brews) {
    app.render('single_brew', {brew: brews[0]}, function(err, html) {
      socket.emit('news', html);
    });
  });
});
