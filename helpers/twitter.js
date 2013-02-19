var moment = require('moment'),
    Twitter = require('twit');

var config = {
  consumer_key: process.env.CONSUMER_KEY || null,
  consumer_secret: process.env.CONSUMER_SECRET || null,
  access_token: process.env.ACCESS_TOKEN || null,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET || null
};

var instance = new Twitter(config);

exports.tweetBrew = function(brew) {
  var niceTime = moment(parseInt(brew.readyAt)).calendar();
  var message = 'Coffee is brewing in ' + brew.potName + '! It will be ready: ' + niceTime;
  instance.post('statuses/update', { status: message }, function(err, reply) {
    if (err) throw err;
  });
}
