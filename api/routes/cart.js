const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { productDb } = require('../dao/dbAdapter');
const { authenticateToken } = require('../utils/auth');

// 判断是否使用 PostgreSQL
const usePostgres = process.env.DATABASE_URL && process.env.NODE_ENV === 'production';
console.log('[购物车] 环境检查:', {
  usePostgres,
  hasDatabaseUrl: !!process.env.DATABASE_URL,
  nodeEnv: process.env.NODE_ENV
});

// 获取用户购物车
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('[购物车 GET] 用户ID:', req.user.id, '使用PostgreSQL:', usePostgres);

    let cartItems = [];
    if (usePostgres) {
      const result = await pool.query(
        `SELECT c.*, p.name, p.description, p.price, p.image, p.stock, p.unit
         FROM cart c
         JOIN products p ON c.product_id = p.id
         WHERE c.user_id = $1`,
        [req.user.id]
      );
      cartItems = result.rows.map(row => ({
        id: row.id.toString(),
        userId: row.user_id,
        productId: row.product_id,
        quantity: row.quantity,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        product: {
          id: row.product_id,
          name: row.name,
          price: parseFloat(row.price),
          description: row.description,
          image: row.image,
          stock: row.stock,
          unit: row.unit
        }
      }));
    } else {
      // 本地开发用内存/JSON
      const { readJsonFile } = require('../dao/db');
      const cart = readJsonFile('cart.json');
      const userCart = cart.filter(item => item.userId === req.user.id);
      const products = await productDb.findAll();
      cartItems = userCart.map(item => {
        const product = products.find(p => p.id === item.productId);
        return {
          ...item,
          product: product ? {
            id: product.id,
            name: product.name,
            price: parseFloat(product.price),
            description: product.description,
            image: product.image,
            stock: product.stock,
            unit: product.unit
          } : null
        };
      }).filter(item => item.product);
    }

    console.log('[购物车 GET] 返回商品数:', cartItems.length);
    res.json({ items: cartItems });
  } catch (error) {
    console.error('[购物车] 获取失败:', error);
    res.status(500).json({ msg: '获取购物车失败' });
  }
});

