import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const handleLogout = () => {
    logout();
    nav('/');
  };

  return (
    <>
      <nav className="nav">
        <div className="container nav-inner">
          <Link to="/" className="nav-brand">
            <span className="logo">GS</span>
            GameShow
          </Link>
          <div className="nav-links">
            <Link to="/">发现作品</Link>
            {user ? (
              <>
                <Link to="/upload">上传作品</Link>
                <Link to="/my">我的作品</Link>
                <span className="nav-user">
                  <span style={{ color: 'var(--accent)' }}>{user.nickname || user.username}</span>
                  <button onClick={handleLogout}>退出</button>
                </span>
              </>
            ) : (
              <Link to="/auth">登录 / 注册</Link>
            )}
          </div>
        </div>
      </nav>
      <main>{children}</main>
      <footer className="footer">
        <div className="container">GameShow · 游戏/软件作品展示分享平台（本地版）</div>
      </footer>
    </>
  );
}
