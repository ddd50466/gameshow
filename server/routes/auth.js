// 用户注册 / 登录 API
const express = require('express');
const bcrypt = require('bcryptjs');
const { all, get, run } = require('../db');
const { signToken, authRequired } = require('../auth');

const router = express.Router();

// 注册
router.post('/register', async (req, res) => {
  const { username, password, nickname } = req.body || {};
  const name = String(username || '').trim();
  const pwd = String(password || '');
  const nick = String(nickname || '').trim() || name;

  if (!name || name.length < 2 || name.length > 20) {
    return res.status(400).json({ success: false, message: '用户名需为 2-20 个字符' });
  }
  if (pwd.length < 6) {
    return res.status(400).json({ success: false, message: '密码至少 6 位' });
  }
  const exists = await get('SELECT id FROM users WHERE username = ?', name);
  if (exists) {
    return res.status(409).json({ success: false, message: '用户名已被注册' });
  }
  const hash = bcrypt.hashSync(pwd, 10);
  const info = await run('INSERT INTO users (username, password_hash, nickname) VALUES (?, ?, ?)', name, hash, nick);
  const user = { id: Number(info.lastInsertRowid), username: name, nickname: nick };
  res.json({ success: true, data: { token: signToken(user), user } });
});

// 登录
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  const name = String(username || '').trim();
  const row = await get('SELECT * FROM users WHERE username = ?', name);
  if (!row || !bcrypt.compareSync(String(password || ''), row.password_hash)) {
    return res.status(401).json({ success: false, message: '用户名或密码错误' });
  }
  const user = { id: row.id, username: row.username, nickname: row.nickname };
  res.json({ success: true, data: { token: signToken(user), user } });
});

// 当前登录用户信息
router.get('/me', authRequired, (req, res) => {
  res.json({
    success: true,
    data: { id: req.user.id, username: req.user.username, nickname: req.user.nickname },
  });
});

module.exports = router;
