var async = require('async');

var BrewManager = function(db) { this.db = db; };
BrewManager.prototype = { db: null };

BrewManager.prototype.getRecentBrews = function(next) {
  var self = this;
  // first, get IDs of most recent brews- 8 hour cutoff
  var cutoff = Date.now() - (8 * 60 * 60 * 1000);
  self.db.zrevrangebyscore('brews', '+inf', cutoff, function(err, brewIds) {
    // with those IDs, retrieve the objects themselves as a list of maps
    var m = self.db.multi();
    brewIds.forEach(function(id, idx) {
      m.hgetall('brew:' + id);
    });
    m.exec(next);
  });
};

function storePartTwo(err, db, obj, type, next) {
  // coerce any non-string keys to strings
  Object.keys(obj).forEach(function(key) { obj[key] = "" + obj[key]; });
  db.hmset(type + ':' + obj.id, obj, next);
}

function storeAsHash(db, obj, type, seqName, next) {
  if (!obj.hasOwnProperty('createdAt') || obj.createdAt === null) {
    obj.createdAt = Date.now();
  }
  if (!obj.hasOwnProperty('id') || obj.id === null) {
    db.incr(seqName, function(err, val) {
      obj.id = val;
      storePartTwo(err, db, obj, type, next);
    });
  } else {
    storePartTwo(null, db, obj, type, next);
  }
}

BrewManager.prototype.getMakers = function(next) {
  var self = this;
  self.db.smembers('makers', function(err, ids) {
    var m = self.db.multi();
    ids.forEach(function(id, idx) {
      m.hgetall('maker:' + id);
    });
    m.exec(next);
  });
};

BrewManager.prototype.addMaker = function(maker, next) {
  var self = this;
  async.waterfall([
      function(next) {
        storeAsHash(self.db, maker, 'maker', 'nextMakerId', next);
      },
      function(result, next) {
        self.db.sadd('makers', maker.id, next);
      }
  ], function(err, results) {
    next(err, maker);
  });
};

BrewManager.prototype.deleteMaker = function(id, next) {
  this.db.multi()
    .srem('makers', id)
    .hset('makers:' + id, 'active', 0)
    .exec(next);
};

BrewManager.prototype.getPots = function(next) {
  var self = this;
  self.db.smembers('pots', function(err, ids) {
    var m = self.db.multi();
    ids.forEach(function(id, idx) {
      m.hgetall('pot:' + id);
    });
    m.exec(next);
  });
};

BrewManager.prototype.addPot = function(pot, next) {
  var self = this;
  async.waterfall([
      function(next) {
        storeAsHash(self.db, pot, 'pot', 'nextPotId', next);
      },
      function(result, next) {
        self.db.sadd('pots', pot.id, next);
      }
  ], function(err, results) {
    next(err, pot);
  });
};

BrewManager.prototype.deletePot = function(id, next) {
  this.db.multi()
    .srem('pots', id)
    .hset('pots:' + id, 'active', 0)
    .exec(next);
};

BrewManager.prototype.getBrew = function(id, next) {
  this.db.hgetall('brew:' + id, next);
};

function int10(val) {
  return parseInt(val, 10);
}

BrewManager.prototype.addBrew = function(brew, next) {
  var self = this;
  async.waterfall([
      function(next) {
        self.db.multi()
          .hmget('maker:' + brew.makerId, 'name', 'brewTime', 'readyAt')
          .hmget('pot:' + brew.potId, 'name', 'color', 'readyAt')
          .exec(next);
      },
      function(results, next) {
        // check preconditions first: we must be > readyAt time for this brew
        // to even make sense, otherwise someone is spoofing us
        var now = Date.now();
        var makerReady = results[0][2] || 0;
        var potReady = results[1][2] || 0;
        if (process.env.NODE_ENV === 'production' && (makerReady > now || potReady > now)) {
          next("Not enough time elapsed for brew to make sense!");
          return;
        }
        brew.makerName = results[0][0];
        brew.brewTime = results[0][1];
        brew.potName = results[1][0];
        brew.potColor = results[1][1];

        // base our created and ready times off what was passed in; only one of
        // them is required in order to proceed as we can calculate the other
        if (!brew.createdAt) {
          if (!brew.readyAt) {
            brew.createdAt = now;
          } else {
            brew.createdAt = brew.readyAt - (1000 * int10(brew.brewTime));
          }
        }
        if (!brew.readyAt) {
          var ready = int10(brew.createdAt) + (1000 * int10(brew.brewTime));
          brew.readyAt = ready;
        }

        next(null, brew);
      },
      function(brew, next) {
        storeAsHash(self.db, brew, 'brew', 'nextBrewId', next);
      },
      function(result, next) {
        var now = brew.createdAt;
        var ready = brew.readyAt;
        self.db.multi()
          .zadd('maker:' + brew.makerId + ':brews', now, brew.id)
          .zadd('pot:' + brew.potId + ':brews', now, brew.id)
          .hmset('maker:' + brew.makerId, 'lastBrew', now,
              'readyAt', ready)
          .hmset('pot:' + brew.potId, 'lastBrew', now,
              'readyAt', ready)
          .zadd('brews', now, brew.id)
          .publish('updateBrew', brew.id)
          .exec(next);
      }
  ], function(err, results) {
    next(err, brew);
  });
};

BrewManager.prototype.deleteBrew = function(id, next) {
  var self = this;
  self.getBrew(id, function(err, brew) {
    if(!brew) {
      next(null);
    } else {
      self.db.multi()
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

exports.createDummyBrewData = function(db) {
  var manager = new BrewManager(db);

  function createBrews(howmany) {
    for (var i = 0; i < howmany; i++) {
      (function(i) {
        var brew = {
          creationIp: '127.0.0.1',
          createdAt: Date.now() - (24 * 60 * 60 * 1000) + ((i + 1) / (50/24) * 60 * 60 * 1000)
        };
        manager.db.multi()
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
