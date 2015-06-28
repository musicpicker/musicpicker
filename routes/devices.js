var express = require('express');
var router = express.Router();

var passport = require('passport');

var Models = require('../models');

router.use(passport.authenticate('bearer', {session: false}));

router.get('/', function(req, res) {
  Models.Device.findAll({
    where: {
      userId: req.user.id
    }
  }).then(function(result) {
    res.json(result);
  });
});

router.post('/', function(req, res) {
  Models.Device.create({
    UserId: req.user.id,
    name: req.body['name']
  }).then(function() {
    res.sendStatus(200);
  });
});

module.exports = router;
