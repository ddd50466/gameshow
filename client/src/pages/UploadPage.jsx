import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

// 通用文件选择 + 上传预览组件
function FileField({ label, multiple, accept, urls, onChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setBusy(true);
    setError('');
    try {
      const uploaded = [];
      for (const f of files) {
        const url = await api.upload(f);
        uploaded.push(url);
      }
      const next = multiple ? [...urls, ...uploaded] : uploaded[0];
      onChange(next);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  return (
    <div>
      <label>{label}</label>
      <div
        className="upload-drop"
        onClick={() => document.getElementById(`file-${label}`)?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const dt = e.dataTransfer;
          if (dt && dt.files) {
            handleFiles({ target: { files: dt.files, value: '' } });
          }
        }}
      >
        {busy ? '上传中...' : multiple ? '点击或拖拽图片到此处上传（可多选）' : '点击或拖拽文件到此处上传'}
        {error && <div style={{ color: 'var(--danger)', marginTop: 6 }}>{error}</div>}
      </div>
      <input
        id={`file-${label}`}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleFiles}
        style={{ display: 'none' }}
      />
      <div className="upload-preview">
        {multiple
          ? urls.map((u, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <img src={u} alt="" />
                <button
                  type="button"
                  onClick={() => onChange(urls.filter((_, j) => j !== i))}
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    background: 'rgba(0,0,0,0.7)',
                    border: 'none',
                    color: '#fff',
                    borderRadius: 6,
                    cursor: 'pointer',
                    padding: '2px 7px',
                    fontSize: 12,
                  }}
                >
                  ✕
                </button>
              </div>
            ))
          : urls && (
              <div style={{ position: 'relative' }}>
                <img src={urls} alt="" />
                <button
                  type="button"
                  onClick={() => onChange('')}
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    background: 'rgba(0,0,0,0.7)',
                    border: 'none',
                    color: '#fff',
                    borderRadius: 6,
                    cursor: 'pointer',
                    padding: '2px 7px',
                    fontSize: 12,
                  }}
                >
                  ✕
                </button>
              </div>
            )}
      </div>
      {!multiple && (
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
          也可直接粘贴图片/视频的网络地址：
          <input
            type="text"
            value={urls || ''}
            onChange={(e) => onChange(e.target.value)}
            style={{ marginTop: 4 }}
            placeholder="https://..."
          />
        </div>
      )}
    </div>
  );
}

export default function UploadPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const isEdit = Boolean(id);

  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'other',
    coverUrl: '',
    screenshotUrls: [],
    videoUrl: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadingEdit, setLoadingEdit] = useState(isEdit);

  useEffect(() => {
    api.categories().then((d) => setCategories(d.categories)).catch(() => {});
  }, []);

  // 编辑模式：加载原作品
  useEffect(() => {
    if (!isEdit) return;
    api
      .detail(id)
      .then((w) => {
        if (user && String(w.authorId) !== String(user.id)) {
          setError('你只能编辑自己发布的作品');
          return;
        }
        setForm({
          title: w.title,
          description: w.description,
          category: w.category,
          coverUrl: w.coverUrl,
          screenshotUrls: w.screenshotUrls || [],
          videoUrl: w.videoUrl,
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingEdit(false));
  }, [id, isEdit, user]);

  if (loading || (isEdit && loadingEdit)) return <div className="spinner" />;

  if (!user) {
    return (
      <div className="container">
        <div className="empty">
          <div className="big">🔒</div>
          <p>发布作品前需要先登录</p>
          <Link to="/auth" className="btn btn-primary" style={{ marginTop: 8 }}>
            去登录 / 注册
          </Link>
        </div>
      </div>
    );
  }

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await api.update(id, form);
      } else {
        await api.create(form);
      }
      nav('/my');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container page">
      <h1 className="page-title">{isEdit ? '编辑作品' : '上传作品'}</h1>
      <form className="form" onSubmit={handleSubmit}>
        <div>
          <label>作品名称 *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set('title')(e.target.value)}
            placeholder="给你的游戏或软件起个名字"
            required
          />
        </div>

        <div className="row">
          <div>
            <label>分类</label>
            <select value={form.category} onChange={(e) => set('category')(e.target.value)}>
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>封面图（可选）</label>
            <input
              type="text"
              value={form.coverUrl}
              onChange={(e) => set('coverUrl')(e.target.value)}
              placeholder="封面图片地址"
            />
          </div>
        </div>

        <div>
          <label>作品简介</label>
          <textarea
            value={form.description}
            onChange={(e) => set('description')(e.target.value)}
            placeholder="介绍你的作品：玩法、特色、技术亮点..."
          />
        </div>

        <FileField
          label="封面图文件"
          multiple={false}
          accept="image/*"
          urls={form.coverUrl}
          onChange={set('coverUrl')}
        />

        <FileField
          label="作品截图"
          multiple
          accept="image/*"
          urls={form.screenshotUrls}
          onChange={set('screenshotUrls')}
        />

        <div>
          <label>演示视频（可选）</label>
          <input
            type="text"
            value={form.videoUrl}
            onChange={(e) => set('videoUrl')(e.target.value)}
            placeholder="视频地址（支持上传或粘贴网络地址）"
          />
        </div>
        <FileField
          label="视频文件"
          multiple={false}
          accept="video/*"
          urls={form.videoUrl}
          onChange={set('videoUrl')}
        />

        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? '保存中...' : isEdit ? '保存修改' : '发布作品'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => nav(-1)}>
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
