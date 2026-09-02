// GameShow 服务入口：托管 API + 前端页面（本地或云端模式自适应）
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { init } = require('./db');
const { isCloud } = require('./storage');

async function bootstrap() {
  await init(); // 初始化数据库（本地 SQLite 或云端 Turso）

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

  // 托管构建后的前端
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

  const port = Number(process.env.PORT || 3000);
  // 监听 0.0.0.0，供 Render 等云平台访问
  app.listen(port, '0.0.0.0', () => {
    console.log(`GameShow 已启动: http://0.0.0.0:${port} (${isCloud() ? '云端模式' : '本地模式'})`);
  });
}

bootstrap().catch((e) => {
  console.error('启动失败:', e);
  process.exit(1);
});
