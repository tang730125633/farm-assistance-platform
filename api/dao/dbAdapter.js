const { pool } = require('../config/database');
const { readJsonFile, writeJsonFile } = require('./db');

// 判断是否使用 PostgreSQL
const usePostgres = process.env.DATABASE_URL && process.env.NODE_ENV === 'production';

// 用户相关操作
const userDb = {
  async findAll() {
    if (usePostgres) {
      const result = await pool.query('SELECT * FROM users');
      return result.rows.map(row => ({
        id: row.id,
        username: row.username,
        email: row.email,
        password: row.password,
        role: row.role,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    }
    return readJsonFile('users.json');
  },

  async findByCondition(conditionFn) {
    const users = await this.findAll();
    return users.filter(conditionFn);
  },

  async findById(id) {
    if (usePostgres) {
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      return {
        id: row.id,
        username: row.username,
        email: row.email,
        password: row.password,
        role: row.role,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    }
    const users = readJsonFile('users.json');
    return users.find(u => u.id === id);
  },

  async create(userData) {
    if (usePostgres) {
      const result = await pool.query(
        `INSERT INTO users (id, username, email, password, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [userData.id, userData.username, userData.email, userData.password, userData.role, userData.createdAt, userData.updatedAt]
      );
      const row = result.rows[0];
      return {
        id: row.id,
        username: row.username,
        email: row.email,
        password: row.password,
        role: row.role,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    }
    const users = readJsonFile('users.json');
    users.push(userData);
    writeJsonFile('users.json', users);
    return userData;
  },

  async delete(id) {
    if (usePostgres) {
      const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
      return result.rows.length > 0;
    }
    const users = readJsonFile('users.json');
    const filtered = users.filter(u => u.id !== id);
    if (filtered.length === users.length) return false;
    writeJsonFile('users.json', filtered);
    return true;
  }
};

// 商品相关操作
const productDb = {
  async findAll() {
    if (usePostgres) {
      const result = await pool.query('SELECT * FROM products');
      return result.rows.map(row => ({
        id: row.id,
        farmerId: row.farmer_id,
        name: row.name,
        description: row.description,
        price: row.price,
        unit: row.unit,
        stock: row.stock,
        image: row.image,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    }
    return readJsonFile('products.json');
  },

  async findById(id) {
    if (usePostgres) {
      const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      return {
        id: row.id,
        farmerId: row.farmer_id,
        name: row.name,
        description: row.description,
        price: row.price,
        unit: row.unit,
        stock: row.stock,
        image: row.image,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    }
    const products = readJsonFile('products.json');
    return products.find(p => p.id === id);
  },

  async create(productData) {
    if (usePostgres) {
      const result = await pool.query(
        `INSERT INTO products (id, farmer_id, name, description, price, unit, stock, image, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [productData.id, productData.farmerId, productData.name, productData.description,
         productData.price, productData.unit, productData.stock, productData.image,
         productData.createdAt, productData.updatedAt]
      );
      const row = result.rows[0];
      return {
        id: row.id,
        farmerId: row.farmer_id,
        name: row.name,
        description: row.description,
        price: row.price,
        unit: row.unit,
        stock: row.stock,
        image: row.image,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    }
    const products = readJsonFile('products.json');
    products.push(productData);
    writeJsonFile('products.json', products);
    return productData;
  },

  async update(id, updateData) {
    if (usePostgres) {
      const fields = [];
      const values = [];
      let idx = 1;

      if (updateData.name !== undefined) { fields.push(`name = $${idx++}`); values.push(updateData.name); }
      if (updateData.description !== undefined) { fields.push(`description = $${idx++}`); values.push(updateData.description); }
      if (updateData.price !== undefined) { fields.push(`price = $${idx++}`); values.push(updateData.price); }
      if (updateData.stock !== undefined) { fields.push(`stock = $${idx++}`); values.push(updateData.stock); }
      if (updateData.image !== undefined) { fields.push(`image = $${idx++}`); values.push(updateData.image); }

      fields.push(`updated_at = $${idx++}`);
      values.push(new Date().toISOString());
      values.push(id);

      const result = await pool.query(
        `UPDATE products SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      );

      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      return {
        id: row.id,
        farmerId: row.farmer_id,
        name: row.name,
        description: row.description,
        price: row.price,
        unit: row.unit,
        stock: row.stock,
        image: row.image,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    }
    const products = readJsonFile('products.json');
    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) return null;
    products[idx] = { ...products[idx], ...updateData, updatedAt: new Date().toISOString() };
    writeJsonFile('products.json', products);
    return products[idx];
  },

  async delete(id) {
    if (usePostgres) {
      const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
      return result.rows.length > 0;
    }
    const products = readJsonFile('products.json');
    const filtered = products.filter(p => p.id !== id);
    if (filtered.length === products.length) return false;
    writeJsonFile('products.json', filtered);
    return true;
  }
};

// 订单相关操作
const orderDb = {
  async findAll() {
    if (usePostgres) {
      const result = await pool.query(`
        SELECT o.*,
               json_agg(json_build_object(
                 'id', oi.id,
                 'productId', oi.product_id,
                 'name', oi.name,
                 'price', oi.price,
                 'qty', oi.qty,
                 'farmerId', oi.farmer_id
               )) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        GROUP BY o.id
      `);
      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        items: row.items || [],
        totalAmount: row.total_amount,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    }
    return readJsonFile('orders.json');
  },

  async findById(id) {
    if (usePostgres) {
      const result = await pool.query(`
        SELECT o.*,
               json_agg(json_build_object(
                 'id', oi.id,
                 'productId', oi.product_id,
                 'name', oi.name,
                 'price', oi.price,
                 'qty', oi.qty,
                 'farmerId', oi.farmer_id
               )) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.id = $1
        GROUP BY o.id
      `, [id]);
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        items: row.items || [],
        totalAmount: row.total_amount,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    }
    const orders = readJsonFile('orders.json');
    return orders.find(o => o.id === id);
  },

  async create(orderData) {
    if (usePostgres) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // 创建订单
        const orderResult = await client.query(
          `INSERT INTO orders (id, user_id, total_amount, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [orderData.id, orderData.userId, orderData.totalAmount, orderData.status, orderData.createdAt, orderData.updatedAt]
        );

        // 创建订单项
        for (const item of orderData.items) {
          await client.query(
            `INSERT INTO order_items (order_id, product_id, name, price, qty, farmer_id)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [orderData.id, item.productId, item.name, item.price, item.qty, item.farmerId]
          );
        }

        await client.query('COMMIT');

        const row = orderResult.rows[0];
        return {
          id: row.id,
          userId: row.user_id,
          items: orderData.items,
          totalAmount: row.total_amount,
          status: row.status,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }
    const orders = readJsonFile('orders.json');
    orders.push(orderData);
    writeJsonFile('orders.json', orders);
    return orderData;
  },

  async update(id, updateData) {
    if (usePostgres) {
      const result = await pool.query(
        `UPDATE orders SET status = $1, updated_at = $2 WHERE id = $3 RETURNING *`,
        [updateData.status, updateData.updatedAt || new Date().toISOString(), id]
      );
      if (result.rows.length === 0) return null;
      return this.findById(id);
    }
    const orders = readJsonFile('orders.json');
    const idx = orders.findIndex(o => o.id === id);
    if (idx === -1) return null;
    orders[idx] = { ...orders[idx], ...updateData };
    writeJsonFile('orders.json', orders);
    return orders[idx];
  }
};

// 退货相关操作
const returnDb = {
  async findAll() {
    if (usePostgres) {
      const result = await pool.query(`
        SELECT r.*,
               json_agg(json_build_object(
                 'id', ri.id,
                 'productId', ri.product_id,
                 'qty', ri.qty
               )) as items
        FROM returns r
        LEFT JOIN return_items ri ON r.id = ri.return_id
        GROUP BY r.id
      `);
      return result.rows.map(row => ({
        id: row.id,
        orderId: row.order_id,
        userId: row.user_id,
        items: row.items || [],
        refundAmount: row.refund_amount,
        reason: row.reason,
        status: row.status,
        images: row.images,
        adminComment: row.admin_comment,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    }
    return readJsonFile('returns.json');
  },

  async create(returnData) {
    if (usePostgres) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const result = await client.query(
          `INSERT INTO returns (id, order_id, user_id, refund_amount, reason, status, images, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [returnData.id, returnData.orderId, returnData.userId, returnData.refundAmount,
           returnData.reason, returnData.status, JSON.stringify(returnData.images || []),
           returnData.createdAt, returnData.updatedAt]
        );

        for (const item of returnData.items || []) {
          await client.query(
            `INSERT INTO return_items (return_id, product_id, qty)
             VALUES ($1, $2, $3)`,
            [returnData.id, item.productId, item.qty]
          );
        }

        await client.query('COMMIT');

        const row = result.rows[0];
        return {
          id: row.id,
          orderId: row.order_id,
          userId: row.user_id,
          items: returnData.items || [],
          refundAmount: row.refund_amount,
          reason: row.reason,
          status: row.status,
          images: row.images,
          adminComment: row.admin_comment,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }
    const returns = readJsonFile('returns.json');
    returns.push(returnData);
    writeJsonFile('returns.json', returns);
    return returnData;
  },

  async update(id, updateData) {
    if (usePostgres) {
      const fields = [];
      const values = [];
      let idx = 1;

      if (updateData.status !== undefined) { fields.push(`status = $${idx++}`); values.push(updateData.status); }
      if (updateData.adminComment !== undefined) { fields.push(`admin_comment = $${idx++}`); values.push(updateData.adminComment); }

      fields.push(`updated_at = $${idx++}`);
      values.push(new Date().toISOString());
      values.push(id);

      const result = await pool.query(
        `UPDATE returns SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      );

      if (result.rows.length === 0) return null;
      return this.findById(id);
    }
    const returns = readJsonFile('returns.json');
    const idx = returns.findIndex(r => r.id === id);
    if (idx === -1) return null;
    returns[idx] = { ...returns[idx], ...updateData };
    writeJsonFile('returns.json', returns);
    return returns[idx];
  }
};

module.exports = { userDb, productDb, orderDb, returnDb, usePostgres };
