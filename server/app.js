// GameShow Express 应用构建（供本地入口与 Vercel serverless 共用）
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { isCloud } = require('./storage');

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // 本地模式：托管本地上传目录
  if (!isCloud()) {
    app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
  }

  // 业务 API
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/works', require('./routes/works'));

  // 托管构建后的前端（若存在 dist）
  const distDir = path.join(__dirname, '..', 'dist');
  if (fs.existsSync(path.join(distDir, 'index.html'))) {
    app.use(express.static(distDir));
    app.get(/^(?!\/api|\/uploads).*/, (req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  // 统一错误处理（含 multer 错误）
  app.use((err, req, res, next) => {
    console.error(err);
    const msg = err && err.message ? err.message : '服务器错误';
    res.status(400).json({ success: false, message: msg });
  });

  return app;
}

module.exports = { createApp };
