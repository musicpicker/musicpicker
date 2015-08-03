var config = require('config');
var redis = require('redis-scanstreams')(require('redis')).createClient(6379, config.get('redis.host'));
var tredis = require('then-redis').createClient(config.get('redis'));
var redisChan = require('redis').createClient(6379, config.get('redis.host'));
var kue = require('kue');
var queue = require('./queue');
var auth = require('socketio-auth');
var Promise = require('bluebird');
var models = require('./models');

function Playback() {

}

Playback.prototype.state = function (deviceId) {
  return new Promise(function(resolve, reject) {
    Promise.props({
      Connected: tredis.exists('musichub.device.' + deviceId + '.connection'),
      Current: tredis.get('musichub.device.' + deviceId + '.current'),
      Duration: tredis.get('musichub.device.' + deviceId + '.duration'),
      Playing: tredis.get('musichub.device.' + deviceId + '.playing'),
      Paused: tredis.get('musichub.device.' + deviceId + '.paused'),
      FromTime: tredis.get('musichub.device.' + deviceId + '.fromtime'),
      Position: tredis.get('musichub.device.' + deviceId + '.position'),
      Queue: tredis.lrange('musichub.device.' + deviceId + '.queue', 0, -1)
    }).then(function(result) {
      resolve({
        Device: deviceId,
        Connected: Boolean(parseInt(result.Connected)),
        Current: parseInt(result.Current),
        Duration: parseInt(result.Duration),
        Playing: Boolean(parseInt(result.Playing)),
        Paused: Boolean(parseInt(result.Paused)),
        FromTime: parseInt(result.FromTime),
        Position: parseInt(result.Position),
        Queue: result.Queue.map(function(item) {
          return parseInt(item);
        })
      });
    });
  });
}

Playback.prototype.updateState = function (deviceId) {
  return new Promise(function(resolve, reject) {
    Promise.props({
      current: tredis.lpop('musichub.device.' + deviceId + '.queue'),
      currentDeviceTrack: tredis.lpop('musichub.device.' + deviceId + '.queue.device'),
    }).then(function(props) {
      tredis.set('musichub.device.' + deviceId + '.current', props.current).then(function() {
        new models.DeviceTrack({
          DeviceId: deviceId,
          TrackId: props.current
        }).fetch().then(function(dt) {
          tredis.set('musichub.device.' + deviceId + '.duration', dt.get('TrackDuration')).then(function() {
            resolve(props.currentDeviceTrack);
          })
        });
      });
    })
  });
}

Playback.prototype.updatePosition = function (deviceId) {
  return new Promise(function(resolve, reject) {
    tredis.get('musichub.device.' + deviceId + '.position').then(function(currentPosition) {
      tredis.get('musichub.device.' + deviceId + '.fromtime').then(function(fromTime) {
        var newPosition = parseInt(currentPosition) + (Date.now() - parseInt(fromTime));
        tredis.set('musichub.device.' + deviceId + '.position', newPosition).then(function() {
          resolve();
        });
      });
    });
  });
}

Playback.prototype.addTrackToQueue = function (deviceId, trackId) {
  return new Promise(function(resolve, reject) {
    new models.DeviceTrack({
      DeviceId: deviceId,
      TrackId: trackId
    }).fetch().then(function(dt) {
      var deviceTrackId = dt.get('DeviceTrackId');
      Promise.all([
        tredis.rpush('musichub.device.' + deviceId + '.queue', trackId),
        tredis.rpush('musichub.device.' + deviceId + '.queue.device', deviceTrackId)
      ]).then(function() {
        resolve();
      })
    });
  });
}

Playback.prototype.requestNext = function (deviceId) {
  return new Promise(function(resolve, reject) {
    tredis.set('musichub.device.' + deviceId + '.playing', 0).then(function() {
    	resolve();
    });
  });
}

Playback.prototype.play = function (deviceId) {
  return new Promise(function(resolve, reject) {
    Promise.all([
      tredis.set('musichub.device.' + deviceId + '.playing', 1),
      tredis.set('musichub.device.' + deviceId + '.paused', 0),
      tredis.set('musichub.device.' + deviceId + '.fromtime', Date.now())
    ]).then(function() {
    	resolve();
    });
  });
}

Playback.prototype.next = function (deviceId) {
  return new Promise(function(resolve, reject) {
    tredis.llen('musichub.device.' + deviceId + '.queue').then(function(queueLen) {
      if (parseInt(queueLen) > 0) {
        Promise.all([
          tredis.set('musichub.device.' + deviceId + '.playing', 1),
          tredis.set('musichub.device.' + deviceId + '.paused', 0)
        ]).then(function() {
          this.updateState(deviceId).then(function(currentDeviceTrack) {
            tredis.set('musichub.device.' + deviceId + '.fromtime', Date.now()).then(function() {
              tredis.set('musichub.device.' + deviceId + '.position', 0).then(function() {
                resolve(currentDeviceTrack);
              });
            });
          });
        }.bind(this));
      }
      else {
        Promise.all([
          tredis.del('musichub.device.' + deviceId + '.current'),
          tredis.del('musichub.device.' + deviceId + '.duration'),
          tredis.del('musichub.device.' + deviceId + '.playing'),
          tredis.del('musichub.device.' + deviceId + '.paused'),
          tredis.del('musichub.device.' + deviceId + '.fromtime'),
          tredis.del('musichub.device.' + deviceId + '.position'),
          tredis.del('musichub.device.' + deviceId + '.queue')
        ]).then(function() {
          resolve(null);
        });
      }
    }.bind(this));
  }.bind(this));  
}

module.exports = Playback;