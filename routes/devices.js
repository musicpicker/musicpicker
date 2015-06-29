var express = require('express');
var router = express.Router();

var passport = require('passport');
var models = require('../models');

var Promise = require('bluebird');
var kue = require('kue');

var redis = require('redis-scanstreams')(require('redis')).createClient();
var toArray = require('stream-to-array')

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
    redis.get('musicpicker.submissions.' + submission.Artist, function(err, reply) {
      if (reply === null) {
        models.Artist.findOne({
          Name: submission.Artist
        }, function(err, artist) {
          if (artist === null) {
            models.Artist.create({
              Name: submission.Artist
            }, function(err, artist) {
              redis.set('musicpicker.submissions.' + submission.Artist, artist._id);
              resolve(artist._id);
            })
          }
          else {
            redis.set('musicpicker.submissions.' + submission.Artist, artist._id);
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
    redis.get('musicpicker.submissions.' + submission.Artist, function(err, artistId) {
      redis.get('musicpicker.submissions.' + submission.Artist + '.' + submission.Album, function(err, reply) {
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
                redis.set('musicpicker.submissions.' + submission.Artist + '.' + submission.Album, album._id);
                resolve(album._id);
              })
            }
            else {
              redis.set('musicpicker.submissions.' + submission.Artist + '.' + submission.Album, album._id);
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

    redis.get('musicpicker.submissions.' + submission.Artist + '.' + submission.Album, function(err, albumId) {
      redis.get('musicpicker.submissions.' + submission.Artist + '.' + submission.Album + '.' + submission.Title, function(err, reply) {
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
                redis.set('musicpicker.submissions.' + submission.Artist + '.' + submission.Album + '.' + submission.Title, track._id);
                redis.hset('musicpicker.devicetracks.' + device._id + '.' + track._id, 'trackId', track._id);
                redis.hset('musicpicker.devicetracks.' + device._id + '.' + track._id, 'deviceTrackId', submission.Id);
                redis.hset('musicpicker.devicetracks.' + device._id + '.' + track._id, 'duration', submission.Duration);
                resolve(track._id);
              })
            }
            else {
              redis.set('musicpicker.submissions.' + submission.Artist + '.' + submission.Album + '.' + submission.Title, track._id);
              redis.hset('musicpicker.devicetracks.' + device._id + '.' + track._id, 'trackId', track._id);
              redis.hset('musicpicker.devicetracks.' + device._id + '.' + track._id, 'deviceTrackId', submission.Id);
              redis.hset('musicpicker.devicetracks.' + device._id + '.' + track._id, 'duration', submission.Duration);
              resolve(track._id);
            }
          });
        }
        else {
          redis.hset('musicpicker.devicetracks.' + device._id + '.' + reply, 'trackId', reply);
          redis.hset('musicpicker.devicetracks.' + device._id + '.' + reply, 'deviceTrackId', submission.Id);
          redis.hset('musicpicker.devicetracks.' + device._id + '.' + reply, 'duration', submission.Duration);
          resolve(reply);
        }
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

function flushTrackToDevice(device, key) {
  return new Promise(function(resolve, reject) {
    redis.hget(key, 'trackId', function(err, trackId) {
      redis.hget(key, 'deviceTrackId', function(err, deviceTrackId) {
        redis.hget(key, 'duration', function(err, duration) {
          device.Tracks.push({
            TrackId: trackId,
            DeviceTrackId: deviceTrackId,
            Duration: duration
          });
          resolve();
        });
      });
    });
  });
}

function flushTracksToDevice(device) {
  return new Promise(function(resolve, reject) {
    toArray(redis.scan({pattern: 'musicpicker.devicetracks.' + device._id + '.*', count: 100000}), function(err, arr) {
      Promise.each(arr, function(item) {
        return flushTrackToDevice(device, item);
      }).then(function() {
        device.save();

        toArray(redis.scan({pattern: 'musicpicker.devicetracks.' + device._id + '.*', count: 100000}), function(err, arr) {
          Promise.each(arr, function(key) {
            return new Promise(function(resolve, reject) {
              redis.del(key, function() {
                resolve();
              })
            });
          }).then(function() {
            resolve();
          });
        });
      });
    });
  });
};

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
          }).then(function() {
            flushTracksToDevice(device).then(function() {
              done();
            });
          });
        });
      });
    });
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
