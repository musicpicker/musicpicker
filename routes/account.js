var express = require('express');
var router = express.Router();
var models = require('../models');

router.post('/register', function(req, res) {
  if (req.body['Username'] === undefined) {
    return res.status(400).send('Username must be provided');
  }

  if (req.body['Password'].length < 6) {
    return res.status(400).send('Password too short');
  }

  if (req.body['Password'] !== req.body['ConfirmPassword']) {
    return res.status(400).send('Password confirmation doesn\'t match wanted password');
  }

  var sha = require('crypto').createHash('sha256');
  sha.update(req.body['Password']);

  models.User.create({
    Username: req.body['Username'],
    Password: sha.digest('hex')
  }, function(err, user) {
    if (!err) {
      return res.sendStatus(200);
    }
    else {
      return res.sendStatus(500);
    }
  });
});

module.exports = router;
