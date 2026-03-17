const { v4: uuid } = require('uuid');
const { readJsonFile, writeJsonFile } = require('../dao/db');

/**
 * 为农户创建销售记录
 * @param {string} orderId - 消费者订单ID
 * @param {string} farmerId - 农户ID
 * @param {string} buyerId - 购买者ID
 * @param {Array} items - 属于该农户的商品列表
 * @param {number} totalAmount - 该农户从此订单获得的总金额
 * @returns {Object} 创建的销售记录
 */
function createFarmerSale(orderId, farmerId, buyerId, items, totalAmount) {
  const farmerSales = readJsonFile('farmer_sales.json');

  const sale = {
    id: uuid(),
    orderId,           // 关联的消费者订单ID
    farmerId,          // 农户ID
    buyerId,           // 购买者ID
    items,             // 售出的商品列表 [{productId, name, price, qty}]
    totalAmount,       // 农户从此笔订单获得的金额
    status: 'pending', // pending, completed, cancelled
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  farmerSales.push(sale);
  writeJsonFile('farmer_sales.json', farmerSales);

  return sale;
}

/**
 * 更新农户钱包余额
 * @param {string} farmerId - 农户ID
 * @param {number} amount - 金额（正数为收入，负数为支出）
 * @param {string} type - 交易类型：'sale'（销售收入）, 'refund'（退款）, 'withdrawal'（提现）
 * @param {string} relatedId - 关联的记录ID（如销售记录ID）
 * @param {string} description - 交易描述
 * @returns {Object} 更新后的钱包信息
 */
function updateFarmerWallet(farmerId, amount, type, relatedId, description) {
  const wallets = readJsonFile('farmer_wallets.json');

  // 查找或创建农户钱包
  let wallet = wallets.find(w => w.farmerId === farmerId);

  if (!wallet) {
    // 首次创建钱包
    wallet = {
      id: uuid(),
      farmerId,
      balance: 0,
      totalIncome: 0,
      totalWithdrawal: 0,
      transactions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    wallets.push(wallet);
  }

  // 创建交易记录
  const transaction = {
    id: uuid(),
    type,           // 'sale', 'refund', 'withdrawal'
    amount,
    relatedId,      // 关联的销售记录ID或订单ID
    description,
    balance: wallet.balance + amount,  // 交易后余额
    createdAt: new Date().toISOString()
  };

  // 更新钱包余额和统计
  wallet.balance += amount;

  if (type === 'sale') {
    wallet.totalIncome += amount;
  } else if (type === 'withdrawal') {
    wallet.totalWithdrawal += Math.abs(amount);
  }

  // 添加交易记录
  if (!wallet.transactions) {
    wallet.transactions = [];
  }
  wallet.transactions.push(transaction);

  wallet.updatedAt = new Date().toISOString();

  // 保存更新后的钱包数据
  writeJsonFile('farmer_wallets.json', wallets);

  return wallet;
}

/**
 * 处理订单支付完成后的农户结算
 * 当消费者支付完成后，为涉及的每个农户创建销售记录并更新钱包
 * @param {Object} order - 消费者订单对象
 */
function processOrderSettlement(order) {
  // 按农户分组订单商品
  const farmerGroups = {};

  for (const item of order.items) {
    const farmerId = item.farmerId;
    if (!farmerId) {
      console.warn(`订单 ${order.id} 中的商品 ${item.productId} 缺少 farmerId`);
      continue;
    }

    if (!farmerGroups[farmerId]) {
      farmerGroups[farmerId] = [];
    }

    farmerGroups[farmerId].push(item);
  }

  // 为每个农户创建销售记录和更新钱包
  const results = [];

  for (const [farmerId, items] of Object.entries(farmerGroups)) {
    // 计算该农户从此订单获得的总金额
    const totalAmount = items.reduce((sum, item) => {
      return sum + (item.price * item.qty);
    }, 0);

    // 创建农户销售记录
    const sale = createFarmerSale(
      order.id,
      farmerId,
      order.userId,
      items,
      totalAmount
    );

    // 更新农户钱包（增加收入）
    const wallet = updateFarmerWallet(
      farmerId,
      totalAmount,
      'sale',
      sale.id,
      `订单 ${order.id} 销售收入`
    );

    results.push({
      farmerId,
      saleId: sale.id,
      amount: totalAmount,
      walletBalance: wallet.balance
    });
  }

  return results;
}

/**
 * 获取农户的销售记录
 * @param {string} farmerId - 农户ID
 * @param {Object} options - 查询选项 {status, page, limit}
 * @returns {Array} 销售记录列表
 */
function getFarmerSales(farmerId, options = {}) {
  const { status, page = 1, limit = 20 } = options;
  let sales = readJsonFile('farmer_sales.json');

  // 过滤该农户的销售记录
  sales = sales.filter(s => s.farmerId === farmerId);

  // 按状态过滤
  if (status) {
    sales = sales.filter(s => s.status === status);
  }

  // 按创建时间降序排序
  sales.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // 分页
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedSales = sales.slice(startIndex, endIndex);

  return {
    sales: paginatedSales,
    total: sales.length,
    page,
    limit,
    pages: Math.ceil(sales.length / limit)
  };
}

/**
 * 获取农户钱包信息
 * @param {string} farmerId - 农户ID
 * @returns {Object|null} 钱包信息
 */
function getFarmerWallet(farmerId) {
  const wallets = readJsonFile('farmer_wallets.json');
  return wallets.find(w => w.farmerId === farmerId) || null;
}

module.exports = {
  createFarmerSale,
  updateFarmerWallet,
  processOrderSettlement,
  getFarmerSales,
  getFarmerWallet
};
