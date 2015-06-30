var redis = require('redis-scanstreams')(require('redis')).createClient();
var tredis = require('then-redis').createClient();
var Promise = require('bluebird');
var models = require('./models');

function deviceConnected(deviceId) {
  return new Promise(function(resolve, reject) {
    tredis.exists('musichub.device.' + deviceId + '.connection').then(function(result) {
      resolve(Boolean(parseInt(result)));
    });
  });
}

function createDeviceState(deviceId) {
  return new Promise(function(resolve, reject) {
    Promise.props({
      Current: tredis.get('musichub.device.' + deviceId + '.current'),
      Duration: tredis.get('musichub.device.' + deviceId + '.duration'),
      Playing: tredis.get('musichub.device.' + deviceId + '.playing'),
      Paused: tredis.get('musichub.device.' + deviceId + '.paused'),
      Queue: tredis.lrange('musichub.device.' + deviceId + '.queue', 0, -1)
    }).then(function(result) {
      resolve({
        Current: parseInt(result.Current),
        Duration: parseInt(result.Duration),
        Playing: Boolean(parseInt(result.Playing)),
        Paused: Boolean(parseInt(result.Paused)),
        Queue: result.Queue.map(function(item) {
          return parseInt(item);
        })
      });
    });
  });
}

function isRegistered(clientId, deviceId) {
  return new Promise(function(resolve, reject) {
    tredis.get('musichub.device.' + deviceId + '.connection').then(function(deviceConnection) {
      if (deviceConnection === clientId) {
        resolve(true);
      }
      else {
        tredis.sismember('musichub.device.' + deviceId + '.clients').then(function(reply) {
          resolve(Boolean(parseInt(reply)));
        });
      }
    });
  });
}

function sendClientState(io, socket, deviceId) {
  return new Promise(function(resolve, reject) {
    createDeviceState(deviceId).then(function(state) {
      io.sockets.to('device.' + deviceId).emit('SetState', state);
      resolve();
    });
  });
}

function updateState(deviceId) {
  return new Promise(function(resolve, reject) {
    Promise.props({
      current: tredis.lpop('musichub.device.' + deviceId + '.queue'),
      currentDeviceTrack: tredis.lpop('musichub.device.' + deviceId + '.queue.device'),
    }).then(function(props) {
      tredis.set('musichub.device.' + deviceId + '.current', props.current);
      new models.DeviceTrack({
        DeviceId: deviceId,
        TrackId: props.current
      }).fetch().then(function(dt) {
        tredis.set('musichub.device.' + deviceId + '.duration', dt.get('TrackDuration'));
        resolve(props.currentDeviceTrack);
      });
    })
  });
}

function addTrackToQueue(deviceId, trackId) {
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

function requestNext(io, socket, deviceId) {
  tredis.set('musichub.device.' + deviceId + '.playing', 0);
  sendClientState(io, socket, deviceId).then(function() {
    tredis.get('musichub.device.' + deviceId + '.connection').then(function(deviceClientId) {
      io.sockets.to(deviceClientId).emit('Stop');
    });
  });
}

function play(io, socket, deviceId) {
  tredis.get('musichub.device.' + deviceId + '.connection').then(function(deviceClientId) {
    tredis.llen('musichub.device.' + deviceId + '.queue').then(function(queueLen) {
      if (parseInt(queueLen) > 0) {
        tredis.set('musichub.device.' + deviceId + '.playing', 1);
        tredis.get('musichub.device.' + deviceId + '.paused').then(function(paused) {
          io.sockets.to(deviceClientId).emit('Stop');
          updateState(deviceId).then(function(currentDeviceTrack) {
            io.sockets.to(deviceClientId).emit('SetTrackId', currentDeviceTrack);
            io.sockets.to(deviceClientId).emit('Play');
            sendClientState(io, socket, deviceId);
          })
        });
      }
      else {
        tredis.set('musichub.device.' + deviceId + '.paused', 0);
        io.sockets.to(deviceClientId).emit('Play');
        sendClientState(io, socket, deviceId);
      }
    });
  })
}

function hub(io, clientId, socket) {
  socket.on('RegisterDevice', function(data) {
    var deviceId = data;
    tredis.set('musichub.devices.' + clientId, deviceId);
    tredis.set('musichub.device.' + deviceId + '.connection', clientId);
  });

  socket.on('RegisterClient', function(data) {
    var deviceId = data.DeviceId;
    tredis.sadd('musichub.client.' + clientId + '.devices', deviceId);
    tredis.sadd('musichub.device.' + deviceId + '.clients', clientId);
    socket.join('device.' + deviceId);
  });

  socket.on('Queue', function(data) {
    var deviceId = data.DeviceId;
    var trackIds = data.TrackIds;

    Promise.all([
      tredis.del('musichub.device.' + deviceId + '.queue'),
      tredis.del('musichub.device.' + deviceId + '.queue.device')
    ]).then(function() {
      Promise.each(trackIds, function(trackId) {
        return addTrackToQueue(deviceId, trackId);
      }).then(function() {
        sendClientState(io, socket, deviceId).then(function() {
          tredis.get('musichub.device.' + deviceId + '.playing').then(function(playing) {
            if (Boolean(parseInt(playing))) {
              requestNext(io, socket, deviceId);
            }
            else {
              tredis.set('musichub.device.' + deviceId + '.playing', 0).then(function() {
                play(io, socket, deviceId);
              });
            }
          });
        })
      });
    });
  });

  socket.on('GetState', function(data) {
    createDeviceState(data.DeviceId).then(function(state) {
      socket.emit('SetState', state);
    })
  });

  socket.on('Play', function(data) {
    play(io, socket, data.DeviceId);
  });

  socket.on('Pause', function(data) {
    var deviceId = data.DeviceId;
    Promise.all([
      tredis.set('musichub.device.' + deviceId + '.playing', 0),
      tredis.set('musichub.device.' + deviceId + '.paused', 1)
    ]).then(function() {
      sendClientState(io, socket, deviceId);
    });
    tredis.get('musichub.device.' + deviceId + '.connection').then(function(deviceClientId) {
      io.sockets.to(deviceClientId).emit('Pause');
    });
  })

  socket.on('RequestNext', function(data) {
    requestNext(io, socket, data.DeviceId);
  });

  socket.on('Next', function(data) {
    var deviceId = data;
    tredis.llen('musichub.device.' + deviceId + '.queue').then(function(queueLen) {
      queueLen = parseInt(queueLen);
      if (queueLen !== 0) {
        play(io, socket, deviceId);
      }
    })
  });
}

module.exports = function(io) {
  io.on('connection', function(socket) {
    var clientId = socket.id;
    hub(io, clientId, socket);
    console.log('hello ' + clientId);
    socket.on('disconnect', function(socket) {
      console.log('goodbye ' + clientId);
    })
  })
}
