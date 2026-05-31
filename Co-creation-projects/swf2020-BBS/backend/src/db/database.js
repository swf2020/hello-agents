const Database = require('better-sqlite3');
const path = require('path');
const { createTables } = require('./schema');

let db = null;

function initDb(dbPath) {
  if (db) {
    try { db.close(); } catch (e) { /* ignore */ }
  }
  db = new Database(dbPath || path.join(__dirname, '..', '..', 'data.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  createTables(db);
  return db;
}

function getDb() {
  if (!db) {
    db = initDb();
  }
  return db;
}

module.exports = { initDb, getDb };
