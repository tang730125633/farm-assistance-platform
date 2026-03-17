const jwt = require('jsonwebtoken');

// 统一的 JWT 密钥配置（优先使用环境变量）
const JWT_SECRET = process.env.JWT_SECRET || 'farm-assistance-platform-secret-key-2024';

/**
 * 认证中间件：校验 Authorization: Bearer <token>
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: '访问令牌缺失' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '访问令牌无效' });
    }
    req.user = user; // { id, username, role }
    next();
  });
}

module.exports = {
  JWT_SECRET,
  authenticateToken
};

