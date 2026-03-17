# 助农服务平台 - 完整启动指南

一个基于 Web 的助农电商服务平台，支持农户上架商品、消费者购买、订单管理、支付结算等功能。

## 📋 目录

- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [详细安装步骤](#详细安装步骤)
- [启动项目](#启动项目)
- [测试功能](#测试功能)
- [API 接口文档](#api-接口文档)
- [常见问题](#常见问题)
- [项目结构](#项目结构)

---

## 🔧 环境要求

在开始之前，请确保你的电脑已安装以下软件：

### 必需软件

1. **Node.js** (版本 >= 14.0.0)
   - 下载地址：https://nodejs.org/
   - 推荐安装 LTS（长期支持）版本
   - 验证安装：在终端运行 `node -v` 和 `npm -v`

2. **Git** (可选，用于克隆项目)
   - 下载地址：https://git-scm.com/
   - 验证安装：在终端运行 `git --version`

### 支持的操作系统

- ✅ Windows 10/11
- ✅ macOS 10.15+
- ✅ Linux (Ubuntu, CentOS, etc.)

---

## 🚀 快速开始

如果你已经有 Node.js，可以直接按以下步骤操作：

```bash
# 1. 进入项目目录
cd /path/to/zhunong-master

# 2. 安装依赖
npm install

# 3. 启动后端服务器（默认端口 3000）
npm start

# 4. 在浏览器打开
http://localhost:3000
```

---

## 📦 详细安装步骤

### 步骤 1: 获取项目代码

#### 方式一：直接复制文件夹
如果你已经有项目文件夹（例如从 U 盘或网盘下载），直接将整个 `zhunong-master` 文件夹复制到你的电脑上。

#### 方式二：使用 Git 克隆（如果项目在 GitHub）
```bash
git clone <项目仓库地址>
cd zhunong-master
```

### 步骤 2: 进入项目目录

打开终端（Terminal / 命令提示符 / PowerShell），然后进入项目目录：

**Windows（命令提示符）：**
```cmd
cd C:\Users\YourName\Desktop\zhunong-master
```

**macOS / Linux（终端）：**
```bash
cd /Users/YourName/Desktop/zhunong-master
```

**提示：** 你可以直接将文件夹拖到终端窗口，它会自动填充路径。

### 步骤 3: 安装项目依赖

在项目根目录下运行：

```bash
npm install
```

**这一步会做什么？**
- 读取 `package.json` 文件
- 下载所有需要的 npm 包（express, bcryptjs, jsonwebtoken 等）
- 安装到 `node_modules` 文件夹

**预计时间：** 1-5 分钟（取决于网速）

**如果遇到网络问题：**
```bash
# 使用淘宝镜像加速
npm install --registry=https://registry.npmmirror.com
```

### 步骤 4: 检查数据文件

项目启动前，确保 `api/data` 目录下有以下文件：

```
api/data/
  ├── users.json           # 用户数据
  ├── products.json        # 商品数据
  ├── orders.json          # 订单数据
  ├── payments.json        # 支付记录
  ├── cart.json            # 购物车数据
  ├── shipments.json       # 物流数据
  ├── farmer_sales.json    # 农户销售记录
  └── farmer_wallets.json  # 农户钱包数据
```

**如果文件不存在，创建空文件：**

**macOS / Linux:**
```bash
touch api/data/users.json
touch api/data/products.json
touch api/data/orders.json
touch api/data/payments.json
touch api/data/cart.json
touch api/data/shipments.json
touch api/data/farmer_sales.json
touch api/data/farmer_wallets.json

# 然后在每个文件中写入空数组 []
echo "[]" > api/data/users.json
echo "[]" > api/data/products.json
echo "[]" > api/data/orders.json
echo "[]" > api/data/payments.json
echo "[]" > api/data/cart.json
echo "[]" > api/data/shipments.json
echo "[]" > api/data/farmer_sales.json
echo "[]" > api/data/farmer_wallets.json
```

**Windows (PowerShell):**
```powershell
"[]" | Out-File -FilePath "api/data/users.json" -Encoding UTF8
"[]" | Out-File -FilePath "api/data/products.json" -Encoding UTF8
"[]" | Out-File -FilePath "api/data/orders.json" -Encoding UTF8
"[]" | Out-File -FilePath "api/data/payments.json" -Encoding UTF8
"[]" | Out-File -FilePath "api/data/cart.json" -Encoding UTF8
"[]" | Out-File -FilePath "api/data/shipments.json" -Encoding UTF8
"[]" | Out-File -FilePath "api/data/farmer_sales.json" -Encoding UTF8
"[]" | Out-File -FilePath "api/data/farmer_wallets.json" -Encoding UTF8
```

---

## ▶️ 启动项目

### 方式一：使用 npm 脚本（推荐）

```bash
# 启动后端服务器（生产模式）
npm start

# 或者启动开发模式（自动重启）
npm run dev
```

### 方式二：直接使用 Node.js

```bash
node api/server.js
```

### 启动成功的标志

看到以下输出说明服务器启动成功：

```
服务器运行在 http://localhost:3000
API 文档: http://localhost:3000/api
```

### 修改端口（可选）

如果 3000 端口被占用，可以修改端口：

**方式一：修改环境变量**
```bash
# macOS / Linux
PORT=3001 npm start

# Windows (PowerShell)
$env:PORT=3001; npm start

# Windows (命令提示符)
set PORT=3001 && npm start
```

**方式二：修改 .env 文件**

在项目根目录创建 `.env` 文件：
```env
PORT=3001
```

然后正常启动 `npm start`

---

## 🧪 测试功能

### 1. 访问前端页面

在浏览器中打开：
```
http://localhost:3000
```

你应该看到主页面。

### 2. 测试完整业务流程

#### 步骤一：注册农户账号

在浏览器中访问前端页面，点击"注册"，选择"农户"角色，填写信息：
- 用户名：farmer01
- 邮箱：farmer01@example.com
- 密码：123456
- 角色：农户

#### 步骤二：农户登录并上架商品

1. 使用农户账号登录
2. 进入"我的商品"页面
3. 点击"上架新商品"
4. 填写商品信息：
   - 商品名称：新鲜苹果
   - 描述：红富士苹果，香甜可口
   - 价格：10.5
   - 库存：100
   - 单位：千克
5. 点击提交

#### 步骤三：注册消费者账号

退出登录，重新注册消费者账号：
- 用户名：consumer01
- 邮箱：consumer01@example.com
- 密码：123456
- 角色：消费者

#### 步骤四：消费者购买商品

1. 使用消费者账号登录
2. 浏览商品列表，找到"新鲜苹果"
3. 点击"加入购物车"，数量选择 2
4. 进入购物车页面
5. 点击"结算"创建订单
6. 在订单页面点击"支付"

#### 步骤五：农户查看销售记录

1. 退出消费者账号
2. 使用农户账号重新登录
3. 进入"订单管理"或"销售记录"页面
4. 可以看到：
   - 刚才消费者购买的订单
   - 购买者信息（consumer01）
   - 销售金额（2 × 10.5 = 21元）
   - 库存已自动减少（100 → 98）
5. 进入"钱包"页面
6. 可以看到：
   - 账户余额：21元
   - 总收入：21元
   - 交易流水记录

### 3. 使用 API 测试（高级）

#### 方法一：使用 cURL

**注册用户：**
```bash
# 注册农户
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "farmer01",
    "email": "farmer01@example.com",
    "password": "123456",
    "role": "farmer"
  }'
```

**登录获取 Token：**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "farmer01@example.com",
    "password": "123456"
  }'
```

保存返回的 `token`，后续请求需要使用。

**上架商品：**
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "新鲜苹果",
    "description": "红富士苹果，香甜可口",
    "price": 10.5,
    "stock": 100,
    "unit": "千克"
  }'
```

**查看农户销售记录：**
```bash
curl http://localhost:3000/api/farmer-sales \
  -H "Authorization: Bearer FARMER_TOKEN"
```

**查看农户钱包：**
```bash
curl http://localhost:3000/api/farmer-sales/wallet \
  -H "Authorization: Bearer FARMER_TOKEN"
```

#### 方法二：使用 Postman

1. 下载安装 Postman：https://www.postman.com/
2. 创建新请求，设置请求方法和 URL
3. 在 Headers 添加：
   - Content-Type: application/json
   - Authorization: Bearer YOUR_TOKEN
4. 在 Body 选择 raw + JSON，填写请求数据
5. 点击 Send 发送请求

---

## 📚 API 接口文档

### 认证接口

| 方法 | 路径 | 说明 | 需要认证 |
|------|------|------|----------|
| POST | /api/auth/register | 用户注册 | ❌ |
| POST | /api/auth/login | 用户登录 | ❌ |

### 商品接口

| 方法 | 路径 | 说明 | 需要认证 |
|------|------|------|----------|
| GET | /api/products | 获取商品列表 | ❌ |
| GET | /api/products/:id | 获取商品详情 | ❌ |
| POST | /api/products | 农户上架商品 | ✅ (farmer) |
| PUT | /api/products/:id | 修改商品信息 | ✅ (farmer) |
| DELETE | /api/products/:id | 删除商品 | ✅ (farmer) |
| GET | /api/products/my | 获取我的商品 | ✅ (farmer) |

### 购物车接口

| 方法 | 路径 | 说明 | 需要认证 |
|------|------|------|----------|
| GET | /api/cart | 获取购物车 | ✅ |
| POST | /api/cart/add | 添加商品到购物车 | ✅ |
| PUT | /api/cart/update | 更新购物车商品数量 | ✅ |
| DELETE | /api/cart/remove/:productId | 删除购物车商品 | ✅ |
| DELETE | /api/cart/clear | 清空购物车 | ✅ |
| POST | /api/cart/checkout | 购物车结算创建订单 | ✅ |

### 订单接口

| 方法 | 路径 | 说明 | 需要认证 |
|------|------|------|----------|
| GET | /api/orders | 获取订单列表 | ✅ |
| GET | /api/orders/:id | 获取订单详情 | ✅ |
| POST | /api/orders | 创建订单 | ✅ |
| PATCH | /api/orders/:id/cancel | 取消订单 | ✅ |

**订单查询逻辑：**
- **消费者**：只能看到自己创建的订单
- **农户**：可以看到包含自己商品的所有订单（包括购买者信息和收益）
- **管理员**：可以看到所有订单

### 支付接口

| 方法 | 路径 | 说明 | 需要认证 |
|------|------|------|----------|
| GET | /api/payments/:orderId | 获取订单支付记录 | ✅ |
| POST | /api/payments/:orderId/pay | 支付订单 | ✅ |
| POST | /api/payments/:orderId/refund | 退款 | ✅ |

**支付流程：**
1. 消费者创建订单（状态：pending）
2. 消费者支付订单（状态：paid）
3. **自动触发农户结算**：
   - 创建农户销售记录
   - 更新农户钱包余额
   - 记录交易流水

### 农户销售接口（核心功能）

| 方法 | 路径 | 说明 | 需要认证 |
|------|------|------|----------|
| GET | /api/farmer-sales | 获取销售记录列表 | ✅ (farmer) |
| GET | /api/farmer-sales/wallet | 获取钱包信息 | ✅ (farmer) |
| GET | /api/farmer-sales/summary | 获取销售概况 | ✅ (farmer) |

**农户销售记录返回示例：**
```json
{
  "sales": [
    {
      "id": "sale-xxx",
      "orderId": "order-xxx",
      "buyerId": "user-xxx",
      "buyerName": "consumer01",
      "items": [
        {
          "productId": "product-xxx",
          "name": "新鲜苹果",
          "price": 10.5,
          "qty": 2
        }
      ],
      "totalAmount": 21,
      "status": "pending",
      "createdAt": "2025-12-11T..."
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 20,
  "pages": 1
}
```

**农户钱包返回示例：**
```json
{
  "wallet": {
    "id": "wallet-xxx",
    "farmerId": "farmer-xxx",
    "balance": 21,
    "totalIncome": 21,
    "totalWithdrawal": 0,
    "transactions": [
      {
        "id": "tx-xxx",
        "type": "sale",
        "amount": 21,
        "description": "订单 order-xxx 销售收入",
        "balance": 21,
        "createdAt": "2025-12-11T..."
      }
    ]
  }
}
```

---

## ❓ 常见问题

### 1. 端口被占用

**错误信息：**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**解决方案：**

**方式一：关闭占用端口的程序**
```bash
# macOS / Linux
lsof -ti:3000 | xargs kill

# Windows (PowerShell，需要管理员权限)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process
```

**方式二：使用其他端口**
```bash
# macOS / Linux
PORT=3001 npm start

# Windows (PowerShell)
$env:PORT=3001; npm start
```

### 2. npm install 失败

**问题：** 网络连接慢或超时

**解决方案：** 使用国内镜像
```bash
# 临时使用
npm install --registry=https://registry.npmmirror.com

# 永久配置
npm config set registry https://registry.npmmirror.com
```

### 3. 找不到模块错误

**错误信息：**
```
Error: Cannot find module 'express'
```

**解决方案：**
```bash
# 删除 node_modules 重新安装
rm -rf node_modules package-lock.json
npm install
```

### 4. JSON 文件格式错误

**错误信息：**
```
SyntaxError: Unexpected token in JSON
```

**解决方案：**
- 检查所有 `.json` 文件是否包含有效的 JSON 格式
- 确保文件内容至少是空数组 `[]`
- 使用在线 JSON 验证工具：https://jsonlint.com/

### 5. 农户看不到订单

**可能原因：**
1. 订单中的商品缺少 `farmerId` 字段
2. 使用了旧代码创建的订单

**解决方案：**
运行数据迁移脚本：
```bash
node api/scripts/migrate-orders.js
```

这会自动为现有订单补充 farmerId 并生成农户销售记录。

### 6. 权限错误（macOS / Linux）

**错误信息：**
```
Error: EACCES: permission denied
```

**解决方案：**
```bash
# 方式一：修改 npm 全局目录（推荐）
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.profile
source ~/.profile

# 然后重新运行 npm install
npm install
```

### 7. 前端页面空白

**可能原因：**
- 服务器未启动
- 端口错误
- 浏览器缓存

**解决方案：**
1. 确认服务器已启动并显示 "服务器运行在 http://localhost:3000"
2. 清除浏览器缓存（Ctrl+Shift+Delete 或 Cmd+Shift+Delete）
3. 在隐私/无痕模式下打开浏览器
4. 检查浏览器控制台（F12）是否有错误信息

---

## 📁 项目结构

```
zhunong-master/
├── api/                          # 后端代码
│   ├── dao/                      # 数据访问层
│   │   └── db.js                # 数据库操作封装
│   ├── data/                     # JSON 数据文件
│   │   ├── users.json           # 用户数据
│   │   ├── products.json        # 商品数据
│   │   ├── orders.json          # 消费者订单数据
│   │   ├── payments.json        # 支付记录
│   │   ├── cart.json            # 购物车数据
│   │   ├── shipments.json       # 物流数据
│   │   ├── farmer_sales.json    # 农户销售记录 ⭐ 新增
│   │   └── farmer_wallets.json  # 农户钱包数据 ⭐ 新增
│   ├── routes/                   # 路由控制器
│   │   ├── auth.js              # 认证路由
│   │   ├── products.js          # 商品路由
│   │   ├── orders.js            # 订单路由
│   │   ├── payments.js          # 支付路由
│   │   ├── cart.js              # 购物车路由
│   │   ├── shipments.js         # 物流路由
│   │   └── farmerSales.js       # 农户销售路由 ⭐ 新增
│   ├── utils/                    # 工具函数
│   │   ├── auth.js              # JWT 认证
│   │   ├── cache.js             # 缓存工具
│   │   ├── performance.js       # 性能监控
│   │   └── farmerSettlement.js  # 农户结算逻辑 ⭐ 新增
│   ├── scripts/                  # 脚本工具
│   │   └── migrate-orders.js    # 订单数据迁移 ⭐ 新增
│   └── server.js                 # 服务器入口文件
├── public/                       # 前端静态文件
│   ├── css/                      # 样式文件
│   ├── js/                       # JavaScript 文件
│   └── index.html               # 主页面
├── node_modules/                 # npm 依赖包（自动生成）
├── package.json                  # 项目配置和依赖
├── package-lock.json             # 依赖版本锁定
├── README.md                     # 项目说明
└── INSTALLATION_GUIDE.md         # 本安装指南
```

---

## 🎯 核心业务流程

### 完整的订单和结算流程

```
1. 农户上架商品
   └─> 商品数据保存 farmerId

2. 消费者购买
   ├─> 添加到购物车
   └─> 结算创建订单（订单items包含farmerId）

3. 消费者支付
   ├─> 订单状态：pending → paid
   └─> 自动触发农户结算 ⭐
       ├─> 创建农户销售记录 (farmer_sales.json)
       ├─> 更新农户钱包余额 (farmer_wallets.json)
       └─> 记录交易流水

4. 农户查看
   ├─> 订单页面：看到包含自己商品的所有订单
   ├─> 销售记录：查看销售详情和购买者信息
   └─> 钱包页面：查看余额、收入、交易流水
```

---

## 🔐 安全提示

1. **不要泄露 JWT_SECRET**
   - 生产环境必须使用强密码
   - 修改 `api/utils/auth.js` 中的 JWT_SECRET

2. **用户密码加密**
   - 项目使用 bcryptjs 加密密码
   - 原始密码不会被保存

3. **生产环境部署**
   - 使用环境变量管理敏感信息
   - 启用 HTTPS
   - 配置防火墙和访问限制
   - 使用真实数据库（MySQL, MongoDB等）替代 JSON 文件

---

## 📝 开发建议

### 开发模式（自动重启）

安装 nodemon：
```bash
npm install -g nodemon
```

然后使用 nodemon 启动：
```bash
nodemon api/server.js
```

或者在 package.json 中添加 dev 脚本：
```json
{
  "scripts": {
    "start": "node api/server.js",
    "dev": "nodemon api/server.js"
  }
}
```

然后运行：
```bash
npm run dev
```

**好处：** 修改代码后自动重启服务器，无需手动停止和启动。

### 调试技巧

1. **查看服务器日志**
   - 所有 console.log 会输出到终端
   - 订单结算日志会显示 "农户结算完成"

2. **使用 Postman 测试 API**
   - 下载：https://www.postman.com/
   - 创建请求集合，保存常用请求

3. **检查数据文件**
   - 直接打开 `api/data/*.json` 查看数据
   - 使用 JSON 格式化工具查看：https://jsonformatter.org/

4. **浏览器开发者工具**
   - 按 F12 打开
   - Console 标签：查看 JavaScript 错误
   - Network 标签：查看 API 请求和响应

---

## 🎉 开始使用

现在你已经准备好了！按照以下步骤开始：

### 第一次使用（新电脑）

1. ✅ 安装 Node.js（https://nodejs.org/）
2. ✅ 下载或复制项目文件夹到你的电脑
3. ✅ 打开终端，进入项目目录
4. ✅ 运行 `npm install` 安装依赖
5. ✅ 确认 `api/data/` 下所有 JSON 文件存在且格式正确
6. ✅ 运行 `npm start` 启动服务器
7. ✅ 在浏览器访问 `http://localhost:3000`
8. ✅ 注册农户和消费者账号
9. ✅ 测试完整业务流程

### 日常使用

```bash
# 1. 进入项目目录
cd /path/to/zhunong-master

# 2. 启动服务器
npm start

# 3. 在浏览器打开
http://localhost:3000
```

### 停止服务器

在终端按 `Ctrl + C`

---

## 📞 技术支持

如果遇到其他问题，请检查：

1. ✅ Node.js 版本是否符合要求（>= 14.0.0）
   ```bash
   node -v
   ```

2. ✅ 所有依赖是否正确安装
   ```bash
   ls node_modules
   ```

3. ✅ 数据文件是否存在且格式正确
   ```bash
   ls api/data/
   cat api/data/users.json  # 应该是 [] 或有效的 JSON 数组
   ```

4. ✅ 端口是否被占用
   ```bash
   # macOS / Linux
   lsof -i:3000

   # Windows
   netstat -ano | findstr :3000
   ```

5. ✅ 终端是否在项目根目录
   ```bash
   pwd  # 应该显示项目路径
   ```

---

## 🚀 下一步

项目成功运行后，你可以：

1. **熟悉业务流程**
   - 测试农户上架商品
   - 测试消费者购买流程
   - 查看农户销售记录和钱包

2. **学习代码结构**
   - 阅读 `api/routes/` 下的路由文件
   - 理解 `api/utils/farmerSettlement.js` 的结算逻辑
   - 查看前端 `public/js/` 下的交互代码

3. **自定义开发**
   - 修改前端样式
   - 添加新功能
   - 优化业务逻辑

---

祝你使用愉快！ 🌱
