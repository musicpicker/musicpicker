exports.up = function(knex, Promise) {
  var tokens = knex.schema.createTable('oauth_tokens', function(table) {
  	table.string('token').primary();
		table.integer('user').references('Id').inTable('users');
		table.integer('client').references('Id').inTable('oauth_apps');
		table.timestamps();
  });

  return tokens;
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('oauth_tokens');
};
