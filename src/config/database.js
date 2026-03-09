const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/medicrm.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = {
  get:         (sql, params = []) => db.prepare(sql).get(...params),
  all:         (sql, params = []) => db.prepare(sql).all(...params),
  run:         (sql, params = []) => db.prepare(sql).run(...params),
  exec:        (sql) => db.exec(sql),
  transaction: (fn) => db.transaction(fn),
  close:       () => db.close(),
  raw:         db,
};
