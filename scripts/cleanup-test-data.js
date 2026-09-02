// 清理测试数据：删除所有 test_ 前缀的测试账号及其作品
const { all, run } = require('../server/db');

async function main() {
  const rows = await all("SELECT id, username FROM users WHERE username LIKE 'test_%' OR username = '小明同学'");
  for (const u of rows) {
    await run('DELETE FROM works WHERE author_id = ?', u.id);
    await run('DELETE FROM users WHERE id = ?', u.id);
    console.log('已清理账号:', u.username);
  }
  const w = await all('SELECT COUNT(*) AS c FROM works');
  const u = await all('SELECT COUNT(*) AS c FROM users');
  console.log('剩余作品数:', w[0].c, '| 剩余用户数:', u[0].c);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
