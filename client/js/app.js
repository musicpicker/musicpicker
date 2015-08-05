var FluxMixin = Fluxxor.FluxMixin(React);
var StoreWatchMixin = Fluxxor.StoreWatchMixin;

var RouteHandler = ReactRouter.RouteHandler;
var Route = ReactRouter.Route;
var DefaultRoute = ReactRouter.DefaultRoute;
var Redirect = ReactRouter.Redirect;
var Navigation = ReactRouter.Navigation;
var Link = ReactRouter.Link;

var actions = {
    receiveDeviceState: function(deviceState) {
        this.dispatch('DEVICE_STATE', deviceState);
    },

    queue: function(deviceId, trackIds) {
        this.dispatch('SEND_QUEUE', {device: deviceId, tracks: trackIds});
    },

    play: function(deviceId) {
        this.dispatch('PLAYER_PLAY', deviceId);
    },

    pause: function(deviceId) {
        this.dispatch('PLAYER_PAUSE', deviceId);
    },

    next: function(deviceId) {
        this.dispatch('PLAYER_NEXT', deviceId);
    },

    startDevices: function() {
        this.dispatch('DEVICES_START');
    },

    receiveSubmissionState: function(state) {
      this.dispatch('DEVICE_SUBMISSION', state);
    }
};

var DeviceSubmissionStore = Fluxxor.createStore({
  submissions: {},

  actions: {
    'DEVICE_SUBMISSION': 'receiveDeviceSubmission'
  },

  receiveDeviceSubmission: function(state) {
    this.submissions[state.device] = state;
    this.emit('change');
  }
});

var DeviceStateStore = Fluxxor.createStore({
    devices: {},

    actions: {
        'DEVICE_STATE': 'receiveDeviceState',
        'SEND_QUEUE': 'sendQueue',
        'PLAYER_PAUSE': 'sendPause',
        'PLAYER_PLAY': 'sendPlay',
        'PLAYER_NEXT': 'sendNext'
    },

    receiveDeviceState: function(deviceState) {
        if (this.devices[deviceState.Device] === undefined) {
          this.devices[deviceState.Device] = {
            artwork: null
          };
        }

        var isNew = deviceState.Current !== this.devices[deviceState.Device].current;

        this.devices[deviceState.Device].connected = deviceState.Connected;
        this.devices[deviceState.Device].playing =  deviceState.Playing;
        this.devices[deviceState.Device].paused = deviceState.Paused;
        this.devices[deviceState.Device].current = deviceState.Current;
        this.devices[deviceState.Device].duration = deviceState.Duration;
        this.devices[deviceState.Device].queue = deviceState.Queue;

        this.updatePosition(deviceState);

        if (isNew) {
          this.getArtwork(deviceState);
        }

        this.emit('change');
    },

    getArtwork: function(deviceState) {
      if (deviceState.Current !== null) {
        jQuery.ajax('/api/Tracks/' + deviceState.Current).done(function(track) {
          this.devices[deviceState.Device].artwork = track.album.Artwork;
        }.bind(this));

        this.emit('change');
      }
    },

    updatePosition: function(deviceState) {
      var deviceId = deviceState.Device;

      socket.on('Clock', function(date) {
        this.devices[deviceId].offset = - (Date.now() - date);
        if (this.devices[deviceId].cancelInterval !== null) {
          clearInterval(this.devices[deviceId].cancelInterval);
          this.devices[deviceId].cancelInterval = null;
         }
        if (!this.devices[deviceId].paused && this.devices[deviceId].playing) {
            this.devices[deviceId].position = (this.devices[deviceId].offset + deviceState.Position + (Date.now() - deviceState.FromTime));
            this.devices[deviceId].cancelInterval = setInterval(function() {
              this.devices[deviceId].position += 1000;
              this.emit('change');
            }.bind(this), 1000);
        }
        else {
          this.devices[deviceId].position = deviceState.Position;
          this.emit('change');
        }
      }.bind(this));
      socket.emit('Clock', Date.now());
    },

    sendQueue: function(payload) {
        window.socket.emit('Queue', {DeviceId: payload.device, TrackIds: payload.tracks});
    },

    sendPause: function(deviceId) {
      window.socket.emit('Pause', {DeviceId: deviceId});
    },

    sendPlay: function(deviceId) {
      window.socket.emit('Play', {DeviceId: deviceId});
    },

    sendNext: function(deviceId) {
      window.socket.emit('RequestNext', {DeviceId: deviceId});
    }
});

var AuthStore = Fluxxor.createStore({
    actions: {
        'DEVICES_START': 'startDevices'
    },

    startDevices: function() {
      socket.on('connect', function() {
        jQuery.ajax('/socket-token').done(function(token) {
          socket.emit('authentication', token);
          socket.on('authenticated', function() {
            socket.on('SetState', function(state) {
              flux.actions.receiveDeviceState(state);
            });

            socket.on('Submission', function(state) {
              flux.actions.receiveSubmissionState(state);
            });

            jQuery.ajax('/api/Devices').done(function(devices) {
              devices.forEach(function(device) {
                socket.on('ClientRegistered', function() {
                  socket.emit('GetState', device.Id);
                }.bind(this));
                socket.emit('RegisterClient', {DeviceId: device.Id});
              }.bind(this));
            }.bind(this));
          }.bind(this));
        })
      }.bind(this));
      
      this.emit('change');
    }
});

var flux = new Fluxxor.Flux({
    DeviceStateStore: new DeviceStateStore(),
    DeviceSubmissionStore: new DeviceSubmissionStore(),
    AuthStore: new AuthStore()
}, actions);
