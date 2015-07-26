var FluxMixin = Fluxxor.FluxMixin(React);
var StoreWatchMixin = Fluxxor.StoreWatchMixin;

var actions = {
    showAlbumsByArtist: function(artist) {
        this.dispatch('SHOW_ALBUMS_BY_ARTIST', artist);
    },

    showTracksByAlbum: function(album) {
        this.dispatch('SHOW_TRACKS_BY_ALBUM', album);
    },

    back: function() {
        this.dispatch('BACK');
    },

    showArtists: function() {
        this.dispatch('SHOW_ARTISTS');
    },

    showAlbums: function() {
        this.dispatch('SHOW_ALBUMS');
    },

    showTracks: function() {
        this.dispatch('SHOW_TRACKS');
    },

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

var CollectionStore = Fluxxor.createStore({
    device: null,
    bearer: null,
    artist: null,
    album: null,
    view: null,

    actions: {
        'DEVICE_START': 'startDevice',
        'SHOW_ALBUMS_BY_ARTIST': 'showAlbumsByArtist',
        'SHOW_TRACKS_BY_ALBUM': 'showTracksByAlbum',
        'SHOW_ARTISTS': 'showArtists',
        'SHOW_ALBUMS': 'showAlbums',
        'SHOW_TRACKS': 'showTracks',
        'BACK': 'back'
    },

    initialize: function() {
        this.showArtists();
    },

    startDevice: function(payload) {
        this.device = payload.device;
        this.bearer = payload.bearer;
    },

    showArtists: function() {
        this.view = 'artists';
        this.artist = null;
        this.album = null;
        this.emit('change');
    },

    showAlbums: function() {
        this.view = 'albums';
        this.artist = null;
        this.album = null;
        this.emit('change');
    },

    showTracks: function() {
        this.view = 'tracks';
        this.artist = null;
        this.album = null;
        this.emit('change');
    },

    showAlbumsByArtist: function(artist) {
        this.view = 'albums';
        this.artist = artist;
        this.album = null;
        this.emit('change');
    },

    showTracksByAlbum: function(album) {
        this.view = 'tracks';
        this.album = album;
        this.emit('change');
    },

    back: function() {
        if (this.album !== null) {
            this.view = 'albums';
            this.album = null;
            this.emit('change');
            return;
        }

        if (this.artist !== null) {
            this.view = 'artists'
            this.artist = null;
            this.emit('change');
            return;
        }
    }
});

var DeviceStateStore = Fluxxor.createStore({
    device: null,
    bearer: null,

    connected: false,
    playing: false,
    current: null,
    duration: 0,
    lastPause: null,
    queue: [],

    submission_processing: false,
    submission_progress: 0,

    actions: {
        'DEVICE_STATE': 'receiveDeviceState',
        'DEVICE_SUBMISSION': 'receiveDeviceSubmission',
        'DEVICE_START': 'startDevice',
        'SEND_QUEUE': 'sendQueue',
        'PLAYER_PAUSE': 'sendPause',
        'PLAYER_PLAY': 'sendPlay',
        'PLAYER_NEXT': 'sendNext'
    },

    startDevice: function(payload) {
        this.device = payload.device;
        this.bearer = payload.bearer;

        window.socket = io(window.location.origin);
        socket.on('connect', function() {
          socket.emit('authentication', this.bearer);
          socket.on('authenticated', function() {
            socket.on('SetState', function(state) {
              flux.actions.receiveDeviceState(state);
            });

            window.socket.emit('RegisterClient', {DeviceId: this.device});
            socket.on('ClientRegistered', function() {
              window.socket.emit('GetState', this.device);
            }.bind(this));

            socket.on('Submission', function(state) {
              flux.actions.receiveSubmissionState(state);
            });
          }.bind(this));
        }.bind(this));
    },

    receiveDeviceState: function(deviceState) {
        this.connected = deviceState.Connected;
        this.playing = deviceState.Playing;
        this.current = deviceState.Current;
        this.duration = deviceState.Duration;
        this.lastPause = deviceState.LastPause;
        this.queue = deviceState.Queue;
        console.log(deviceState);
        this.emit('change');
    },

    receiveDeviceSubmission: function(state) {
      this.submission_processing = state.processing;
      this.submission_progress = state.progress;
      this.emit('change');
    },

    sendQueue: function(trackIds) {
        console.log(trackIds);
        window.socket.emit('Queue', {DeviceId: this.device, TrackIds: trackIds});
    },

    sendPause: function() {
      window.socket.emit('Pause', {DeviceId: this.device});
    },

    sendPlay: function() {
      window.socket.emit('Play', {DeviceId: this.device});
    },

    sendNext: function() {
      window.socket.emit('RequestNext', {DeviceId: this.device});
    }
});

var AuthStore = Fluxxor.createStore({
    bearer: null,
    devices: [],
    device: null,

    actions: {
        'AUTH_SIGNIN': 'signIn',
        'DEVICE_START': 'startDevice'
    },

    signIn: function(bearer) {
      this.bearer = bearer;
      jQuery.ajax('/api/Devices', {
          headers: {
              'Authorization': 'Bearer ' + this.bearer
          }
      }).done(function(data) {
          this.devices = data;
          this.emit('change');
      }.bind(this));
    },

    startDevice: function(payload) {
        this.device = payload.device;
        this.emit('change');
    }
});

var flux = new Fluxxor.Flux({
    CollectionStore: new CollectionStore(),
    DeviceStateStore: new DeviceStateStore(),
    AuthStore: new AuthStore()
}, actions);
