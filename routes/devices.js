var express = require('express');
var router = express.Router();

var passport = require('passport');
var models = require('../models');

router.use(passport.authenticate('bearer', {session: false}));

router.get('/', function(req, res) {
  if (req.query['name'] === undefined) {
    models.Device.find({
      OwnerId: req.user.id
    }, function(err, devices) {
      return res.json(devices);
    });
  }
  else {
    models.Device.findOne({
      OwnerId: req.user.id,
      Name: req.query['name']
    }, function(err, device) {
      if (device === null) {
        return res.sendStatus(404);
      }
      else {
        return res.json({Id: device._id});
      }
    });
  }
});

router.post('/', function(req, res) {
  models.Device.create({
    OwnerId: req.user.id,
    Name: req.body['name'],
    RegistrationDate: Date.now()
  }, function(err, device) {
    return res.json({Id: device._id});
  });
});

router.get('/:id', function(req, res) {
  models.Device.findOne({
    _id: req.params['id'],
    OwnerId: req.user.id
  }, function(err, device) {
    if (device === null) {
      return res.sendStatus(404);
    }
    return res.json(device);
  });
})

router.delete('/:id', function(req, res) {
  models.Device.remove({
    _id: req.params['id'],
    OwnerId: req.user.id
  }, function(err) {
    if (err) {
      return res.sendStatus(400);
    }
    else {
      return res.sendStatus(204);
    }
  });
});

/*router.post('/:id/submit', function(req, res) {
  models.DeviceTracks.destroy({
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
});*/

module.exports = router;
