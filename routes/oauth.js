var express = require('express');
var router = express.Router();

var config = require('config');
var redis = require('then-redis').createClient(config.get('redis'));

var passport = require('passport');
var ResourceOwnerPasswordStrategy = require('passport-oauth2-resource-owner-password').Strategy;
var BearerStrategy = require('passport-http-bearer').Strategy;
var LocalStrategy = require('passport-local').Strategy;
var BasicStrategy = require('passport-http').BasicStrategy;

var oauth2orize = require('oauth2orize');
var uid = require('uid-safe')
var extract = require('url-querystring');

var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;
var Promise = require('bluebird');

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
  return done(null, client.get('client_id'));
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

passport.use(new BasicStrategy(
  function (client_id, client_secret, done) {
    new models.OauthApp({
      client_id: client_id,
      client_secret: client_secret
    }).fetch({require: true}).then(function(client) {
      return done(null, client);
    }).catch(function() {
      return done(null, false);
    })
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
      if (!client.get('enable_grant_password')) {
        return done(new Error('Grant type password is disabled for application ' + client.get('name')));
      }
      else {
        new models.User({
          Username: username,
          Password: sha.digest('hex')
        }).fetch({require: true}).then(function(user) {
          new models.OauthToken({
            user_id: user.id,
            client_id: client.id
          }).fetch().then(function(token) {
            if (token !== null) {
              return done(null, token.get('token'));
            }
            else {
              uid(42).then(function(token) {
                new models.OauthToken({
                  token: token,
                  user_id: user.id,
                  client_id: client.id
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
  }
));

router.post('/token', statsd('oauth-token'),
  function(req, res, next) {
    if (req.body.client_id === undefined) {
      req.body.client_id = 'legacy';
    }
    next();
  },
  passport.authenticate(['basic', 'oauth2-resource-owner-password'], {session: false}),
  server.token(),
  server.errorHandler()
);

server.grant(oauth2orize.grant.code(function(client, redirectURI, user, ares, done) {
  if (redirectURI === undefined) {
    redirectURI = client.get('redirect_uri');
  }

  uid(16).then(function(code) {
    Promise.all([
      redis.set('musicpicker.oauth.' + client.id + '.' + code + '.user', user.id),
      redis.expire('musicpicker.oauth.' + client.id + '.' + code + '.user', 60),
      redis.set('musicpicker.oauth.' + client.id + '.' + code + '.redirect', redirectURI),
      redis.expire('musicpicker.oauth.' + client.id + '.' + code + '.redirect', 60)
    ]).then(function() {
      return done(null, code);
    }).catch(function(err) {
      return done(err);
    });
  })
}));

server.exchange(oauth2orize.exchange.code(function(client, code, redirectURI, done) {
  if (redirectURI === undefined) {
    redirectURI = client.get('redirect_uri');
  }

  Promise.props({
    userId: redis.get('musicpicker.oauth.' + client.id + '.' + code + '.user'),
    storedRedirect: redis.get('musicpicker.oauth.' + client.id + '.' + code + '.redirect')
  }).then(function(props) {
    Promise.all([
      redis.del('musicpicker.oauth.' + client.id + '.' + code + '.user'),
      redis.del('musicpicker.oauth.' + client.id + '.' + code + '.redirect')
    ]).then(function() {
      if (props.userId === null || redirectURI !== props.storedRedirect) {
        return done(null, false);
      }
      else {
        new models.OauthToken({
          user_id: props.userId,
          client_id: client.id
        }).fetch().then(function(token) {
          if (token !== null) {
            return done(null, token.get('token'));
          }
          else {
            uid(42).then(function(token) {
              new models.OauthToken({
                token: token,
                user_id: props.userId,
                client_id: client.id
              }).save().then(function(token) {
                return done(null, token.get('token'));
              });
            });
          }
        });
      }
    });
  });
}));

server.grant(oauth2orize.grant.token(function(client, user, ares, done) {
  if (!client.get('enable_grant_token')) {
    return done(new Error('Grant type token is disabled for application ' + client.get('name')));
  }
  else {
    new models.OauthToken({
      user_id: user.id,
      client_id: client.id
    }).fetch().then(function(token) {
      if (token !== null) {
        return done(null, token.get('token'));
      }
      else {
        uid(42).then(function(token) {
          new models.OauthToken({
            token: token,
            user_id: user.id,
            client_id: client.id
          }).save().then(function(token) {
            return done(null, token.get('token'));
          });
        });
      }
    });
  }
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
    new models.OauthToken({
      client_id: client.id,
      user_id: user.id
    }).fetch({require: true}).then(function() {
      return done(null, client, user);
    }).catch(function() {
      return done(null, false);
    });
  }),
  function(req, res) {
    res.render('authorize', {
      transactionID: req.oauth2.transactionID,
      user: req.user, client: req.oauth2.client,
      client_name: req.oauth2.client.get('name'),
      client_description: req.oauth2.client.get('description')
    });
  }
);

router.post('/authorize/decision', statsd('oauth-decision'),
  ensureLoggedIn('/login'),
  server.decision()
);

passport.use(new BearerStrategy(
  function(token, done) {
    new models.User({
      Token: token
    }).fetch().then(function(user) {
      if (user !== null) {
        return done(null, user);
      }
      else {
        new models.OauthToken({
          token: token
        }).fetch({require: true, withRelated: ['client', 'user']}).then(function(token) {
          return done(null, token.related('user'), {client: token.related('client')});
        }).catch(function() {
          return done(null, false);
        });
      }
    }).catch(function(err) {
      return done(err);
    });
  }
));

module.exports = router;
