// GameShow 服务入口：托管 API + 前端页面（本地或云端模式自适应）
const { init } = require('./db');
const { createApp } = require('./app');
const { isCloud } = require('./storage');

async function bootstrap() {
  await init(); // 初始化数据库（本地 SQLite 或云端 D1）
  const app = createApp();
  const port = Number(process.env.PORT || 3000);
  // 监听 0.0.0.0，供 Render 等云平台访问
  app.listen(port, '0.0.0.0', () => {
    console.log(`GameShow 已启动 http://0.0.0.0:${port} (${isCloud() ? '云端模式' : '本地模式'})`);
  });
}

bootstrap().catch((e) => {
  console.error('启动失败:', e);
  process.exit(1);
});
