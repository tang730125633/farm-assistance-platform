/**
 * 数据迁移脚本：为现有订单补充 farmerId 并生成农户销售记录
 */

const path = require('path');
const { readJsonFile, writeJsonFile } = require('../dao/db');
const { processOrderSettlement } = require('../utils/farmerSettlement');

function migrateOrders() {
  console.log('开始迁移订单数据...\n');

  const orders = readJsonFile('orders.json');
  const products = readJsonFile('products.json');

  let updatedCount = 0;
  let settlementCount = 0;

  // 为每个订单补充 farmerId
  for (const order of orders) {
    let orderUpdated = false;

    for (const item of order.items) {
      // 如果item缺少farmerId，从产品中补充
      if (!item.farmerId) {
        const product = products.find(p => p.id === item.productId);
        if (product && product.farmerId) {
          item.farmerId = product.farmerId;
          orderUpdated = true;
          console.log(`✓ 订单 ${order.id} 的商品 ${item.name} 补充了 farmerId: ${product.farmerId}`);
        } else {
          console.warn(`⚠ 订单 ${order.id} 的商品 ${item.productId} 找不到对应的产品或产品缺少farmerId`);
        }
      }
    }

    if (orderUpdated) {
      updatedCount++;
    }

    // 如果订单已支付，且所有items都有farmerId，为农户生成销售记录
    const allItemsHaveFarmerId = order.items.every(item => item.farmerId);
    if (order.status === 'paid' && allItemsHaveFarmerId) {
      try {
        // 检查是否已经有对应的销售记录（避免重复生成）
        const farmerSales = readJsonFile('farmer_sales.json');
        const existingSale = farmerSales.find(sale => sale.orderId === order.id);

        if (!existingSale) {
          const results = processOrderSettlement(order);
          settlementCount++;
          console.log(`✓ 为订单 ${order.id} 生成了农户销售记录和钱包数据:`, results);
        } else {
          console.log(`- 订单 ${order.id} 已有销售记录，跳过`);
        }
      } catch (error) {
        console.error(`✗ 为订单 ${order.id} 生成农户结算数据失败:`, error.message);
      }
    }
  }

  // 保存更新后的订单数据
  if (updatedCount > 0) {
    writeJsonFile('orders.json', orders);
    console.log(`\n✓ 已更新 ${updatedCount} 个订单的数据\n`);
  } else {
    console.log('\n- 没有需要更新farmerId的订单\n');
  }

  console.log(`✓ 已为 ${settlementCount} 个订单生成农户结算数据\n`);
  console.log('迁移完成！\n');
}

// 执行迁移
if (require.main === module) {
  migrateOrders();
}

module.exports = { migrateOrders };
