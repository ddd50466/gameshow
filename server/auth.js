// 认证工具：JWT 签发与登录校验中间件
const jwt = require('jsonwebtoken');

// 本地运行用的默认密钥；需要时可改环境变量 JWT_SECRET
const SECRET = process.env.JWT_SECRET || 'gameshow-local-secret-key-2026';

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, nickname: user.nickname },
    SECRET,
    { expiresIn: '7d' }
  );
}

// 需要登录的接口保护中间件
function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, message: '请先登录' });
  }
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: '登录已过期，请重新登录' });
  }
}

module.exports = { SECRET, signToken, authRequired };
