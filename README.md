# 🌱 基于 Web 的助农服务平台

## 📋 项目概述

本项目是一个基于 Web 的助农服务平台，旨在连接农民和消费者，促进农产品的直接销售。当前实现的演示闭环包括：用户认证、产品展示/搜索/详情、农户上架与管理、下单/取消、模拟支付与模拟物流（发货/轨迹/签收）。购物车、评价与资讯等扩展功能暂缓。

## 🎯 项目目标

- **助农扶贫**：为农民提供直接销售渠道，减少中间环节
- **消费者便利**：为消费者提供新鲜、优质的农产品
- **透明交易**：提供完整的订单跟踪和物流信息
- **用户体验**：现代化的 Web 界面，响应式设计

## 🏗️ 技术架构

### 前端技术
- **HTML5** - 页面结构
- **CSS3** - 样式设计，响应式布局
- **JavaScript (ES6+)** - 交互逻辑和API调用
- **Font Awesome** - 图标库

### 后端技术
- **Node.js** - 服务器运行环境
- **Express.js** - Web 应用框架
- **JWT** - 用户认证和授权
- **bcryptjs** - 密码加密
- **CORS** - 跨域资源共享

### 数据存储
- **JSON 文件** - 轻量级数据存储（users / products / orders / payments / shipments）
- **文件系统** - 静态资源管理

## 📁 项目结构

```
farm-assistance-platform/
├── api/                          # 后端API
│   ├── data/                     # 数据文件
│   │   ├── users.json           # 用户数据
│   │   ├── products.json        # 产品数据
│   │   ├── orders.json          # 订单数据
│   │   ├── payments.json        # 支付数据（模拟）
│   │   └── shipments.json       # 物流数据（模拟）
│   ├── routes/                   # 路由模块
│   │   ├── auth.js              # 认证路由
│   │   ├── products.js          # 产品路由
│   │   ├── orders.js            # 订单路由
│   │   ├── payments.js          # 支付路由（模拟）
│   │   └── shipments.js         # 物流路由（模拟）
│   ├── utils/                    # 工具模块
│   │   └── auth.js              # 认证工具
│   ├── dao/                      # 数据访问层
│   │   └── db.js                # 数据库操作
│   └── server.js                 # 服务器入口
├── public/                       # 前端静态文件
│   ├── css/
│   │   └── style.css            # 主样式文件
│   ├── js/
│   │   ├── app.js               # 首页前端逻辑
│   │   ├── orders.js            # 我的订单逻辑
│   │   └── shipments.js         # 物流页逻辑
│   ├── images/                  # 图片资源
│   ├── index.html               # 主页面
│   ├── orders.html              # 我的订单
│   └── shipments.html           # 物流页面
├── test.html                    # 综合测试页
├── simple-test.html             # 简化测试页
├── scripts/                      # 脚本文件
│   └── smoke-test.js            # 冒烟测试
├── package.json                  # 项目配置
├── .env.example                 # 环境变量示例
└── README.md                    # 项目文档
```

## ✨ 核心功能

### 🔐 用户认证系统
- **用户注册**：支持消费者和农民角色注册
- **用户登录**：JWT Token 认证
- **密码加密**：bcryptjs 安全加密
- **角色管理**：区分消费者和农民权限

### 🛍️ 产品管理
- **产品展示**：分类展示农产品
- **产品搜索**：支持名称和描述搜索
- **库存管理**：实时库存更新
- **产品详情**：详细的产品信息展示

### 🛒 购物车功能（暂缓）
- 页面存在基础 UI，占位逻辑；后端 API 暂未接入（演示通过“立即购买”完成下单与支付）。

### 📦 订单管理
- **订单创建**：通过“立即购买”直下单生成订单（购物车功能暂缓）
- **订单状态**：pending（待支付）、paid（已支付）、shipped（配送中）、finished（已完成）、cancelled（已取消）
  （说明：仅 pending 可取消；paid 通过退款进入 cancelled）
- **订单历史**：用户订单记录查看
- **订单详情**：完整的订单信息

### 💳 支付系统
- **支付处理**：模拟支付流程
- **支付状态**：支付成功/失败状态
- **支付记录**：支付历史记录
- **退款处理**：支持订单退款

