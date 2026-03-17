const express = require('express');
const { v4: uuid } = require('uuid');
const { readJsonFile, writeJsonFile } = require('../dao/db');
const { authenticateToken } = require('../utils/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../uploads/returns');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'return-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB 限制
  fileFilter: function (req, file, cb) {
    // 只允许图片
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'));
    }
  }
});

// GET /api/returns - 获取退货申请列表
router.get('/', authenticateToken, (req, res) => {
  const returns = readJsonFile('returns.json');
  const orders = readJsonFile('orders.json');
  const users = readJsonFile('users.json');
  const products = readJsonFile('products.json');

  const isAdmin = req.user.role === 'admin';

  let result = returns;

  // 非管理员只能看到自己的退货申请
  if (!isAdmin) {
    result = returns.filter(r => r.userId === req.user.id);
  }

  // 补充关联信息
  result = result.map(ret => {
    const order = orders.find(o => o.id === ret.orderId);
    const user = users.find(u => u.id === ret.userId);

    // 获取商品信息
    let items = [];
    if (order && order.items) {
      items = order.items.map(item => {
        const product = products.find(p => p.id === item.productId);
        return {
          ...item,
          productImage: product ? product.image : null
        };
      });
    }

    return {
      ...ret,
      orderInfo: order ? {
        id: order.id,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt,
        items: items
      } : null,
      userInfo: user ? {
        id: user.id,
        username: user.username,
        email: user.email
      } : null
    };
  });

  // 按状态筛选（可选）
  const { status } = req.query;
  if (status) {
    result = result.filter(r => r.status === status);
  }

  res.json({ returns: result });
});

// GET /api/returns/:id - 获取单个退货申请详情
router.get('/:id', authenticateToken, (req, res) => {
  const returns = readJsonFile('returns.json');
  const ret = returns.find(r => r.id === req.params.id);

  if (!ret) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: '退货申请不存在' } });
  }

  const isAdmin = req.user.role === 'admin';
  if (!isAdmin && ret.userId !== req.user.id) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: '无权查看此退货申请' } });
  }

  res.json({ return: ret });
});

