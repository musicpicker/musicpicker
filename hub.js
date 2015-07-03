var redis = require('redis-scanstreams')(require('redis')).createClient();
var tredis = require('then-redis').createClient();
var redisChan = require('redis').createClient();
var kue = require('kue');
var queue = require('./queue');
var auth = require('socketio-auth');
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
      Connected: tredis.exists('musichub.device.' + deviceId + '.connection'),
      Current: tredis.get('musichub.device.' + deviceId + '.current'),
      Duration: tredis.get('musichub.device.' + deviceId + '.duration'),
      Playing: tredis.get('musichub.device.' + deviceId + '.playing'),
      Paused: tredis.get('musichub.device.' + deviceId + '.paused'),
      Queue: tredis.lrange('musichub.device.' + deviceId + '.queue', 0, -1)
    }).then(function(result) {
      resolve({
        Connected: Boolean(parseInt(result.Connected)),
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
        tredis.sismember('musichub.device.' + deviceId + '.clients', clientId).then(function(reply) {
          resolve(Boolean(parseInt(reply)));
        });
      }
    });
  });
}

function checkRegistration(clientId, deviceId, skipDevice) {
  return new Promise(function(resolve, reject) {
    isRegistered(clientId, deviceId).then(function(registered) {
      if (registered) {
        if (skipDevice === true) {
          return resolve();
        }
        tredis.exists('musichub.device.' + deviceId + '.connection').then(function(exists) {
          if (Boolean(parseInt(exists))) {
            resolve();
          }
        })
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
  tredis.set('musichub.device.' + deviceId + '.playing', 0).then(function() {
    sendClientState(io, socket, deviceId).then(function() {
      tredis.get('musichub.device.' + deviceId + '.connection').then(function(deviceClientId) {
        io.sockets.to(deviceClientId).emit('Stop');
      });
    });
  });
}

function play(io, socket, deviceId, fromNext) {
  tredis.get('musichub.device.' + deviceId + '.connection').then(function(deviceClientId) {
    tredis.llen('musichub.device.' + deviceId + '.queue').then(function(queueLen) {
      if (parseInt(queueLen) > 0) {
        tredis.set('musichub.device.' + deviceId + '.playing', 1);
        if (fromNext) {
          io.sockets.to(deviceClientId).emit('Stop');
          updateState(deviceId).then(function(currentDeviceTrack) {
            io.sockets.to(deviceClientId).emit('SetTrackId', currentDeviceTrack);
            io.sockets.to(deviceClientId).emit('Play');
            sendClientState(io, socket, deviceId);
          });
        }
        else {
          tredis.set('musichub.device.' + deviceId + '.paused', 0).then(function() {
            io.sockets.to(deviceClientId).emit('Play');
            sendClientState(io, socket, deviceId);
          });
        }
      }
    });
  })
}

function onDisconnect(io, socket, clientId) {
  tredis.get('musichub.devices.' + clientId).then(function(deviceId) {
    if (deviceId !== null) {
      Promise.all([
        tredis.del('musichub.device.' + deviceId + '.current'),
        tredis.del('musichub.device.' + deviceId + '.duration'),
        tredis.del('musichub.device.' + deviceId + '.playing'),
        tredis.del('musichub.device.' + deviceId + '.paused'),
        tredis.del('musichub.device.' + deviceId + '.queue'),
        tredis.del('musichub.device.' + deviceId + '.queue.device'),
        tredis.del('musichub.device.' + deviceId + '.connection'),
      ]);
      sendClientState(io, socket, deviceId);
    }
    else {
      tredis.smembers('musichub.client.' + clientId + '.devices').then(function(members) {
        members.forEach(function(member) {
          tredis.srem('musichub.client.' + clientId + '.devices', member);
          tredis.srem('musichub.device.' + member + '.clients', clientId);
        }.bind(this));
      });
    }
  });
}

function reportSubmissionStatus(socket, deviceId) {
  redisChan.on('message', function(channel, message) {
    if (channel === 'submissions.' + deviceId + '.progress') {
      socket.emit('Submission', {
        processing: true,
        progress: parseInt(message)
      });
    }

    if (channel === 'submissions.' + deviceId + '.processing') {
      socket.emit('Submission', {
        processing: Boolean(parseInt(message))
      });
    }
  });
  redisChan.subscribe('submissions.' + deviceId + '.processing');
  redisChan.subscribe('submissions.' + deviceId + '.progress');
}

function hub(io, clientId, socket) {
  socket.on('RegisterDevice', function(deviceId) {
    new models.Device({
      Id: deviceId
    }).fetch().then(function(device) {
      if (device.get('OwnerId') === socket.client.user.id) {
        tredis.set('musichub.devices.' + clientId, deviceId);
        tredis.set('musichub.device.' + deviceId + '.connection', clientId);
        sendClientState(io, socket, deviceId);
      }
    });
  });

  socket.on('RegisterClient', function(data) {
    var deviceId = data.DeviceId;
    new models.Device({
      Id: deviceId
    }).fetch().then(function(device) {
      if (device.get('OwnerId') === socket.client.user.id) {
        Promise.all([
          tredis.sadd('musichub.client.' + clientId + '.devices', deviceId),
          tredis.sadd('musichub.device.' + deviceId + '.clients', clientId),
          socket.join('device.' + deviceId)
        ]).then(function() {
          socket.emit('ClientRegistered');
        });
        reportSubmissionStatus(socket, deviceId);
      }
    });
  });

  socket.on('Queue', function(data) {
    var deviceId = data.DeviceId;
    var trackIds = data.TrackIds;

    checkRegistration(socket.id, deviceId).then(function() {
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
                  play(io, socket, deviceId, true);
                });
              }
            });
          })
        });
      });
    });
  });

  socket.on('GetState', function(deviceId) {
    checkRegistration(socket.id, deviceId, true).then(function() {
      createDeviceState(deviceId).then(function(state) {
        socket.emit('SetState', state);
      })
    });
  });

  socket.on('Play', function(data) {
    checkRegistration(socket.id, data.DeviceId).then(function() {
      play(io, socket, data.DeviceId);
    });
  });

  socket.on('Pause', function(data) {
    checkRegistration(socket.id, data.DeviceId).then(function() {
      var deviceId = data.DeviceId;
      Promise.all([
        tredis.set('musichub.device.' + deviceId + '.playing', 0),
        tredis.set('musichub.device.' + deviceId + '.paused', 1)
      ]).then(function() {
        sendClientState(io, socket, deviceId);
        tredis.get('musichub.device.' + deviceId + '.connection').then(function(deviceClientId) {
          io.sockets.to(deviceClientId).emit('Pause');
        });
      });
    });
  })

  socket.on('RequestNext', function(data) {
    checkRegistration(socket.id, data.DeviceId).then(function() {
      requestNext(io, socket, data.DeviceId);
    });
  });

  socket.on('Next', function(deviceId) {
    checkRegistration(socket.id, deviceId).then(function() {
      tredis.llen('musichub.device.' + deviceId + '.queue').then(function(queueLen) {
        queueLen = parseInt(queueLen);
        if (queueLen !== 0) {
          play(io, socket, deviceId, true);
        }
      })
    });
  });
}

function authenticate(token, callback) {
  new models.User({
    Token: token
  }).fetch().then(function(user) {
    return callback(null, true);
  }).catch(function(err) {
    return callback(new Error('Invalid authentication token'));
  });
}

function postAuthenticate(socket, token) {
  new models.User({
    Token: token
  }).fetch().then(function(user) {
    socket.client.user = user;
  }).catch(function(err) {
    return callback(new Error('Invalid authentication token'));
  });
}

module.exports = function(io) {
  auth(io, {
    authenticate: authenticate,
    postAuthenticate: postAuthenticate
  });

  io.on('connection', function(socket) {
    var clientId = socket.id;
    hub(io, clientId, socket);
    socket.on('disconnect', function(socket) {
      onDisconnect(io, socket, clientId);
    })
  })
}
