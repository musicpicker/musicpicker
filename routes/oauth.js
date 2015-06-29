var express = require('express');
var router = express.Router();

var passport = require('passport');
var ResourceOwnerPasswordStrategy = require('passport-oauth2-resource-owner-password').Strategy;
var BearerStrategy = require('passport-http-bearer').Strategy;
var oauth2orize = require('oauth2orize');
var uuid = require('node-uuid');

var models = require('../models');

passport.use(new ResourceOwnerPasswordStrategy(
  function(clientId, clientSecret, username, password, done) {
    var sha = require('crypto').createHash('sha256');
    sha.update(password);

    models.User.findOne({
      Username: username,
      Password: sha.digest('hex')
    }, function(err, user) {
      if (err) {
        return done(null, clientId, false);
      }
      else {
        return done(null, clientId, user);
      }
    });
  }
));

var server = oauth2orize.createServer();
server.exchange(oauth2orize.exchange.password(
  function(client, username, password, scope, done) {
    var sha = require('crypto').createHash('sha256');
    sha.update(password);

    models.User.findOne({
      Username: username,
      Password: sha.digest('hex')
    }, function(err, user) {
      if (err) {
        return done(null, false);
      }
      else {
        console.log(user);
        if (user.Token === undefined) {
          var token = uuid.v4();
          models.User.findOneAndUpdate({_id: user._id}, {Token: token}, {new: true},
            function(err, user) {
              return done(null, user.Token);
            }
          );
        }
        else {
          return done(null, user.Token);
        }
      }
    });
  }
));

router.post('/token',
  function(req, res, next) {
    req.body['client_id'] = 'API Client'
    next();
  },
  passport.authenticate(['oauth2-resource-owner-password'], {session: false}),
  server.token(),
  server.errorHandler()
);

passport.use(new BearerStrategy(
  function(token, done) {
    models.User.findOne({
      Token: token
    }, function(err, user) {
      if (user !== null) {
        return done(null, user);
      }
      else {
        return done(null, false);
      }
    });
  }
));

module.exports = router;
