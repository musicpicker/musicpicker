exports.up = function(knex, Promise) {
  return knex.schema.table('users', function(table) {
  	table.dropUnique('Password');
  });
};

exports.down = function(knex, Promise) {
  
};
