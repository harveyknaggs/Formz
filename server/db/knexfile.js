require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const isLocal = !process.env.DATABASE_URL || /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '');

module.exports = {
  client: 'pg',
  connection: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  migrations: {
    directory: require('path').join(__dirname, 'migrations')
  }
};
