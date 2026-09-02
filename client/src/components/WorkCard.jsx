import { Link } from 'react-router-dom';

const CATEGORY_LABELS = {
  game_rpg: '角色扮演',
  game_action: '动作游戏',
  game_puzzle: '解谜游戏',
  game_sim: '模拟经营',
  game_casual: '休闲游戏',
  tool_utility: '实用工具',
  tool_productivity: '效率办公',
  tool_creative: '创意设计',
  other: '其他',
};

export function categoryLabel(value) {
  return CATEGORY_LABELS[value] || value || '其他';
}

export default function WorkCard({ work }) {
  return (
    <Link to={`/works/${work.id}`} className="card">
      <div className="card-cover">
        {work.coverUrl ? (
          <img src={work.coverUrl} alt={work.title} loading="lazy" />
        ) : (
          <div className="placeholder">🎮</div>
        )}
      </div>
      <div className="card-body">
        <h3 className="card-title">{work.title}</h3>
        <div className="card-meta">
          <span className="tag">{categoryLabel(work.category)}</span>
          <span>👁 {work.viewCount}</span>
        </div>
        <div className="card-meta" style={{ marginTop: 6 }}>
          <span>{work.authorName}</span>
        </div>
      </div>
    </Link>
  );
}
