import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { categoryLabel } from '../components/WorkCard';

function fmtTime(s) {
  if (!s) return '';
  const d = new Date(s.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return s;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function WorkDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [work, setWork] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api
      .detail(id)
      .then(setWork)
      .catch(() => setNotFound(true));
  }, [id]);

  const isOwner = work && user && String(work.authorId) === String(user.id);

  const handleDelete = async () => {
    if (!window.confirm('确定删除这个作品吗？删除后无法恢复。')) return;
    try {
      await api.remove(id);
      nav('/my');
    } catch (e) {
      alert(e.message);
    }
  };

  if (notFound) {
    return (
      <div className="container">
        <div className="empty">
          <div className="big">😕</div>
          <p>作品不存在或已被删除</p>
          <Link to="/" className="btn btn-ghost" style={{ marginTop: 8 }}>
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  if (!work) return <div className="spinner" />;

  return (
    <div className="container page">
      <div className="detail-cover">
        {work.coverUrl ? (
          <img src={work.coverUrl} alt={work.title} />
        ) : (
          <div className="placeholder">🎮</div>
        )}
      </div>
      <h1 className="detail-title">{work.title}</h1>
      <div className="detail-info">
        <span className="tag">{categoryLabel(work.category)}</span>
        <span>👤 {work.authorName}</span>
        <span>👁 {work.viewCount} 次浏览</span>
        <span>🕒 {fmtTime(work.createdAt)}</span>
      </div>
      <div className="detail-desc">{work.description || '这个作者还没有填写作品介绍。'}</div>

      {work.screenshotUrls && work.screenshotUrls.length > 0 && (
        <>
          <h2 className="section-title">作品截图</h2>
          <div className="shots">
            {work.screenshotUrls.map((url, i) => (
              <div className="shot" key={i}>
                <img src={url} alt={`截图 ${i + 1}`} loading="lazy" />
              </div>
            ))}
          </div>
        </>
      )}

      {work.videoUrl && (
        <>
          <h2 className="section-title">演示视频</h2>
          <div className="video-wrap">
            <video src={work.videoUrl} controls preload="metadata" />
          </div>
        </>
      )}

      {isOwner && (
        <div className="detail-actions">
          <Link to={`/upload/${work.id}`} className="btn btn-primary">
            编辑作品
          </Link>
          <button className="btn btn-danger" onClick={handleDelete}>
            删除作品
          </button>
        </div>
      )}
    </div>
  );
}
