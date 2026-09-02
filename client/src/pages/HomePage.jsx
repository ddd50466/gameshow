import { useEffect, useState } from 'react';
import { api } from '../api';
import WorkCard from '../components/WorkCard';

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [works, setWorks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [keyword, setKeyword] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const pageSize = 12;

  useEffect(() => {
    api.categories().then((d) => setCategories(d.categories)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { page, pageSize };
    if (category) params.category = category;
    if (keyword) params.keyword = keyword;
    api
      .list(params)
      .then((d) => {
        setWorks(d.items);
        setTotal(d.total);
      })
      .catch(() => setWorks([]))
      .finally(() => setLoading(false));
  }, [page, category, keyword]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const doSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setKeyword(input.trim());
  };

  const pickCategory = (c) => {
    setCategory(c === category ? '' : c);
    setPage(1);
  };

  return (
    <div className="container">
      <section className="hero">
        <h1>发现你的下一款心头好</h1>
        <p>独立开发者的游戏与软件作品分享社区</p>
        <form className="search-box" onSubmit={doSearch}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="搜索作品名称或介绍..."
          />
          <button type="submit">搜索</button>
        </form>
      </section>

      <div className="cats">
        {categories.map((c) => (
          <button
            key={c.value}
            className={`cat-chip ${category === c.value ? 'active' : ''}`}
            onClick={() => pickCategory(c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="spinner" />
      ) : works.length === 0 ? (
        <div className="empty">
          <div className="big">🔍</div>
          <p>没有找到相关作品，换个关键词或分类试试</p>
        </div>
      ) : (
        <>
          <div className="grid">
            {works.map((w) => (
              <WorkCard key={w.id} work={w} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="pager">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
                上一页
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
                .map((p, idx, arr) => (
                  <span key={p} style={{ display: 'inline-flex', gap: 8 }}>
                    {idx > 0 && arr[idx - 1] !== p - 1 ? <span style={{ color: 'var(--text-3)', padding: '0 2px' }}>…</span> : null}
                    <button className={p === page ? 'active' : ''} onClick={() => setPage(p)}>
                      {p}
                    </button>
                  </span>
                ))}
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
