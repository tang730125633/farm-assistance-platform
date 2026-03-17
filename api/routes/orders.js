const express = require('express');
const { v4: uuid } = require('uuid');
const { orderDb, productDb, userDb } = require('../dao/dbAdapter');
const { authenticateToken, JWT_SECRET } = require('../utils/auth');

const router = express.Router();
// 统一使用 utils/auth 的鉴权中间件

// GET /api/orders?me=1
router.get('/', authenticateToken, async (req, res) => {
  try {
    const orders = await orderDb.findAll();
    const users = await userDb.findAll();
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
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const order = await orderDb.findById(req.params.id);
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
  } catch (error) {
    console.error('获取订单详情错误:', error);
    res.status(500).json({ msg: 'server error' });
  }
});

// POST /api/orders
router.post('/', authenticateToken, async (req, res) => {
  try {
    const itemsInput = Array.isArray(req.body.items) ? req.body.items : [];
    if (itemsInput.length === 0) return res.status(400).json({ msg: 'items empty' });

    const products = await productDb.findAll();

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

    // 扣减库存
    for (const it of calcItems) {
      await productDb.update(it.productId, { stock: products.find(x => x.id === it.productId).stock - it.qty });
    }

    // 生成订单
    const order = {
      id: uuid(),
      userId: req.user.id,
      items: calcItems,
      totalAmount: Number(totalAmount.toFixed(2)),
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    await orderDb.create(order);

    res.status(201).json({ order });
  } catch (error) {
    console.error('创建订单错误:', error);
    res.status(500).json({ msg: 'server error' });
  }
});

// PATCH /api/orders/:id/cancel（仅 pending 可取消，库存加回）
router.patch('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const order = await orderDb.findById(req.params.id);
    if (!order) return res.status(404).json({ msg: 'not found' });

    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && order.userId !== req.user.id) {
      return res.status(403).json({ msg: 'forbidden' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ msg: 'only pending orders can be cancelled' });
    }

    // 恢复库存
    for (const item of order.items) {
      const product = await productDb.findById(item.productId);
      if (product) {
        await productDb.update(item.productId, { stock: product.stock + item.qty });
      }
    }

    // 更新订单状态
    await orderDb.update(order.id, { status: 'cancelled', updatedAt: new Date().toISOString() });

  res.json({ message: '订单已取消', order });
});

module.exports = router;