// 添加商品到购物车
router.post('/add', authenticateToken, async (req, res) => {
  try {
    const { productId, quantity: rawQuantity = 1 } = req.body;
    const quantity = parseInt(rawQuantity, 10);
    console.log('[购物车 POST] 添加商品:', { productId, quantity, userId: req.user.id });

    console.log('[购物车 POST] 参数检查:', { productId, quantity, isInteger: Number.isInteger(quantity) });

    if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
      console.log('[购物车 POST] 参数无效:', { productId, quantity, type: typeof quantity });
      return res.status(400).json({ msg: 'Invalid productId or quantity' });
    }

    // 检查产品是否存在
    const products = await productDb.findAll();
    const product = products.find(p => p.id === productId);
    if (!product) {
      return res.status(404).json({ msg: 'Product not found' });
    }

    // 检查库存
    if (product.stock < quantity) {
      return res.status(400).json({ msg: 'Insufficient stock' });
    }

    if (usePostgres) {
      // 使用 ON CONFLICT DO UPDATE 避免竞态条件
      const result = await pool.query(
        `INSERT INTO cart (user_id, product_id, quantity, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         ON CONFLICT (user_id, product_id)
         DO UPDATE SET
           quantity = cart.quantity + EXCLUDED.quantity,
           updated_at = NOW()
         RETURNING *`,
        [req.user.id, productId, quantity]
      );

      // 检查更新后的总数量是否超过库存
      const finalQuantity = result.rows[0].quantity;
      if (product.stock < finalQuantity) {
        // 回滚：减去刚才添加的数量
        await pool.query(
          'UPDATE cart SET quantity = quantity - $1 WHERE user_id = $2 AND product_id = $3',
          [quantity, req.user.id, productId]
        );
        return res.status(400).json({ msg: 'Insufficient stock for total quantity' });
      }

      console.log('[购物车 POST] Upsert 成功:', result.rows[0]);
    } else {
      // 本地开发用 JSON
      const { readJsonFile, writeJsonFile } = require('../dao/db');
      const cart = readJsonFile('cart.json');
      const existingItem = cart.find(item =>
        item.userId === req.user.id && item.productId === productId
      );

      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (product.stock < newQuantity) {
          return res.status(400).json({ msg: 'Insufficient stock for total quantity' });
        }
        existingItem.quantity = newQuantity;
        existingItem.updatedAt = new Date().toISOString();
      } else {
        cart.push({
          id: Date.now().toString(),
          userId: req.user.id,
          productId,
          quantity,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      writeJsonFile('cart.json', cart);
    }

    res.json({ msg: 'Product added to cart successfully' });
  } catch (error) {
    console.error('[购物车] 添加失败:', error);
    res.status(500).json({ msg: '添加购物车失败' });
  }
});

// 更新购物车商品数量
router.put('/update', authenticateToken, async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId || !Number.isInteger(quantity) || quantity < 0) {
      return res.status(400).json({ msg: 'Invalid productId or quantity' });
    }

    if (usePostgres) {
      if (quantity === 0) {
        await pool.query(
          'DELETE FROM cart WHERE user_id = $1 AND product_id = $2',
          [req.user.id, productId]
        );
      } else {
        // 检查库存
        const products = await productDb.findAll();
        const product = products.find(p => p.id === productId);
        if (!product || product.stock < quantity) {
          return res.status(400).json({ msg: 'Insufficient stock' });
        }
        await pool.query(
          'UPDATE cart SET quantity = $1, updated_at = NOW() WHERE user_id = $2 AND product_id = $3',
          [quantity, req.user.id, productId]
        );
      }
    } else {
      const { readJsonFile, writeJsonFile } = require('../dao/db');
      const cart = readJsonFile('cart.json');
      const itemIndex = cart.findIndex(item =>
        item.userId === req.user.id && item.productId === productId
      );

      if (itemIndex === -1) {
        return res.status(404).json({ msg: 'Item not found in cart' });
      }

      if (quantity === 0) {
        cart.splice(itemIndex, 1);
      } else {
        const products = await productDb.findAll();
        const product = products.find(p => p.id === productId);
        if (!product || product.stock < quantity) {
          return res.status(400).json({ msg: 'Insufficient stock' });
        }
        cart[itemIndex].quantity = quantity;
        cart[itemIndex].updatedAt = new Date().toISOString();
      }
      writeJsonFile('cart.json', cart);
    }

    res.json({ msg: 'Cart updated successfully' });
  } catch (error) {
    console.error('[购物车] 更新失败:', error);
    res.status(500).json({ msg: '更新购物车失败' });
  }
});

// 删除购物车商品
router.delete('/remove/:productId', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;

    if (usePostgres) {
      await pool.query(
        'DELETE FROM cart WHERE user_id = $1 AND product_id = $2',
        [req.user.id, productId]
      );
    } else {
      const { readJsonFile, writeJsonFile } = require('../dao/db');
      const cart = readJsonFile('cart.json');
      const filtered = cart.filter(item =>
        !(item.userId === req.user.id && item.productId === productId)
      );
      writeJsonFile('cart.json', filtered);
    }

    res.json({ msg: 'Item removed from cart successfully' });
  } catch (error) {
    console.error('[购物车] 删除失败:', error);
    res.status(500).json({ msg: '删除购物车商品失败' });
  }
});

// 清空购物车
router.delete('/clear', authenticateToken, async (req, res) => {
  try {
    if (usePostgres) {
      await pool.query('DELETE FROM cart WHERE user_id = $1', [req.user.id]);
    } else {
      const { readJsonFile, writeJsonFile } = require('../dao/db');
      const cart = readJsonFile('cart.json');
      const filtered = cart.filter(item => item.userId !== req.user.id);
      writeJsonFile('cart.json', filtered);
    }

    res.json({ msg: 'Cart cleared successfully' });
  } catch (error) {
    console.error('[购物车] 清空失败:', error);
    res.status(500).json({ msg: '清空购物车失败' });
  }
});

