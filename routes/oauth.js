var express = require('express');
var router = express.Router();

var passport = require('passport');
var ResourceOwnerPasswordStrategy = require('passport-oauth2-resource-owner-password').Strategy;
var BearerStrategy = require('passport-http-bearer').Strategy;
var oauth2orize = require('oauth2orize');
var uuid = require('node-uuid');

var Models = require('../models');

passport.use(new ResourceOwnerPasswordStrategy(
  function(clientId, clientSecret, username, password, done) {
    var sha = require('crypto').createHash('sha256');
    sha.update(password);

    Models.User.findOne({
      where: {
        username: username,
        password: sha.digest('hex')
      }
    }).then(function(user) {
      if (user === null) {
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

    Models.User.findOne({
      where: {
        username: username,
        password: sha.digest('hex')
      }
    }).then(function(user) {
      if (user.token === null) {
        user.token = uuid.v4();
        user.save();
      }
      return done(null, user.token);
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
    Models.User.findOne({
      where: {
        token: token
      }
    }).then(function(user) {
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
