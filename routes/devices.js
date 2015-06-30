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
    new models.Device({
      OwnerId: req.user.id
    }).fetchAll().then(function(devices) {
      return res.json(devices);
    });
  }
  else {
    new models.Device({
      OwnerId: req.user.id,
      Name: req.query['name']
    }).fetch().then(function(device) {
      return res.json({Id: device.id});
    }).catch(function(err) {
      return res.sendStatus(404);
    });
  }
});

router.post('/', function(req, res) {
  new models.Device({
    OwnerId: req.user.id,
    Name: req.body['name'],
  }).save().then(function(device) {
    return res.json({Id: device.id});
  });
});

router.get('/:id', function(req, res) {
  new models.Device({
    id: req.params['id'],
    OwnerId: req.user.id
  }).fetch().then(function(device) {
    return res.json(device);
  }).catch(function(err) {
    return res.sendStatus(404);
  });
})

router.delete('/:id', function(req, res) {
  new models.Device({
    id: req.params['id'],
    OwnerId: req.user.id
  }).fetch().then(function(device) {
    device.destroy();
    return res.sendStatus(204);
  }).catch(function(err) {
    return res.sendStatus(404);
  });
});

function getArtist(submission) {
  return new Promise(function(resolve, reject) {
    if (submission.Artist === null) {
      return resolve();
    }
    redis.get('musicpicker.submissions.' + submission.Artist, function(err, reply) {
      if (reply === null) {
        new models.Artist({
          Name: submission.Artist
        }).fetch().then(function(artist) {
          redis.set('musicpicker.submissions.' + submission.Artist, artist.id);
          resolve(artist.id);
        }).catch(function(err) {
          new models.Artist({
            Name: submission.Artist
          }).save().then(function(artist) {
            redis.set('musicpicker.submissions.' + submission.Artist, artist.id);
            resolve(artist.id);
          });
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
          new models.Album({
            Name: submission.Album,
            ArtistId: artistId
          }).fetch().then(function(album) {
            redis.set('musicpicker.submissions.' + submission.Artist + '.' + submission.Album, album.id);
            resolve(album.id);
          }).catch(function(err) {
            new models.Album({
              Name: submission.Album,
              ArtistId: artistId,
              Year: submission.Year
            }).save().then(function(album) {
              redis.set('musicpicker.submissions.' + submission.Artist + '.' + submission.Album, album.id);
              resolve(album.id);
            });
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
          new models.Track({
            Name: submission.Title,
            AlbumId: albumId
          }).fetch().then(function(track) {
            redis.set('musicpicker.submissions.' + submission.Artist + '.' + submission.Album + '.' + submission.Title, track.id);
            redis.hset('musicpicker.devicetracks.' + device.id + '.' + track.id, 'trackId', track.id);
            redis.hset('musicpicker.devicetracks.' + device.id + '.' + track.id, 'deviceTrackId', submission.Id);
            redis.hset('musicpicker.devicetracks.' + device.id + '.' + track.id, 'duration', submission.Duration);
            resolve(track.id);
          }).catch(function(err) {
            new models.Track({
              Name: submission.Title,
              AlbumId: albumId,
              Number: submission.Number
            }).save().then(function(track) {
              redis.set('musicpicker.submissions.' + submission.Artist + '.' + submission.Album + '.' + submission.Title, track.id);
              redis.hset('musicpicker.devicetracks.' + device.id + '.' + track.id, 'trackId', track.id);
              redis.hset('musicpicker.devicetracks.' + device.id + '.' + track.id, 'deviceTrackId', submission.Id);
              redis.hset('musicpicker.devicetracks.' + device.id + '.' + track.id, 'duration', submission.Duration);
              resolve(track.id);
            });
          });
        }
        else {
          redis.hset('musicpicker.devicetracks.' + device.id + '.' + reply, 'trackId', reply);
          redis.hset('musicpicker.devicetracks.' + device.id + '.' + reply, 'deviceTrackId', submission.Id);
          redis.hset('musicpicker.devicetracks.' + device.id + '.' + reply, 'duration', submission.Duration);
          resolve(reply);
        }
      });
    });
  });
}

function clearDeviceTracks(deviceId, userId) {
  return new Promise(function(resolve, reject) {
    new models.DeviceTrack({
      DeviceId: deviceId
    }).fetchAll().then(function(collection) {
      collection.reset();
      resolve();
    });
  });
}

function flushTrackToDevice(device, key) {
  return new Promise(function(resolve, reject) {
    redis.hget(key, 'trackId', function(err, trackId) {
      redis.hget(key, 'deviceTrackId', function(err, deviceTrackId) {
        redis.hget(key, 'duration', function(err, duration) {
          new models.DeviceTrack({
            DeviceId: device.id,
            TrackId: trackId,
            DeviceTrackId: deviceTrackId,
            TrackDuration: duration
          }).save().then(function() {
            resolve();
          });
        });
      });
    });
  });
}

function flushTracksToDevice(device) {
  return new Promise(function(resolve, reject) {
    toArray(redis.scan({pattern: 'musicpicker.devicetracks.' + device.id + '.*', count: 100000}), function(err, arr) {
      Promise.each(arr, function(item) {
        return flushTrackToDevice(device, item);
      }).then(function() {
        toArray(redis.scan({pattern: 'musicpicker.devicetracks.' + device.id + '.*', count: 100000}), function(err, arr) {
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
        new models.Device({
          Id: deviceId,
          OwnerId: userId
        }).fetch().then(function(device) {
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
