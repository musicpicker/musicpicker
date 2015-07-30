var express = require('express');
var router = express.Router();
var config = require('config');

var passport = require('passport');
var models = require('../models');
var knex = require('../knex');

var Promise = require('bluebird');
var kue = require('kue');
var request = require('request');

var redis = require('redis-scanstreams')(require('redis')).createClient(6379, config.get('redis.host'));
var toArray = require('stream-to-array')

var queue = require('../queue');
var statsd = require('../statsd').middleware;
var metrics = require('../statsd').lynx;

router.use(passport.authenticate('bearer', {session: false}));

router.get('/', function(req, res) {
  if (req.query['name'] === undefined) {
    req.statsdKey = 'http.device-list.get';
    models.Device.query({
      where: {
        OwnerId: req.user.id
      }
    }).fetchAll().then(function(devices) {
      return res.json(devices);
    });
  }
  else {
    req.statsdKey = 'http.device-list-filter.get';
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

router.post('/', statsd('device-list'), function(req, res) {
  new models.Device({
    OwnerId: req.user.id,
    Name: req.body['name'],
  }).save().then(function(device) {
    return res.json({Id: device.id});
  });
});

router.get('/:id', statsd('device-detail'), function(req, res) {
  new models.Device({
    Id: req.params['id'],
    OwnerId: req.user.id
  }).fetch().then(function(device) {
    return res.json(device);
  }).catch(function(err) {
    return res.sendStatus(404);
  });
})

router.delete('/:id', statsd('device-detail'), function(req, res) {
  new models.Device({
    Id: req.params['id'],
    OwnerId: req.user.id
  }).fetch().then(function(device) {
    Promise.all([
      device.destroy(),
      clearDeviceTracks(req.params['id'])
    ]).then(function() {
      res.sendStatus(204);
    }).catch(function() {
      res.sendStatus(500);
    });
  }).catch(function(err) {
    return res.sendStatus(404);
  });
});

function getArtist(submission) {
  return new Promise(function(resolve, reject) {
    var timer = metrics.createTimer('submission.getArtist.response_time');
    metrics.increment('submission.getArtist.calls');

    if (submission.Artist === null) {
      timer.stop();
      return resolve();
    }
    redis.get('musicpicker.submissions.' + submission.Artist, function(err, reply) {
      if (reply === null) {
        new models.Artist({
          Name: submission.Artist
        }).fetch().then(function(artist) {
          redis.set('musicpicker.submissions.' + submission.Artist, artist.id);
          if (config.has('redis.cache.expire')) {
            redis.expire('musicpicker.submissions.' + submission.Artist, config.get('redis.cache.expire'));
          }
          timer.stop();
          resolve(artist.id);
        }).catch(function(err) {
          new models.Artist({
            Name: submission.Artist
          }).save().then(function(artist) {
            redis.set('musicpicker.submissions.' + submission.Artist, artist.id);
            if (config.has('redis.cache.expire')) {
              redis.expire('musicpicker.submissions.' + submission.Artist, config.get('redis.cache.expire'));
            }
            timer.stop();
            resolve(artist.id);
          }).catch(function(err) {
            timer.stop();
            resolve();
          });
        });
      }
      else {
        if (config.has('redis.cache.expire')) {
          redis.expire('musicpicker.submissions.' + submission.Artist, config.get('redis.cache.expire'));
        }
        timer.stop();
        resolve(reply);
      }
    });
  });
}

function getAlbum(submission, artistId) {
  return new Promise(function(resolve, reject) {
    metrics.increment('submission.getAlbum.calls');
    var timer = metrics.createTimer('submission.getAlbum.response_time');

    if (submission.Artist === null || submission.Album === null) {
      timer.stop();
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
            if (config.has('redis.cache.expire')) {
              redis.expire('musicpicker.submissions.' + submission.Artist + '.' + submission.Album, config.get('redis.cache.expire'));
            }
            timer.stop();
            resolve(album.id);
          }).catch(function(err) {
            new models.Album({
              Name: submission.Album,
              ArtistId: artistId,
              Year: submission.Year
            }).save().then(function(album) {
              redis.set('musicpicker.submissions.' + submission.Artist + '.' + submission.Album, album.id);
              if (config.has('redis.cache.expire')) {
                redis.expire('musicpicker.submissions.' + submission.Artist + '.' + submission.Album, config.get('redis.cache.expire'));
              }
              queue.create('artworks', {
                submission: submission,
                albumId: album.id
              }).save();
              timer.stop();
              resolve(album.id);
            }).catch(function(err) {
              timer.stop();
              resolve();
            });
          });
        }
        else {
          if (config.has('redis.cache.expire')) {
            redis.expire('musicpicker.submissions.' + submission.Artist + '.' + submission.Album, config.get('redis.cache.expire'));
          }
          timer.stop();
          resolve(reply);
        }
      });
    });
  });
}

