var bookshelf = require('bookshelf')(require('./knex'));

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
  tableName: 'oauth_apps'
});

module.exports = {
  User: User,
  Device: Device,
  Artist: Artist,
  Album: Album,
  Track: Track,
  DeviceTrack: DeviceTrack,
  OauthApp: OauthApp
}
