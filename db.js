const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'hunting.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS hunts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    season TEXT,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS stands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hunt_id INTEGER REFERENCES hunts(id),
    name TEXT NOT NULL,
    description TEXT,
    lat REAL,
    lng REAL,
    type TEXT DEFAULT 'tree_stand',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    stand_id INTEGER REFERENCES stands(id),
    checked_in_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    checked_out_at DATETIME,
    gps_lat REAL,
    gps_lng REAL
  );
`);

// Seed: one hunt + one stand
const existingHunt = db.prepare('SELECT id FROM hunts WHERE id = 1').get();
if (!existingHunt) {
  db.prepare('INSERT INTO hunts (id, name, description, season) VALUES (1, ?, ?, ?)')
    .run('Opening Day Hunt', 'Annual whitetail deer hunt on the back forty', 'Fall 2024');
  db.prepare('INSERT INTO stands (id, hunt_id, name, description, type) VALUES (1, 1, ?, ?, ?)')
    .run('Big Oak Stand', 'Trophy tree stand overlooking the east field — best used during morning hunts', 'tree_stand');
}

module.exports = db;
