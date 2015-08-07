var bookshelf = require('bookshelf')(require('./knex'));
var validator = require('validator');

var User = bookshelf.Model.extend({
  tableName: 'users',
  idAttribute: 'Id'
});

var Device = bookshelf.Model.extend({
  tableName: 'devices',
  idAttribute: 'Id'
});

var Artist = bookshelf.Model.extend({
  tableName: 'artists',
  idAttribute: 'Id',
  albums: function() {
    return this.hasMany(Album, 'ArtistId');
  }
});

var Album = bookshelf.Model.extend({
  tableName: 'albums',
  idAttribute: 'Id',
  artist: function() {
    return this.belongsTo(Artist, 'ArtistId');
  },
  tracks: function() {
    return this.hasMany(Track, 'AlbumId');
  }
});

var Track = bookshelf.Model.extend({
  tableName: 'tracks',
  idAttribute: 'Id',
  album: function() {
    return this.belongsTo(Album, 'AlbumId');
  }
});

var DeviceTrack = bookshelf.Model.extend({
  tableName: 'deviceTracks',
  idAttribute: 'Id'
});

var OauthApp = bookshelf.Model.extend({
  tableName: 'oauth_apps',
  
  parse: function(response) {
    response.enable_grant_token = validator.toBoolean(response.enable_grant_token);
    response.enable_grant_password = validator.toBoolean(response.enable_grant_password);
    return response;
  }
});

var OauthToken = bookshelf.Model.extend({
  tableName: 'oauth_tokens',
  idAttribute: 'token',
  user: function() {
    return this.belongsTo(User, 'user_id');
  },
  client: function() {
    return this.belongsTo(OauthApp, 'client_id');
  }
});

module.exports = {
  User: User,
  Device: Device,
  Artist: Artist,
  Album: Album,
  Track: Track,
  DeviceTrack: DeviceTrack,
  OauthApp: OauthApp,
  OauthToken: OauthToken
}