### 🚚 物流跟踪
- **物流状态**：实时物流状态更新
- **配送信息**：配送员和联系方式
- **物流轨迹**：配送进度跟踪
- **签收确认**：订单完成确认

## 🚀 快速开始

### 环境要求
- Node.js 18 LTS（已在 18.19.x 验证）
- npm >= 9

### 安装步骤

0. **配置环境变量**
```bash
cp .env.example .env   # 修改 JWT_SECRET 等
# 已内置 dotenv；也可在 shell 中覆盖同名变量：
# macOS/Linux: JWT_SECRET=override_value npm run dev
# Windows PowerShell: $env:JWT_SECRET='override_value'; npm run dev
```

1. **克隆项目**
```bash
git clone <repository-url>
cd farm-assistance-platform
```

2. **安装依赖**
```bash
npm install
```

3. **启动服务器**
```bash
npm start
```

4. **访问应用**
```
http://localhost:3000
```

### Windows 一键启动

如需在 Windows 上“一键运行”以复现论文场景，可直接双击根目录的 `start-windows.bat`，脚本会自动完成以下步骤：

1. 检查 Node.js / npm 是否已安装
2. 自动执行 `npm install`（仅首次或依赖缺失时）
3. 使用 `npm run dev` 拉起带热重载的开发服务器

若需要自定义 `JWT_SECRET` 等变量，请在运行脚本前创建 `.env`（可复制 `.env.example`），或在 PowerShell 中执行 `$Env:JWT_SECRET='your-secret'` 后再启动。

### 开发模式
```bash
npm run dev  # 使用 nodemon 自动重启
```

### 运行测试
```bash
npm run test:smoke  # 运行冒烟测试
```

## 📖 API 文档（与代码一致）

### 错误响应统一格式
所有接口错误默认返回如下结构：
```json
{ "error": { "code": "FORBIDDEN", "message": "需要权限" } }
```
常见状态码：
- 401 未认证（缺少或无效 Token）
- 403 越权（身份合法但无权限）
- 404 资源不存在
- 409 业务冲突（如已支付/已退款等幂等场景）

### 认证接口
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息（需 Token）
- `GET /api/auth/verify` - 验证 Token 有效性（需 Token）

### 产品接口
- `GET /api/products` - 获取产品列表；Query: `search?`、`category?`、`page=1`、`limit=10`、`farmerId?`
- `GET /api/products/:id` - 获取产品详情
- `GET /api/products/my` - 当前农户的商品（需 Token；`farmer`/`admin`）
- `POST /api/products` - 上架商品（需 Token；`farmer`/`admin`）
- `PUT /api/products/:id` - 更新商品（仅拥有者 `farmer` 或 `admin`）
- `DELETE /api/products/:id` - 删除商品（仅拥有者 `farmer` 或 `admin`）

### 订单接口
- `POST /api/orders` - 创建订单（需 Token）；Body: `{ items: [{ productId, qty }] }`
- `GET /api/orders` - 获取订单列表（需 Token）；普通用户仅返回“本人”订单；`admin` 返回全部（不再支持 `me` 参数）
- `GET /api/orders/:id` - 获取订单详情（需 Token；仅本人或 `admin`）
- `PATCH /api/orders/:id/cancel` - 取消订单（需 Token；仅 `pending` 可取消且回滚库存）

### 支付接口（模拟）
- `POST /api/payments/:orderId/pay` — 支付订单（仅订单所有者；`pending` → `paid`；重复支付返回 409〔幂等〕）
- `POST /api/payments/:orderId/refund` — 退款（仅 `paid`；重复请求返回 409〔幂等〕；退款成功后订单转 `cancelled`）
- `GET /api/payments/:orderId` — 查看订单的支付/退款记录（本人或 `admin`），返回数组：`{ id, orderId, userId, type:'payment'|'refund', amount, status:'success'|'failed', method:'mock', createdAt }`

### 物流接口（模拟）
- `GET /api/shipments/:orderId` - 获取物流信息（本人或 `admin`）
- `POST /api/shipments/:orderId/ship` - 发货（`admin`；`paid` → `shipped`）
- `POST /api/shipments/:orderId/push` - 追加轨迹（`admin`；当 `status=delivered` 时订单转 `finished`）

