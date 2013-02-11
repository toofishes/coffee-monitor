exports.updateBrew = function(app, io, manager, brewId) {
  // TODO: there has to be a better way of getting all this darn state
  // and global stuff into here.
  manager.getBrew(brewId, function(error, brew) {
    app.render('includes/brew-single', {brew: brew}, function(err, html) {
      io.sockets.emit('updateBrew', html);
    });
  });
};

exports.deleteBrew = function(app, io, brewId) {
  io.sockets.emit('deleteBrew', brewId);
};
