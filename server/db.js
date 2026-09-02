// 统一数据访问层：支持本地 SQLite（开发）与云端 Turso（生产）双模式
// - 设置了 DATABASE_URL + TURSO_AUTH_TOKEN 时走云端 Turso（SQLite 兼容）
// - 否则走本地 better-sqlite3，数据存在 data/gameshow.db
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const CLOUD = Boolean(process.env.DATABASE_URL && process.env.TURSO_AUTH_TOKEN);

let sqlite = null; // better-sqlite3（本地模式）
let turso = null; // libsql client（云端模式）

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nickname TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS works (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'other',
  cover_url TEXT NOT NULL DEFAULT '',
  screenshot_urls TEXT NOT NULL DEFAULT '[]',
  video_url TEXT NOT NULL DEFAULT '',
  author_id INTEGER NOT NULL,
  author_name TEXT NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_works_category ON works(category);
CREATE INDEX IF NOT EXISTS idx_works_created_at ON works(created_at);
CREATE INDEX IF NOT EXISTS idx_works_author ON works(author_id);
`;

// 初始化（幂等，可在服务启动时调用）
async function init() {
  if (CLOUD) {
    const { createClient } = require('@libsql/client');
    turso = createClient({
      url: process.env.DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    await turso.execute('PRAGMA foreign_keys = ON').catch(() => {});
    await turso.executeBatch([{ sql: SCHEMA }]).catch(() => {});
  } else {
    const Database = require('better-sqlite3');
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    sqlite = new Database(path.join(dataDir, 'gameshow.db'));
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    sqlite.exec(SCHEMA);
  }
}

// 统一查询：返回行数组
async function all(sql, ...params) {
  if (CLOUD) {
    const r = await turso.execute({ sql, args: params });
    return r.rows;
  }
  return sqlite.prepare(sql).all(...params);
}

// 统一查询：返回单行或 null
async function get(sql, ...params) {
  if (CLOUD) {
    const rows = await all(sql, ...params);
    return rows[0] || null;
  }
  return sqlite.prepare(sql).get(...params);
}

// 统一写：返回 { lastInsertRowid, changes }
async function run(sql, ...params) {
  if (CLOUD) {
    const r = await turso.execute({ sql, args: params });
    return { lastInsertRowid: r.lastInsertRowid ?? null, changes: r.rowsAffected ?? 0 };
  }
  const info = sqlite.prepare(sql).run(...params);
  return { lastInsertRowid: Number(info.lastInsertRowid), changes: info.changes };
}

function uuid() {
  return crypto.randomUUID();
}

function isCloud() {
  return CLOUD;
}

module.exports = { init, all, get, run, uuid, isCloud };