## 📦 数据字段（简版）
- `users.json`
  - id: string(uuid)，必填 — 用户ID
  - username: string，必填 — 用户名
  - email: string，必填 — 邮箱
  - password: string(bcrypt hash)，必填 — 密码哈希
  - role: enum(consumer, farmer, admin)，必填 — 角色
  - createdAt/updatedAt: string(ISO)，必填 — 创建/更新时间

- `products.json`
  - id: string(uuid)，name: string，description: string
  - price: number，stock: number，image?: string，category?: string
  - farmerId: string — 所属农户用户ID
  - createdAt/updatedAt: string(ISO)

- `orders.json`
  - id: string(uuid)，userId: string
  - items: array[{ productId, name, price, qty }]
  - totalAmount: number
  - status: enum(pending, paid, shipped, finished, cancelled)
  - createdAt: string(ISO)
  - paidAt?/shippedAt?/finishedAt?/cancelledAt?: string(ISO)
  - updatedAt?: string(ISO)

- `payments.json`
  - id: string(uuid)，orderId: string，userId: string
  - type: enum(payment, refund) — 记录类型
  - amount: number，method: 'mock'
  - status: enum(success, failed)
  - createdAt: string(ISO)

- `shipments.json`
  - id: string(uuid) — 运单ID
  - orderId: string — 关联订单ID（以 orderId 作为唯一键）
  - carrier: string — 承运方名称
  - courierName: string — 配送员
  - courierPhone: string — 配送员联系方式
  - status: enum(shipped, delivered)
  - history: array[{ time: ISO string, status: string, text?: string }]
  - createdAt/updatedAt: string(ISO)

示例（products.json 项目）
```json
{
  "id": "c7d7-...",
  "name": "苹果",
  "description": "当季新果",
  "price": 6.0,
  "stock": 120,
  "image": "/images/apple.png",
  "farmerId": "f1a2-...",
  "createdAt": "2025-09-13T08:10:00Z",
  "updatedAt": "2025-09-13T08:10:00Z"
}
```

## 🔐 安全与合规要点（论文口径）
- 密码哈希：bcrypt，轮次 10（`api/routes/auth.js`）
- JWT：有效期 24h；密钥 `JWT_SECRET`（环境变量优先，`api/utils/auth.js`）
- Token 存储：localStorage（演示环境）；生产建议 HttpOnly Cookie + CSRF 防护
- CORS：默认开放（演示环境）；生产建议白名单与鉴权网关
- 速率限制：未启用（演示环境）；生产建议 `express-rate-limit`
- 输入校验：必填字段与类型校验已覆盖；生产建议统一校验层和错误码

## 🧪 简单性能占位表（本地）

| 并发 | p50(ms) | p95(ms) | RPS | 错误率 |
|---:|---:|---:|---:|---:|
| 10 |     |     |     |       |
| 30 |     |     |     |       |
| 50 |     |     |     |       |

## 🎨 界面设计

### 设计理念
- **现代化**：采用现代 Web 设计趋势
- **响应式**：支持多种设备屏幕
- **用户友好**：直观的操作界面
- **农业主题**：绿色环保的设计风格

### 主要页面
1. **首页** - 产品展示和平台介绍（支持“立即购买”直购）
2. **我的订单** - 列表、支付、取消、查看物流（`/orders.html`）
3. **物流页面** - 某订单物流轨迹查看（`/shipments.html?orderId=...`）
4. **登录/注册** - 用户认证弹窗

## 🔧 开发历程

### 第一阶段：基础架构搭建
- ✅ 项目初始化和依赖安装
- ✅ Express 服务器配置
- ✅ 基础路由结构设计
- ✅ 静态文件服务配置

### 第二阶段：核心功能开发
- ✅ 用户认证系统实现
- ✅ 产品管理功能开发
- ✅ 订单管理系统
  （说明：购物车功能暂缓，演示通过“立即购买”完成闭环）

### 第三阶段：高级功能
- ✅ 支付系统集成
- ✅ 物流跟踪功能
- ✅ 前端界面优化
- ✅ 响应式设计实现

### 第四阶段：测试和优化
- ✅ 功能测试和调试
- ✅ 性能优化
- ✅ 用户体验改进
- ✅ 代码重构和清理

## 🐛 问题修复记录

### 主要问题及解决方案

