var config = require('config');
var express = require('express');
var router = express.Router();
var passport = require('passport');
var Promise = require('bluebird');
var models = require('../models');
var statsd = require('../statsd').middleware;
var jwt = require('jsonwebtoken');
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;
var crypto = require('crypto');

function registerUser(username, password, confirm) {
  return new Promise(function(resolve, reject) {
    if (username === undefined) {
      return reject('Username must be provided');
    }

    new models.User({
      Username: username
    }).fetch().then(function(user) {
      if (user !== null) {
        return reject('Username already taken');
      }
    });

    if (password.length < 6) {
      return reject('Password too short');
    }

    if (password !== confirm) {
      return reject('Password confirmation doesn\'t match wanted password');
    }

    var sha = require('crypto').createHash('sha256');
    sha.update(password);

    new models.User({
      Username: username,
      Password: sha.digest('hex')
    }).save().then(function(user) {
      return resolve();
    }).catch(function(err) {
      return reject(err);
    });
  });
}

router.post('/api/account/register', statsd('account-register'), function(req, res) {
  registerUser(req.body['Username'], req.body['Password'], req.body['ConfirmPassword']).then(function() {
    return res.sendStatus(200);
  }).catch(function(err) {
    if (err !== undefined) {
      return res.status(400).send(err);
    }
    else {
      return res.sendStatus(500);
    }
  });
});

router.get('/login', statsd('login'), function(req, res) {
  res.render('login', {
    failure: req.query['failure']
  });
});
router.post('/login', passport.authenticate('local', { successReturnToOrRedirect: '/', failureRedirect: '/login?failure=true' }));

router.get('/logout', statsd('logout'), function(req, res) {
  req.logout();
  res.redirect('/login');
});

router.get('/signup', statsd('account-signup'), function(req, res) {
  res.render('signup', {
    errors: req.flash('error')
  });
});
router.post('/signup', statsd('account-signup'),
  function(req, res, next) {
    registerUser(req.body['username'], req.body['password'], req.body['password2']).then(function() {
      next();
    }).catch(function(err) {
      if (err !== undefined) {
        req.flash('error', err);
        return res.redirect('/signup');
      }
      else {
        return res.sendStatus(500);
      }
    });
  },
  passport.authenticate('local', { successReturnToOrRedirect: '/', failureRedirect: '/login' })
);

router.get('/password', statsd('account-password'), 
  ensureLoggedIn('/login'),
  function(req, res) {
    res.render('password', {
      errors: req.flash('error')
    });
  }
);

router.post('/password', statsd('account-password'),
  ensureLoggedIn('/login'),
  function(req, res) {
    var current = crypto.createHash('sha256').update(req.body['password']).digest('hex');
    if (req.user.get('Password') !== current) {
      req.flash('error', 'Invalid current password');
      return res.redirect('/password');
    }

    if (req.body['new_password'] < 6) {
      req.flash('error', 'Password too short');
      return res.redirect('/password');
    }

    if (req.body['new_password'] !== req.body['confirm_new']) {
      req.flash('error', 'Password confirmation doesn\'t match wanted password');
      return res.redirect('/password');
    }

    var new_password = crypto.createHash('sha256').update(req.body['new_password']).digest('hex');
    req.user.set({Password: new_password}).save().then(function() {
      return res.redirect('/');
    }).catch(function() {
      req.flash('error', 'Unknown error');
      return res.redirect('/password');
    });
  }
);

router.get('/socket-token', passport.authenticate('session'), function(req, res, next) {
  if (req.isAuthenticated()) {
    var token = jwt.sign({deviceId: req.user.id}, config.get('secret'), {
      audience: 'hub',
      issuer: 'socket-token',
      expiresInSeconds: 30
    });
    res.send(token);
  }
  else {
    res.sendStatus(401);
  }
});

module.exports = router;
