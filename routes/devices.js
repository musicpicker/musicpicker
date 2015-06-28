var express = require('express');
var router = express.Router();

var passport = require('passport');

var Models = require('../models');

router.use(passport.authenticate('bearer', {session: false}));

router.get('/', function(req, res) {
  if (req.query['name'] === undefined) {
    Models.Device.findAll({
      where: {
        UserId: req.user.id
      }
    }).then(function(result) {
      res.json(result);
    });
  }
  else {
    Models.Device.findOne({
      where: {
        UserId: req.user.id,
        name: req.query['name']
      }
    }).then(function(result) {
      res.json(result);
    });
  }
});

router.post('/', function(req, res) {
  Models.Device.create({
    UserId: req.user.id,
    name: req.body['name']
  }).then(function() {
    res.sendStatus(200);
  });
});

router.get('/:id', function(req, res) {
  Models.Device.findOne({
    where: {
      id: req.params['id'],
      UserId: req.user.id
    }
  }).then(function(device) {
    res.json(device);
  });
})

router.delete('/:id', function(req, res) {
  Models.Device.findOne({
    where: {
      id: req.params['id'],
      UserId: req.user.id
    }
  }).then(function(device) {
    device.destroy().then(function() {
      res.sendStatus(204);
    });
  });
});

module.exports = router;