#### 1. JavaScript 语法错误修复
**问题**：变量名冲突导致登录注册按钮无法点击
- **原因**：`cartItems` 变量被重复声明
- **解决方案**：重命名DOM元素变量为 `cartItemsElement`
- **影响**：修复了前端交互功能

#### 2. DOM 元素初始化问题
**问题**：页面加载时DOM元素未正确初始化
- **原因**：DOM元素获取时机过早
- **解决方案**：将DOM初始化移到 `initDOMElements()` 函数
- **影响**：提高了页面稳定性

#### 3. 错误处理机制
**问题**：缺乏完善的错误处理
- **原因**：未添加DOM元素存在性检查
- **解决方案**：添加错误检查和调试日志
- **影响**：提高了代码健壮性

## 📊 测试页面

项目包含多个测试页面用于功能验证：

1. **主页面** - `http://localhost:3000`
   - 完整的平台功能
   - 用户交互界面

2. **测试页** - `http://localhost:3000/test.html`
3. **简单测试页** - `http://localhost:3000/simple-test.html`

## 📚 毕业论文大纲

### 第1章 绪论
- **1.1** 研究背景与意义（助农直连、缩短链路、轻量易部署）
- **1.2** 国内外研究现状（简述农村电商与轻量化实现；指出工程落地门槛）
- **1.3** 研究目标与范围（最小可用闭环：认证、商品、下单/取消、支付模拟、物流模拟、基础后台）
- **1.4** 研究方法与论文结构（实现驱动、快速迭代、JSON 替代 DB；章节安排）

### 第2章 相关技术与理论基础
- **2.1** B/S 架构与前后端分离（单体 Express 提供 API 与静态资源）
- **2.2** 前端技术：HTML/CSS/JS、Font Awesome（为何放弃 React：时间成本与可复现性）
- **2.3** 后端技术：Node.js、Express、JWT、bcrypt、CORS
- **2.4** 数据存储：JSON 文件 + DAO 封装（优缺点与将来可迁移到数据库）
- **2.5** 权限模型与安全机制：基于 JWT 的鉴权与简化 RBAC（consumer/farmer/admin）

### 第3章 系统需求分析
- **3.1** 角色与场景：农户、消费者、管理员（管理员前端可简化，通过接口/工具操作）
- **3.2** 功能需求（已实现/暂缓）：
  - 已实现：注册/登录；商品展示/搜索/详情；农户上架/管理；下单与取消；库存扣减与回滚；模拟支付；模拟物流（发货、轨迹、签收）；基础管理操作
  - 暂缓：评价系统、资讯模块、图表可视化前端（可在第5章用"后端统计接口 + 截图/表格"替代）
- **3.3** 非功能需求：安全性（bcrypt、JWT）、可用性（基础响应式）、可测试性（冒烟测试）、简易鲁棒性（错误处理与幂等约束）

### 第4章 系统设计与实现
- **4.1** 总体架构：单体 Node/Express + 静态前端；路由与静态资源共存
- **4.2** 模块划分：auth / products / orders / payments / shipments；utils/auth；dao/db；public
- **4.3** 数据设计（JSON 结构）：users/products/orders/payments/shipments 字段表（附示例）
- **4.4** 接口设计（REST API 一览与状态机）：认证、商品、订单、支付、物流；状态机（已实现）：`pending → paid → shipped → finished`（可选：`pending → cancelled`）。取消规则：仅 `pending` 可取消且回滚库存。
- **4.5** 关键流程实现：
  - 下单：库存校验 → 扣减 → 生成订单（pending）
  - 支付（模拟）：订单所有者支付 → 写支付记录 → 订单转 paid（幂等）
  - 物流（模拟）：管理员发货 → 生成运单与轨迹 → 追加轨迹 → 签收转 finished
  - 取消订单：仅 pending，回滚库存
- **4.6** 前端实现：页面结构、主要交互（列表/下单/支付按钮/物流时间线）、消息提示
- **4.7** 启动与配置：环境变量、目录结构、命令与数据文件位置

### 第5章 系统测试与结果分析
- **5.1** 测试环境与数据准备（Node 版本、脚本、种子数据）
- **5.2** 功能测试用例（用例表：正常流/错误流/越权）
- **5.3** 简单性能与稳定性验证（本地并发 10–50 下的响应统计；写盘策略与幂等）
- **5.4** 结果展示（接口返回截图、页面截图、统计接口返回表格）

