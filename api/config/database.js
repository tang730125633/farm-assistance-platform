const { Pool } = require('pg');

// 使用 Railway 提供的 DATABASE_URL 环境变量
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// 初始化数据库表
async function initDatabase() {
  const client = await pool.connect();
  try {
    // 创建用户表
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('consumer', 'farmer', 'admin')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建商品表
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(50) PRIMARY KEY,
        farmer_id VARCHAR(50) REFERENCES users(id),
        name VARCHAR(200) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        unit VARCHAR(50) DEFAULT 'kg',
        stock INTEGER DEFAULT 0,
        image VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建订单表
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) REFERENCES users(id),
        total_amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'shipped', 'finished', 'cancelled', 'returned')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建订单项表
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(50) REFERENCES orders(id) ON DELETE CASCADE,
        product_id VARCHAR(50) REFERENCES products(id),
        name VARCHAR(200) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        qty INTEGER NOT NULL,
        farmer_id VARCHAR(50) REFERENCES users(id)
      )
    `);

    // 创建退货表
    await client.query(`
      CREATE TABLE IF NOT EXISTS returns (
        id VARCHAR(50) PRIMARY KEY,
        order_id VARCHAR(50) REFERENCES orders(id),
        user_id VARCHAR(50) REFERENCES users(id),
        refund_amount DECIMAL(10, 2) NOT NULL,
        reason TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        images JSONB DEFAULT '[]',
        admin_comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建退货商品关联表
    await client.query(`
      CREATE TABLE IF NOT EXISTS return_items (
        id SERIAL PRIMARY KEY,
        return_id VARCHAR(50) REFERENCES returns(id) ON DELETE CASCADE,
        product_id VARCHAR(50) REFERENCES products(id),
        qty INTEGER NOT NULL
      )
    `);

    // 插入默认 admin 用户
    const adminExists = await client.query('SELECT * FROM users WHERE username = $1', ['admin']);
    if (adminExists.rows.length === 0) {
      await client.query(`
        INSERT INTO users (id, username, email, password, role)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
      `, ['admin-001-0000-000000000001', 'admin', 'admin@farmplatform.com', '$2a$10$Jou3wWdUNUHdjymn5bjd6Op/PDRnlhXSe6JayIOC0BqFCAZy1QXr.', 'admin']);
    }

    console.log('数据库初始化完成');
  } catch (err) {
    console.error('数据库初始化失败:', err);
  } finally {
    client.release();
  }
}

module.exports = { pool, initDatabase };
