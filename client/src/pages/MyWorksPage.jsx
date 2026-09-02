import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function MyWorksPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [works, setWorks] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      nav('/auth');
      return;
    }
    api
      .list({ page: 1, pageSize: 50, authorId: user.id })
      .then((d) => setWorks(d.items))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [user, loading, nav]);

  if (loading) return <div className="spinner" />;

  const handleDelete = async (w) => {
    if (!window.confirm(`确定删除「${w.title}」吗？`)) return;
    try {
      await api.remove(w.id);
      setWorks((ws) => ws.filter((x) => x.id !== w.id));
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="container page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          我的作品
        </h1>
        <Link to="/upload" className="btn btn-primary">
          + 上传新作品
        </Link>
      </div>

      {!loaded ? (
        <div className="spinner" />
      ) : works.length === 0 ? (
        <div className="empty">
          <div className="big">📦</div>
          <p>你还没有发布任何作品，点击右上角开始上传吧</p>
        </div>
      ) : (
        <div className="my-list">
          {works.map((w) => (
            <div className="my-row" key={w.id}>
              {w.coverUrl ? <img src={w.coverUrl} alt="" /> : <div style={{ width: 88, height: 56 }} />}
              <div className="info">
                <h3>{w.title}</h3>
                <p>浏览 {w.viewCount} · 发布于 {w.createdAt}</p>
              </div>
              <div className="ops">
                <Link to={`/works/${w.id}`} className="btn btn-ghost btn-sm">
                  查看
                </Link>
                <Link to={`/upload/${w.id}`} className="btn btn-primary btn-sm">
                  编辑
                </Link>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(w)}>
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
