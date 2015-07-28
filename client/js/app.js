var FluxMixin = Fluxxor.FluxMixin(React);
var StoreWatchMixin = Fluxxor.StoreWatchMixin;

var RouteHandler = ReactRouter.RouteHandler;
var Route = ReactRouter.Route;
var DefaultRoute = ReactRouter.DefaultRoute;
var Navigation = ReactRouter.Navigation;
var Link = ReactRouter.Link;

var actions = {
    receiveDeviceState: function(deviceState) {
        this.dispatch('DEVICE_STATE', deviceState);
    },

    queue: function(trackIds) {
        this.dispatch('SEND_QUEUE', trackIds);
    },

    play: function() {
        this.dispatch('PLAYER_PLAY');
    },

    pause: function() {
        this.dispatch('PLAYER_PAUSE');
    },

    next: function() {
        this.dispatch('PLAYER_NEXT');
    },

    startDevice: function(deviceId, bearer) {
        this.dispatch('DEVICE_START', {device: deviceId, bearer: bearer});
    },

    signIn: function(bearer) {
        this.dispatch('AUTH_SIGNIN', bearer);
    },

    receiveSubmissionState: function(state) {
      this.dispatch('DEVICE_SUBMISSION', state);
    }
};

var DeviceStateStore = Fluxxor.createStore({
    devices: {},
    submissions: {},

    actions: {
        'DEVICE_STATE': 'receiveDeviceState',
        'DEVICE_SUBMISSION': 'receiveDeviceSubmission',
        'SEND_QUEUE': 'sendQueue',
        'PLAYER_PAUSE': 'sendPause',
        'PLAYER_PLAY': 'sendPlay',
        'PLAYER_NEXT': 'sendNext'
    },

    receiveDeviceState: function(deviceState) {
        if (this.devices[deviceState.Device] === undefined) {
          this.devices[deviceState.Device] = {};
        }

        this.devices[deviceState.Device].connected = deviceState.Connected;
        this.devices[deviceState.Device].playing =  deviceState.Playing;
        this.devices[deviceState.Device].paused = deviceState.Paused;
        this.devices[deviceState.Device].current = deviceState.Current;
        this.devices[deviceState.Device].duration = deviceState.Duration;
        this.devices[deviceState.Device].queue = deviceState.Queue;

        this.updatePosition(deviceState);
        this.emit('change');
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

    receiveDeviceSubmission: function(state) {
      this.submissions[state.device] = state;
      this.emit('change');
    },

    sendQueue: function(trackIds) {
        console.log(trackIds);
        window.socket.emit('Queue', {DeviceId: flux.store('AuthStore').device, TrackIds: trackIds});
    },

    sendPause: function() {
      window.socket.emit('Pause', {DeviceId: flux.store('AuthStore').device});
    },

    sendPlay: function() {
      window.socket.emit('Play', {DeviceId: flux.store('AuthStore').device});
    },

    sendNext: function() {
      window.socket.emit('RequestNext', {DeviceId: flux.store('AuthStore').device});
    }
});

var AuthStore = Fluxxor.createStore({
    bearer: null,
    device: null,

    actions: {
        'AUTH_SIGNIN': 'signIn',
        'DEVICE_START': 'startDevice'
    },

    signIn: function(bearer) {
      this.bearer = bearer;
      this.emit('change');
    },

    startDevice: function(payload) {
        this.device = payload.device;

        window.socket = io(window.location.origin);
        socket.on('connect', function() {
          socket.emit('authentication', this.bearer);
          socket.on('authenticated', function() {
            socket.on('SetState', function(state) {
              flux.actions.receiveDeviceState(state);
            });

            socket.emit('RegisterClient', {DeviceId: this.device});
            socket.on('ClientRegistered', function() {
              socket.emit('GetState', this.device);
            }.bind(this));

            socket.on('Submission', function(state) {
              flux.actions.receiveSubmissionState(state);
            });
          }.bind(this));
        }.bind(this));
        
        this.emit('change');
    }
});

var flux = new Fluxxor.Flux({
    DeviceStateStore: new DeviceStateStore(),
    AuthStore: new AuthStore()
}, actions);
