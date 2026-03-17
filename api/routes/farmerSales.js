const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../utils/auth');
const { getFarmerSales, getFarmerWallet } = require('../utils/farmerSettlement');
const { readJsonFile } = require('../dao/db');

/**
 * 验证农户或管理员权限
 */
function requireFarmerOrAdmin(req, res, next) {
  if (req.user.role !== 'farmer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要农户或管理员权限' });
  }
  next();
}

/**
 * GET /api/farmer-sales - 获取农户的销售记录列表
 * 查询参数：
 *   - status: 状态筛选 (pending, completed, cancelled)
 *   - page: 页码 (默认 1)
 *   - limit: 每页数量 (默认 20)
 */
router.get('/', authenticateToken, requireFarmerOrAdmin, (req, res) => {
  try {
    const farmerId = req.user.id;
    const { status, page, limit } = req.query;

    const result = getFarmerSales(farmerId, {
      status,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });

    // 为每条销售记录添加购买者信息
    const users = readJsonFile('users.json');
    result.sales = result.sales.map(sale => {
      const buyer = users.find(u => u.id === sale.buyerId);
      return {
        ...sale,
        buyerName: buyer ? buyer.username : '未知用户',
        buyerEmail: buyer ? buyer.email : null
      };
    });

    res.json(result);
  } catch (error) {
    console.error('获取农户销售记录错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * GET /api/farmer-sales/wallet - 获取农户钱包信息
 * 返回：余额、总收入、总提现、交易流水等
 */
router.get('/wallet', authenticateToken, requireFarmerOrAdmin, (req, res) => {
  try {
    const farmerId = req.user.id;
    const wallet = getFarmerWallet(farmerId);

    if (!wallet) {
      return res.json({
        farmerId,
        balance: 0,
        totalIncome: 0,
        totalWithdrawal: 0,
        transactions: [],
        message: '钱包尚未初始化'
      });
    }

    res.json({ wallet });
  } catch (error) {
    console.error('获取农户钱包错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * GET /api/farmer-sales/summary - 获取农户销售概况
 * 返回：总销售额、待结算金额、已完成订单数等统计信息
 */
router.get('/summary', authenticateToken, requireFarmerOrAdmin, (req, res) => {
  try {
    const farmerId = req.user.id;
    const wallet = getFarmerWallet(farmerId);
    const allSales = getFarmerSales(farmerId, { limit: 999999 });

    const summary = {
      totalSales: allSales.total,
      balance: wallet ? wallet.balance : 0,
      totalIncome: wallet ? wallet.totalIncome : 0,
      totalWithdrawal: wallet ? wallet.totalWithdrawal : 0,
      pendingSales: allSales.sales.filter(s => s.status === 'pending').length,
      completedSales: allSales.sales.filter(s => s.status === 'completed').length,
      cancelledSales: allSales.sales.filter(s => s.status === 'cancelled').length
    };

    res.json({ summary });
  } catch (error) {
    console.error('获取农户销售概况错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
