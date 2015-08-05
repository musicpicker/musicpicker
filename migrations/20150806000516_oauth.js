exports.up = function(knex, Promise) {
  var apps = knex.schema.createTable('oauth_apps', function(table) {
  	table.increments('id'),
  	table.string('name').notNullable();
  	table.string('client_id').notNullable();
  	table.string('client_secret').notNullable();
  	table.string('redirect_uri');
  	table.string('description');
  	table.timestamps();
  	table.boolean('enable_grant_token').defaultTo(false);
  	table.boolean('enable_grant_password').defaultTo(false);
  });

  return apps;
};

exports.down = function(knex, Promise) {
  
};
