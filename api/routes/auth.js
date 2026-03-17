const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { addItem, findByCondition } = require('../dao/db');
const { JWT_SECRET, authenticateToken } = require('../utils/auth');
const { ERRORS, sendErrorResponse, asyncHandler, validateRequiredFields } = require('../utils/errorHandler');

const router = express.Router();

// JWT 密钥统一从 utils 获取（支持环境变量）

/**
 * 生成 JWT Token
 * @param {Object} user - 用户信息
 * @returns {string} JWT Token
 */
function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

/**
 * 验证 JWT Token 中间件
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
// 认证中间件改为复用 utils/auth

// 用户注册
router.post('/register', asyncHandler(async (req, res) => {
  const { username, password, email, role = 'consumer' } = req.body;

  // 验证必填字段
  validateRequiredFields(req.body, ['username', 'password', 'email']);

  // 验证角色
  if (!['consumer', 'farmer', 'admin'].includes(role)) {
    return sendErrorResponse(res, ERRORS.INVALID_INPUT, '角色必须是 consumer、farmer 或 admin');
  }

  // 验证密码强度
  if (password.length < 6) {
    return sendErrorResponse(res, ERRORS.INVALID_INPUT, '密码长度至少6位');
  }

  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return sendErrorResponse(res, ERRORS.INVALID_INPUT, '邮箱格式无效');
  }

  // 检查用户名是否已存在
  const existingUsers = findByCondition('users.json', user => 
    user.username === username || user.email === email
  );

  if (existingUsers.length > 0) {
    return sendErrorResponse(res, ERRORS.ALREADY_EXISTS, '用户名或邮箱已存在');
  }

  // 加密密码
  const hashedPassword = await bcrypt.hash(password, 10);

  // 创建新用户
  const newUser = {
    id: uuidv4(),
    username,
    email,
    password: hashedPassword,
    role,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // 保存用户
  const savedUser = addItem('users.json', newUser);
  
  if (!savedUser) {
    return sendErrorResponse(res, ERRORS.DATABASE_ERROR, '注册失败，请重试');
  }

  // 生成 Token
  const token = generateToken(savedUser);
  
  // 返回用户信息（不包含密码）
  const { password: _, ...userWithoutPassword } = savedUser;
  
  res.status(201).json({
    message: '注册成功',
    user: userWithoutPassword,
    token
  });
}));

// 用户登录
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  // 验证必填字段
  validateRequiredFields(req.body, ['username', 'password']);

  // 查找用户
  const users = findByCondition('users.json', user => 
    user.username === username || user.email === username
  );

  if (users.length === 0) {
    return sendErrorResponse(res, ERRORS.UNAUTHORIZED, '用户名或密码错误');
  }

  const user = users[0];

  // 验证密码
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return sendErrorResponse(res, ERRORS.UNAUTHORIZED, '用户名或密码错误');
  }

  // 生成 Token
  const token = generateToken(user);
  
  // 返回用户信息（不包含密码）
  const { password: _, ...userWithoutPassword } = user;
  
  res.json({
    message: '登录成功',
    user: userWithoutPassword,
    token
  });
}));

// 获取当前用户信息
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    user: req.user
  });
});

// 验证 Token 有效性
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: req.user
  });
});

// 获取用户列表（基本信息，不包含密码）
router.get('/users', authenticateToken, (req, res) => {
  try {
    const { readJsonFile } = require('../dao/db');
    const users = readJsonFile('users.json');

    // 只返回基本信息，不包含密码
    const usersBasicInfo = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }));

    res.json({ users: usersBasicInfo });
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
