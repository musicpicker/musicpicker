var express = require('express');
var router = express.Router();

var passport = require('passport');
var ResourceOwnerPasswordStrategy = require('passport-oauth2-resource-owner-password').Strategy;
var BearerStrategy = require('passport-http-bearer').Strategy;
var LocalStrategy = require('passport-local').Strategy;
var oauth2orize = require('oauth2orize');
var uid = require('uid-safe')
var extract = require('url-querystring');

var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;

var models = require('../models');
var statsd = require('../statsd').middleware;

var server = oauth2orize.createServer();

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

server.serializeClient(function(client, done) {
  return done(null, client.client_id);
});

server.deserializeClient(function(client_id, done) {
  new models.OauthApp({
    client_id: client_id
  }).fetch({require: true}).then(function(client) {
    return done(null, client);
  }).catch(function() {
    return done(null, false);
  })
});

passport.use(new ResourceOwnerPasswordStrategy(
  function(clientId, clientSecret, username, password, done) {
    var sha = require('crypto').createHash('sha256');
    sha.update(password);

    if (clientId === 'legacy') {
      var client = {client_id: 'legacy'}
      new models.User({
        Username: username,
        Password: sha.digest('hex')
      }).fetch({require: true}).then(function(user) {
        return done(null, client, user);
      }).catch(function(err) {
        return done(null, client, false);
      });
    }
    else {
      new models.OauthApp({
        client_id: clientId
      }).fetch({require: true}).then(function(client) {
        new models.User({
          Username: username,
          Password: sha.digest('hex')
        }).fetch({require: true}).then(function(user) {
          return done(null, client, user);
        }).catch(function(err) {
          return done(null, client, false);
        });
      }).catch(function() {
        return done(null, false);
      })
    }
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

server.exchange(oauth2orize.exchange.password(
  function(client, username, password, scope, done) {
    var sha = require('crypto').createHash('sha256');
    sha.update(password);

    if (client.client_id === 'legacy') {
      new models.User({
        Username: username,
        Password: sha.digest('hex')
      }).fetch({require: true}).then(function(user) {
        if (user.get('Token') === null) {
          uid(42).then(function(token) {
            user.set({Token: token});
            user.save().then(function(user) {
              return done(null, user.get('Token'));
            });
          });
        }
        else {
          return done(null, user.get('Token'));
        }
      }).catch(function(err) {
        return done(null, false);
      });
    }

    else {
      new models.User({
        Username: username,
        Password: sha.digest('hex')
      }).fetch({require: true}).then(function(user) {
        new models.OauthToken({
          user: user.id,
          client: client.id
        }).fetch().then(function(token) {
          if (token !== null) {
            return done(null, token.get('token'));
          }
          else {
            uid(42).then(function(token) {
              new models.OauthToken({
                token: token,
                user: user.id,
                client: client.id
              }).save().then(function(token) {
                return done(null, token.get('token'));
              });
            });
          }
        });
      }).catch(function(err) {
        return done(null, false);
      });
    }
  }
));

router.post('/token', statsd('oauth-token'),
  function(req, res, next) {
    if (req.body.client_id === undefined) {
      req.body.client_id = 'legacy';
    }
    next();
  },
  passport.authenticate('oauth2-resource-owner-password', {session: false}),
  server.token(),
  server.errorHandler()
);

server.grant(oauth2orize.grant.token(function(client, user, ares, done) {
  new models.OauthToken({
    user: user.id,
    client: client.id
  }).fetch().then(function(token) {
    if (token !== null) {
      return done(null, token.get('token'));
    }
    else {
      uid(42).then(function(token) {
        new models.OauthToken({
          token: token,
          user: user.id,
          client: client.id
        }).save().then(function(token) {
          return done(null, token.get('token'));
        });
      });
    }
  });
}));

router.get('/authorize', statsd('oauth-authorize'),
  ensureLoggedIn('/login'),
  server.authorization(function(clientID, redirectURI, done) {
    new models.OauthApp({
      client_id: clientID,
    }).fetch({require: true}).then(function(client) {
      if (redirectURI === undefined) {
        redirectURI = client.get('redirect_uri');
      }
      else {
        if (extract(redirectURI).url !== client.get('redirect_uri')) {
          return done(null, false);
        }
      }
      done(null, client, redirectURI);
    }).catch(function() {
      return done(null, false);
    });
  }, function (client, user, done) {
    done(null, client, user);
  })
);

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
