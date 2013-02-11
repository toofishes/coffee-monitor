exports.recentBrews = function(req, res) {
  req.manager.getRecentBrews(function(error, brews) {
    res.render('index', { 'title': 'Recent Brews', 'brews': brews });
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

exports.brewDetail = fourohfour;

exports.brews = fourohfour;
