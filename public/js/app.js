// 全局变量
let currentUser = null;
let products = [];
let currentOrderId = null;
let cartItems = [];

// 工具：获取 Token 与通用鉴权头
function getToken() {
    return localStorage.getItem('token');
}

function authHeaders() {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

// DOM 元素 - 将在DOM加载后初始化
let loginBtn, registerBtn, authModal, closeModal, authTitle, loginForm, registerForm;
let authSwitch, switchText, switchLink, userName, userMenu, logoutBtn, adminBtn;
let productsGrid, logisticsModal, adminModal, closeLogisticsModal, closeAdminModal;
let cartBtn, cartCount, cartModal, closeCartModal, cartItemsElement, cartTotal, clearCartBtn, checkoutBtn;

// 初始化DOM元素
function initDOMElements() {
    loginBtn = document.getElementById('loginBtn');
    registerBtn = document.getElementById('registerBtn');
    authModal = document.getElementById('authModal');
    closeModal = document.querySelector('.close');
    authTitle = document.getElementById('authTitle');
    loginForm = document.getElementById('loginForm');
    registerForm = document.getElementById('registerForm');
    authSwitch = document.getElementById('authSwitch');
    switchText = document.getElementById('switchText');
    switchLink = document.getElementById('switchLink');
    userName = document.getElementById('userName');
    userMenu = document.getElementById('userMenu');
    logoutBtn = document.getElementById('logoutBtn');
    adminBtn = document.getElementById('adminBtn');
    productsGrid = document.getElementById('productsGrid');
    logisticsModal = document.getElementById('logisticsModal');
    adminModal = document.getElementById('adminModal');
    closeLogisticsModal = document.getElementById('closeLogisticsModal');
    closeAdminModal = document.getElementById('closeAdminModal');
    
    // 购物车相关DOM元素
    cartBtn = document.getElementById('cartBtn');
    cartCount = document.getElementById('cartCount');
    cartModal = document.getElementById('cartModal');
    closeCartModal = document.getElementById('closeCartModal');
    cartItemsElement = document.getElementById('cartItems');
    cartTotal = document.getElementById('cartTotal');
    clearCartBtn = document.getElementById('clearCartBtn');
    checkoutBtn = document.getElementById('checkoutBtn');
    
    console.log('DOM元素初始化完成');
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initDOMElements();
    loadProducts();
    setupEventListeners();
    checkAuthStatus();
});

// 设置事件监听器
function setupEventListeners() {
    console.log('开始设置事件监听器');
    
    // 检查关键DOM元素是否存在
    if (!loginBtn) {
        console.error('登录按钮未找到');
        return;
    }
    if (!registerBtn) {
        console.error('注册按钮未找到');
        return;
    }
    if (!authModal) {
        console.error('认证模态框未找到');
        return;
    }
    
    // 登录/注册按钮
    loginBtn.addEventListener('click', () => {
        console.log('登录按钮被点击');
        showAuthModal('login');
    });
    registerBtn.addEventListener('click', () => {
        console.log('注册按钮被点击');
        showAuthModal('register');
    });
    
    // 模态框关闭
    if (closeModal) {
        closeModal.addEventListener('click', hideAuthModal);
    }
    window.addEventListener('click', (e) => {
        if (e.target === authModal) {
            hideAuthModal();
        }
    });
    
    // 购物车相关事件
    if (cartBtn) {
        cartBtn.addEventListener('click', showCartModal);
    }
    if (closeCartModal) {
        closeCartModal.addEventListener('click', hideCartModal);
    }
    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', clearCart);
    }
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', checkout);
    }
    
    // 购物车模态框关闭
    window.addEventListener('click', (e) => {
        if (e.target === cartModal) {
            hideCartModal();
        }
    });
    
    // 表单提交
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // 切换登录/注册
    if (switchLink) {
        switchLink.addEventListener('click', (e) => {
            e.preventDefault();
            toggleAuthForm();
        });
    }
    
    // 退出登录
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // 管理员按钮
    if (adminBtn) {
        adminBtn.addEventListener('click', showAdminModal);
    }
    
    // 物流模态框关闭
    if (closeLogisticsModal) {
        closeLogisticsModal.addEventListener('click', hideLogisticsModal);
    }
    if (closeAdminModal) {
        closeAdminModal.addEventListener('click', hideAdminModal);
    }
    
    // 模态框刷新按钮
    const modalRefreshBtn = document.getElementById('modalRefreshBtn');
    if (modalRefreshBtn) {
        modalRefreshBtn.addEventListener('click', refreshModalLogistics);
    }
    
    // 点击模态框外部关闭
    window.addEventListener('click', (e) => {
        if (logisticsModal && e.target === logisticsModal) hideLogisticsModal();
        if (adminModal && e.target === adminModal) hideAdminModal();
    });
    
    console.log('事件监听器设置完成');
}

