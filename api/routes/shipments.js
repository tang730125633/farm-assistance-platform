const express = require('express');
const { v4: uuid } = require('uuid');
const { authenticateToken } = require('../utils/auth');
const { readJsonFile, writeJsonFile } = require('../dao/db');

const router = express.Router();

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
}

// GET /api/shipments/:orderId - 查询物流（本人或管理员）
router.get('/:orderId', authenticateToken, (req, res) => {
  const orderId = req.params.orderId;
  const orders = readJsonFile('orders.json');
  const shipments = readJsonFile('shipments.json');
  const order = orders.find(o => o.id === orderId);
  if (!order) return res.status(404).json({ error: '订单不存在' });

  const isAdmin = req.user.role === 'admin';
  if (!isAdmin && order.userId !== req.user.id) {
    return res.status(403).json({ error: '无权查看该订单的物流' });
  }

  const shipment = shipments.find(s => s.orderId === orderId) || null;
  res.json({ shipment });
});

// POST /api/shipments/:orderId/ship - 发货（管理员），订单需 paid -> shipped
router.post('/:orderId/ship', authenticateToken, requireAdmin, (req, res) => {
  const orderId = req.params.orderId;
  const orders = readJsonFile('orders.json');
  const shipments = readJsonFile('shipments.json');
  const orderIndex = orders.findIndex(o => o.id === orderId);
  if (orderIndex === -1) return res.status(404).json({ error: '订单不存在' });
  const order = orders[orderIndex];

  if (order.status !== 'paid') {
    return res.status(400).json({ error: '仅已支付订单可发货' });
  }

  // 若已存在物流则幂等处理
  let shipment = shipments.find(s => s.orderId === orderId);
  if (!shipment) {
    shipment = {
      id: uuid(),
      orderId,
      status: 'shipped',
      carrier: '本地配送队',
      courierName: '张三',
      courierPhone: '13800000000',
      history: [
        { time: new Date().toISOString(), status: 'shipped', text: '包裹已发出' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    shipments.push(shipment);
  } else {
    shipment.status = 'shipped';
    shipment.history.push({ time: new Date().toISOString(), status: 'shipped', text: '重复发货记录' });
    shipment.updatedAt = new Date().toISOString();
  }
  writeJsonFile('shipments.json', shipments);

  // 更新订单状态
  order.status = 'shipped';
  order.shippedAt = new Date().toISOString();
  order.updatedAt = order.shippedAt;
  orders[orderIndex] = order;
  writeJsonFile('orders.json', orders);

  res.status(201).json({ message: '已发货', shipment, order });
});

// POST /api/shipments/:orderId/push - 追加轨迹；当 status=delivered 同步订单为 finished
router.post('/:orderId/push', authenticateToken, requireAdmin, (req, res) => {
  const orderId = req.params.orderId;
  const { status, text } = req.body || {};
  const orders = readJsonFile('orders.json');
  const shipments = readJsonFile('shipments.json');
  const orderIndex = orders.findIndex(o => o.id === orderId);
  if (orderIndex === -1) return res.status(404).json({ error: '订单不存在' });
  const order = orders[orderIndex];

  let shipment = shipments.find(s => s.orderId === orderId);
  if (!shipment) return res.status(404).json({ error: '未找到物流单' });

  const entry = {
    time: new Date().toISOString(),
    status: status || 'in_transit',
    text: text || '运输中'
  };
  shipment.history.push(entry);

  if (entry.status === 'delivered') {
    shipment.status = 'delivered';
    shipment.updatedAt = entry.time;
    // 完成订单
    order.status = 'finished';
    order.finishedAt = entry.time;
    order.updatedAt = entry.time;
    orders[orderIndex] = order;
    writeJsonFile('orders.json', orders);
  } else {
    shipment.updatedAt = entry.time;
  }

  writeJsonFile('shipments.json', shipments);
  res.json({ message: '已追加物流轨迹', shipment, order });
});

module.exports = router;