// POST /api/returns - 创建退货申请（支持图片上传）
router.post('/', authenticateToken, upload.array('images', 5), (req, res) => {
  try {
    const { orderId, reason, items } = req.body;

    if (!orderId || !reason) {
      // 删除已上传的图片
      if (req.files) {
        req.files.forEach(file => fs.unlinkSync(file.path));
      }
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: '订单ID和退货原因必填' } });
    }

    const orders = readJsonFile('orders.json');
    const order = orders.find(o => o.id === orderId);

    if (!order) {
      // 删除已上传的图片
      if (req.files) {
        req.files.forEach(file => fs.unlinkSync(file.path));
      }
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: '订单不存在' } });
    }

    // 只能退自己的订单
    if (order.userId !== req.user.id) {
      // 删除已上传的图片
      if (req.files) {
        req.files.forEach(file => fs.unlinkSync(file.path));
      }
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: '无权申请此订单退货' } });
    }

    // 只有已完成的订单才能退货
    if (order.status !== 'finished') {
      // 删除已上传的图片
      if (req.files) {
        req.files.forEach(file => fs.unlinkSync(file.path));
      }
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: '只有已完成的订单才能申请退货' } });
    }

    // 检查是否已有进行中的退货申请
    const returns = readJsonFile('returns.json');
    const existingReturn = returns.find(r => r.orderId === orderId && r.status === 'pending');
    if (existingReturn) {
      // 删除已上传的图片
      if (req.files) {
        req.files.forEach(file => fs.unlinkSync(file.path));
      }
      return res.status(409).json({ error: { code: 'CONFLICT', message: '该订单已有进行中的退货申请' } });
    }

    // 处理上传的图片
    const images = req.files ? req.files.map(file => `/uploads/returns/${file.filename}`) : [];

    // 计算退款金额
    let refundAmount = 0;
    let returnItems = [];

    if (items) {
      try {
        returnItems = JSON.parse(items);
      } catch (e) {
        returnItems = order.items.map(i => ({ productId: i.productId, qty: i.qty }));
      }
    } else {
      returnItems = order.items.map(i => ({ productId: i.productId, qty: i.qty }));
    }

    if (returnItems && Array.isArray(returnItems) && returnItems.length > 0) {
      // 部分退货
      for (const item of returnItems) {
        const orderItem = order.items.find(i => i.productId === item.productId);
        if (orderItem) {
          refundAmount += orderItem.price * item.qty;
        }
      }
    } else {
      // 全额退货
      refundAmount = order.totalAmount;
    }

    const newReturn = {
      id: uuid(),
      orderId,
      userId: req.user.id,
      reason,
      items: returnItems,
      images,
      refundAmount: Number(refundAmount.toFixed(2)),
      status: 'pending',
      adminComment: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    returns.push(newReturn);
    writeJsonFile('returns.json', returns);

    res.status(201).json({ message: '退货申请已提交', return: newReturn });
  } catch (error) {
    // 删除已上传的图片
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// PATCH /api/returns/:id/approve - 管理员同意退货
router.patch('/:id/approve', authenticateToken, (req, res) => {
  const isAdmin = req.user.role === 'admin';
  if (!isAdmin) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: '只有管理员可以审核退货' } });
  }

  const { adminComment } = req.body;
  const returns = readJsonFile('returns.json');
  const retIndex = returns.findIndex(r => r.id === req.params.id);

  if (retIndex === -1) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: '退货申请不存在' } });
  }

  const ret = returns[retIndex];
  if (ret.status !== 'pending') {
    return res.status(409).json({ error: { code: 'CONFLICT', message: '该退货申请已处理' } });
  }

  // 更新退货申请状态
  ret.status = 'approved';
  ret.adminComment = adminComment || '';
  ret.approvedAt = new Date().toISOString();
  ret.approvedBy = req.user.id;
  ret.updatedAt = new Date().toISOString();

  // 恢复订单状态为已退货
  const orders = readJsonFile('orders.json');
  const order = orders.find(o => o.id === ret.orderId);
  if (order) {
    order.status = 'returned';
    order.returnedAt = new Date().toISOString();
    writeJsonFile('orders.json', orders);

    // 恢复库存
    const products = readJsonFile('products.json');
    for (const item of ret.items) {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        product.stock += item.qty;
      }
    }
    writeJsonFile('products.json', products);
  }

  writeJsonFile('returns.json', returns);

  res.json({ message: '退货申请已批准', return: ret });
});

// PATCH /api/returns/:id/reject - 管理员拒绝退货
router.patch('/:id/reject', authenticateToken, (req, res) => {
  const isAdmin = req.user.role === 'admin';
  if (!isAdmin) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: '只有管理员可以审核退货' } });
  }

  const { adminComment } = req.body;
  const returns = readJsonFile('returns.json');
  const retIndex = returns.findIndex(r => r.id === req.params.id);

  if (retIndex === -1) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: '退货申请不存在' } });
  }

  const ret = returns[retIndex];
  if (ret.status !== 'pending') {
    return res.status(409).json({ error: { code: 'CONFLICT', message: '该退货申请已处理' } });
  }

  ret.status = 'rejected';
  ret.adminComment = adminComment || '';
  ret.rejectedAt = new Date().toISOString();
  ret.rejectedBy = req.user.id;
  ret.updatedAt = new Date().toISOString();

  writeJsonFile('returns.json', returns);

  res.json({ message: '退货申请已拒绝', return: ret });
});

// GET /api/returns/stats - 获取退货统计（管理员）
router.get('/stats/overview', authenticateToken, (req, res) => {
  const isAdmin = req.user.role === 'admin';
  if (!isAdmin) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: '只有管理员可以查看统计' } });
  }

  const returns = readJsonFile('returns.json');

  const stats = {
    total: returns.length,
    pending: returns.filter(r => r.status === 'pending').length,
    approved: returns.filter(r => r.status === 'approved').length,
    rejected: returns.filter(r => r.status === 'rejected').length,
    totalRefundAmount: returns
      .filter(r => r.status === 'approved')
      .reduce((sum, r) => sum + r.refundAmount, 0)
  };

  res.json({ stats });
});

module.exports = router;
