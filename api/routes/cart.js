const express = require('express');
const router = express.Router();
const { readJsonFile, writeJsonFile } = require('../dao/db');
const { productDb } = require('../dao/dbAdapter');
const { authenticateToken } = require('../utils/auth');

// 判断是否使用 PostgreSQL
const usePostgres = process.env.DATABASE_URL && process.env.NODE_ENV === 'production';

// 获取购物车数据（仅本地开发用JSON，生产环境也用内存+JSON混合）
function getCartData() {
  return readJsonFile('cart.json');
}

function saveCartData(cart) {
  writeJsonFile('cart.json', cart);
}

// 获取用户购物车
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('[购物车 GET] 用户ID:', req.user.id);
    const cart = getCartData();
    console.log('[购物车 GET] 所有购物车数据:', cart.length, '条');
    console.log('[购物车 GET] 购物车用户ID列表:', cart.map(i => i.userId));

    const userCart = cart.filter(item => item.userId === req.user.id);
    console.log('[购物车 GET] 当前用户购物车:', userCart.length, '条');

    // 获取产品详细信息（从 PostgreSQL）
    const products = await productDb.findAll();
    const cartWithProducts = userCart.map(item => {
      const product = products.find(p => p.id === item.productId);
      return {
        ...item,
        product: product ? {
          id: product.id,
          name: product.name,
          price: product.price,
          description: product.description,
          image: product.image,
          stock: product.stock
        } : null
      };
    }).filter(item => item.product); // 过滤掉已删除的产品

    res.json({ items: cartWithProducts });
  } catch (error) {
    console.error('[购物车] 获取失败:', error);
    res.status(500).json({ msg: '获取购物车失败' });
  }
});

// 添加商品到购物车
router.post('/add', authenticateToken, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    console.log('[购物车 POST] 添加商品:', { productId, quantity, userId: req.user.id });

    // 先读取当前购物车状态
    const cartBefore = getCartData();
    console.log('[购物车 POST] 添加前购物车数量:', cartBefore.length);

    if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ msg: 'Invalid productId or quantity' });
    }

    // 检查产品是否存在（从 PostgreSQL）
    const products = await productDb.findAll();
    const product = products.find(p => p.id === productId);

    console.log('[购物车] 查找商品结果:', product ? `找到 ${product.name}` : '未找到');

    if (!product) {
      return res.status(404).json({ msg: 'Product not found' });
    }

    // 检查库存
    if (product.stock < quantity) {
      return res.status(400).json({ msg: 'Insufficient stock' });
    }

    const cart = getCartData();
    const existingItem = cart.find(item =>
      item.userId === req.user.id && item.productId === productId
    );

    if (existingItem) {
      // 更新数量
      const newQuantity = existingItem.quantity + quantity;
      if (product.stock < newQuantity) {
        return res.status(400).json({ msg: 'Insufficient stock for total quantity' });
      }
      existingItem.quantity = newQuantity;
      existingItem.updatedAt = new Date().toISOString();
    } else {
      // 添加新商品
      cart.push({
        id: Date.now().toString(),
        userId: req.user.id,
        productId,
        quantity,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    saveCartData(cart);

    // 验证保存结果
    const cartAfter = getCartData();
    console.log('[购物车 POST] 保存后购物车数量:', cartAfter.length);
    console.log('[购物车 POST] 保存后用户购物车:', cartAfter.filter(i => i.userId === req.user.id));

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

    const cart = getCartData();
    const itemIndex = cart.findIndex(item =>
      item.userId === req.user.id && item.productId === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ msg: 'Item not found in cart' });
    }

    if (quantity === 0) {
      // 删除商品
      cart.splice(itemIndex, 1);
    } else {
      // 检查库存（从 PostgreSQL）
      const products = await productDb.findAll();
      const product = products.find(p => p.id === productId);
      if (!product || product.stock < quantity) {
        return res.status(400).json({ msg: 'Insufficient stock' });
      }

      // 更新数量
      cart[itemIndex].quantity = quantity;
      cart[itemIndex].updatedAt = new Date().toISOString();
    }

    saveCartData(cart);
    res.json({ msg: 'Cart updated successfully' });
  } catch (error) {
    console.error('[购物车] 更新失败:', error);
    res.status(500).json({ msg: '更新购物车失败' });
  }
});

// 删除购物车商品
router.delete('/remove/:productId', authenticateToken, (req, res) => {
  try {
    const { productId } = req.params;

    const cart = getCartData();
    const itemIndex = cart.findIndex(item =>
      item.userId === req.user.id && item.productId === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ msg: 'Item not found in cart' });
    }

    cart.splice(itemIndex, 1);
    saveCartData(cart);
    res.json({ msg: 'Item removed from cart successfully' });
  } catch (error) {
    console.error('[购物车] 删除失败:', error);
    res.status(500).json({ msg: '删除购物车商品失败' });
  }
});

// 清空购物车
router.delete('/clear', authenticateToken, (req, res) => {
  try {
    const cart = getCartData();
    const filteredCart = cart.filter(item => item.userId !== req.user.id);
    saveCartData(filteredCart);
    res.json({ msg: 'Cart cleared successfully' });
  } catch (error) {
    console.error('[购物车] 清空失败:', error);
    res.status(500).json({ msg: '清空购物车失败' });
  }
});

// 从购物车创建订单
router.post('/checkout', authenticateToken, async (req, res) => {
  try {
    const cart = getCartData();
    const userCart = cart.filter(item => item.userId === req.user.id);

    if (userCart.length === 0) {
      return res.status(400).json({ msg: 'Cart is empty' });
    }

    // 获取产品信息（从 PostgreSQL）
    const products = await productDb.findAll();

    // 验证库存并准备订单项
    const orderItems = [];
    for (const cartItem of userCart) {
      const product = products.find(p => p.id === cartItem.productId);
      if (!product) {
        return res.status(400).json({ msg: `Product ${cartItem.productId} not found` });
      }
      if (product.stock < cartItem.quantity) {
        return res.status(400).json({ msg: `Insufficient stock for ${product.name}` });
      }

      orderItems.push({
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        qty: cartItem.quantity,
        farmerId: product.farmerId
      });
    }

    // 计算总价
    const totalAmount = orderItems.reduce((sum, item) => sum + item.price * item.qty, 0);

    // 扣减库存
    for (const item of orderItems) {
      const product = products.find(p => p.id === item.productId);
      await productDb.update(item.productId, { stock: product.stock - item.qty });
    }

    // 创建订单
    const { v4: uuid } = require('uuid');
    const { orderDb } = require('../dao/dbAdapter');

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
    const filteredCart = cart.filter(item => item.userId !== req.user.id);
    saveCartData(filteredCart);

    res.status(201).json({
      msg: 'Order created successfully',
      order
    });
  } catch (error) {
    console.error('[购物车] 结算失败:', error);
    res.status(500).json({ msg: '结算失败' });
  }
});

module.exports = router;