// 从购物车创建订单
router.post('/checkout', authenticateToken, async (req, res) => {
  try {
    let cartItems = [];

    if (usePostgres) {
      const result = await pool.query(
        `SELECT c.*, p.name, p.price, p.stock, p.farmer_id
         FROM cart c
         JOIN products p ON c.product_id = p.id
         WHERE c.user_id = $1`,
        [req.user.id]
      );
      cartItems = result.rows;
    } else {
      const { readJsonFile } = require('../dao/db');
      const cart = readJsonFile('cart.json');
      const products = await productDb.findAll();
      const userCart = cart.filter(item => item.userId === req.user.id);
      cartItems = userCart.map(item => {
        const product = products.find(p => p.id === item.productId);
        return { ...item, product };
      }).filter(item => item.product);
    }

    if (cartItems.length === 0) {
      return res.status(400).json({ msg: 'Cart is empty' });
    }

    // 验证库存并准备订单项
    const orderItems = [];
    for (const item of cartItems) {
      const stock = usePostgres ? item.stock : item.product.stock;
      const qty = usePostgres ? item.quantity : item.quantity;
      const productId = usePostgres ? item.product_id : item.productId;
      const name = usePostgres ? item.name : item.product.name;
      const price = usePostgres ? parseFloat(item.price) : parseFloat(item.product.price);
      const farmerId = usePostgres ? item.farmer_id : item.product.farmerId;

      if (stock < qty) {
        return res.status(400).json({ msg: `Insufficient stock for ${name}` });
      }

      orderItems.push({
        productId,
        name,
        price,
        qty,
        farmerId
      });
    }

    // 计算总价
    const totalAmount = orderItems.reduce((sum, item) => sum + item.price * item.qty, 0);

    // 扣减库存并创建订单
    const { orderDb } = require('../dao/dbAdapter');
    const { v4: uuid } = require('uuid');

    // 扣减库存
    for (const item of orderItems) {
      const product = await productDb.findById(item.productId);
      await productDb.update(item.productId, { stock: product.stock - item.qty });
    }

    // 创建订单
    const order = {
      id: uuid(),
      userId: req.user.id,
      items: orderItems,
      totalAmount: Number(totalAmount.toFixed(2)),
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    await orderDb.create(order);

    // 清空购物车
    if (usePostgres) {
      await pool.query('DELETE FROM cart WHERE user_id = $1', [req.user.id]);
    } else {
      const { readJsonFile, writeJsonFile } = require('../dao/db');
      const cart = readJsonFile('cart.json');
      const filtered = cart.filter(item => item.userId !== req.user.id);
      writeJsonFile('cart.json', filtered);
    }

    res.status(201).json({
      msg: 'Order created successfully',
      order
    });
  } catch (error) {
    console.error('[购物车] 结算失败:', error);
    res.status(500).json({ msg: '结算失败' });
  }
});

// 诊断端点：检查数据库状态
router.get('/debug/status', async (req, res) => {
  try {
    // 检查 cart 表是否存在
    const tableResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'cart'
      )
    `);
    const tableExists = tableResult.rows[0].exists;

    // 检查 cart 表数据
    const countResult = await pool.query('SELECT COUNT(*) as count FROM cart');
    const rowCount = parseInt(countResult.rows[0].count);

    // 检查所有 cart 数据
    const dataResult = await pool.query('SELECT * FROM cart LIMIT 10');

    res.json({
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        usePostgres
      },
      database: {
        cartTableExists: tableExists,
        cartRowCount: rowCount,
        cartData: dataResult.rows
      }
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasDatabaseUrl: !!process.env.DATABASE_URL
      }
    });
  }
});

module.exports = router;
