var async = require('async'),
    redisHelper = require('./helpers/redis');

var db = redisHelper.getConnection();

BrewManager = function(){};

BrewManager.prototype.getRecentBrews = function(next) {
  // first, get IDs of most recent brews- 8 hour cutoff
  var cutoff = Date.now() - (8 * 60 * 60 * 1000);
  db.zrevrangebyscore('brews', '+inf', cutoff, function(err, brewIds) {
    // with those IDs, retrieve the objects themselves as a list of maps
    var m = db.multi();
    brewIds.forEach(function(id, idx) {
      m.hgetall('brew:' + id);
    });
    m.exec(next);
  });
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

BrewManager.prototype.getMakers = function(next) {
  db.smembers('makers', function(err, ids) {
    var m = db.multi();
    ids.forEach(function(id, idx) {
      m.hgetall('maker:' + id);
    });
    m.exec(next);
  });
};

BrewManager.prototype.addMaker = function(maker, next) {
  storeAsHash(maker, 'maker', 'nextMakerId', function(err) {
    db.sadd('makers', maker.id, next);
  });
};

BrewManager.prototype.getPots = function(next) {
  db.smembers('pots', function(err, ids) {
    var m = db.multi();
    ids.forEach(function(id, idx) {
      m.hgetall('pot:' + id);
    });
    m.exec(next);
  });
};

BrewManager.prototype.addPot = function(pot, next) {
  storeAsHash(pot, 'pot', 'nextPotId', function(err) {
    db.sadd('pots', pot.id, next);
  });
};

BrewManager.prototype.getBrew = function(id, next) {
  db.hgetall('brew:' + id, next);
};

BrewManager.prototype.addBrew = function(brew, next) {
  async.waterfall([
      function(next) {
        db.multi()
          .hmget('maker:' + brew.makerId, 'name', 'brewTime')
          .hmget('pot:' + brew.potId, 'name', 'color')
          .exec(next);
      },
      function(results, next) {
        brew.makerName = results[0][0];
        brew.brewTime = results[0][1];
        brew.potName = results[1][0];
        brew.potColor = results[1][1];
        next(null, brew);
      },
      function(brew, next) {
        storeAsHash(brew, 'brew', 'nextBrewId', next);
      },
      function(result, next) {
        var now = brew.createdAt;
        var ready = parseInt(now, 10) + (1000 * parseInt(brew.brewTime, 10));
        db.multi()
          .hset('brew:' + brew.id, 'readyAt', ready)
          .zadd('maker:' + brew.makerId + ':brews', now, brew.id)
          .zadd('pot:' + brew.potId + ':brews', now, brew.id)
          .zadd('brews', now, brew.id)
          .publish('updateBrew', brew.id)
          .exec(next);
      }
  ], function(err, results) {
    next(null, brew);
  });
};

BrewManager.prototype.deleteBrew = function(id, next) {
  this.getBrew(id, function(err, brew) {
    if(!brew) {
      next(null);
    } else {
      db.multi()
      .del('brew:' + id)
      .zrem('maker:' + brew.makerId + ':brews', brew.id)
      .zrem('pot:' + brew.potId + ':brews', brew.id)
      .zrem('brews', id)
      .publish('deleteBrew', id)
      .exec(next);
    }
  });
};

exports.BrewManager = BrewManager;

exports.createDummyBrewData = function() {
  var manager = new BrewManager();

  function createBrews(howmany) {
    for (var i = 0; i < howmany; i++) {
      (function(i) {
        var brew = {
          creationIp: '127.0.0.1',
          createdAt: Date.now() - (24 * 60 * 60 * 1000) + ((i + 1) / (50/24) * 60 * 60 * 1000)
        };
        db.multi()
        .srandmember('makers', function(err, val) { brew.makerId = val; })
        .srandmember('pots', function(err, val) { brew.potId = val; })
        .exec(function(err, replies) {
          manager.addBrew(brew, function(error, brew){});
        });
      })(i);
    }
  }

  async.parallel([
    function(next) {
      manager.addMaker({'name': 'Sample Coffee Maker', 'brewTime': 270, 'createdAt': 1358213907000}, next);
    },
    function(next) {
      manager.addPot({'name': 'Carafe A', 'color': 'green', 'createdAt': 1359213907000}, next);
    },
    function(next) {
      manager.addPot({'name': 'Carafe B', 'color': 'red', 'createdAt': 1360213907000}, next);
    }
  ], function(err) {
    createBrews(50);
  });
};
