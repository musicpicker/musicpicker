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
        return res.json(result);
    });
  }
  else {
    Models.Device.findOne({
      where: {
        UserId: req.user.id,
        name: req.query['name']
      }
    }).then(function(result) {
      if (result === null) {
        return res.sendStatus(404);
      }
      else {
        return res.json(result);
      }
    });
  }
});

router.post('/', function(req, res) {
  Models.Device.create({
    UserId: req.user.id,
    name: req.body['name']
  }).then(function(device) {
    res.json({Id: device.id});
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

router.post('/:id/submit', function(req, res) {
  Models.DeviceTracks.destroy({
    where: {
      DeviceId: req.params['id']
    }
  }).then(function() {
    req.body.forEach(function(submission) {
      if (submission.Artist == null) {
          submission.Artist = "Unknown artist";
      }
      if (submission.Album == null) {
          submission.Album = "Unknown album";
      }
      if (submission.Title == null) {
        if (submission.Count != 0) {
            submission.Title = "Track " + submission.Count;
        }
        else {
            submission.Title = "Unknown track";
        }
      }

      console.log(submission);
    }.bind(this));
  });
});

module.exports = router;