// 显示认证模态框
function showAuthModal(type) {
    authModal.style.display = 'block';
    if (type === 'login') {
        showLoginForm();
    } else {
        showRegisterForm();
    }
}

// 隐藏认证模态框
function hideAuthModal() {
    authModal.style.display = 'none';
    loginForm.reset();
    registerForm.reset();
}

// 显示登录表单
function showLoginForm() {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    authTitle.textContent = '登录';
    switchText.textContent = '还没有账号？';
    switchLink.textContent = '立即注册';
}

// 显示注册表单
function showRegisterForm() {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    authTitle.textContent = '注册';
    switchText.textContent = '已有账号？';
    switchLink.textContent = '立即登录';
}

// 切换登录/注册表单
function toggleAuthForm() {
    if (loginForm.style.display === 'none') {
        showLoginForm();
    } else {
        showRegisterForm();
    }
}

// 处理登录
async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(loginForm);
    const data = {
        username: formData.get('username'),
        password: formData.get('password')
    };
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            currentUser = result.user;
            localStorage.setItem('token', result.token);
            localStorage.setItem('user', JSON.stringify(result.user));

            // 根据角色跳转到不同页面
            if (result.user.role === 'admin') {
                window.location.href = '/admin-dashboard.html';
            } else if (result.user.role === 'farmer') {
                window.location.href = '/farmer-dashboard.html';
            } else {
                updateAuthUI();
                hideAuthModal();
                showMessage('登录成功！', 'success');
                loadCartItems(); // 加载购物车
            }
        } else {
            showMessage(result.error || '登录失败', 'error');
        }
    } catch (error) {
        console.error('登录错误:', error);
        showMessage('网络错误，请重试', 'error');
    }
}

// 处理注册
async function handleRegister(e) {
    e.preventDefault();
    
    const formData = new FormData(registerForm);
    const data = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password'),
        role: formData.get('role')
    };
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage('注册成功！请登录', 'success');
            showLoginForm();
        } else {
            showMessage(result.error || '注册失败', 'error');
        }
    } catch (error) {
        console.error('注册错误:', error);
        showMessage('网络错误，请重试', 'error');
    }
}

// 处理退出登录
function handleLogout() {
    currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateAuthUI();
    showMessage('已退出登录', 'info');
}

// 检查认证状态
function checkAuthStatus() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
        try {
            currentUser = JSON.parse(user);

            // 如果是农民且在首页，跳转到农民后台
            if ((currentUser.role === 'farmer' || currentUser.role === 'admin') &&
                window.location.pathname === '/index.html') {
                window.location.href = '/farmer-dashboard.html';
                return;
            }

            updateAuthUI();
            loadCartItems(); // 加载购物车
        } catch (error) {
            console.error('解析用户信息失败:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    }
}

// 更新认证UI
function updateAuthUI() {
    if (currentUser) {
        loginBtn.style.display = 'none';
        registerBtn.style.display = 'none';
        userMenu.style.display = 'flex';
        userName.textContent = currentUser.username;
        cartBtn.style.display = 'flex'; // 显示购物车按钮
        const myOrdersLink = document.getElementById('myOrdersLink');
        if (myOrdersLink) myOrdersLink.style.display = 'inline-block';
        const myReturnsLink = document.getElementById('myReturnsLink');
        if (myReturnsLink) myReturnsLink.style.display = 'inline-block';

        // 显示管理员按钮
        if (currentUser.role === 'admin') {
            adminBtn.style.display = 'inline-block';
        } else {
            adminBtn.style.display = 'none';
        }
    } else {
        loginBtn.style.display = 'inline-block';
        registerBtn.style.display = 'inline-block';
        userMenu.style.display = 'none';
        cartBtn.style.display = 'none'; // 隐藏购物车按钮
        const myOrdersLink = document.getElementById('myOrdersLink');
        if (myOrdersLink) myOrdersLink.style.display = 'none';
        const myReturnsLink = document.getElementById('myReturnsLink');
        if (myReturnsLink) myReturnsLink.style.display = 'none';
    }
}

// 加载产品
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        const result = await response.json();
        
        if (response.ok) {
            products = result.products || [];
            renderProducts();
        } else {
            console.error('加载产品失败:', result.error);
            showMessage('加载产品失败', 'error');
        }
    } catch (error) {
        console.error('加载产品错误:', error);
        showMessage('网络错误，请重试', 'error');
    }
}