function getTrack(submission, device) {
  return new Promise(function(resolve, reject) {
    metrics.increment('submission.getTrack.calls');
    var timer = metrics.createTimer('submission.getTrack.response_time');

    if (submission.Artist === null || submission.Album === null || submission.Title === null) {
      timer.stop();
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
            if (config.has('redis.cache.expire')) {
              redis.expire('musicpicker.submissions.' + submission.Artist + '.' + submission.Album + '.' + submission.Title, config.get('redis.cache.expire'));
            }

            redis.hset('musicpicker.devicetracks.' + device.id + '.' + track.id, 'trackId', track.id);
            redis.hset('musicpicker.devicetracks.' + device.id + '.' + track.id, 'deviceTrackId', submission.Id);
            redis.hset('musicpicker.devicetracks.' + device.id + '.' + track.id, 'duration', submission.Duration);

            timer.stop();
            resolve(track.id);
          }).catch(function(err) {
            new models.Track({
              Name: submission.Title,
              AlbumId: albumId,
              Number: submission.Number
            }).save().then(function(track) {
              redis.set('musicpicker.submissions.' + submission.Artist + '.' + submission.Album + '.' + submission.Title, track.id);
              if (config.has('redis.cache.expire')) {
                redis.expire('musicpicker.submissions.' + submission.Artist + '.' + submission.Album + '.' + submission.Title, config.get('redis.cache.expire'));
              }

              redis.hset('musicpicker.devicetracks.' + device.id + '.' + track.id, 'trackId', track.id);
              redis.hset('musicpicker.devicetracks.' + device.id + '.' + track.id, 'deviceTrackId', submission.Id);
              redis.hset('musicpicker.devicetracks.' + device.id + '.' + track.id, 'duration', submission.Duration);

              timer.stop();
              resolve(track.id);
            }).catch(function(err) {
              timer.stop();
              resolve();
            })
          });
        }
        else {
          if (config.has('redis.cache.expire')) {
            redis.expire('musicpicker.submissions.' + submission.Artist + '.' + submission.Album + '.' + submission.Title, config.get('redis.cache.expire'));
          }

          redis.hset('musicpicker.devicetracks.' + device.id + '.' + reply, 'trackId', reply);
          redis.hset('musicpicker.devicetracks.' + device.id + '.' + reply, 'deviceTrackId', submission.Id);
          redis.hset('musicpicker.devicetracks.' + device.id + '.' + reply, 'duration', submission.Duration);

          timer.stop();
          resolve(reply);
        }
      });
    });
  });
}

function clearDeviceTracks(deviceId) {
  return new Promise(function(resolve, reject) {
    metrics.increment('submission.clearDeviceTracks.calls');
    var timer = metrics.createTimer('submission.clearDeviceTracks.response_time');

    knex('deviceTracks').where('DeviceId', deviceId).delete().then(function() {
      timer.stop();
      resolve();
    })
  });
}

function flushTrackToDevice(device, key) {
  return new Promise(function(resolve, reject) {
    metrics.increment('submission.flushTrackToDevice.calls');
    var timer = metrics.createTimer('submission.flushTrackToDevice.response_time');

    redis.hget(key, 'trackId', function(err, trackId) {
      redis.hget(key, 'deviceTrackId', function(err, deviceTrackId) {
        redis.hget(key, 'duration', function(err, duration) {
          new models.DeviceTrack({
            DeviceId: device.id,
            TrackId: trackId,
            DeviceTrackId: deviceTrackId,
            TrackDuration: duration
          }).save().then(function() {
            timer.stop();
            resolve();
          });
        });
      });
    });
  });
}

