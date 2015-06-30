var FluxMixin = Fluxxor.FluxMixin(React);
var StoreWatchMixin = Fluxxor.StoreWatchMixin;

var actions = {
    showAlbumsByArtist: function(artist) {
        this.dispatch('SHOW_ALBUMS_BY_ARTIST', {artist: artist});
    },

    showTracksByAlbum: function(album) {
        this.dispatch('SHOW_TRACKS_BY_ALBUM', {album: album});
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
        this.dispatch('DEVICE_STATE', {deviceState: deviceState});
    },

    queue: function(trackIds) {
        this.dispatch('SEND_QUEUE', {trackIds: trackIds});
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

    signIn: function(username, password) {
        this.dispatch('AUTH_SIGNIN', {username: username, password: password});
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

    showAlbumsByArtist: function(payload) {
        this.view = 'albums';
        this.artist = payload.artist;
        this.album = null;
        this.emit('change');
    },

    showTracksByAlbum: function(payload) {
        this.view = 'tracks';
        this.album = payload.album;
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
    playing: false,
    current: null,
    duration: 0,
    lastPause: null,
    queue: [],

    actions: {
        'DEVICE_STATE': 'receiveDeviceState',
        'DEVICE_START': 'startDevice',
        'SEND_QUEUE': 'sendQueue',
        'PLAYER_PAUSE': 'sendPause',
        'PLAYER_PLAY': 'sendPlay',
        'PLAYER_NEXT': 'sendNext'
    },

    startDevice: function(payload) {
        this.device = payload.device;
        this.bearer = payload.bearer;
        $.connection.hub.qs = { 'access_token': this.bearer };
        $.connection.hub.start().done(function () {
            musicHubProxy.invoke('RegisterClient', this.device).done(function() {
                musicHubProxy.invoke('GetState', this.device);
            }.bind(this));
        }.bind(this));
    },

    receiveDeviceState: function(payload) {
        this.playing = payload.deviceState.Playing;
        this.current = payload.deviceState.Current;
        this.duration = payload.deviceState.Duration;
        this.lastPause = payload.deviceState.LastPause;
        this.queue = payload.deviceState.Queue;
        console.log(payload);
        this.emit('change');
    },

    sendQueue: function(payload) {
        console.log(payload);
        window.musicHubProxy.invoke('Queue', this.device, payload.trackIds);
    },

    sendPause: function() {
        window.musicHubProxy.server.pause(this.device);
    },

    sendPlay: function() {
        window.musicHubProxy.server.play(this.device);
    },

    sendNext: function() {
        window.musicHubProxy.server.requestNext(this.device);
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

    signIn: function(payload) {
        jQuery.ajax('/oauth/token', {
            method: 'POST',
            data: {
                grant_type: 'password',
                username: payload.username,
                password: payload.password
            }
        }).done(function(data) {
            this.bearer = data.access_token
            jQuery.ajax('/api/Devices', {
                headers: {
                    'Authorization': 'Bearer ' + this.bearer
                }
            }).done(function(data) {
                this.devices = data;
                this.emit('change');
            }.bind(this));
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

var musicHubProxy = $.connection.musicHub;
musicHubProxy.client.setState = flux.actions.receiveDeviceState;