const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { productDb } = require('../dao/dbAdapter');
const { authenticateToken } = require('../utils/auth');
const { cacheMiddleware } = require('../utils/cache');

const router = express.Router();

// 配置 multer 文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../public/images/products');
    // 确保目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名：时间戳 + UUID + 原始扩展名
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// 文件过滤器：只允许图片
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件 (jpeg, jpg, png, gif, webp)'));
  }
};

// 配置 multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 限制 5MB
  },
  fileFilter: fileFilter
});

/**
 * 验证 JWT Token 中间件
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
// 鉴权中间件从 utils 复用，避免重复实现

/**
 * 验证农户或管理员权限中间件
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
function requireFarmerOrAdmin(req, res, next) {
  if (req.user.role !== 'farmer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要农户或管理员权限' });
  }
  next();
}

/**
 * 验证商品所有权中间件
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function requireProductOwnership(req, res, next) {
  const productId = req.params.id;
  const product = await productDb.findById(productId);

  if (!product) {
    return res.status(404).json({ error: '商品不存在' });
  }

  // 管理员可以操作所有商品，农户只能操作自己的商品
  if (req.user.role !== 'admin' && product.farmerId !== req.user.id) {
    return res.status(403).json({ error: '只能操作自己的商品' });
  }

  req.product = product;
  next();
}

// 获取商品列表
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, farmerId, search, category } = req.query;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
    let products = await productDb.findAll();

    console.log(`[商品列表] 查询条件: farmerId=${farmerId}, search=${search}, 总商品数: ${products.length}`);
    console.log(`[商品列表] 商品详情:`, products.map(p => ({ id: p.id.substring(0,8), name: p.name, farmerId: p.farmerId?.substring(0,8) })));

    // 按农户筛选
    if (farmerId) {
      products = products.filter(product => product.farmerId === farmerId);
    }

    // 按名称搜索
    if (search) {
      const searchLower = search.toLowerCase();
      products = products.filter(product =>
        product.name.toLowerCase().includes(searchLower) ||
        (product.description && product.description.toLowerCase().includes(searchLower))
      );
    }
    // 按分类筛选（可选）
    if (category) {
      const c = String(category).toLowerCase();
      products = products.filter(p => (p.category || '').toLowerCase() === c);
    }

    // 分页
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedProducts = products.slice(startIndex, endIndex);

    res.json({
      products: paginatedProducts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: products.length,
        pages: Math.ceil(products.length / limitNum)
      }
    });
  } catch (error) {
    console.error('获取商品列表错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取当前用户的商品列表（放在 /:id 之前，避免被参数路由匹配）
router.get('/my/products', authenticateToken, requireFarmerOrAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
    let products = await productDb.findAll();

    // 筛选当前用户的商品
    products = products.filter(product => product.farmerId === req.user.id);

    // 分页
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedProducts = products.slice(startIndex, endIndex);

    res.json({
      products: paginatedProducts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: products.length,
        pages: Math.ceil(products.length / limitNum)
      }
    });
  } catch (error) {
    console.error('获取我的商品列表错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 我的商品（别名路由，等价于 /my/products；需在 /:id 之前）
router.get('/my', authenticateToken, requireFarmerOrAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
    let list = await productDb.findAll();

    console.log(`[我的商品] 用户ID: ${req.user.id}, 角色: ${req.user.role}, 总商品数: ${list.length}`);
    console.log(`[我的商品] 商品farmerId列表:`, list.map(p => ({ id: p.id.substring(0,8), farmerId: p.farmerId?.substring(0,8) })));

    list = list.filter(product => product.farmerId === req.user.id);

    console.log(`[我的商品] 筛选后商品数: ${list.length}`);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginated = list.slice(startIndex, endIndex);
    res.json({
      products: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: list.length,
        pages: Math.ceil(list.length / limitNum)
      }
    });
  } catch (error) {
    console.error('获取我的商品列表错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取单个商品详情
router.get('/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await productDb.findById(productId);

    if (!product) {
      return res.status(404).json({ error: '商品不存在' });
    }

    res.json({ product });
  } catch (error) {
    console.error('获取商品详情错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 农户上架商品（需要 farmer 或 admin 权限）
router.post('/', authenticateToken, requireFarmerOrAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, stock, unit } = req.body;

    // 验证必填字段
    if (!name || !description || price === undefined || stock === undefined) {
      return res.status(400).json({
        error: '商品名称、描述、价格和库存为必填项'
      });
    }

    // 验证数据类型
    const priceNum = parseFloat(price);
    const stockNum = parseInt(stock);

    if (isNaN(priceNum) || priceNum <= 0) {
      return res.status(400).json({
        error: '价格必须是大于0的数字'
      });
    }

    if (isNaN(stockNum) || stockNum < 0) {
      return res.status(400).json({
        error: '库存必须是非负整数'
      });
    }

    // 处理图片路径
    let imagePath = 'https://via.placeholder.com/400?text=产品图片';
    if (req.file) {
      // 使用相对路径，以便前端可以访问
      imagePath = `/images/products/${req.file.filename}`;
    }

    // 创建新商品
    const newProduct = {
      id: uuidv4(),
      name: name.trim(),
      description: description.trim(),
      price: priceNum,
      stock: stockNum,
      unit: unit || '千克',
      image: imagePath,
      farmerId: req.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 保存商品
    try {
      const savedProduct = await productDb.create(newProduct);

      if (savedProduct) {
        res.status(201).json({
          message: '商品上架成功',
          product: savedProduct
        });
      } else {
        res.status(500).json({ error: '商品上架失败，请重试' });
      }
    } catch (error) {
      console.error('保存商品错误:', error);
      res.status(500).json({ error: '商品上架失败，请重试' });
    }
  } catch (error) {
    console.error('上架商品错误:', error);
    // 如果是 multer 错误
    if (error.message && error.message.includes('只允许上传图片文件')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 修改商品信息（仅商品拥有者 farmer 或 admin）
router.put('/:id', authenticateToken, requireProductOwnership, upload.single('image'), async (req, res) => {
  try {
    const productId = req.params.id;
    const { name, description, price, stock, unit } = req.body;

    // 构建更新数据
    const updates = {};

    if (name !== undefined) {
      if (!name || name.trim() === '') {
        return res.status(400).json({ error: '商品名称不能为空' });
      }
      updates.name = name.trim();
    }

    if (description !== undefined) {
      if (!description || description.trim() === '') {
        return res.status(400).json({ error: '商品描述不能为空' });
      }
      updates.description = description.trim();
    }

    if (price !== undefined) {
      const priceNum = parseFloat(price);
      if (isNaN(priceNum) || priceNum <= 0) {
        return res.status(400).json({ error: '价格必须是大于0的数字' });
      }
      updates.price = priceNum;
    }

    if (stock !== undefined) {
      const stockNum = parseInt(stock);
      if (isNaN(stockNum) || stockNum < 0) {
        return res.status(400).json({ error: '库存必须是非负整数' });
      }
      updates.stock = stockNum;
    }

    // 处理上传的图片文件
    if (req.file) {
      updates.image = `/images/products/${req.file.filename}`;

      // 可选：删除旧图片文件（如果存在且不是占位符）
      const oldProduct = req.product;
      if (oldProduct.image && oldProduct.image.startsWith('/images/products/')) {
        const oldImagePath = path.join(__dirname, '../../public', oldProduct.image);
        if (fs.existsSync(oldImagePath)) {
          try {
            fs.unlinkSync(oldImagePath);
          } catch (err) {
            console.error('删除旧图片失败:', err);
          }
        }
      }
    }

    if (unit !== undefined) {
      updates.unit = unit;
    }

    updates.updatedAt = new Date().toISOString();

    // 更新商品
    try {
      const updatedProduct = await productDb.update(productId, updates);

      if (updatedProduct) {
        res.json({
          message: '商品信息更新成功',
          product: updatedProduct
        });
      } else {
        res.status(500).json({ error: '商品信息更新失败，请重试' });
      }
    } catch (error) {
      console.error('更新商品错误:', error);
      res.status(500).json({ error: '商品信息更新失败，请重试' });
    }
  } catch (error) {
    console.error('更新商品错误:', error);
    // 如果是 multer 错误
    if (error.message && error.message.includes('只允许上传图片文件')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 删除商品（仅商品拥有者 farmer 或 admin）
router.delete('/:id', authenticateToken, requireProductOwnership, async (req, res) => {
  try {
    const productId = req.params.id;

    // 删除商品
    const success = await productDb.delete(productId);

    if (success) {
      res.json({
        message: '商品删除成功'
      });
    } else {
      res.status(500).json({ error: '商品删除失败，请重试' });
    }
  } catch (error) {
    console.error('删除商品错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// （已上移）

module.exports = router;
