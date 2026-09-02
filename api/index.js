// Vercel serverless 函数入口：导出 Express 应用
// 模块加载时即触发云端数据库表结构初始化（幂等，不阻塞导出）
const { init } = require('../server/db');
const { createApp } = require('../server/app');

init().catch((e) => {
  console.error('[api] init error:', e && e.message ? e.message : e);
});

module.exports = createApp();
