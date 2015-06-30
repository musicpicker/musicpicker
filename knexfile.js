module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: './musicpicker.db'
    }
  },

  production: {
    client: 'postgresql',
    connection: {
      host: 'localhost',
      database: 'picker',
      user:     'picker',
      password: 'picker'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  }

};
