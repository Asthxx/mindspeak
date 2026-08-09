// ==================== SQLite 数据库（node:sqlite 内置，无需编译） ====================
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const DB_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DB_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DB_DIR, 'app.db'));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    nickname TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS verification_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    purpose TEXT NOT NULL DEFAULT 'register',
    expires_at INTEGER NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    tries INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_vcode_email ON verification_codes(email, purpose);
`);

// 兼容旧库：为 users 表补充新列
const userCols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
if (!userCols.includes('avatar')) {
  db.exec('ALTER TABLE users ADD COLUMN avatar TEXT');
}

// 兼容旧库：verification_codes 表补充 tries 列（验证码错误次数）
const vcCols = db.prepare('PRAGMA table_info(verification_codes)').all().map(c => c.name);
if (!vcCols.includes('tries')) {
  db.exec('ALTER TABLE verification_codes ADD COLUMN tries INTEGER NOT NULL DEFAULT 0');
}

module.exports = db;