### 第6章 总结与展望
- **6.1** 已达成目标（最小可用、可复现、全本地演示）
- **6.2** 局限与改进（数据库迁移、前端重构、实支付/实物流、可视化、完善 RBAC、OpenAPI 文档）

## 📊 论文图表数据清单

### 第1章 绪论
- **图1-1**：行业链路简图（生产→流通→消费者）
  - 数据来源：行业调研报告
  - 制作工具：Mermaid/Visio
  - 内容：传统农产品销售链路 vs 平台直连链路对比

- **图1-2**：轻量化实现对比图
  - 数据来源：技术选型对比
  - 制作工具：Mermaid
  - 内容：React+DB vs 原生技术+JSON 的复杂度对比

### 第2章 相关技术与理论基础
- **图2-1**：JWT 鉴权时序图
  - 数据来源：系统认证流程
  - 制作工具：Mermaid
  - 内容：登录→发Token→携带Authorization访问的完整流程

- **表2-1**：JSON vs RDB 对比表
  - 数据来源：技术选型分析
  - 制作工具：Markdown表格
  - 内容：维护成本/事务/索引/复现难度对比

### 第3章 系统需求分析
- **表3-1**：功能矩阵表
  - 数据来源：系统功能分析
  - 制作工具：Markdown表格
  - 内容：功能 vs 角色（消费者/农户/管理员）的权限矩阵

- **图3-1**：简化用例图
  - 数据来源：业务流程分析
  - 制作工具：Mermaid
  - 内容：用户注册、商品管理、下单取消等核心用例

### 第4章 系统设计与实现
- **图4-1**：系统架构图
  - 数据来源：项目架构分析
  - 制作工具：Mermaid
  - 内容：前端↔API↔DAO↔JSON 的完整架构

- **表4-1**：users.json 字段表
  - 数据来源：`api/data/users.json`
  - 制作工具：Markdown表格
  - 内容：字段/类型/必填/说明

- **表4-2**：products.json 字段表
  - 数据来源：`api/data/products.json`
  - 制作工具：Markdown表格
  - 内容：字段/类型/必填/说明

- **表4-3**：orders.json 字段表
  - 数据来源：`api/data/orders.json`
  - 制作工具：Markdown表格
  - 内容：字段/类型/必填/说明

- **表4-4**：接口一览表
  - 数据来源：`api/routes/` 目录下所有路由文件
  - 制作工具：Markdown表格
  - 内容：方法/路径/鉴权/参数/返回/备注

- **图4-2**：状态机图
  - 数据来源：订单状态流转逻辑
  - 制作工具：Mermaid
  - 内容：已实现主流程：pending → paid → shipped → finished；分支：pending → cancelled

- **图4-3**：首页截图
  - 数据来源：`http://localhost:3000`
  - 制作工具：浏览器截图
  - 内容：商品列表展示页面

- **图4-4**：登录页面截图
  - 数据来源：`http://localhost:3000` 登录弹窗
  - 制作工具：浏览器截图
  - 内容：用户登录界面

- **图4-5**：商品卡片截图
  - 数据来源：`http://localhost:3000` 商品详情
  - 制作工具：浏览器截图
  - 内容：商品信息展示

- **图4-6**：下单/取消提示截图
  - 数据来源：`http://localhost:3000` 订单操作
  - 制作工具：浏览器截图
  - 内容：下单成功/取消成功的提示信息

### 第5章 系统测试与结果分析
- **表5-1**：用例表
  - 数据来源：功能测试用例
  - 制作工具：Markdown表格
  - 内容：编号/前置/步骤/期望/实际/结果

- **图5-1**：接口返回截图
  - 数据来源：API 测试结果
  - 制作工具：curl/Postman截图
  - 内容：关键接口的请求响应示例

- **图5-2**：冒烟测试脚本执行结果
  - 数据来源：`scripts/smoke-test.js` 执行输出
  - 制作工具：终端截图
  - 内容：测试脚本运行过程和结果

- **图5-3**：数据文件变更片段
  - 数据来源：`api/data/*.json` 文件变更
  - 制作工具：文件对比截图
  - 内容：订单新增/取消前后的数据对比

