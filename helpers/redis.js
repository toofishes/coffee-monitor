var redis = require('redis');

function getConnection() {
  var db = redis.createClient();
  db.select(6, function (err) { if (err) throw err; });
  return db;
}

exports.redis = redis;
exports.getConnection = getConnection;
