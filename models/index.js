var Sequelize = require('sequelize');
var sequelize = require('./database');

var User = sequelize.define('User', {
  username: Sequelize.STRING,
  password: Sequelize.STRING,
  token: Sequelize.STRING,
}, {
  indexes: [
    {
      unique: true,
      fields: ['username']
    }
  ]
});

var Device = sequelize.define('Device', {
  name: Sequelize.STRING
});

var Artist = sequelize.define('Artist', {
  name: Sequelize.STRING
});

var Album = sequelize.define('Album', {
  name: Sequelize.STRING,
  year: Sequelize.INTEGER,
  artwork: Sequelize.STRING
});

var Track = sequelize.define('Track', {
  name: Sequelize.STRING,
  number: Sequelize.INTEGER
});

var DeviceTracks = sequelize.define('DeviceTracks', {
  deviceTrackId: Sequelize.STRING,
  duration: Sequelize.INTEGER
});

User.hasOne(Device);
Device.belongsToMany(Track, {through: 'DeviceTracks'});
Artist.hasMany(Album, {as: 'Albums'});
Album.hasMany(Track, {as: 'Tracks'});
Track.belongsToMany(Device, {through: 'DeviceTracks'});

sequelize.sync();

module.exports = {
  User: User,
  Device: Device,
  Artist: Artist,
  Album: Album,
  Track: Track,
  DeviceTracks: DeviceTracks
}
