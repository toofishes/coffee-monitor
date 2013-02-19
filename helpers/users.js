var bcrypt = require('bcrypt');

var redisHelper = require('./redis');
var db = redisHelper.getConnection();

function findByUsername(username, next) {
  db.hget('users', username, function(err, hashedpw) {
    if (hashedpw != null) {
      var user = {
        username: username,
        hashedpw: hashedpw,
        admin: false
      };
      return next(null, user);
    }
    return next(null, null);
  });
}

function verifyUser(username, password, next) {
  findByUsername(username, function(err, user) {
    if (err) { return next(err); }
    if (!user) {
      return next(null, false,
        { message: 'Unknown user: ' + username });
    }
    bcrypt.compare(password, user.hashedpw, function(err, res) {
      if (err) { return next(err); }
      if (res === false) {
        return next(null, false,
          { message: 'Invalid password.' });
      }
      return next(null, user);
    });
  });
}

function createUser(username, password, next) {
  bcrypt.hash(password, 11, function(err, hashedpw) {
    if (err) { return next(err); }
    db.hset('users', username, hashedpw, function(err) {
      next(err);
    });
  });
}

function setupPassport(passport) {
  passport.serializeUser(function(user, next) {
    next(null, user.username);
  });

  passport.deserializeUser(function(username, next) {
    findByUsername(username, next);
  });

  var LocalStrategy = require('passport-local').Strategy;
  var strategy = new LocalStrategy(verifyUser);
  passport.use(strategy);
}

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  // save desired URL for later redirect
  req.session.redirect = req.url;
  return res.redirect("/login");
}

function ensureAdmin(req, res, next) {
  ensureAuthenticated(req, res, function(req, res, next) {
    if(!req.user.admin) {
      res.set('Content-Type', 'text/plain');
      res.send(403, 'You can\'t do that!');
    }
    return next();
  });
}

exports.verifyUser = verifyUser;
exports.createUser = createUser;
exports.setupPassport = setupPassport;
exports.ensureAuthenticated = ensureAuthenticated;
exports.ensureAdmin = ensureAdmin;
