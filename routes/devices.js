var express = require('express');
var router = express.Router();

var passport = require('passport');
var models = require('../models');

var Promise = require('bluebird');

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

function getArtist(submission) {
  return new Promise(function(resolve, reject) {
    models.Artist.findOne({
      Name: submission.Artist
    }, function(err, artist) {
      if (artist === null) {
        models.Artist.create({
          Name: submission.Artist
        }, function(err, artist) {
          resolve(artist);
        })
      }
      else {
        resolve(artist);
      }
    });
  });
}

function getAlbum(submission, artist) {
  return new Promise(function(resolve, reject) {
    models.Album.findOne({
      Name: submission.Album,
      ArtistId: artist._id
    }, function(err, album) {
      if (album  === null) {
        models.Album.create({
          Name: submission.Album,
          ArtistId: artist._id,
          Year: submission.Year
        }, function(err, album) {
          resolve(album);
        })
      }
      else {
        resolve(album);
      }
    });
  });
}

function getTrack(submission, album) {
  return new Promise(function(resolve, reject) {
    models.Track.findOne({
      Name: submission.Title,
      AlbumId: album._id
    }, function(err, track) {
      if (track  === null) {
        models.Track.create({
          Name: submission.Title,
          AlbumId: album._id,
          Number: submission.Number
        }, function(err, track) {
          resolve(track);
        })
      }
      else {
        resolve(track);
      }
    });
  });
}

function clearDeviceTracks(req) {
  return new Promise(function(resolve, reject) {
    models.Device.findOne({
      _id: req.params['id'],
      OwnerId: req.user.id
    }, function(err, device) {
      device.Tracks = undefined;
      device.save();
      resolve();
    });
  });
}

function addTrackToDevice(device, submission, track) {
  return new Promise(function(resolve, reject) {
    device.Tracks.push({
      TrackId: track._id,
      DeviceTrackId: submission.Id,
      Duration: submission.Duration
    });

    device.save(function(err) {
      if(err) {
        reject();
      }
      else {
        resolve();
      }
    })
  });
}

function processSubmission(req, submission) {
  return new Promise(function(resolve, reject) {
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

    getArtist(submission).then(function(artist) {
      getAlbum(submission, artist).then(function(album) {
        getTrack(submission, album).then(function(track) {
          models.Device.findOne({
            _id: req.params['id'],
            OwnerId: req.user.id
          }, function(err, device) {
            addTrackToDevice(device, submission, track).then(function() {
              resolve();
            })
          });
        })
      });
    });
  });
}

router.post('/:id/submit', function(req, res) {
  clearDeviceTracks(req).then(function() {
    Promise.each(req.body, function(submission) {
      return processSubmission(req, submission);
    }).then(function() {
      res.sendStatus(200);
    });
  });
});

module.exports = router;