// 渲染产品
function renderProducts() {
    if (products.length === 0) {
        productsGrid.innerHTML = '<p style="text-align: center; color: #666; grid-column: 1 / -1;">暂无产品</p>';
        return;
    }

    productsGrid.innerHTML = products.map(product => `
        <div class="product-card">
            <div class="product-image" style="background: #f5f5f5; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                ${product.image ?
                    `<img src="${product.image}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                     <i class="fas fa-image" style="display: none; font-size: 48px; color: #ccc;"></i>` :
                    `<i class="fas fa-carrot" style="font-size: 48px; color: #4CAF50;"></i>`
                }
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <div class="product-price">¥${parseFloat(product.price || 0).toFixed(2)} / ${product.unit || '千克'}</div>
                <div class="product-stock">库存: ${product.stock} ${product.unit || '千克'}</div>
                <button class="add-to-cart" onclick="addToCart('${product.id}')">
                    <i class="fas fa-shopping-cart"></i>
                    加入购物车
                </button>
                <button class="add-to-cart" style="margin-top:8px;background:#27ae60" onclick="buyNow('${product.id}')">
                    <i class="fas fa-bolt"></i>
                    立即购买
                </button>
            </div>
        </div>
    `).join('');
}

// 添加到购物车
async function addToCart(productId) {
    if (!currentUser) {
        showMessage('请先登录', 'warning');
        showAuthModal('login');
        return;
    }
    
    const product = products.find(p => p.id === productId);
    if (!product) {
        showMessage('商品不存在', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/cart/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                productId: productId,
                quantity: 1
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage(`已将 ${product.name} 添加到购物车`, 'success');
            loadCartItems();
        } else {
            showMessage(data.msg || '添加失败', 'error');
        }
    } catch (error) {
        showMessage('网络错误，请重试', 'error');
    }
}

// 立即购买：创建订单 → 支付 → 跳转物流页
async function buyNow(productId) {
    try {
        console.log('[buyNow] 开始购买流程, productId:', productId);
        console.log('[buyNow] 当前products数组:', products.map(p => ({ id: p.id, name: p.name })));

        if (!currentUser) {
            showMessage('请先登录', 'warning');
            showAuthModal('login');
            return;
        }
        const product = products.find(p => p.id === productId);
        console.log('[buyNow] 查找商品结果:', product);

        if (!product) {
            console.error('[buyNow] 商品不存在! productId:', productId, '类型:', typeof productId);
            showMessage('商品不存在或已下架', 'error');
            return;
        }

        // 1) 创建订单（默认数量 1）
        const createRes = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ items: [{ productId, qty: 1 }] })
        });
        const createText = await createRes.text();
        let createData = null; try { createData = createText ? JSON.parse(createText) : null; } catch {}
        if (!createRes.ok) {
            const msg = (createData && (createData.error || createData.msg)) || `下单失败(${createRes.status})`;
            showMessage(msg, 'error');
            console.warn('下单失败响应:', createRes.status, createText);
            return;
        }
        const order = createData.order;

        // 2) 支付
        const payRes = await fetch(`/api/payments/${order.id}/pay`, {
            method: 'POST',
            headers: { ...authHeaders() }
        });
        const payText = await payRes.text();
        let payData = null; try { payData = payText ? JSON.parse(payText) : null; } catch {}
        if (!payRes.ok) {
            const msg = (payData && (payData.error || payData.msg)) || `支付失败(${payRes.status})`;
            showMessage(msg, 'error');
            console.warn('支付失败响应:', payRes.status, payText);
            return;
        }

        showMessage('支付成功，正在跳转物流', 'success');
        window.location.href = `/shipments.html?orderId=${order.id}`;
    } catch (e) {
        console.error('购买流程异常:', e);
        showMessage('网络错误，请重试', 'error');
    }
}

// 滚动到产品区域
function scrollToProducts() {
    document.getElementById('products').scrollIntoView({
        behavior: 'smooth'
    });
}

// 购物车相关函数
async function loadCartItems() {
    if (!currentUser) return;
    
    try {
        const response = await fetch('/api/cart', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            cartItems = data.items;
            updateCartUI();
        }
    } catch (error) {
        console.error('加载购物车失败:', error);
    }
}

function updateCartUI() {
    // 更新购物车数量
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    // 显示/隐藏购物车按钮
    if (currentUser && totalItems > 0) {
        cartBtn.style.display = 'flex';
    } else if (currentUser) {
        cartBtn.style.display = 'flex';
    } else {
        cartBtn.style.display = 'none';
    }
    
    // 更新购物车内容
    renderCartItems();
}

function renderCartItems() {
    if (cartItems.length === 0) {
        cartItemsElement.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-shopping-cart"></i>
                <p>购物车是空的</p>
            </div>
        `;
        cartTotal.textContent = '0.00';
        return;
    }
    
    cartItemsElement.innerHTML = cartItems.map(item => `
        <div class="cart-item">
            <div class="cart-item-image">
                <i class="fas fa-carrot"></i>
            </div>
            <div class="cart-item-info">
                <div class="cart-item-name">${item.product.name}</div>
                <div class="cart-item-price">¥${item.product.price}</div>
            </div>
            <div class="cart-item-controls">
                <div class="quantity-control">
                    <button class="quantity-btn" onclick="updateQuantity('${item.productId}', ${item.quantity - 1})">-</button>
                    <input type="number" class="quantity-input" value="${item.quantity}" 
                           onchange="updateQuantity('${item.productId}', this.value)" min="1">
                    <button class="quantity-btn" onclick="updateQuantity('${item.productId}', ${item.quantity + 1})">+</button>
                </div>
                <button class="remove-item" onclick="removeFromCart('${item.productId}')">删除</button>
            </div>
        </div>
    `).join('');
    
    // 计算总价
    const total = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    cartTotal.textContent = total.toFixed(2);
}

