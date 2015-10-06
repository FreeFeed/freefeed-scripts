// Update with your config settings.

module.exports = {

  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL || {
      database: 'feedick',
      user:     'feedick',
      password: 'feedick'
    }
  },

  staging: {
    client: 'pg',
    connection: process.env.DATABASE_URL || {
      database: 'my_db',
      user:     'username',
      password: 'password'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'db_versions'
    }
  },

  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL || {
      database: 'my_db',
      user:     'username',
      password: 'password'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'db_versions'
    }
  }

};
