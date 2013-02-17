var LocalStrategy = require('passport-local').Strategy;

var redisHelper = require('./redis');
var db = redisHelper.getConnection();

function findByUsername(username, next) {
  db.hget('users', username, function(err, password) {
    if (password != null) {
      return next(null, { username: username, password: password });
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
    if (user.password !== password) {
      return next(null, false,
        { message: 'Invalid password.' });
    }
    return next(null, user);
  });
}

exports.findByUsername = findByUsername;
exports.verifyUser = verifyUser;
exports.strategy = new LocalStrategy(verifyUser);
