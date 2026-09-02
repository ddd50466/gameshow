// 后端 API 封装（自动附带登录 token）
const BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

function authHeaders() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json', ...authHeaders() };
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || '请求失败');
  return data.data;
}

export const api = {
  register: (b) => request('POST', '/auth/register', b),
  login: (b) => request('POST', '/auth/login', b),
  me: () => request('GET', '/auth/me'),

  categories: () => request('GET', '/works/categories'),
  list: (params) => request('GET', `/works?${new URLSearchParams(params)}`),
  detail: (id) => request('GET', `/works/${id}`),
  create: (b) => request('POST', '/works', b),
  update: (id, b) => request('PUT', `/works/${id}`, b),
  remove: (id) => request('DELETE', `/works/${id}`),

  upload: async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${BASE}/works/upload`, {
      method: 'POST',
      headers: authHeaders(),
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || '上传失败');
    return data.data.url;
  },
};
