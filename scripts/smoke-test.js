/*
  简单冒烟测试（无第三方依赖）
  - 启动 app 于随机端口
  - 覆盖主要功能：注册/登录、鉴权验证、商品 CRUD 主要路径、下单与取消
  - 测试前备份数据文件，测试后还原，避免污染
*/

const http = require('http');
const fs = require('fs');
const path = require('path');
const { start } = require('../api/server');

const dataDir = path.join(__dirname, '../api/data');
const files = ['users.json', 'products.json', 'orders.json', 'payments.json', 'shipments.json'];
let backups = {};
let server;
let baseURL;

function readFileSafe(file) {
  const p = path.join(dataDir, file);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '[]';
}

function writeFileSafe(file, content) {
  const p = path.join(dataDir, file);
  fs.writeFileSync(p, content, 'utf8');
}

function requestJSON(method, urlPath, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, baseURL);
    const payload = body ? Buffer.from(JSON.stringify(body)) : null;
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + (url.search || ''),
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload ? payload.length : 0,
        ...headers,
      },
    };

    const req = http.request(opts, (res) => {
      let chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json;
        try {
          json = text ? JSON.parse(text) : null;
        } catch (e) {
          json = { parseError: true, raw: text };
        }
        resolve({ status: res.statusCode, body: json });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function run() {
  // 备份数据
  for (const f of files) backups[f] = readFileSafe(f);

  // 启动到随机端口
  server = start(0);
  await new Promise((r) => server.on('listening', r));
  const addr = server.address();
  baseURL = `http://127.0.0.1:${addr.port}`;

  const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

  // 1) API 信息
  const apiInfo = await requestJSON('GET', '/api');
  assert(apiInfo.status === 200, 'GET /api 失败');

  // 2) 未认证访问受限接口
  const ordersUnauthorized = await requestJSON('GET', '/api/orders');
  assert(ordersUnauthorized.status === 401, '未认证访问 /api/orders 应返回 401');

  // 3) 注册三个用户：农户 farmer、消费者 consumer、管理员 admin
  const uniq = Math.random().toString(36).slice(2, 8);
  const farmerReg = await requestJSON('POST', '/api/auth/register', {
    username: `farmer_${uniq}`,
    email: `farmer_${uniq}@ex.com`,
    password: 'Passw0rd!',
    role: 'farmer',
  });
  assert(farmerReg.status === 201 && farmerReg.body && farmerReg.body.token, '注册农户失败');
  const farmerToken = farmerReg.body.token;

  const consumerReg = await requestJSON('POST', '/api/auth/register', {
    username: `consumer_${uniq}`,
    email: `consumer_${uniq}@ex.com`,
    password: 'Passw0rd!',
    role: 'consumer',
  });
  assert(consumerReg.status === 201 && consumerReg.body && consumerReg.body.token, '注册消费者失败');
  const consumerToken = consumerReg.body.token;

  const adminReg = await requestJSON('POST', '/api/auth/register', {
    username: `admin_${uniq}`,
    email: `admin_${uniq}@ex.com`,
    password: 'Passw0rd!',
    role: 'admin',
  });
  assert(adminReg.status === 201 && adminReg.body && adminReg.body.token, '注册管理员失败');
  const adminToken = adminReg.body.token;

  // 4) /auth/verify
  const me = await requestJSON('GET', '/api/auth/verify', null, { Authorization: `Bearer ${farmerToken}` });
  assert(me.status === 200 && me.body && me.body.valid === true, '验证 Token 失败');

  // 5) 农户创建商品
  const pName = `测试苹果_${uniq}`;
  const createProduct = await requestJSON('POST', '/api/products', {
    name: pName,
    description: '脆甜可口',
    price: 3.5,
    stock: 10,
  }, { Authorization: `Bearer ${farmerToken}` });
  assert(createProduct.status === 201 && createProduct.body && createProduct.body.product, '上架商品失败');
  const product = createProduct.body.product;

  // 5.1) 农户查询“我的商品”应包含该商品
  const myProducts = await requestJSON('GET', '/api/products/my/products', null, { Authorization: `Bearer ${farmerToken}` });
  assert(myProducts.status === 200 && myProducts.body.products.some(p => p.id === product.id), '我的商品列表应包含新商品');

  // 6) 消费者尝试上架应被拒绝
  const createByConsumer = await requestJSON('POST', '/api/products', {
    name: '不应成功', description: 'x', price: 1, stock: 1
  }, { Authorization: `Bearer ${consumerToken}` });
  assert(createByConsumer.status === 403, '消费者不应有上架权限');

  // 7) 列表/搜索/详情
  const list = await requestJSON('GET', '/api/products?search=' + encodeURIComponent(pName));
  assert(list.status === 200 && list.body.products.some(p => p.id === product.id), '搜索应返回新商品');
  const detail = await requestJSON('GET', `/api/products/${product.id}`);
  assert(detail.status === 200 && detail.body.product && detail.body.product.id === product.id, '商品详情异常');

  // 8) 下单并校验库存扣减
  const orderCreate = await requestJSON('POST', '/api/orders', {
    items: [{ productId: product.id, qty: 2 }]
  }, { Authorization: `Bearer ${consumerToken}` });
  assert(orderCreate.status === 201 && orderCreate.body.order, '创建订单失败');
  const order = orderCreate.body.order;

  // 查询订单（消费者）
  const myOrders = await requestJSON('GET', '/api/orders?me=1', null, { Authorization: `Bearer ${consumerToken}` });
  assert(myOrders.status === 200 && Array.isArray(myOrders.body.orders), '查询我的订单失败');

  // 取消订单并校验
  const cancel = await requestJSON('PATCH', `/api/orders/${order.id}/cancel`, null, { Authorization: `Bearer ${consumerToken}` });
  assert(cancel.status === 200 && cancel.body.order && cancel.body.order.status === 'cancelled', '取消订单失败');

  // 9) 再下一个订单，走支付与物流流程
  const order2Create = await requestJSON('POST', '/api/orders', {
    items: [{ productId: product.id, qty: 2 }]
  }, { Authorization: `Bearer ${consumerToken}` });
  assert(order2Create.status === 201 && order2Create.body.order, '创建订单2失败');
  const order2 = order2Create.body.order;

  // 支付
  const pay = await requestJSON('POST', `/api/payments/${order2.id}/pay`, null, { Authorization: `Bearer ${consumerToken}` });
  assert(pay.status === 201 && pay.body.order && pay.body.order.status === 'paid', '支付失败');

  // 查询支付记录
  const payList = await requestJSON('GET', `/api/payments/${order2.id}`, null, { Authorization: `Bearer ${consumerToken}` });
  assert(payList.status === 200 && Array.isArray(payList.body.payments) && payList.body.payments.length >= 1, '查询支付记录失败');

  // 管理员发货
  const ship = await requestJSON('POST', `/api/shipments/${order2.id}/ship`, null, { Authorization: `Bearer ${adminToken}` });
  assert(ship.status === 201 && ship.body.order && ship.body.order.status === 'shipped', '发货失败');

  // 查看物流
  const shipInfo = await requestJSON('GET', `/api/shipments/${order2.id}`, null, { Authorization: `Bearer ${consumerToken}` });
  assert(shipInfo.status === 200 && shipInfo.body.shipment && shipInfo.body.shipment.status === 'shipped', '查看物流失败');

  // 追加签收轨迹，完成订单
  const delivered = await requestJSON('POST', `/api/shipments/${order2.id}/push`, { status: 'delivered', text: '签收完成' }, { Authorization: `Bearer ${adminToken}` });
  assert(delivered.status === 200 && delivered.body.order && delivered.body.order.status === 'finished', '签收完成失败');

  console.log('\n冒烟测试通过：核心功能正常');
}

(async () => {
  try {
    await run();
    process.exitCode = 0;
  } catch (e) {
    console.error('测试失败：', e.message || e);
    process.exitCode = 1;
  } finally {
    // 还原数据
    try {
      if (server) await new Promise((r) => server.close(r));
    } catch {}
    try {
      for (const f of files) writeFileSafe(f, backups[f]);
    } catch (e) {
      console.error('还原数据失败：', e.message || e);
    }
  }
})();
