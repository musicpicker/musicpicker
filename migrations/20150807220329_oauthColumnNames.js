var Promise = require('bluebird');

exports.up = function(knex, Promise) {
	var apps = knex.schema.table('oauth_apps', function(table) {
		table.renameColumn('owner', 'owner_id');
	});

	var tokens = knex.schema.table('oauth_tokens', function(table) {
		table.renameColumn('user', 'user_id');
		table.renameColumn('client', 'client_id');
	});

	return Promise.all([apps, tokens]);
};

exports.down = function(knex, Promise) {

};
