var express = require('express'),
    expressValidator = require('express-validator'),
    routes = require('./routes'),
    http = require('http'),
    path = require('path'),
    redisHelper = require('./helpers/redis'),
    signals = require('./helpers/signals'),
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
app.locals.moment = require('moment');
app.configure(function() {
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(expressValidator);
  app.use(express.methodOverride());
  app.use(attachBrewManager);
  app.use(app.router);
  app.use(require('stylus').middleware(__dirname + '/public'));
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function() {
  app.use(express.errorHandler());
});

// Start defining routes
app.get('/', onlineTracker, routes.recentBrews);
app.get('/makers/:id', onlineTracker, routes.makerDetail);
app.get('/makers', onlineTracker, routes.makers);
app.get('/pots/:id', onlineTracker, routes.potDetail);
app.get('/pots', onlineTracker, routes.pots);
app.get('/brews/add', routes.brewAdd);
app.post('/brews/add', routes.brewAddSubmit);
app.get('/brews/:id', onlineTracker, routes.brewDetail);
app.delete('/brews/:id', routes.brewDelete);
app.get('/brews', onlineTracker, routes.brews);


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

io.sockets.on('connection', function(socket) { });

var ioSub = redisHelper.getConnection();
ioSub.on('message', function(chan, msg) {
  if (chan === 'updateBrew') {
    signals.updateBrew(app, io, manager, msg);
  } else if (chan === 'deleteBrew') {
    signals.deleteBrew(app, io, msg);
  }
});
ioSub.subscribe('updateBrew', 'deleteBrew');
