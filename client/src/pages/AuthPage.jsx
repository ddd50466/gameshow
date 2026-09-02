import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // login | register
  const [form, setForm] = useState({ username: '', password: '', nickname: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data =
        mode === 'login'
          ? await api.login({ username: form.username, password: form.password })
          : await api.register(form);
      login(data);
      nav('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="container">
      <div className="auth-wrap">
        <div className="auth-card">
          <h2>{mode === 'login' ? '欢迎回来' : '创建账号'}</h2>
          <form onSubmit={handleSubmit}>
            <label>用户名</label>
            <input
              type="text"
              value={form.username}
              onChange={set('username')}
              placeholder={mode === 'register' ? '2-20 个字符' : '输入用户名'}
              required
            />
            {mode === 'register' && (
              <>
                <label>昵称（可选）</label>
                <input type="text" value={form.nickname} onChange={set('nickname')} placeholder="展示给别人看的名字" />
              </>
            )}
            <label>密码</label>
            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              placeholder={mode === 'register' ? '至少 6 位' : '输入密码'}
              required
            />
            {error && <div className="form-error">{error}</div>}
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
                {busy ? '请稍候...' : mode === 'login' ? '登录' : '注册并登录'}
              </button>
            </div>
          </form>
          <div className="auth-switch">
            {mode === 'login' ? (
              <span>
                还没有账号？ <a onClick={() => { setError(''); setMode('register'); }}>立即注册</a>
              </span>
            ) : (
              <span>
                已有账号？ <a onClick={() => { setError(''); setMode('login'); }}>直接登录</a>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
