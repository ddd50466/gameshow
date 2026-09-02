// GameShow 本地版端到端验证脚本：注册→登录→上传→发布→浏览→搜索→编辑→删除
const BASE = 'http://localhost:3000/api';
const rand = Date.now().toString().slice(-6);
const user = { username: `test_${rand}`, password: 'pass123456', nickname: '端到端测试' };

async function j(method, path, body, token) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${data.message || ''}`);
  return data.data;
}

// 1x1 红色 PNG
function makePng() {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
}

async function main() {
  const results = [];
  const log = (name, ok, extra = '') => {
    results.push({ name, ok });
    console.log(`${ok ? '✅' : '❌'} ${name} ${extra}`);
  };

  try {
    // 1 注册
    const reg = await j('POST', '/auth/register', user);
    const token = reg.token;
    log('注册', !!token, `用户:${user.username}`);
    // 2 登录（验证登录 token 可访问受保护接口）
    const lg = await j('POST', '/auth/login', { username: user.username, password: user.password });
    const me = await j('GET', '/auth/me', undefined, lg.token);
    log('登录', !!lg.token && me.username === user.username);

    // 3 上传图片
    const fd = new FormData();
    fd.append('file', new Blob([makePng()], { type: 'image/png' }), 'cover.png');
    const upRes = await fetch(`${BASE}/works/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const upData = await upRes.json();
    if (!upRes.ok) throw new Error('上传失败 ' + upData.message);
    const coverUrl = upData.data.url;
    log('上传图片', coverUrl.startsWith('/uploads/'), coverUrl);

    // 4 创建作品
    const work = await j(
      'POST',
      '/works',
      {
        title: '端到端测试游戏',
        description: '这是一个自动化验证创建的作品',
        category: 'game_action',
        coverUrl,
        screenshotUrls: [coverUrl],
        videoUrl: '',
      },
      token
    );
    log('创建作品', !!work.id, work.title);
    const wid = work.id;

    // 5 列表
    const list = await j('GET', '/works?page=1&pageSize=10');
    log('作品列表', list.items.some((w) => w.id === wid), `total=${list.total}`);

    // 6 关键词搜索
    const search = await j('GET', `/works?keyword=${encodeURIComponent('端到端')}`);
    log('关键词搜索', search.items.some((w) => w.id === wid));

    // 7 分类筛选
    const cat = await j('GET', '/works?category=game_action');
    log('分类筛选', cat.items.some((w) => w.id === wid));

    // 8 详情 + 浏览量
    const detail = await j('GET', `/works/${wid}`);
    log('详情+浏览量', detail.viewCount >= 1, `views=${detail.viewCount}`);

    // 9 我的作品（按作者）
    const mine = await j('GET', `/works?authorId=${reg.user.id}`);
    log('我的作品', mine.items.some((w) => w.id === wid));

    // 10 编辑
    const upd = await j('PUT', `/works/${wid}`, { title: '端到端测试游戏(已编辑)' }, token);
    log('编辑作品', upd.title.includes('已编辑'));

    // 11 删除
    await j('DELETE', `/works/${wid}`, undefined, token);
    const after = await j('GET', '/works?page=1&pageSize=10');
    log('删除作品', !after.items.some((w) => w.id === wid));

    const fail = results.filter((r) => !r.ok);
    console.log(`\n结果: ${results.length - fail.length}/${results.length} 项通过`);
    process.exit(fail.length ? 1 : 0);
  } catch (e) {
    console.error('❌ 异常:', e.message);
    process.exit(1);
  }
}

main();
