var express = require('express');
var router = express.Router();

var passport = require('passport');
var models = require('../models');

var Promise = require('bluebird');
var kue = require('kue');
var redis = require('redis').createClient();

queue = kue.createQueue();

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
    if (submission.Artist === null) {
      return resolve();
    }
    console.log(submission.Artist);
    redis.get('musicpicker.submissions.artist.' + submission.Artist, function(err, reply) {
      if (reply === null) {
        models.Artist.findOne({
          Name: submission.Artist
        }, function(err, artist) {
          if (artist === null) {
            models.Artist.create({
              Name: submission.Artist
            }, function(err, artist) {
              redis.set('musicpicker.submissions.artist.' + submission.Artist, artist._id);
              resolve(artist._id);
            })
          }
          else {
            redis.set('musicpicker.submissions.artist.' + submission.Artist, artist._id);
            resolve(artist._id);
          }
        });
      }
      else {
        resolve(reply);
      }
    });
  });
}

function getAlbum(submission, artistId) {
  return new Promise(function(resolve, reject) {
    if (submission.Artist === null || submission.Album === null) {
      return resolve();
    }
    console.log(submission.Album);
    redis.get('musicpicker.submissions.artist.' + submission.Artist, function(err, artistId) {
      redis.get('musicpicker.submissions.album.' + artistId + '.' + submission.Album, function(err, reply) {
        if (reply === null) {
          models.Album.findOne({
            Name: submission.Album,
            ArtistId: artistId
          }, function(err, album) {
            if (album  === null) {
              models.Album.create({
                Name: submission.Album,
                ArtistId: artistId,
                Year: submission.Year
              }, function(err, album) {
                console.log(err);
                redis.set('musicpicker.submissions.album.' + artistId + '.' + submission.Album, album._id);
                resolve(album._id);
              })
            }
            else {
              redis.set('musicpicker.submissions.album.' + artistId + '.' + submission.Album, album._id);
              resolve(album._id);
            }
          });
        }
        else {
          resolve(reply);
        }
      });
    });
  });
}

function getTrack(submission, device) {
  return new Promise(function(resolve, reject) {
    if (submission.Artist === null || submission.Album === null || submission.Title === null) {
      return resolve();
    }
    console.log(submission.Title);

    redis.get('musicpicker.submissions.artist.' + submission.Artist, function(err, artistId) {
      redis.get('musicpicker.submissions.album.' + artistId + '.' + submission.Album, function(err, albumId) {
        redis.get('musicpicker.submissions.track.' + albumId + '.' + submission.Title, function(err, reply) {
          if (reply === null) {
            models.Track.findOne({
              Name: submission.Title,
              AlbumId: albumId
            }, function(err, track) {
              if (track  === null) {
                models.Track.create({
                  Name: submission.Title,
                  AlbumId: albumId,
                  Number: submission.Number
                }, function(err, track) {
                  redis.set('musicpicker.submissions.track.' + albumId + '.' + submission.Title, track._id);
                  addTrackToDevice(device, submission, track._id).then(function() {
                    resolve(track._id);
                  });
                })
              }
              else {
                redis.set('musicpicker.submissions.track.' + albumId + '.' + submission.Title, track._id);
                addTrackToDevice(device, submission, track._id).then(function() {
                  resolve(track._id);
                });
              }
            });
          }
          else {
            addTrackToDevice(device, submission, reply).then(function() {
              resolve(reply);
            });
          }
        });
      });
    });
  });
}

function clearDeviceTracks(deviceId, userId) {
  return new Promise(function(resolve, reject) {
    models.Device.findOne({
      _id: deviceId,
      OwnerId: userId
    }, function(err, device) {
      device.Tracks = undefined;
      device.save();
      resolve();
    });
  });
}

function addTrackToDevice(device, submission, trackId) {
  return new Promise(function(resolve, reject) {
    device.Tracks.push({
      TrackId: trackId,
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

function processSubmission(deviceId, userId, submission) {
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

    getArtist(submission).then(function(artistId) {
      getAlbum(submission, artistId).then(function(albumId) {
        getTrack(submission, albumId).then(function(trackId) {
          console.log(trackId);
          models.Device.findOne({
            _id: deviceId,
            OwnerId: userId
          }, function(err, device) {
            addTrackToDevice(device, submission, trackId).then(function() {
              resolve();
            })
          });
        })
      });
    });
  });
}

function processSubmissions(deviceId, userId, submissions, done) {
  var begin = Date.now();
  clearDeviceTracks(deviceId, userId).then(function() {
    Promise.each(submissions, function(submission) {
      return getArtist(submission);
    }).then(function() {
      Promise.each(submissions, function(submission) {
        return getAlbum(submission);
      }).then(function() {
        models.Device.findOne({
          _id: deviceId,
          OwnerId: userId
        }, function(err, device) {
          Promise.each(submissions, function(submission) {
            return getTrack(submission, device);
          });
        });
      });
    });

      /*.then(function() {
      Promise.each(submissions, function(submission) {
        return processSubmission(deviceId, userId, submission);
      }).then(function() {
        console.log(Date.now() - begin);
        done();
      });
    });*/
  });
}

router.post('/:id/submit', function(req, res) {
  queue.create('submissions', {
    deviceId: req.params['id'],
    userId: req.user.id,
    submissions: req.body
  }).save(function(err) {
    if (err) {
      return res.sendStatus(500);
    }
    else {
      return res.sendStatus(200);
    }
  });
});

queue.process('submissions', function(job, done) {
  processSubmissions(job.data.deviceId, job.data.userId, job.data.submissions, done);
});

module.exports = router;
