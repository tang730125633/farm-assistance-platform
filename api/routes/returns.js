const express = require('express');
const { v4: uuid } = require('uuid');
const { returnDb, orderDb, userDb, productDb } = require('../dao/dbAdapter');
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
router.get('/', authenticateToken, async (req, res) => {
  try {
    const returns = await returnDb.findAll();
    const orders = await orderDb.findAll();
    const users = await userDb.findAll();
    const products = await productDb.findAll();

    const isAdmin = req.user.role === 'admin';
    const isFarmer = req.user.role === 'farmer';

    let result = returns;

    // 权限过滤
    if (isFarmer) {
      // 农户：查看涉及自己商品的退货申请
      result = returns.filter(r => {
        const order = orders.find(o => o.id === r.orderId);
        if (!order || !order.items) return false;
        // 检查订单中是否包含该农户的商品
        return order.items.some(item => item.farmerId === req.user.id);
      });
    } else if (!isAdmin) {
      // 消费者：只能看到自己的退货申请
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
  } catch (error) {
    console.error('获取退货列表错误:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } });
  }
});

// GET /api/returns/:id - 获取单个退货申请详情
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const ret = await returnDb.findById(req.params.id);

    if (!ret) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: '退货申请不存在' } });
    }

    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && ret.userId !== req.user.id) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: '无权查看此退货申请' } });
    }

    res.json({ return: ret });
  } catch (error) {
    console.error('获取退货详情错误:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } });
  }
});

// POST /api/returns - 创建退货申请（支持图片上传）
router.post('/', authenticateToken, upload.array('images', 5), async (req, res) => {
  try {
    const { orderId, reason, items } = req.body;

    if (!orderId || !reason) {
      // 删除已上传的图片
      if (req.files) {
        req.files.forEach(file => fs.unlinkSync(file.path));
      }
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: '订单ID和退货原因必填' } });
    }

    const order = await orderDb.findById(orderId);

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

    // 只有已支付或已完成的订单才能退货
    if (!['paid', 'finished'].includes(order.status)) {
      // 删除已上传的图片
      if (req.files) {
        req.files.forEach(file => fs.unlinkSync(file.path));
      }
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: '只有已支付或已完成的订单才能申请退货' } });
    }

    // 检查是否已有进行中的退货申请
    const returns = await returnDb.findAll();
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

    await returnDb.create(newReturn);

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
router.patch('/:id/approve', authenticateToken, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    if (!isAdmin) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: '只有管理员可以审核退货' } });
    }

    const { adminComment } = req.body;
    const ret = await returnDb.findById(req.params.id);

    if (!ret) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: '退货申请不存在' } });
    }

    if (ret.status !== 'pending') {
      return res.status(409).json({ error: { code: 'CONFLICT', message: '该退货申请已处理' } });
    }

    // 更新退货申请状态
    await returnDb.update(req.params.id, {
      status: 'approved',
      adminComment: adminComment || '',
      updatedAt: new Date().toISOString()
    });

    // 恢复订单状态为已退货
    const order = await orderDb.findById(ret.orderId);
    if (order) {
      await orderDb.update(ret.orderId, { status: 'returned', updatedAt: new Date().toISOString() });

      // 恢复库存
      for (const item of ret.items) {
        const product = await productDb.findById(item.productId);
        if (product) {
          await productDb.update(item.productId, { stock: product.stock + item.qty });
        }
      }
    }

    res.json({ message: '退货申请已批准', return: await returnDb.findById(req.params.id) });
  } catch (error) {
    console.error('批准退货错误:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } });
  }
});

// PATCH /api/returns/:id/reject - 管理员拒绝退货
router.patch('/:id/reject', authenticateToken, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    if (!isAdmin) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: '只有管理员可以审核退货' } });
    }

    const { adminComment } = req.body;
    const ret = await returnDb.findById(req.params.id);

    if (!ret) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: '退货申请不存在' } });
    }

    if (ret.status !== 'pending') {
      return res.status(409).json({ error: { code: 'CONFLICT', message: '该退货申请已处理' } });
    }

    await returnDb.update(req.params.id, {
      status: 'rejected',
      adminComment: adminComment || '',
      updatedAt: new Date().toISOString()
    });

    res.json({ message: '退货申请已拒绝', return: await returnDb.findById(req.params.id) });
  } catch (error) {
    console.error('拒绝退货错误:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } });
  }
});

// GET /api/returns/stats - 获取退货统计（管理员）
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    if (!isAdmin) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: '只有管理员可以查看统计' } });
    }

    const returns = await returnDb.findAll();

    const stats = {
      total: returns.length,
      pending: returns.filter(r => r.status === 'pending').length,
      approved: returns.filter(r => r.status === 'approved').length,
      rejected: returns.filter(r => r.status === 'rejected').length,
      totalRefundAmount: returns
        .filter(r => r.status === 'approved')
        .reduce((sum, r) => sum + (r.refundAmount || 0), 0)
    };

    res.json({ stats });
  } catch (error) {
    console.error('获取退货统计错误:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } });
  }
});

module.exports = router;