async function updateQuantity(productId, newQuantity) {
    if (newQuantity < 1) return;
    
    try {
        const response = await fetch('/api/cart/update', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                productId: productId,
                quantity: parseInt(newQuantity)
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            loadCartItems();
        } else {
            showMessage(data.msg || '更新失败', 'error');
        }
    } catch (error) {
        showMessage('网络错误，请重试', 'error');
    }
}

async function removeFromCart(productId) {
    try {
        const response = await fetch(`/api/cart/remove/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('商品已从购物车中移除', 'success');
            loadCartItems();
        } else {
            showMessage(data.msg || '删除失败', 'error');
        }
    } catch (error) {
        showMessage('网络错误，请重试', 'error');
    }
}

async function clearCart() {
    if (!confirm('确定要清空购物车吗？')) return;
    
    try {
        const response = await fetch('/api/cart/clear', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('购物车已清空', 'success');
            loadCartItems();
        } else {
            showMessage(data.msg || '清空失败', 'error');
        }
    } catch (error) {
        showMessage('网络错误，请重试', 'error');
    }
}

async function checkout() {
    if (cartItems.length === 0) {
        showMessage('购物车是空的', 'warning');
        return;
    }
    
    if (!confirm('确定要结算购物车吗？')) return;
    
    try {
        const response = await fetch('/api/cart/checkout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('订单创建成功！', 'success');
            hideCartModal();
            loadCartItems();
            
            // 跳转到订单页面
            if (data.order) {
                currentOrderId = data.order.id;
                window.location.href = `/orders.html`;
            }
        } else {
            showMessage(data.msg || '结算失败', 'error');
        }
    } catch (error) {
        showMessage('网络错误，请重试', 'error');
    }
}

function showCartModal() {
    cartModal.style.display = 'block';
    loadCartItems();
}

function hideCartModal() {
    cartModal.style.display = 'none';
}

// 显示消息
function showMessage(message, type = 'info') {
    // 创建消息元素
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${type}`;
    messageEl.textContent = message;
    
    // 设置样式
    messageEl.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 1rem 2rem;
        border-radius: 5px;
        color: white;
        font-weight: 500;
        z-index: 3000;
        animation: slideIn 0.3s ease-out;
        max-width: 300px;
    `;
    
    // 根据类型设置背景色
    const colors = {
        success: '#27ae60',
        error: '#e74c3c',
        warning: '#f39c12',
        info: '#3498db'
    };
    messageEl.style.backgroundColor = colors[type] || colors.info;
    
    // 添加到页面
    document.body.appendChild(messageEl);
    
    // 3秒后自动移除
    setTimeout(() => {
        messageEl.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 300);
    }, 3000);
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ==================== 物流功能 ====================

// 全局变量
let currentLogisticsOrderId = null;
let modalRefreshInterval = null;
let isModalRefreshing = false;

// 格式化时间
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 获取状态图标
function getStatusIcon(status) {
    const icons = {
        '已发货': 'fas fa-shipping-fast',
        '运输中': 'fas fa-truck',
        '派送中': 'fas fa-motorcycle',
        '已签收': 'fas fa-check-circle',
        '已到达': 'fas fa-map-marker-alt',
        '已发出': 'fas fa-paper-plane',
        '处理中': 'fas fa-cog',
        '待发货': 'fas fa-clock'
    };
    return icons[status] || 'fas fa-info-circle';
}

// 获取状态颜色类
function getStatusClass(status) {
    const classes = {
        '已发货': 'status-shipped',
        '运输中': 'status-shipped',
        '派送中': 'status-shipped',
        '已签收': 'status-delivered',
        '已到达': 'status-delivered',
        '已发出': 'status-shipped',
        '处理中': 'status-pending',
        '待发货': 'status-pending'
    };
    return classes[status] || 'status-pending';
}

// 显示物流信息
async function showLogistics(orderId) {
    currentLogisticsOrderId = orderId;
    logisticsModal.style.display = 'block';
    
    // 更新订单号显示
    document.getElementById('modalOrderId').textContent = orderId;
    
    // 开始加载物流信息
    await refreshModalLogistics();
    
    // 开始自动刷新
    startModalAutoRefresh();
}

// 刷新模态框物流信息
async function refreshModalLogistics() {
    if (isModalRefreshing || !currentLogisticsOrderId) return;
    
    isModalRefreshing = true;
    
    // 更新按钮状态
    const refreshBtn = document.getElementById('modalRefreshBtn');
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 刷新中...';
    
    showModalLoading();
    
    try {
        // 并行加载订单和物流信息
        const [orderResponse, shipmentResponse] = await Promise.all([
            fetch(`/api/orders/${currentLogisticsOrderId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            }),
            fetch(`/api/shipments/${currentLogisticsOrderId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
        ]);
        
        if (!orderResponse.ok || !shipmentResponse.ok) {
            throw new Error('获取数据失败');
        }
        
        const orderData = await orderResponse.json();
        const shipmentData = await shipmentResponse.json();
        
        const order = orderData.order;
        const shipment = shipmentData.shipment;
        
        // 更新订单信息
        updateModalOrderStatus(order);
        
        // 更新运单号
        document.getElementById('trackingNumber').textContent = shipment?.trackingNo || '-';
        
        // 渲染物流信息
        renderModalLogistics(shipment);
        
        // 更新最后更新时间
        updateModalLastUpdateTime();
        
    } catch (error) {
        console.error('刷新物流信息失败:', error);
        showMessage('获取物流信息失败', 'error');
        
        // 显示空状态
        document.getElementById('modalEmptyState').style.display = 'block';
        document.getElementById('modalLogisticsTimeline').style.display = 'none';
    } finally {
        isModalRefreshing = false;
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 刷新物流信息';
        hideModalLoading();
    }
}

// 显示模态框加载状态
function showModalLoading() {
    document.getElementById('modalLoadingState').style.display = 'block';
    document.getElementById('modalLogisticsTimeline').style.display = 'none';
    document.getElementById('modalEmptyState').style.display = 'none';
}

// 隐藏模态框加载状态
function hideModalLoading() {
    document.getElementById('modalLoadingState').style.display = 'none';
    document.getElementById('modalLogisticsTimeline').style.display = 'block';
}

// 更新模态框订单状态
function updateModalOrderStatus(order) {
    const statusElement = document.getElementById('modalOrderStatus');
    const statusClass = getStatusClass(order.status);
    
    statusElement.textContent = order.status;
    statusElement.className = `order-status ${statusClass}`;
}

// 更新模态框最后更新时间
function updateModalLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('modalLastUpdate').textContent = `最后更新：${timeString}`;
}

// 渲染模态框物流信息
function renderModalLogistics(shipment) {
    const timeline = document.getElementById('modalLogisticsTimeline');
    const emptyState = document.getElementById('modalEmptyState');
    
    hideModalLoading();
    
    if (!shipment || !shipment.traces || shipment.traces.length === 0) {
        timeline.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    // 按时间排序（最新的在前）
    const traces = shipment.traces.sort((a, b) => new Date(b.ts || b.time || b.date) - new Date(a.ts || a.time || a.date));
    
    timeline.innerHTML = traces.map((trace, index) => {
        const isLatest = index === 0;
        const isCompleted = index > 0;
        const status = trace.status || '未知状态';
        const location = trace.location || trace.text || '位置信息未知';
        const timestamp = trace.ts || trace.time || trace.date || Date.now();
        const icon = getStatusIcon(status);
        
        return `
            <div class="timeline-item ${isLatest ? 'current' : isCompleted ? 'completed' : ''}">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                    <div class="timeline-status">
                        <i class="${icon}"></i>
                        ${status}
                    </div>
                    <div class="timeline-location">
                        <i class="fas fa-map-marker-alt"></i>
                        ${location}
                    </div>
                    <div class="timeline-time">
                        <i class="fas fa-clock"></i>
                        ${formatTime(timestamp)}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 模态框自动刷新功能
function startModalAutoRefresh() {
    // 每30秒自动刷新一次
    modalRefreshInterval = setInterval(() => {
        if (currentLogisticsOrderId && !isModalRefreshing) {
            refreshModalLogistics();
        }
    }, 30000);
}

// 停止模态框自动刷新
function stopModalAutoRefresh() {
    if (modalRefreshInterval) {
        clearInterval(modalRefreshInterval);
        modalRefreshInterval = null;
    }
}

// 隐藏物流模态框
function hideLogisticsModal() {
    logisticsModal.style.display = 'none';
    currentLogisticsOrderId = null;
    stopModalAutoRefresh();
}

// 显示管理员模态框
async function showAdminModal() {
    try {
        const response = await fetch('/api/orders', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            const paidOrders = result.orders.filter(order => order.status === 'paid');
            displayPendingOrders(paidOrders);
            adminModal.style.display = 'block';
        } else {
            showMessage('获取订单信息失败', 'error');
        }
    } catch (error) {
        console.error('获取订单信息错误:', error);
        showMessage('网络错误，请重试', 'error');
    }
}

// 显示待发货订单
function displayPendingOrders(orders) {
    const container = document.getElementById('pendingOrders');
    if (orders.length === 0) {
        container.innerHTML = '<p>暂无待发货订单</p>';
        return;
    }
    
    container.innerHTML = orders.map(order => `
        <div class="order-item">
            <div class="order-info">
                <p><strong>订单号：</strong>${order.id}</p>
                <p><strong>金额：</strong>¥${order.totalAmount}</p>
                <p><strong>商品：</strong>${order.items.map(item => `${item.name} x${item.qty}`).join(', ')}</p>
            </div>
            <div class="order-actions">
                <button onclick="shipOrder('${order.id}')" class="btn btn-primary btn-small">发货</button>
                <button onclick="manageLogistics('${order.id}')" class="btn btn-outline btn-small">物流管理</button>
            </div>
        </div>
    `).join('');
}

// 发货
async function shipOrder(orderId) {
    try {
        const response = await fetch(`/api/shipments/${orderId}/ship`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            showMessage('发货成功！', 'success');
            showAdminModal(); // 刷新订单列表
        } else {
            const error = await response.json();
            showMessage(error.msg || '发货失败', 'error');
        }
    } catch (error) {
        console.error('发货错误:', error);
        showMessage('网络错误，请重试', 'error');
    }
}

// 管理物流
function manageLogistics(orderId) {
    currentOrderId = orderId;
    document.getElementById('orderList').style.display = 'none';
    document.getElementById('logisticsManagement').style.display = 'block';
}

// 添加物流轨迹
async function addLogisticsTrace() {
    const status = document.getElementById('logisticsStatus').value;
    const location = document.getElementById('logisticsLocation').value;
    
    if (!location.trim()) {
        showMessage('请输入位置信息', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`/api/shipments/${currentOrderId}/push`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ status, location })
        });
        
        if (response.ok) {
            showMessage('轨迹添加成功！', 'success');
            document.getElementById('logisticsLocation').value = '';
            showAdminModal(); // 返回订单列表
        } else {
            const error = await response.json();
            showMessage(error.msg || '添加轨迹失败', 'error');
        }
    } catch (error) {
        console.error('添加轨迹错误:', error);
        showMessage('网络错误，请重试', 'error');
    }
}

// 隐藏管理员模态框
function hideAdminModal() {
    adminModal.style.display = 'none';
    document.getElementById('orderList').style.display = 'block';
    document.getElementById('logisticsManagement').style.display = 'none';
}
