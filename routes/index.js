exports.recentBrews = function(req, res) {
  req.manager.getRecentBrews(function(error, brews) {
    res.render('recent-brews', { 'title': 'Recent Brews', 'brews': brews });
  });
};

function fourohfour(req, res) {
  res.set('Content-Type', 'text/plain');
  res.send(404, 'Not implemented yet');
};

exports.makerDetail = fourohfour;

exports.makers = fourohfour;

exports.potDetail = fourohfour;

exports.pots = fourohfour;

exports.brewDetail = function(req, res) {
  req.manager.getBrew(req.params.id, function(error, brew) {
    if(!brew) {
      res.set('Content-Type', 'text/plain');
      res.send(404, 'Brew not found');
    } else {
      res.render('brew-detail', { 'title': 'Brew ' + req.params.id, 'brew': brew });
    }
  });
};

exports.brewDelete = function(req, res) {
  req.manager.removeBrew(req.params.id, function(err) {
    res.send(204, null);
  });
};

exports.brewAdd = fourohfour;

exports.brews = fourohfour;
