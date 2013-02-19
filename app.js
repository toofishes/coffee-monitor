var express = require('express'),
    routes = require('./routes'),
    http = require('http'),
    passport = require('passport'),
    path = require('path'),
    brewHelper = require('./helpers/brews'),
    redisHelper = require('./helpers/redis'),
    signals = require('./helpers/signals'),
    userHelper = require('./helpers/users');

var db = redisHelper.getConnection();
var manager = new brewHelper.BrewManager(db);
userHelper.setupPassport(passport);

function attachBrewManager(req, res, next) {
  req.manager = manager;
  next();
}

function onlineTracker(req, res, next) {
  db.zadd('online', Date.now(), req.ip, next);
}

function compressFilter(req, res) {
  return (/json|text|javascript|svg\+xml/).test(res.getHeader('Content-Type'));
}

var app = express();
app.locals.moment = require('moment');
app.configure(function() {
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon(__dirname + '/public/favicon.ico',
          { maxAge: 365 * 24 * 60 * 60 * 1000 }));
  app.use(express.logger('dev'));
  app.use(express.compress({ filter: compressFilter }));
  app.use(express.bodyParser());
  app.use(require('express-validator'));
  var secret = process.env.COOKIE_SECRET || 'samplesecretcookie';
  app.use(express.cookieParser(secret));
  secret = process.env.SESSION_SECRET || 'samplesecretsession';
  var RedisStore = require('connect-redis')(express);
  var store = new RedisStore({ client: db });
  app.use(express.session({ secret: secret, store: store }));
  app.use(passport.initialize());
  app.use(passport.session());
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

app.get('/makers/add', routes.makerAdd);
app.post('/makers/add', routes.makerAddSubmit);
app.get('/makers/:id', onlineTracker, routes.makerDetail);
app.delete('/makers/:id', routes.makerDelete);
app.get('/makers', onlineTracker, routes.makers);

app.get('/pots/add', routes.potAdd);
app.post('/pots/add', routes.potAddSubmit);
app.get('/pots/:id', onlineTracker, routes.potDetail);
app.delete('/pots/:id', routes.potDelete);
app.get('/pots', onlineTracker, routes.pots);

app.get('/brews/add', routes.brewAdd);
app.post('/brews/add', routes.brewAddSubmit);
app.get('/brews/:id', onlineTracker, routes.brewDetail);
app.delete('/brews/:id', routes.brewDelete);
app.get('/brews', onlineTracker, routes.brews);

app.get('/tea', onlineTracker, routes.teapot);

// Authentication
app.get('/login', onlineTracker, routes.login);
app.post('/login', routes.loginSubmit);
app.get('/logout', routes.logout);

var server = http.createServer(app);
server.listen(app.get('port'), function() {
  console.log("Express server listening on port " + app.get('port'));
});

var io = require('socket.io').listen(server);
io.configure(function() {
  io.set('log level', 1);
  io.set('browser client etag', true);
  io.set('browser client gzip', true);
  io.set('browser client minification', true);
  // This uses Redis for pubsub as well as storing any client data there
  // rather than in memory. Nice because it then persists across restarts.
  var RedisStore = require('socket.io/lib/stores/redis');
  io.set('store', new RedisStore({
    redis: redisHelper.redis,
    redisPub: redisHelper.getConnection(),
    redisSub: redisHelper.getConnection(),
    redisClient: db
  }));
});

io.sockets.on('connection', function(socket) {
  signals.recentBrews(app, socket, manager);
  socket.on('recentBrews', function() {
    signals.recentBrews(app, socket, manager);
  });
});

var ioSub = redisHelper.getConnection();
ioSub.on('message', function(chan, msg) {
  if (chan === 'updateBrew') {
    signals.updateBrew(app, io, manager, msg);
  } else if (chan === 'deleteBrew') {
    signals.deleteBrew(io, msg);
  }
});
ioSub.subscribe('updateBrew', 'deleteBrew');
