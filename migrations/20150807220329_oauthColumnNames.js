var Promise = require('bluebird');

exports.up = function(knex, Promise) {
	var apps = knex.schema.table('oauth_apps', function(table) {
		table.renameColumn('owner', 'owner_id');
	});

	var tokens = knex.schema.table('oauth_tokens', function(table) {
		table.renameColumn('user', 'user_id');
		table.renameColumn('client', 'client_id');
	});

	return new Promise(function(resolve, reject) {
		apps.then(function() {
			tokens.then(function() {
				resolve();
			})
		})
	});
};

exports.down = function(knex, Promise) {

};
