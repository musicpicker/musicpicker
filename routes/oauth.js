var express = require('express');
var router = express.Router();

var passport = require('passport');
var ResourceOwnerPasswordStrategy = require('passport-oauth2-resource-owner-password').Strategy;
var BearerStrategy = require('passport-http-bearer').Strategy;
var LocalStrategy = require('passport-local').Strategy;
var oauth2orize = require('oauth2orize');
var uuid = require('node-uuid');

var models = require('../models');

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  new models.User({
    Id: id
  }).fetch().then(function(user) {
    return done(null, user);
  }).catch(function(err) {
    return done(null, false);
  });
});

passport.use(new ResourceOwnerPasswordStrategy(
  function(clientId, clientSecret, username, password, done) {
    var sha = require('crypto').createHash('sha256');
    sha.update(password);

    new models.User({
      Username: username,
      Password: sha.digest('hex')
    }).fetch().then(function(user) {
      return done(null, clientId, user);
    }).catch(function(err) {
      return done(null, clientId, false);
    });
  }
));

passport.use(new LocalStrategy(
  function(username, password, done) {
    var sha = require('crypto').createHash('sha256');
    sha.update(password);

    new models.User({
      Username: username,
      Password: sha.digest('hex')
    }).fetch().then(function(user) {
      return done(null, user);
    }).catch(function(err) {
      return done(null, false);
    });
  }
));

var server = oauth2orize.createServer();
server.exchange(oauth2orize.exchange.password(
  function(client, username, password, scope, done) {
    var sha = require('crypto').createHash('sha256');
    sha.update(password);

    new models.User({
      Username: username,
      Password: sha.digest('hex')
    }).fetch().then(function(user) {
      if (user.get('Token') === null) {
        user.set({Token: uuid.v4()});
        user.save().then(function(user) {
          return done(null, user.get('Token'));
        })
      }
      else {
        return done(null, user.get('Token'));
      }
    }).catch(function(err) {
      return done(null, false);
    });
  }
));

router.post('/oauth/token',
  function(req, res, next) {
    req.body['client_id'] = 'API Client'
    next();
  },
  passport.authenticate('oauth2-resource-owner-password', {session: false}),
  server.token(),
  server.errorHandler()
);

router.get('/login', function(req, res) {
  res.render('login');
});

router.post('/login', passport.authenticate('local', { successReturnToOrRedirect: '/', failureRedirect: '/login' }));

passport.use(new BearerStrategy(
  function(token, done) {
    new models.User({
      Token: token
    }).fetch().then(function(user) {
      return done(null, user);
    }).catch(function(err) {
      return done(null, false);
    });
  }
));

module.exports = router;
