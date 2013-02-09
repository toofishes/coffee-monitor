exports.index = function(req, res) {
  req.manager.getRecentBrews(function(error, brews) {
    res.render('index', { 'title': 'Recent Brews', 'brews': brews });
  });
};
