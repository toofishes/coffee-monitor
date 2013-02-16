var redis = require('redis');

function throwError(err) {
  if (err) {
    throw err;
  }
}

function logError(err) {
  console.log(err);
}

function getConnection() {
  var port = process.env.REDIS_PORT || 6379,
      host = process.env.REDIS_HOST || '127.0.0.1',
      password = process.env.REDIS_PASS,
      dbNumber = process.env.REDIS_DB;
  var db = redis.createClient(port, host);
  db.on('error', logError);

  var callback = throwError;
  if (dbNumber) {
    callback = function() { db.select(dbNumber, throwError); };
  }

  if (password) {
    db.auth(password, callback);
  } else {
    callback();
  }
  return db;
}

exports.redis = redis;
exports.getConnection = getConnection;
