// 统一数据访问层：支持本地 SQLite（开发）与云端 D1/Turso 多模式
// - 设置了 CLOUDFLARE_ACCOUNT_ID + D1_DATABASE_ID + CLOUDFLARE_API_TOKEN 时走 Cloudflare D1（SQLite 兼容）
// - 设置了 DATABASE_URL + TURSO_AUTH_TOKEN 时走云端 Turso（SQLite 兼容）
// - 否则走本地 better-sqlite3，数据存在 data/gameshow.db
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const D1 = Boolean(
  process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.D1_DATABASE_ID &&
    process.env.CLOUDFLARE_API_TOKEN
);
const TURSO = Boolean(process.env.DATABASE_URL && process.env.TURSO_AUTH_TOKEN);

let sqlite = null; // better-sqlite3（本地模式）
let turso = null; // libsql client（Turso 云端模式）

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
  author_name TEXT NOT NULL DEFAULT '',
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_works_category ON works(category);
CREATE INDEX IF NOT EXISTS idx_works_created_at ON works(created_at);
CREATE INDEX IF NOT EXISTS idx_works_author ON works(author_id);
`;

// D1 每次只执行一条语句，拆分 SCHEMA
const SCHEMA_STATEMENTS = SCHEMA
  .split(';')
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

// 初始化（幂等，可在服务启动时调用）
async function init() {
  if (D1) {
    // D1 无连接，仅确保表结构存在（幂等）
    for (const sql of SCHEMA_STATEMENTS) {
      await d1Exec({ sql, params: [] }).catch((e) => {
        console.error('[db] D1 schema init 跳过:', e.message);
      });
    }
  } else if (TURSO) {
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

// ---- Cloudflare D1 底层调用 ----
async function d1Exec({ sql, params }) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/d1/database/${process.env.D1_DATABASE_ID}/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params: params || [] }),
  });
  const json = await res.json();
  if (!json || json.success !== true) {
    const msg = json?.errors?.[0]?.message || 'D1 查询失败';
    throw new Error(msg);
  }
  return json.result?.[0] || {};
}

// 统一查询：返回行数组
async function all(sql, ...params) {
  if (D1) {
    const r = await d1Exec({ sql, params });
    return r.results || [];
  }
  if (TURSO) {
    const r = await turso.execute({ sql, args: params });
    return r.rows;
  }
  return sqlite.prepare(sql).all(...params);
}

// 统一查询：返回单行或 null
async function get(sql, ...params) {
  const rows = await all(sql, ...params);
  return rows[0] || null;
}

// 统一写：返回 { lastInsertRowid, changes }
async function run(sql, ...params) {
  if (D1) {
    const r = await d1Exec({ sql, params });
    const meta = r.meta || {};
    return { lastInsertRowid: meta.last_row_id ?? null, changes: meta.changes ?? 0 };
  }
  if (TURSO) {
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
  return D1 || TURSO;
}

module.exports = { init, all, get, run, uuid, isCloud };
