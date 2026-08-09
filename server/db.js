// ==================== SQLite 数据库（node:sqlite 内置，无需编译） ====================
// 注意：本应用现在无需登录/账号体系，所有学习数据保存在浏览器 localStorage，
// 因此这里仅初始化一个空库（保持 db 连接存在），为后续扩展保留结构。
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const DB_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DB_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DB_DIR, 'app.db'));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
`);

module.exports = db;