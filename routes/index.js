var async = require('async');

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
  req.manager.deleteBrew(req.params.id, function(err) {
    res.send(204, null);
  });
};

exports.brewAdd = function(req, res) {
  var man = req.manager;
  async.parallel([man.getMakers, man.getPots], function(err, results) {
    res.render('brew-add', {
      'title': 'Add Brew',
      'makers': results[0],
      'pots': results[1]
    });
  });
};

exports.brewAddSubmit = function(req, res) {
  req.assert('maker').notEmpty().isInt();
  req.assert('pot').notEmpty().isInt();

  var errors = req.validationErrors();
  if(errors) {
    res.set('Content-Type', 'text/plain');
    res.send(400, 'Validation failed!\n' + require('util').inspect(errors));
    return;
  }

  var maker = req.sanitize('maker').toInt();
  var pot = req.sanitize('pot').toInt();
  var brew = {
    makerId: maker,
    potId: pot,
    creationIp: req.ip,
    createdAt: Date.now()
  };

  req.manager.addBrew(brew, function(err, brew) {
    res.redirect('/brews/' + brew.id);
  });
}

exports.brews = fourohfour;
