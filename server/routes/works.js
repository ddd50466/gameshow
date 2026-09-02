// 作品 API：列表 / 详情 / 创建 / 更新 / 删除 + 图片视频上传（本地或云端存储）
const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { all, get, run, uuid } = require('../db');
const { authRequired } = require('../auth');
const { publishBuffer } = require('../storage');

const router = express.Router();

const CATEGORIES = [
  { value: 'game_rpg', label: '角色扮演' },
  { value: 'game_action', label: '动作游戏' },
  { value: 'game_puzzle', label: '解谜游戏' },
  { value: 'game_sim', label: '模拟经营' },
  { value: 'game_casual', label: '休闲游戏' },
  { value: 'tool_utility', label: '实用工具' },
  { value: 'tool_productivity', label: '效率办公' },
  { value: 'tool_creative', label: '创意设计' },
  { value: 'other', label: '其他' },
];

// 行 -> 前端结构
function toWork(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    coverUrl: row.cover_url,
    screenshotUrls: JSON.parse(row.screenshot_urls || '[]'),
    videoUrl: row.video_url,
    authorId: String(row.author_id),
    authorName: row.author_name,
    viewCount: row.view_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---- 文件上传（内存缓冲，由 storage 决定去云或落地）----
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 300 * 1024 * 1024 }, // 图片视频上限 300MB
  fileFilter: (req, file, cb) => {
    const isImg = /^image\//.test(file.mimetype);
    const isVid = /^video\//.test(file.mimetype);
    if (isImg || isVid) cb(null, true);
    else cb(new Error('仅支持图片或视频文件'));
  },
});

// 分类列表
router.get('/categories', (req, res) => {
  res.json({ success: true, data: { categories: CATEGORIES } });
});

// 作品列表（分页 / 分类筛选 / 关键词搜索 / 按作者）
router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 12));
  const { category, keyword, authorId } = req.query;

  const where = [];
  const params = [];
  if (category) {
    where.push('category = ?');
    params.push(String(category));
  }
  if (keyword) {
    const kw = String(keyword).trim();
    if (kw) {
      where.push('(title LIKE ? OR description LIKE ?)');
      params.push(`%${kw}%`, `%${kw}%`);
    }
  }
  if (authorId) {
    where.push('author_id = ?');
    params.push(Number(authorId));
  }
  const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : '';

  const totalRow = await get(`SELECT COUNT(*) AS c FROM works${whereSql}`, ...params);
  const total = Number(totalRow?.c ?? 0);
  const rows = await all(
    `SELECT * FROM works${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
    ...params,
    pageSize,
    (page - 1) * pageSize
  );

  res.json({ success: true, data: { items: rows.map(toWork), total, page, pageSize } });
});

// 上传文件（需登录）
router.post('/upload', authRequired, upload.single('file'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ success: false, message: '未收到文件' });
  try {
    const ext = (path.extname(req.file.originalname || '') || '').toLowerCase().slice(0, 12) || '.bin';
    const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    const url = await publishBuffer(req.file.buffer, filename, req.file.mimetype);
    res.json({ success: true, data: { url } });
  } catch (e) {
    next(e);
  }
});

// 创建作品（需登录）
router.post('/', authRequired, async (req, res) => {
  const { title, description, category, coverUrl, screenshotUrls, videoUrl } = req.body || {};
  if (!String(title || '').trim()) {
    return res.status(400).json({ success: false, message: '标题不能为空' });
  }
  const id = uuid();
  const now = new Date().toISOString();
  await run(
    `INSERT INTO works
      (id, title, description, category, cover_url, screenshot_urls, video_url, author_id, author_name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    String(title).trim(),
    String(description || ''),
    String(category || 'other'),
    String(coverUrl || ''),
    JSON.stringify(Array.isArray(screenshotUrls) ? screenshotUrls : []),
    String(videoUrl || ''),
    req.user.id,
    req.user.nickname || req.user.username,
    now,
    now
  );
  const row = await get('SELECT * FROM works WHERE id = ?', id);
  res.json({ success: true, data: toWork(row) });
});

// 作品详情（浏览量 +1）
router.get('/:id', async (req, res) => {
  const row = await get('SELECT * FROM works WHERE id = ?', req.params.id);
  if (!row) return res.status(404).json({ success: false, message: '作品不存在' });
  await run('UPDATE works SET view_count = view_count + 1 WHERE id = ?', req.params.id);
  const data = toWork(row);
  data.viewCount += 1;
  res.json({ success: true, data });
});

// 更新作品（仅作者）
router.put('/:id', authRequired, async (req, res) => {
  const row = await get('SELECT * FROM works WHERE id = ?', req.params.id);
  if (!row) return res.status(404).json({ success: false, message: '作品不存在' });
  if (row.author_id !== req.user.id) {
    return res.status(403).json({ success: false, message: '无权修改他人作品' });
  }
  const b = req.body || {};
  const patch = {};
  if (b.title !== undefined) patch.title = String(b.title).trim();
  if (b.description !== undefined) patch.description = String(b.description);
  if (b.category !== undefined) patch.category = String(b.category);
  if (b.coverUrl !== undefined) patch.cover_url = String(b.coverUrl);
  if (b.screenshotUrls !== undefined)
    patch.screenshot_urls = JSON.stringify(Array.isArray(b.screenshotUrls) ? b.screenshotUrls : []);
  if (b.videoUrl !== undefined) patch.video_url = String(b.videoUrl);
  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ success: false, message: '未提供可更新字段' });
  }
  patch.updated_at = new Date().toISOString();
  const sets = Object.keys(patch)
    .map((k) => `${k} = ?`)
    .join(', ');
  await run(`UPDATE works SET ${sets} WHERE id = ?`, ...Object.values(patch), req.params.id);
  const updated = await get('SELECT * FROM works WHERE id = ?', req.params.id);
  res.json({ success: true, data: toWork(updated) });
});

// 删除作品（仅作者）
router.delete('/:id', authRequired, async (req, res) => {
  const row = await get('SELECT * FROM works WHERE id = ?', req.params.id);
  if (!row) return res.status(404).json({ success: false, message: '作品不存在' });
  if (row.author_id !== req.user.id) {
    return res.status(403).json({ success: false, message: '无权删除他人作品' });
  }
  await run('DELETE FROM works WHERE id = ?', req.params.id);
  res.json({ success: true, message: '删除成功' });
});

module.exports = router;
