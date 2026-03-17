const express = require('express');
const { v4: uuid } = require('uuid');
const { readJsonFile, writeJsonFile } = require('../dao/db');
const { authenticateToken, JWT_SECRET } = require('../utils/auth');

const router = express.Router();
// 统一使用 utils/auth 的鉴权中间件

// GET /api/orders?me=1
router.get('/', authenticateToken, (req, res) => {
  const orders = readJsonFile('orders.json');
  const users = readJsonFile('users.json');
  const isAdmin = req.user.role === 'admin';
  const isFarmer = req.user.role === 'farmer';
  const me = req.query.me === '1';
  let result = orders;

  if (isFarmer) {
    // 农户：查看包含自己商品的订单
    result = orders.filter(o =>
      o.items && o.items.some(item => item.farmerId === req.user.id)
    );

    // 为农户添加额外信息：消费者信息和农户收益
    result = result.map(order => {
      // 查找消费者信息
      const buyer = users.find(u => u.id === order.userId);
      const buyerName = buyer ? buyer.username : '未知用户';

      // 计算农户从这个订单中的收益（只计算属于该农户的商品）
      const farmerItems = order.items.filter(item => item.farmerId === req.user.id);
      const farmerEarnings = farmerItems.reduce((sum, item) => sum + item.price * item.qty, 0);

      return {
        ...order,
        buyerName,           // 购买者名称
        farmerEarnings,      // 农户收益
        farmerItems          // 属于该农户的商品
      };
    });
  } else if (!isAdmin) {
    // 消费者：只看自己下的订单
    result = orders.filter(o => o.userId === req.user.id);
  } else if (me) {
    // 管理员如果带 me=1 则只看自己的
    result = orders.filter(o => o.userId === req.user.id);
  }

  res.json({ orders: result });
});

// GET /api/orders/:id
router.get('/:id', authenticateToken, (req, res) => {
  const orders = readJsonFile('orders.json');
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ msg: 'not found' });
  const isAdmin = req.user.role === 'admin';
  const isFarmer = req.user.role === 'farmer';

  // 权限检查：管理员可以看所有，农户可以看包含自己商品的订单，消费者只能看自己的
  const hasAccess = isAdmin ||
    order.userId === req.user.id ||
    (isFarmer && order.items && order.items.some(item => item.farmerId === req.user.id));

  if (!hasAccess) {
    return res.status(403).json({ msg: 'forbidden' });
  }
  res.json({ order });
});

// POST /api/orders
router.post('/', authenticateToken, (req, res) => {
  const itemsInput = Array.isArray(req.body.items) ? req.body.items : [];
  if (itemsInput.length === 0) return res.status(400).json({ msg: 'items empty' });

  const products = readJsonFile('products.json');

  // 校验、计算与库存扣减（先检查再扣减，确保全部充足）
  const calcItems = [];
  for (const it of itemsInput) {
    const { productId, qty } = it || {};
    if (!productId || !Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ msg: 'bad item' });
    }
    const p = products.find(x => x.id === productId);
    if (!p || p.stock < qty) {
      return res.status(400).json({ msg: `stock not enough for ${productId}` });
    }
    calcItems.push({ productId: p.id, name: p.name, price: Number(p.price), qty, farmerId: p.farmerId });
  }

  // 计算总价
  const totalAmount = calcItems.reduce((sum, it) => sum + it.price * it.qty, 0);

  // 扣减库存并写回
  for (const it of calcItems) {
    const p = products.find(x => x.id === it.productId);
    p.stock -= it.qty;
  }
  writeJsonFile('products.json', products);

  // 生成订单
  const order = {
    id: uuid(),
    userId: req.user.id,
    items: calcItems,
    totalAmount: Number(totalAmount.toFixed(2)),
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  const orders = readJsonFile('orders.json');
  orders.push(order);
  writeJsonFile('orders.json', orders);

  res.status(201).json({ order });
});

// PATCH /api/orders/:id/cancel（仅 pending 可取消，库存加回）
router.patch('/:id/cancel', authenticateToken, (req, res) => {
  const orders = readJsonFile('orders.json');
  const orderIndex = orders.findIndex(o => o.id === req.params.id);
  if (orderIndex === -1) return res.status(404).json({ msg: 'not found' });
  
  const order = orders[orderIndex];
  const isAdmin = req.user.role === 'admin';
  if (!isAdmin && order.userId !== req.user.id) {
    return res.status(403).json({ msg: 'forbidden' });
  }
  
  if (order.status !== 'pending') {
    return res.status(400).json({ msg: 'only pending orders can be cancelled' });
  }

  // 恢复库存
  const products = readJsonFile('products.json');
  for (const item of order.items) {
    const product = products.find(p => p.id === item.productId);
    if (product) {
      product.stock += item.qty;
    }
  }
  writeJsonFile('products.json', products);

  // 更新订单状态
  order.status = 'cancelled';
  order.updatedAt = new Date().toISOString();
  writeJsonFile('orders.json', orders);

  res.json({ message: '订单已取消', order });
});

module.exports = router;
