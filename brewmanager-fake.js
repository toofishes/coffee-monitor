var nextMakerId = 1,
    nextPotId = 1,
    nextBrewId = 1;

BrewManager = function(){};
BrewManager.prototype.makers = [];
BrewManager.prototype.pots = [];
BrewManager.prototype.brews = [];

BrewManager.prototype.getRecentBrews = function(next) {
  var recent = this.brews.slice(-5).reverse();
  process.nextTick(function() {
    next(null, recent);
  });
};

function setBasicFields(obj, idSeq) {
  if (!obj.hasOwnProperty('id') || obj.id === null) {
    obj.id = idSeq++;
  }
  if (!obj.hasOwnProperty('createdAt') || obj.createdAt === null) {
    obj.createdAt = Date.now();
  }
  return obj;
}

BrewManager.prototype.addMaker = function(maker, next) {
  setBasicFields(maker, nextMakerId);
  this.makers.push(maker);
  next(null, maker);
};

BrewManager.prototype.addPot = function(pot, next) {
  setBasicFields(pot, nextPotId);
  this.pots.push(pot);
  next(null, pot);
};

BrewManager.prototype.addBrew = function(brew, next) {
  setBasicFields(brew, nextBrewId);
  this.brews.push(brew);
  next(null, brew);
};

/* now bootstrap some dummy data */
var manager = new BrewManager();
manager.addMaker({'name': 'Sample Coffee Maker', 'brewTime': 270, 'createdAt': 1358213907000},
    function(error, maker){});
manager.addPot({'name': 'Carafe A', 'color': 'green', 'createdAt': 1359213907000},
    function(error, pot){});
manager.addPot({'name': 'Carafe B', 'color': 'red', 'createdAt': 1360213907000},
    function(error, pot){});
for (var i = 0; i < 50; i++) {
  manager.addBrew({
    'makerId': manager.makers[0]['id'],
    'potId': manager.pots[i % 2]['id'],
    'creationIp': '127.0.0.1',
    'createdAt': Date.now() - (24 * 60 * 60 * 1000) + ((i + 1) / (50/24) * 60 * 60 * 1000)
  }, function(error, brew){});
}

exports.BrewManager = BrewManager;
