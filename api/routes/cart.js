const express = require('express');
const router = express.Router();
const { readJsonFile, writeJsonFile } = require('../dao/db');
const { authenticateToken } = require('../utils/auth');

// 获取用户购物车
router.get('/', authenticateToken, (req, res) => {
  const cart = readJsonFile('cart.json');
  const userCart = cart.filter(item => item.userId === req.user.id);
  
  // 获取产品详细信息
  const products = readJsonFile('products.json');
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
});

// 添加商品到购物车
router.post('/add', authenticateToken, (req, res) => {
  const { productId, quantity = 1 } = req.body;
  
  if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({ msg: 'Invalid productId or quantity' });
  }
  
  // 检查产品是否存在
  const products = readJsonFile('products.json');
  const product = products.find(p => p.id === productId);
  if (!product) {
    return res.status(404).json({ msg: 'Product not found' });
  }
  
  // 检查库存
  if (product.stock < quantity) {
    return res.status(400).json({ msg: 'Insufficient stock' });
  }
  
  const cart = readJsonFile('cart.json');
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
  
  writeJsonFile('cart.json', cart);
  res.json({ msg: 'Product added to cart successfully' });
});

// 更新购物车商品数量
router.put('/update', authenticateToken, (req, res) => {
  const { productId, quantity } = req.body;
  
  if (!productId || !Number.isInteger(quantity) || quantity < 0) {
    return res.status(400).json({ msg: 'Invalid productId or quantity' });
  }
  
  const cart = readJsonFile('cart.json');
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
    // 检查库存
    const products = readJsonFile('products.json');
    const product = products.find(p => p.id === productId);
    if (!product || product.stock < quantity) {
      return res.status(400).json({ msg: 'Insufficient stock' });
    }
    
    // 更新数量
    cart[itemIndex].quantity = quantity;
    cart[itemIndex].updatedAt = new Date().toISOString();
  }
  
  writeJsonFile('cart.json', cart);
  res.json({ msg: 'Cart updated successfully' });
});

// 删除购物车商品
router.delete('/remove/:productId', authenticateToken, (req, res) => {
  const { productId } = req.params;
  
  const cart = readJsonFile('cart.json');
  const itemIndex = cart.findIndex(item => 
    item.userId === req.user.id && item.productId === productId
  );
  
  if (itemIndex === -1) {
    return res.status(404).json({ msg: 'Item not found in cart' });
  }
  
  cart.splice(itemIndex, 1);
  writeJsonFile('cart.json', cart);
  res.json({ msg: 'Item removed from cart successfully' });
});

// 清空购物车
router.delete('/clear', authenticateToken, (req, res) => {
  const cart = readJsonFile('cart.json');
  const filteredCart = cart.filter(item => item.userId !== req.user.id);
  writeJsonFile('cart.json', filteredCart);
  res.json({ msg: 'Cart cleared successfully' });
});

// 从购物车创建订单
router.post('/checkout', authenticateToken, (req, res) => {
  const cart = readJsonFile('cart.json');
  const userCart = cart.filter(item => item.userId === req.user.id);
  
  if (userCart.length === 0) {
    return res.status(400).json({ msg: 'Cart is empty' });
  }
  
  const products = readJsonFile('products.json');
  
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
    product.stock -= item.qty;
  }
  writeJsonFile('products.json', products);
  
  // 创建订单
  const { v4: uuid } = require('uuid');
  const order = {
    id: uuid(),
    userId: req.user.id,
    items: orderItems,
    totalAmount: Number(totalAmount.toFixed(2)),
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  const orders = readJsonFile('orders.json');
  orders.push(order);
  writeJsonFile('orders.json', orders);
  
  // 清空购物车
  const filteredCart = cart.filter(item => item.userId !== req.user.id);
  writeJsonFile('cart.json', filteredCart);
  
  res.status(201).json({ 
    msg: 'Order created successfully',
    order 
  });
});

module.exports = router;
