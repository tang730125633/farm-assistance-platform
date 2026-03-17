/**
 * 数据迁移脚本：为现有订单添加 farmerId
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../api/data');
const ordersPath = path.join(DATA_DIR, 'orders.json');
const productsPath = path.join(DATA_DIR, 'products.json');

// 读取数据
const orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8'));
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

console.log(`找到 ${orders.length} 个订单`);
console.log(`找到 ${products.length} 个商品`);

let updated = 0;

// 为每个订单的商品项添加 farmerId
orders.forEach(order => {
  if (order.items && Array.isArray(order.items)) {
    order.items.forEach(item => {
      // 如果已经有 farmerId，跳过
      if (item.farmerId) return;

      // 查找对应的商品
      const product = products.find(p => p.id === item.productId);
      if (product && product.farmerId) {
        item.farmerId = product.farmerId;
        updated++;
        console.log(`✓ 订单 ${order.id} 的商品 ${item.name} 添加了 farmerId: ${product.farmerId}`);
      } else {
        console.log(`✗ 订单 ${order.id} 的商品 ${item.productId} 找不到对应的产品`);
      }
    });
  }
});

// 写回文件
fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2), 'utf8');

console.log(`\n迁移完成！共更新 ${updated} 个订单项`);
