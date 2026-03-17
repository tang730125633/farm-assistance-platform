const express = require('express');
const { v4: uuid } = require('uuid');
const { authenticateToken } = require('../utils/auth');
const { readJsonFile, writeJsonFile } = require('../dao/db');
const { processOrderSettlement } = require('../utils/farmerSettlement');

const router = express.Router();

// GET /api/payments/:orderId - 获取订单的支付记录（本人或管理员）
router.get('/:orderId', authenticateToken, (req, res) => {
  const orderId = req.params.orderId;
  const orders = readJsonFile('orders.json');
  const payments = readJsonFile('payments.json');
  const order = orders.find(o => o.id === orderId);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  const isAdmin = req.user.role === 'admin';
  if (!isAdmin && order.userId !== req.user.id) {
    return res.status(403).json({ error: '无权查看该支付记录' });
  }
  const list = payments.filter(p => p.orderId === orderId);
  res.json({ payments: list });
});

// POST /api/payments/:orderId/pay - 订单支付（仅订单所有者，pending -> paid）
router.post('/:orderId/pay', authenticateToken, (req, res) => {
  const orderId = req.params.orderId;
  const orders = readJsonFile('orders.json');
  const payments = readJsonFile('payments.json');
  const orderIndex = orders.findIndex(o => o.id === orderId);
  if (orderIndex === -1) return res.status(404).json({ error: '订单不存在' });
  const order = orders[orderIndex];

  if (order.userId !== req.user.id) {
    return res.status(403).json({ error: '只能支付自己的订单' });
  }

  if (order.status !== 'pending') {
    return res.status(400).json({ error: '仅待支付订单可支付' });
  }

  // 幂等：如已有成功支付记录则直接返回
  const exists = payments.find(p => p.orderId === orderId && p.status === 'success');
  if (exists) {
    return res.json({ message: '订单已支付', payment: exists, order });
  }

  const payment = {
    id: uuid(),
    orderId,
    userId: req.user.id,
    amount: Number(order.totalAmount),
    method: 'mock',
    type: 'payment',
    status: 'success',
    createdAt: new Date().toISOString()
  };
  payments.push(payment);
  writeJsonFile('payments.json', payments);

  // 更新订单状态
  order.status = 'paid';
  order.paidAt = new Date().toISOString();
  order.updatedAt = order.paidAt;
  orders[orderIndex] = order;
  writeJsonFile('orders.json', orders);

  // ⭐ 关键：支付成功后，为涉及的农户创建销售记录和更新钱包
  try {
    const settlementResults = processOrderSettlement(order);
    console.log('农户结算完成:', settlementResults);
  } catch (error) {
    console.error('农户结算失败:', error);
    // 即使结算失败，也返回支付成功（可以后续补偿）
  }

  res.status(201).json({ message: '支付成功', payment, order });
});

module.exports = router;

// 退款（仅订单所有者或管理员；仅 paid 可退款；幂等等价 409）
router.post('/:orderId/refund', authenticateToken, (req, res) => {
  const orderId = req.params.orderId;
  const orders = readJsonFile('orders.json');
  const payments = readJsonFile('payments.json');
  const orderIndex = orders.findIndex(o => o.id === orderId);
  if (orderIndex === -1) return res.status(404).json({ error: '订单不存在' });
  const order = orders[orderIndex];

  const isAdmin = req.user.role === 'admin';
  if (!isAdmin && order.userId !== req.user.id) {
    return res.status(403).json({ error: '只能操作自己的订单' });
  }

  // 幂等：若已存在成功退款记录，则 409（等价返回）
  const refunded = payments.find(p => p.orderId === orderId && p.type === 'refund' && p.status === 'success');
  if (refunded) {
    return res.status(409).json({ error: '订单已退款' });
  }

  if (order.status !== 'paid') {
    return res.status(400).json({ error: '仅已支付订单可退款' });
  }

  const refund = {
    id: uuid(),
    orderId,
    userId: req.user.id,
    amount: Number(order.totalAmount),
    method: 'mock',
    status: 'success',
    type: 'refund',
    createdAt: new Date().toISOString()
  };
  payments.push(refund);
  writeJsonFile('payments.json', payments);

  // 方案A：退款后将订单标记为 cancelled（含退款完成语义）
  order.status = 'cancelled';
  order.updatedAt = refund.createdAt;
  orders[orderIndex] = order;
  writeJsonFile('orders.json', orders);

  res.status(201).json({ message: '退款成功', refund, order });
});
