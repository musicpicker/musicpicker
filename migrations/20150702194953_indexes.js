exports.up = function(knex, Promise) {
  var albums = knex.schema.table('albums', function(table) {
    table.unique(['Name', 'ArtistId']);
  });

  var tracks = knex.schema.table('tracks', function(table) {
    table.unique(['Name', 'AlbumId']);
  });

  return Promise.all([albums, tracks]);
};

exports.down = function(knex, Promise) {

};