### 附录
- **附录A**：REST API 一览表（详细版）
- **附录B**：JSON 字段定义与样例（详细版）
- **附录C**：冒烟测试脚本与关键命令
- **附录D**：核心代码片段（鉴权中间件、库存扣减/回滚）

## 📝 论文写作指导

### 写作原则
1. **文档=代码**：每节前加一句"本节内容与项目仓库的对应文件/目录为：……"
2. **统一命名**：论文中的接口名称与代码完全一致
3. **基于实际**：不写未实现的功能，统一放到"展望"
4. **证据充分**：每个功能都有对应的代码文件和截图支撑

### 常见问答口径
- **Q: 为何不用数据库/React？**
  - A: 为了可复现与演示稳定，选用 JSON+原生前端；论文中已给出迁移方案（DAO→DB，页面→React）

- **Q: 一致性如何保证？**
  - A: DAO 采用"读→校验→一次性写回"，状态机加幂等校验（仅 pending 可取消），满足单机演示需求

- **Q: 支付/物流为什么没有？**
  - A: 已实现“模拟支付/物流”用于演示（见 payments/shipments 路由与数据文件）；真实接入可替换为第三方支付与物流平台，对接流程保持一致。

### 截图准备清单
- [ ] 注册/登录成功页面或接口返回
- [ ] 农户上架商品、我的商品（/api/products/my）结果
- [ ] 商品列表分页/搜索（search/page/limit）效果
- [ ] 下单成功返回（status: pending）与相应的 orders.json 片段
- [ ] 取消订单返回（status: cancelled）与库存回滚前后对比
- [ ] 越权操作被拒的错误返回（403/401）
- [ ] 冒烟测试脚本执行输出
- [ ] 项目目录结构与版本信息（README/终端）

### 代码片段准备
- [ ] 鉴权中间件代码（`api/utils/auth.js`）
- [ ] 库存扣减逻辑（`api/routes/orders.js`）
- [ ] 库存回滚逻辑（`api/routes/orders.js`）
- [ ] 订单状态更新逻辑（`api/routes/orders.js`）
- [ ] 分页搜索逻辑（`api/routes/products.js`）

### 数据表格准备
- [ ] users.json 字段表（字段/类型/必填/说明）
- [ ] products.json 字段表（字段/类型/必填/说明）
- [ ] orders.json 字段表（字段/类型/必填/说明）
- [ ] 接口一览表（方法/路径/鉴权/参数/返回/备注）
- [ ] 功能矩阵表（功能 vs 角色权限）
- [ ] JSON vs RDB 对比表
- [ ] 用例表（编号/前置/步骤/期望/实际/结果）

### 图表制作工具
- **Mermaid**：架构图、时序图、状态机图、用例图
- **Markdown表格**：数据表格、对比表
- **浏览器截图**：页面截图
- **终端截图**：命令执行结果
- **文件对比**：数据变更对比

## 🔮 未来规划

### 短期目标
- [ ] 添加产品图片上传功能
- [ ] 实现实时聊天功能
- [ ] 添加用户评价系统
- [ ] 优化移动端体验

### 长期目标
- [ ] 集成真实支付接口
- [ ] 添加数据分析功能
- [ ] 实现多语言支持
- [ ] 开发移动端应用

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 👥 开发团队

- **项目负责人**：开发团队
- **前端开发**：Web 界面和用户体验
- **后端开发**：API 和服务器逻辑
- **测试工程师**：功能测试和质量保证

## 📞 联系方式

- **项目地址**：[GitHub Repository]
- **问题反馈**：[Issues Page]
- **邮箱**：[....@example.com]

---

## 📝 更新日志

### v1.0.0 (2025-09-13)
- 🎉 项目初始版本（演示版）发布
- 🔐 用户认证系统（JWT + bcrypt）
- 🛍️ 产品管理（展示/搜索/详情/上架/更新/删除/我的商品）
- 📦 订单（创建/查询/详情/取消，库存扣减与回滚）
- 💳 模拟支付（pending → paid，幂等）
- 🚚 模拟物流（发货/轨迹/签收；paid → shipped → finished）
- 🎨 基础前端页面与交互

---

*最后更新：2025年9月14日*
