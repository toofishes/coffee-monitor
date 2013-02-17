var bcrypt = require('bcrypt');

var redisHelper = require('./redis');
var db = redisHelper.getConnection();

function findByUsername(username, next) {
  db.hget('users', username, function(err, hashedpw) {
    if (hashedpw != null) {
      return next(null, { username: username, hashedpw: hashedpw });
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

exports.findByUsername = findByUsername;
exports.verifyUser = verifyUser;
var LocalStrategy = require('passport-local').Strategy;
exports.strategy = new LocalStrategy(verifyUser);
