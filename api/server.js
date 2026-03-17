require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { performanceMiddleware, getPerformanceStats } = require('./utils/performance');
const { initDatabase } = require('./config/database');

// 初始化数据库
initDatabase().catch(console.error);

// 导入路由
const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const ordersRoutes = require('./routes/orders');
const paymentsRoutes = require('./routes/payments');
const shipmentsRoutes = require('./routes/shipments');
const cartRoutes = require('./routes/cart');
const farmerSalesRoutes = require('./routes/farmerSales');
const returnsRoutes = require('./routes/returns');

const app = express();
const DEFAULT_PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(performanceMiddleware);

// 静态文件服务
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads/returns', express.static(path.join(__dirname, '../uploads/returns')));

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/shipments', shipmentsRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/farmer-sales', farmerSalesRoutes);
app.use('/api/returns', returnsRoutes);

// 根路径 - 返回主页面
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// API 信息端点
app.get('/api', (req, res) => {
  res.json({
    message: '基于 Web 的助农服务平台 API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      orders: '/api/orders',
      payments: '/api/payments',
      shipments: '/api/shipments',
      cart: '/api/cart',
      farmerSales: '/api/farmer-sales',
      returns: '/api/returns',
      stats: '/api/stats'
    }
  });
});

// 性能统计端点
app.get('/api/stats', (req, res) => {
  res.json({
    performance: getPerformanceStats(),
    timestamp: new Date().toISOString()
  });
});

// 诊断端点：检查 returns.html 文件内容
app.get('/api/debug/returns-html', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(__dirname, '../public/returns.html');

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const hasProcessModal = content.includes('id="processModal"');
    const hasProcessReturnInfo = content.includes('id="processReturnInfo"');
    const lines = content.split('\n');
    const processReturnInfoLine = lines.findIndex(l => l.includes('id="processReturnInfo"')) + 1;

    res.json({
      fileExists: true,
      fileSize: content.length,
      lineCount: lines.length,
      hasProcessModal,
      hasProcessReturnInfo,
      processReturnInfoLine: processReturnInfoLine > 0 ? processReturnInfoLine : null,
      snippet: processReturnInfoLine > 0 ? lines.slice(processReturnInfoLine - 2, processReturnInfoLine + 2) : null
    });
  } catch (err) {
    res.status(500).json({
      fileExists: false,
      error: err.message,
      path: filePath
    });
  }
});

// 404 处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: '接口不存在',
      path: req.originalUrl
    }
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  
  // 根据错误类型返回不同的错误码
  let errorCode = 'INTERNAL_ERROR';
  let statusCode = 500;
  
  if (err.name === 'ValidationError') {
    errorCode = 'VALIDATION_ERROR';
    statusCode = 400;
  } else if (err.name === 'UnauthorizedError') {
    errorCode = 'UNAUTHORIZED';
    statusCode = 401;
  } else if (err.name === 'ForbiddenError') {
    errorCode = 'FORBIDDEN';
    statusCode = 403;
  }
  
  res.status(statusCode).json({
    error: {
      code: errorCode,
      message: process.env.NODE_ENV === 'development' ? err.message : '服务器内部错误'
    }
  });
});

// 仅在作为主模块运行时启动监听，便于测试复用 app
function start(port = DEFAULT_PORT) {
  const server = app.listen(port, () => {
    const addr = server.address();
    const actualPort = typeof addr === 'object' && addr ? addr.port : port;
    console.log(`服务器运行在 http://localhost:${actualPort}`);
    console.log(`API 文档: http://localhost:${actualPort}/api`);
  });
  return server;
}

if (require.main === module) {
  start();
}

module.exports = { app, start };
