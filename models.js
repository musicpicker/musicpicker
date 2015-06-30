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
  idAttribute: 'Id'
});

var Album = bookshelf.Model.extend({
  tableName: 'albums',
  idAttribute: 'Id'
});

var Track = bookshelf.Model.extend({
  tableName: 'tracks',
  idAttribute: 'Id'
});

var DeviceTrack = bookshelf.Model.extend({
  tableName: 'deviceTracks',
  idAttribute: 'Id'
});

module.exports = {
  User: User,
  Device: Device,
  Artist: Artist,
  Album: Album,
  Track: Track,
  DeviceTrack: DeviceTrack
}
