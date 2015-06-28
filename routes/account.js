var express = require('express');
var router = express.Router();
var Models = require('../models');

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

  Models.User.create({
    username: req.body['Username'],
    password: sha.digest('hex')
  }).then(function() {
    return res.sendStatus(200);
  });
});

module.exports = router;
