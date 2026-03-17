const express = require('express');
const { v4: uuid } = require('uuid');
const { authenticateToken } = require('../utils/auth');
const { orderDb } = require('../dao/dbAdapter');
const { pool } = require('../config/database');
const { processOrderSettlement } = require('../utils/farmerSettlement');

const router = express.Router();

// 判断是否使用 PostgreSQL
const usePostgres = process.env.DATABASE_URL && process.env.NODE_ENV === 'production';

// 获取支付记录（从 JSON 或 PostgreSQL）
async function getPayments(orderId) {
  if (usePostgres) {
    const result = await pool.query(
      'SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at DESC',
      [orderId]
    );
    return result.rows.map(row => ({
      id: row.id,
      orderId: row.order_id,
      userId: row.user_id,
      amount: parseFloat(row.amount),
      method: row.method,
      type: row.type,
      status: row.status,
      createdAt: row.created_at
    }));
  } else {
    const { readJsonFile } = require('../dao/db');
    const payments = readJsonFile('payments.json');
    return payments.filter(p => p.orderId === orderId);
  }
}

// 保存支付记录
async function savePayment(payment) {
  if (usePostgres) {
    await pool.query(
      `INSERT INTO payments (id, order_id, user_id, amount, method, type, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [payment.id, payment.orderId, payment.userId, payment.amount, payment.method, payment.type, payment.status, payment.createdAt]
    );
  } else {
    const { readJsonFile, writeJsonFile } = require('../dao/db');
    const payments = readJsonFile('payments.json');
    payments.push(payment);
    writeJsonFile('payments.json', payments);
  }
}

// GET /api/payments/:orderId - 获取订单的支付记录（本人或管理员）
router.get('/:orderId', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await orderDb.findById(orderId);

    if (!order) return res.status(404).json({ error: '订单不存在' });

    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && order.userId !== req.user.id) {
      return res.status(403).json({ error: '无权查看该支付记录' });
    }

    const list = await getPayments(orderId);
    res.json({ payments: list });
  } catch (error) {
    console.error('[支付] 获取支付记录失败:', error);
    res.status(500).json({ error: '获取支付记录失败' });
  }
});

// POST /api/payments/:orderId/pay - 订单支付（仅订单所有者，pending -> paid）
router.post('/:orderId/pay', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.orderId;
    console.log('[支付] 开始处理支付, orderId:', orderId, '用户:', req.user.id);

    const order = await orderDb.findById(orderId);
    if (!order) {
      console.log('[支付] 订单不存在:', orderId);
      return res.status(404).json({ error: '订单不存在' });
    }

    console.log('[支付] 找到订单, 状态:', order.status, '订单用户:', order.userId);

    if (order.userId !== req.user.id) {
      return res.status(403).json({ error: '只能支付自己的订单' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ error: '仅待支付订单可支付' });
    }

    // 幂等：如已有成功支付记录则直接返回
    const payments = await getPayments(orderId);
    const exists = payments.find(p => p.status === 'success');
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

    await savePayment(payment);

    // 更新订单状态
    await orderDb.update(orderId, {
      status: 'paid',
      paidAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // 获取更新后的订单
    const updatedOrder = await orderDb.findById(orderId);

    // ⭐ 关键：支付成功后，为涉及的农户创建销售记录和更新钱包
    try {
      const settlementResults = processOrderSettlement(updatedOrder);
      console.log('农户结算完成:', settlementResults);
    } catch (error) {
      console.error('农户结算失败:', error);
      // 即使结算失败，也返回支付成功（可以后续补偿）
    }

    console.log('[支付] 支付成功, paymentId:', payment.id);
    res.status(201).json({ message: '支付成功', payment, order: updatedOrder });
  } catch (error) {
    console.error('[支付] 支付失败:', error);
    res.status(500).json({ error: '支付失败: ' + error.message });
  }
});

// 退款（仅订单所有者或管理员；仅 paid 可退款；幂等等价 409）
router.post('/:orderId/refund', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await orderDb.findById(orderId);

    if (!order) return res.status(404).json({ error: '订单不存在' });

    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && order.userId !== req.user.id) {
      return res.status(403).json({ error: '只能操作自己的订单' });
    }

    // 幂等：若已存在成功退款记录，则 409（等价返回）
    const payments = await getPayments(orderId);
    const refunded = payments.find(p => p.type === 'refund' && p.status === 'success');
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

    await savePayment(refund);

    // 退款后将订单标记为 cancelled
    await orderDb.update(orderId, {
      status: 'cancelled',
      updatedAt: new Date().toISOString()
    });

    const updatedOrder = await orderDb.findById(orderId);

    res.status(201).json({ message: '退款成功', refund, order: updatedOrder });
  } catch (error) {
    console.error('[支付] 退款失败:', error);
    res.status(500).json({ error: '退款失败: ' + error.message });
  }
});

module.exports = router;
