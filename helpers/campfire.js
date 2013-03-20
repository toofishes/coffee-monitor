var campfire = require('campfire'),
    moment = require('moment');

var config = {
  account: process.env.CAMPFIRE_ACCOUNT || null,
  token: process.env.CAMPFIRE_TOKEN || null,
  ssl: true,
  room: process.env.CAMPFIRE_ROOM || null
};

var instance = null;
if (config.account && config.token && config.room) {
  instance = new campfire.Campfire(config);
}

exports.postBrew = function(brew, next) {
  console.log("Campfire postBrew method called", instance, brew);
  if (!instance) {
    next(null);
    return;
  }
  instance.room(config.room, function(err, room) {
    console.log("Got campfire room for instance", err, room);
    if (err) {
      next(err);
      return;
    }
    var niceTime = moment(parseInt(brew.readyAt)).calendar();
    room.speak('Coffee is brewing in ' + brew.potName + '! It will be ready: ' + niceTime,
      function(err, msg) {
        console.log("Message sent to campfire?", err, msg);
        if (err) {
          next(err);
          return;
        }
        next(null);
      });
  });
};
