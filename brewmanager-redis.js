var redis = require('redis');
var db = redis.createClient();
db.select(6);

BrewManager = function(){};

BrewManager.prototype.getRecentBrews = function(next) {
  db.zrevrange('brews', 0, 5, next);
};

function storePartTwo(err, obj, type, next) {
  // coerce any non-string keys to strings
  Object.keys(obj).forEach(function(key) { obj[key] = "" + obj[key]; });
  db.hmset(type + ':' + obj.id, obj, next);
}

function storeAsHash(obj, type, seqName, next) {
  if (!obj.hasOwnProperty('createdAt') || obj.createdAt === null) {
    obj.createdAt = Date.now();
  }
  if (!obj.hasOwnProperty('id') || obj.id === null) {
    db.incr(seqName, function(err, val) {
      obj.id = val;
      storePartTwo(err, obj, type, next);
    });
  } else {
    storePartTwo(null, obj, type, next);
  }
}

BrewManager.prototype.addMaker = function(maker, next) {
  storeAsHash(maker, 'maker', 'nextMakerId', function(err) {
    db.sadd('makers', maker.id, next);
  });
};

BrewManager.prototype.addPot = function(pot, next) {
  storeAsHash(pot, 'pot', 'nextPotId', function(err) {
    db.sadd('pots', pot.id, next);
  });
};

BrewManager.prototype.addBrew = function(brew, next) {
  storeAsHash(brew, 'brew', 'nextBrewId', function(err) {
    /* TODO: use sorted sets w/ time for brews sets, not regular sets */
    var now = Date.now();
    db.multi()
      .sadd('maker:' + brew.makerId + ':brews', brew.makerId)
      .sadd('pot:' + brew.potId + ':brews', brew.potId)
      .sadd('brews', brew.id)
      .exec();
  });
};

/* now bootstrap some dummy data */
var manager = new BrewManager();
manager.addMaker({'name': 'Sample Coffee Maker', 'brewTime': 270, 'createdAt': 1358213907000},
    function(error, maker){});
manager.addPot({'name': 'Carafe A', 'color': 'green', 'createdAt': 1359213907000},
    function(error, pot){});
manager.addPot({'name': 'Carafe B', 'color': 'red', 'createdAt': 1360213907000},
    function(error, pot){});

/* TODO: first time this is ran, the above commands haven't actually run yet,
 * so we don't have any pots or coffee makers in existence. we need to ensure
 * things are ran callback-style so objects actually exist. */
for (var i = 0; i < 50; i++) {
  brew = {
    'creationIp': '127.0.0.1',
    'createdAt': Date.now() - (24 * 60 * 60 * 1000) + ((i + 1) / (50/24) * 60 * 60 * 1000)
  };
  db.multi()
    .srandmember('makers', function(err, val) { brew.makerId = val; })
    .srandmember('pots', function(err, val) { brew.potId = val; })
    .exec(function(err, replies) {
      console.log("loop exec", brew);
      manager.addBrew(brew, function(error, brew){});
    });
}

exports.BrewManager = BrewManager;
