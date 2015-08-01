var config = require('config');
var redis = require('redis-scanstreams')(require('redis')).createClient(6379, config.get('redis.host'));
var tredis = require('then-redis').createClient(config.get('redis'));
var redisChan = require('redis').createClient(6379, config.get('redis.host'));
var kue = require('kue');
var queue = require('./queue');
var auth = require('socketio-auth');
var Promise = require('bluebird');
var models = require('./models');
var metrics = require('./statsd').lynx;

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
          else {
            reject();
          }
        })
      }
      else {
        reject();
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

function updatePosition(deviceId) {
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
  return new Promise(function(resolve, reject) {
    tredis.set('musichub.device.' + deviceId + '.playing', 0).then(function() {
      sendClientState(io, socket, deviceId).then(function() {
        tredis.get('musichub.device.' + deviceId + '.connection').then(function(deviceClientId) {
          io.sockets.to(deviceClientId).emit('Stop');
          resolve();
        });
      });
    });
  });
}

function play(io, socket, deviceId) {
  return new Promise(function(resolve, reject) {
    tredis.get('musichub.device.' + deviceId + '.connection').then(function(deviceClientId) {
      tredis.llen('musichub.device.' + deviceId + '.queue').then(function(queueLen) {
        if (parseInt(queueLen) > 0) {
          Promise.all([
            tredis.set('musichub.device.' + deviceId + '.playing', 1),
            tredis.set('musichub.device.' + deviceId + '.paused', 0),
            tredis.set('musichub.device.' + deviceId + '.fromtime', Date.now())
          ]).then(function() {
            io.sockets.to(deviceClientId).emit('Play');
            sendClientState(io, socket, deviceId).then(function() {
              resolve();
            });
          });
        }
        else {
          resolve();
        }
      });
    })
  });
}

function next(io, socket, deviceId) {
  return new Promise(function(resolve, reject) {
    tredis.get('musichub.device.' + deviceId + '.connection').then(function(deviceClientId) {
      tredis.llen('musichub.device.' + deviceId + '.queue').then(function(queueLen) {
        if (parseInt(queueLen) > 0) {
          Promise.all([
            tredis.set('musichub.device.' + deviceId + '.playing', 1),
            tredis.set('musichub.device.' + deviceId + '.paused', 0)
          ]).then(function() {
            io.sockets.to(deviceClientId).emit('Stop');
            updateState(deviceId).then(function(currentDeviceTrack) {
              tredis.set('musichub.device.' + deviceId + '.fromtime', Date.now()).then(function() {
                tredis.set('musichub.device.' + deviceId + '.position', 0).then(function() {
                  io.sockets.to(deviceClientId).emit('SetTrackId', currentDeviceTrack);
                  io.sockets.to(deviceClientId).emit('Play');
                  sendClientState(io, socket, deviceId).then(function() {
                    resolve();
                  });
                });
              });
            });
          });
        }
        else {
          resolve();
        }
      });
    })
  });  
}

function onDisconnect(io, socket, clientId) {
  tredis.get('musichub.devices.' + clientId).then(function(deviceId) {
    if (deviceId !== null) {
      Promise.all([
        tredis.del('musichub.device.' + deviceId + '.current'),
        tredis.del('musichub.device.' + deviceId + '.duration'),
        tredis.del('musichub.device.' + deviceId + '.playing'),
        tredis.del('musichub.device.' + deviceId + '.paused'),
        tredis.del('musichub.device.' + deviceId + '.fromtime'),
        tredis.del('musichub.device.' + deviceId + '.position'),
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
        device: deviceId,
        processing: true,
        progress: parseInt(message)
      });
    }

    if (channel === 'submissions.' + deviceId + '.processing') {
      socket.emit('Submission', {
        device: deviceId,
        processing: Boolean(parseInt(message))
      });
    }
  });
  redisChan.subscribe('submissions.' + deviceId + '.processing');
  redisChan.subscribe('submissions.' + deviceId + '.progress');
}

function hub(io, clientId, socket) {
  socket.on('RegisterDevice', function(deviceId) {
    var timer = metrics.createTimer('hub.RegisterDevice.response_time');
    metrics.increment('hub.RegisterDevice.calls');
    new models.Device({
      Id: deviceId
    }).fetch().then(function(device) {
      if (device === null) {
        socket.emit('DeviceNotFound', deviceId);
        timer.stop();
        return;
      }
      if (device.get('OwnerId') === socket.client.user.id) {
        Promise.all([
          tredis.set('musichub.devices.' + clientId, deviceId),
          tredis.set('musichub.device.' + deviceId + '.connection', clientId),
          sendClientState(io, socket, deviceId)
        ]).then(function() {
          timer.stop();
        });
      }
      else {
        timer.stop();
      }
    });
  });

  socket.on('RegisterClient', function(data) {
    var timer = metrics.createTimer('hub.RegisterClient.response_time');
    metrics.increment('hub.RegisterClient.calls');
    var deviceId = data.DeviceId;
    new models.Device({
      Id: deviceId
    }).fetch().then(function(device) {
      if (device === null) {
        socket.emit('DeviceNotFound', deviceId);
        timer.stop();
        return;
      }

      if (device.get('OwnerId') === socket.client.user.id) {
        Promise.all([
          tredis.sadd('musichub.client.' + clientId + '.devices', deviceId),
          tredis.sadd('musichub.device.' + deviceId + '.clients', clientId),
          socket.join('device.' + deviceId)
        ]).then(function() {
          socket.emit('ClientRegistered');
          reportSubmissionStatus(socket, deviceId);
          timer.stop();
        });
      }
      else {
        timer.stop();
      }
    });
  });

  socket.on('Queue', function(data) {
    var timer = metrics.createTimer('hub.Queue.response_time');
    metrics.increment('hub.Queue.calls');
    var deviceId = data.DeviceId;
    var trackIds = data.TrackIds.slice(0, 100);

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
                timer.stop();
              }
              else {
                tredis.set('musichub.device.' + deviceId + '.playing', 0).then(function() {
                  next(io, socket, deviceId);
                  timer.stop();
                });
              }
            });
          })
        });
      });
    }).catch(function() {
      socket.emit('DeviceNotFound', deviceId);
      timer.stop();
    });
  });

  socket.on('GetState', function(deviceId) {
    var timer = metrics.createTimer('hub.GetState.response_time');
    metrics.increment('hub.GetState.calls');
    checkRegistration(socket.id, deviceId, true).then(function() {
      createDeviceState(deviceId).then(function(state) {
        socket.emit('SetState', state);
        timer.stop();
      })
    }).catch(function() {
      socket.emit('DeviceNotFound', deviceId);
      timer.stop();
    });
  });

  socket.on('Play', function(data) {
    var timer = metrics.createTimer('hub.Play.response_time');
    metrics.increment('hub.Play.calls');
    checkRegistration(socket.id, data.DeviceId).then(function() {
      play(io, socket, data.DeviceId).then(function() {
        timer.stop();
      });
    }).catch(function() {
      socket.emit('DeviceNotFound', data.DeviceId);
      timer.stop();
    });
  });

  socket.on('Pause', function(data) {
    var timer = metrics.createTimer('hub.Pause.response_time');
    metrics.increment('hub.Pause.calls');
    checkRegistration(socket.id, data.DeviceId).then(function() {
      var deviceId = data.DeviceId;
      Promise.all([
        tredis.set('musichub.device.' + deviceId + '.paused', 1),
        updatePosition(deviceId)
      ]).then(function() {
        sendClientState(io, socket, deviceId);
        tredis.get('musichub.device.' + deviceId + '.connection').then(function(deviceClientId) {
          io.sockets.to(deviceClientId).emit('Pause');
          timer.stop();
        });
      });
    }).catch(function() {
      socket.emit('DeviceNotFound', data.DeviceId);
      timer.stop();
    });
  })

  socket.on('RequestNext', function(data) {
    var timer = metrics.createTimer('hub.RequestNext.response_time');
    metrics.increment('hub.RequestNext.calls');
    checkRegistration(socket.id, data.DeviceId).then(function() {
      requestNext(io, socket, data.DeviceId).then(function() {
        timer.stop();
      })
    }).catch(function() {
      socket.emit('DeviceNotFound', data.DeviceId);
      timer.stop();
    });
  });

  socket.on('Next', function(deviceId) {
    var timer = metrics.createTimer('hub.Next.response_time');
    metrics.increment('hub.Next.calls');
    checkRegistration(socket.id, deviceId).then(function() {
      tredis.llen('musichub.device.' + deviceId + '.queue').then(function(queueLen) {
        queueLen = parseInt(queueLen);
        if (queueLen !== 0) {
          next(io, socket, deviceId).then(function() {
            timer.stop();
          });
        }
        else {
          timer.stop();
        }
      })
    }).catch(function() {
      socket.emit('DeviceNotFound', deviceId);
      timer.stop();
    });
  });

  socket.on('Clock', function(clientDate) {
    metrics.increment('hub.Clock.calls');
    socket.emit('Clock', Date.now());
  })
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
    metrics.increment('hub.connects');
    var clientId = socket.id;
    hub(io, clientId, socket);
    socket.on('disconnect', function(socket) {
      metrics.increment('hub.disconnects');
      onDisconnect(io, socket, clientId);
    })
  })
}
