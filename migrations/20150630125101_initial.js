exports.up = function(knex, Promise) {
  var users = knex.schema.createTable('users', function(table) {
    table.increments('Id');
    table.string('Name').unique().notNullable();
    table.string('Password').unique().notNullable();
    table.string('Token');
  })

  var devices = knex.schema.createTable('devices', function(table) {
    table.increments('Id');
    table.integer('OwnerId').references('Id').inTable('users');
    table.string('Name').notNullable();
  });

  var artists = knex.schema.createTable('artists', function(table) {
    table.increments('Id');
    table.string('Name').unique().notNullable();
    table.string('MbId');
  });

  var albums = knex.schema.createTable('albums', function(table) {
    table.increments('Id');
    table.string('Name').notNullable();
    table.integer('ArtistId').references('Id').inTable('artists');
    table.integer('Year');
    table.string('MbId');
    table.string('Artwork');
  });

  var tracks = knex.schema.createTable('tracks', function(table) {
    table.increments('Id');
    table.string('Name').notNullable();
    table.integer('AlbumId').references('Id').inTable('albums');
    table.integer('Number');
    table.string('MbId');
  });

  var deviceTracks = knex.schema.createTable('deviceTracks', function(table) {
    table.primary(['DeviceId', 'TrackId'])
    table.integer('DeviceId').references('Id').inTable('devices');
    table.integer('TrackId').references('Id').inTable('tracks');

    table.string('DeviceTrackId').notNullable();
    table.integer('TrackDuration');
  });

  return Promise.all([users, devices, artists, albums, tracks, deviceTracks]);
};

exports.down = function(knex, Promise) {

}
