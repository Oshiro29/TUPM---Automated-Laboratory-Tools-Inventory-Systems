const fs = require('fs/promises');
const path = require('path');
const sqlite3 = require('sqlite3');

const defaultDatabasePath = path.join(__dirname, '..', 'database', 'inventory.sqlite');
const databasePath = process.env.DATABASE_PATH
  ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
  : defaultDatabasePath;

let connection;

function run(db, sql, parameters = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, parameters, function onRun(error) {
      if (error) return reject(error);
      resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

function get(db, sql, parameters = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, parameters, (error, row) => (error ? reject(error) : resolve(row)));
  });
}

function all(db, sql, parameters = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, parameters, (error, rows) => (error ? reject(error) : resolve(rows)));
  });
}

function exec(db, sql) {
  return new Promise((resolve, reject) => db.exec(sql, (error) => (error ? reject(error) : resolve())));
}

async function initializeDatabase() {
  if (connection) return connection;

  await fs.mkdir(path.dirname(databasePath), { recursive: true });
  const rawDatabase = await new Promise((resolve, reject) => {
    const db = new sqlite3.Database(databasePath, (error) => (error ? reject(error) : resolve(db)));
  });
  connection = {
    run: (sql, parameters) => run(rawDatabase, sql, parameters),
    get: (sql, parameters) => get(rawDatabase, sql, parameters),
    all: (sql, parameters) => all(rawDatabase, sql, parameters),
    exec: (sql) => exec(rawDatabase, sql),
  };

  await connection.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  await runMigrations(connection);
  return connection;
}

async function runMigrations(db) {
  await db.run('CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
  const migrationsPath = path.join(__dirname, 'migrations');
  const migrationFiles = (await fs.readdir(migrationsPath)).filter((file) => file.endsWith('.sql')).sort();

  for (const filename of migrationFiles) {
    const applied = await db.get('SELECT filename FROM schema_migrations WHERE filename = ?', [filename]);
    if (applied) continue;
    await db.exec(await fs.readFile(path.join(migrationsPath, filename), 'utf8'));
    await db.run('INSERT INTO schema_migrations (filename, applied_at) VALUES (?, ?)', [filename, new Date().toISOString()]);
  }
}

module.exports = { databasePath, initializeDatabase, runMigrations };
