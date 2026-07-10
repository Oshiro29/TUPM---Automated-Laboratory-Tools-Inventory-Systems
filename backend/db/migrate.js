const { databasePath, initializeDatabase } = require('./database');

initializeDatabase().then(() => console.log(`Database migrated: ${databasePath}`))
  .catch((error) => { console.error('Database migration failed:', error); process.exitCode = 1; });
