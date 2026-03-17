// 全局变量
let currentUser = null;
let myProducts = [];
let myOrders = [];

// 工具函数
function getToken() {
    return localStorage.getItem('token');
}

function authHeaders() {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

// 检查认证状态
async function checkAuth() {
    const token = getToken();
    if (!token) {
        alert('请先登录');
        window.location.href = '/index.html';
        return;
    }

    try {
        const response = await fetch('/api/auth/me', {
            headers: authHeaders()
        });

        if (!response.ok) {
            throw new Error('认证失败');
        }

        const data = await response.json();
        currentUser = data.user;

        // 检查是否是农民或管理员
        if (currentUser.role !== 'farmer' && currentUser.role !== 'admin') {
            alert('此页面仅供农民使用');
            window.location.href = '/index.html';
            return;
        }

        document.getElementById('userName').textContent = currentUser.username;
        loadDashboardData();
    } catch (error) {
        console.error('认证错误:', error);
        alert('登录已过期,请重新登录');
        localStorage.removeItem('token');
        window.location.href = '/index.html';
    }
}

// 加载仪表板数据
async function loadDashboardData() {
    // 必须先加载商品，然后才能加载订单（订单筛选依赖商品数据）
    await loadMyProducts();
    await loadMyOrders();
    updateStats();
}

// 加载我的商品
async function loadMyProducts() {
    try {
        const response = await fetch('/api/products/my', {
            headers: authHeaders()
        });

        if (!response.ok) {
            throw new Error('加载商品失败');
        }

        const data = await response.json();
        myProducts = data.products || [];
        renderProducts();
    } catch (error) {
        console.error('加载商品错误:', error);
        alert('加载商品失败');
    }
}

// 渲染商品列表
function renderProducts() {
    const tbody = document.getElementById('productsTableBody');

    if (myProducts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <p>暂无商品,点击"上架新商品"开始添加</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = myProducts.map(product => `
        <tr>
            <td><img src="${product.image || 'https://via.placeholder.com/60'}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/60?text=图片'"></td>
            <td><strong>${product.name}</strong></td>
            <td>¥${product.price.toFixed(2)}</td>
            <td>${product.stock}</td>
            <td>${product.unit || '千克'}</td>
            <td>${new Date(product.createdAt).toLocaleDateString('zh-CN')}</td>
            <td>
                <div class="action-btns">
                    <button class="btn btn-small btn-edit" onclick="editProduct('${product.id}')">
                        <i class="fas fa-edit"></i> 编辑
                    </button>
                    <button class="btn btn-small btn-delete" onclick="deleteProduct('${product.id}')">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// 加载我的订单（包含我商品的订单）
async function loadMyOrders() {
    try {
        const [ordersResponse, usersResponse] = await Promise.all([
            fetch('/api/orders', { headers: authHeaders() }),
            fetch('/api/auth/users', { headers: authHeaders() }).catch(() => null)
        ]);

        if (!ordersResponse.ok) {
            throw new Error('加载订单失败');
        }

        const ordersData = await ordersResponse.json();
        const allOrders = ordersData.orders || [];

        // 尝试加载用户信息（如果API不存在，使用fallback）
        let usersMap = {};
        if (usersResponse && usersResponse.ok) {
            const usersData = await usersResponse.json();
            usersMap = (usersData.users || []).reduce((map, user) => {
                map[user.id] = user;
                return map;
            }, {});
        }

        // 筛选包含我商品的订单，并附加买家信息
        myOrders = allOrders.filter(order => {
            return order.items.some(item => {
                return myProducts.some(p => p.id === item.productId);
            });
        }).map(order => {
            const buyer = usersMap[order.userId] || { username: '匿名用户', email: '' };
            return {
                ...order,
                buyerName: buyer.username,
                buyerEmail: buyer.email
            };
        });

        console.log('加载的订单数量:', myOrders.length);
        console.log('买家信息示例:', myOrders.slice(0, 2).map(o => ({
            订单ID: o.id.substring(0, 8),
            买家: o.buyerName,
            邮箱: o.buyerEmail,
            状态: o.status
        })));

        renderOrders();
    } catch (error) {
        console.error('加载订单错误:', error);
    }
}

// 渲染订单列表
function renderOrders() {
    const container = document.getElementById('ordersContainer');

    if (myOrders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-bag"></i>
                <p>暂无订单</p>
            </div>
        `;
        return;
    }

    container.innerHTML = myOrders.map(order => {
        // 只显示包含我商品的订单项
        const myItems = order.items.filter(item =>
            myProducts.some(p => p.id === item.productId)
        );

        const myEarnings = myItems.reduce((sum, item) => sum + item.price * item.qty, 0);
        const isPaid = ['paid', 'shipped', 'finished'].includes(order.status);
        const totalQty = myItems.reduce((sum, item) => sum + item.qty, 0);

        return `
            <div class="order-card" style="border-left: 4px solid ${isPaid ? '#4CAF50' : '#ff9800'};">
                <div class="order-header">
                    <div>
                        <strong>订单号:</strong> <span style="font-family: monospace;">${order.id.substring(0, 12)}...</span><br>
                        <small><i class="fas fa-clock"></i> ${new Date(order.createdAt).toLocaleString('zh-CN')}</small>
                    </div>
                    <span class="order-status status-${order.status}">
                        ${getStatusText(order.status)}
                    </span>
                </div>

                <!-- 买家信息 -->
                <div style="background: #f8f9fa; padding: 12px; margin: 10px 0; border-radius: 5px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong style="color: #333;"><i class="fas fa-user-circle"></i> 购买人</strong><br>
                            <span style="font-size: 16px; color: #495057; font-weight: 600;">
                                ${order.buyerName || '加载中...'}
                            </span>
                            ${order.buyerEmail ? `<br><small style="color: #6c757d;"><i class="fas fa-envelope"></i> ${order.buyerEmail}</small>` : ''}
                        </div>
                        <div style="text-align: right;">
                            <small style="color: #6c757d;">购买数量</small><br>
                            <strong style="font-size: 20px; color: #495057;">${totalQty}</strong>
                        </div>
                    </div>
                </div>

                <!-- 商品明细 -->
                <div class="order-items" style="background: white; padding: 12px; border: 1px solid #e9ecef; border-radius: 5px;">
                    <strong style="color: #495057; margin-bottom: 8px; display: block;">
                        <i class="fas fa-shopping-basket"></i> 购买的我的商品
                    </strong>
                    ${myItems.map(item => {
                        const product = myProducts.find(p => p.id === item.productId);
                        const unit = product ? product.unit : '千克';
                        return `
                        <div class="order-item" style="padding: 8px; background: #f8f9fa; margin: 4px 0; border-radius: 3px;">
                            <span style="font-weight: 500;">
                                ${item.name}
                                <span style="color: #6c757d; font-size: 14px;">× ${item.qty} ${unit}</span>
                            </span>
                            <span style="font-weight: 600; color: #495057;">¥${(item.price * item.qty).toFixed(2)}</span>
                        </div>
                    `}).join('')}
                </div>

                <!-- 收入统计 -->
                <div style="margin-top: 12px; padding: 15px; background: ${isPaid ? 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)' : 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)'}; border-radius: 5px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <i class="fas fa-${isPaid ? 'check-circle' : 'clock'}"></i>
                            <strong style="color: ${isPaid ? '#155724' : '#856404'};">
                                ${isPaid ? '✅ 已到账' : '⏳ 待支付'}
                            </strong>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 14px; color: ${isPaid ? '#155724' : '#856404'}; margin-bottom: 4px;">
                                ${isPaid ? '本单收入' : '预计收入'}
                            </div>
                            <div style="font-size: 24px; font-weight: bold; color: ${isPaid ? '#28a745' : '#ffc107'};">
                                ¥${myEarnings.toFixed(2)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 获取订单状态文本
function getStatusText(status) {
    const statusMap = {
        'pending': '待支付',
        'paid': '已支付',
        'shipped': '已发货',
        'finished': '已完成',
        'cancelled': '已取消'
    };
    return statusMap[status] || status;
}

// 更新统计数据
function updateStats() {
    // 商品总数
    document.getElementById('totalProducts').textContent = myProducts.length;

    // 订单统计
    const paidOrders = myOrders.filter(o => ['paid', 'shipped', 'finished'].includes(o.status));
    const pendingOrders = myOrders.filter(o => o.status === 'pending');

    document.getElementById('totalOrders').textContent = myOrders.length;
    document.getElementById('paidOrdersCount').textContent = paidOrders.length;
    document.getElementById('pendingOrdersCount').textContent = pendingOrders.length;

    // 计算已到账收入（已支付订单）
    const paidEarnings = paidOrders.reduce((total, order) => {
        const myItems = order.items.filter(item =>
            myProducts.some(p => p.id === item.productId)
        );
        return total + myItems.reduce((sum, item) => sum + item.price * item.qty, 0);
    }, 0);

    // 计算待到账收入（待支付订单）
    const pendingEarnings = pendingOrders.reduce((total, order) => {
        const myItems = order.items.filter(item =>
            myProducts.some(p => p.id === item.productId)
        );
        return total + myItems.reduce((sum, item) => sum + item.price * item.qty, 0);
    }, 0);

    document.getElementById('paidEarnings').textContent = '¥' + paidEarnings.toFixed(2);
    document.getElementById('pendingEarnings').textContent = '¥' + pendingEarnings.toFixed(2);

    console.log('统计更新:', {
        商品总数: myProducts.length,
        订单总数: myOrders.length,
        已付款订单: paidOrders.length,
        待付款订单: pendingOrders.length,
        已到账: paidEarnings,
        待到账: pendingEarnings
    });
}

// 图片预览功能 - 添加商品
document.getElementById('productImage').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');

    if (file) {
        // 检查文件大小（5MB）
        if (file.size > 5 * 1024 * 1024) {
            alert('图片大小不能超过 5MB');
            e.target.value = '';
            preview.style.display = 'none';
            return;
        }

        // 检查文件类型
        if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
            alert('只支持 jpg, png, gif, webp 格式的图片');
            e.target.value = '';
            preview.style.display = 'none';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else {
        preview.style.display = 'none';
    }
});

// 上架新商品
document.getElementById('addProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // 使用 FormData 来支持文件上传
    const formData = new FormData();
    formData.append('name', document.getElementById('productName').value);
    formData.append('description', document.getElementById('productDescription').value);
    formData.append('price', document.getElementById('productPrice').value);
    formData.append('stock', document.getElementById('productStock').value);
    formData.append('unit', document.getElementById('productUnit').value);

    // 添加图片文件（如果有）
    const imageFile = document.getElementById('productImage').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }

    try {
        const response = await fetch('/api/products', {
            method: 'POST',
            headers: authHeaders(), // 只需要认证头，不需要 Content-Type（FormData 会自动设置）
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '上架失败');
        }

        alert('商品上架成功！');
        document.getElementById('addProductForm').reset();
        document.getElementById('imagePreview').style.display = 'none';
        await loadMyProducts();
        updateStats();

        // 切换到商品列表标签
        document.querySelector('[data-tab="products"]').click();
    } catch (error) {
        console.error('上架商品错误:', error);
        alert('上架失败: ' + error.message);
    }
});

// 图片预览功能 - 编辑商品
document.getElementById('editProductImage').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('editImagePreview');
    const previewImg = document.getElementById('editPreviewImg');

    if (file) {
        // 检查文件大小（5MB）
        if (file.size > 5 * 1024 * 1024) {
            alert('图片大小不能超过 5MB');
            e.target.value = '';
            preview.style.display = 'none';
            return;
        }

        // 检查文件类型
        if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
            alert('只支持 jpg, png, gif, webp 格式的图片');
            e.target.value = '';
            preview.style.display = 'none';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else {
        preview.style.display = 'none';
    }
});

// 编辑商品
async function editProduct(productId) {
    const product = myProducts.find(p => p.id === productId);
    if (!product) return;

    // 填充表单
    document.getElementById('editProductId').value = product.id;
    document.getElementById('editProductName').value = product.name;
    document.getElementById('editProductDescription').value = product.description;
    document.getElementById('editProductPrice').value = product.price;
    document.getElementById('editProductStock').value = product.stock;
    document.getElementById('editProductUnit').value = product.unit || '千克';

    // 清空文件输入和预览
    document.getElementById('editProductImage').value = '';
    document.getElementById('editImagePreview').style.display = 'none';

    // 显示模态框
    document.getElementById('editModal').style.display = 'block';
}

// 删除商品
async function deleteProduct(productId) {
    if (!confirm('确定要删除这个商品吗？')) return;

    try {
        const response = await fetch(`/api/products/${productId}`, {
            method: 'DELETE',
            headers: authHeaders()
        });

        if (!response.ok) {
            throw new Error('删除失败');
        }

        alert('商品已删除');
        await loadMyProducts();
        updateStats();
    } catch (error) {
        console.error('删除商品错误:', error);
        alert('删除失败: ' + error.message);
    }
}

// 保存编辑
document.getElementById('editProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const productId = document.getElementById('editProductId').value;

    // 使用 FormData 来支持文件上传
    const formData = new FormData();
    formData.append('name', document.getElementById('editProductName').value);
    formData.append('description', document.getElementById('editProductDescription').value);
    formData.append('price', document.getElementById('editProductPrice').value);
    formData.append('stock', document.getElementById('editProductStock').value);
    formData.append('unit', document.getElementById('editProductUnit').value);

    // 添加图片文件（如果有）
    const imageFile = document.getElementById('editProductImage').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }

    try {
        const response = await fetch(`/api/products/${productId}`, {
            method: 'PUT',
            headers: authHeaders(), // 只需要认证头，不需要 Content-Type（FormData 会自动设置）
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '更新失败');
        }

        alert('商品更新成功！');
        document.getElementById('editModal').style.display = 'none';
        await loadMyProducts();
        updateStats();
    } catch (error) {
        console.error('更新商品错误:', error);
        alert('更新失败: ' + error.message);
    }
});

// 标签页切换
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;

        // 更新按钮状态
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // 更新内容显示
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
    });
});

// 关闭编辑模态框
document.getElementById('closeEditModal').addEventListener('click', () => {
    document.getElementById('editModal').style.display = 'none';
});

// 点击模态框外部关闭
window.addEventListener('click', (e) => {
    const modal = document.getElementById('editModal');
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

// 退出登录
document.getElementById('logoutBtn').addEventListener('click', () => {
    if (confirm('确定要退出登录吗？')) {
        localStorage.removeItem('token');
        window.location.href = '/index.html';
    }
});

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});
