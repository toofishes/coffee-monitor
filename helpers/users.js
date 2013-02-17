var LocalStrategy = require('passport-local').Strategy;

var users = [
  { username: 'testuser', password: 'testpass' }
];

function findByUsername(username, next) {
  for (var i = 0, len = users.length; i < len; i++) {
    if (users[i].username === username) {
      return next(null, users[i]);
    }
  }
  return next(null, null);
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

exports.verifyUser = verifyUser;
exports.strategy = new LocalStrategy(verifyUser);