function flushTracksToDevice(device, progress) {
  return new Promise(function(resolve, reject) {
    metrics.increment('submission.flushTracksToDevice.calls');
    var timer = metrics.createTimer('submission.flushTracksToDevice.response_time');

    toArray(redis.scan({pattern: 'musicpicker.devicetracks.' + device.id + '.*', count: 100000}), function(err, arr) {
      Promise.each(arr, function(item) {
        return progress(flushTrackToDevice.bind(this, device, item));
      }).then(function() {
        toArray(redis.scan({pattern: 'musicpicker.devicetracks.' + device.id + '.*', count: 100000}), function(err, arr) {
          Promise.each(arr, function(key) {
            return new Promise(function(resolve, reject) {
              redis.del(key, function() {
                resolve();
              })
            });
          }).then(function() {
            timer.stop();
            resolve();
          });
        });
      });
    });
  });
};

function getArtwork(submission, albumId, done) {
  metrics.increment('submission.getArtwork.calls');
  var timer = metrics.createTimer('submission.getArtwork.response_time');

  var key = config.get('lastfm.key');
  var url = 'http://ws.audioscrobbler.com/2.0/?method=album.getinfo&api_key=' +
      key + '&artist=' + submission.Artist + '&album=' + submission.Album + '&format=json';

  request(url, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      try {
        var result = JSON.parse(body);
      }
      catch (ex) {
        timer.stop();
        return done();
      }
      if (result.album !== undefined && result.album.image !== undefined) {
        var images = result.album.image;
        if (images.length > 0) {
          var image = images[images.length - 1]['#text'];
          new models.Album({
            Id: albumId
          }).fetch().then(function(album) {
            album.set('Artwork', image);
            album.save();

            timer.stop();
            done();
          }).catch(function() {
            timer.stop();
            done();
          });
        }
      }
      timer.stop();
      done();
    }
    else {
      timer.stop();
      done();
    }
  });
}

function submissionProgress(job, len) {
  var i = 0;
  var buf = 0;
  return function(callback) {
    buf++;
    if (buf === 5) {
      i += 5;
      job.progress(i, len);
      buf = 0;
    }
    if (callback !== undefined) {
      return callback();
    }
  }
}

function processSubmissions(job, deviceId, userId, submissions, done) {
  metrics.increment('submission.processSubmissions.calls');
  var timer = metrics.createTimer('submission.processSubmissions.response_time');

  var begin = Date.now();
  var progress = submissionProgress(job, 4 * submissions.length);

  clearDeviceTracks(deviceId).then(function() {
    Promise.each(submissions, function(submission) {
      return progress(getArtist.bind(this, submission));
    }.bind(this)).then(function() {
      Promise.each(submissions, function(submission) {
        return progress(getAlbum.bind(this, submission));
      }.bind(this)).then(function() {
        new models.Device({
          Id: deviceId,
          OwnerId: userId
        }).fetch().then(function(device) {
          Promise.each(submissions, function(submission) {
            return progress(getTrack.bind(this, submission, device));
          }.bind(this)).then(function() {
            flushTracksToDevice(device, progress).then(function() {
              redis.del('musicpicker.submissionjob.' + deviceId);

              timer.stop();
              done();
            });
          }.bind(this));
        }.bind(this));
      }.bind(this));
    }.bind(this));
  }.bind(this));
}

router.post('/:id/submit', statsd('device-submit'), function(req, res) {
  new models.Device({
    Id: req.params['id'],
    OwnerId: req.user.id
  }).fetch().then(function(device) {
    if (device === null) {
      return res.sendStatus(404);
    }
    
    var job = queue.create('submissions', {
      deviceId: req.params['id'],
      userId: req.user.id,
      submissions: req.body
    });

    job.on('progress', function(progress, data) {
      redis.publish('submissions.' + req.params['id'] + '.progress', progress);
    });
    job.on('complete', function() {
      redis.publish('submissions.' + req.params['id'] + '.processing', 0);
    });

    job.save(function(err) {
      if (err) {
        return res.sendStatus(500);
      }
      else {
        redis.publish('submissions.' + req.params['id'] + '.processing', 1);
        return res.sendStatus(200);
      }
    });
  }).catch(function() {
    res.sendStatus(404);
  });
});

queue.process('submissions', config.get('queue.paralel.submissions'), function(job, done) {
  redis.set('musicpicker.submissionjob.' + job.data.deviceId, job.id);
  processSubmissions(job, job.data.deviceId, job.data.userId, job.data.submissions, done);
});

queue.process('artworks', config.get('queue.paralel.artworks'), function(job, done) {
  getArtwork(job.data.submission, job.data.albumId, done);
});

module.exports = router;
