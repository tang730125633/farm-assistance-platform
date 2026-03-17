// 全局变量
let currentOrderId = null;
let refreshInterval = null;
let isRefreshing = false;

// 工具函数
function getQuery(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function authHeaders() {
  const t = localStorage.getItem('token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// 格式化时间
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  // 小于1分钟
  if (diff < 60000) {
    return '刚刚';
  }
  
  // 小于1小时
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`;
  }
  
  // 小于1天
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`;
  }
  
  // 超过1天
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

// 加载订单信息
async function loadOrder(orderId) {
  try {
    const response = await fetch(`/api/orders/${orderId}`, { 
      headers: { ...authHeaders() }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.msg || `获取订单失败(${response.status})`);
    }
    
    const data = await response.json();
    return data.order;
  } catch (error) {
    console.error('加载订单失败:', error);
    throw error;
  }
}

// 加载物流信息
async function loadShipment(orderId) {
  try {
    const response = await fetch(`/api/shipments/${orderId}`, { 
      headers: { ...authHeaders() }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.msg || `获取物流失败(${response.status})`);
    }
    
    const data = await response.json();
    return data.shipment; // 可能为 null
  } catch (error) {
    console.error('加载物流失败:', error);
    throw error;
  }
}

// 显示加载状态
function showLoading() {
  document.getElementById('loadingState').style.display = 'block';
  document.getElementById('logisticsTimeline').style.display = 'none';
  document.getElementById('emptyState').style.display = 'none';
}

// 隐藏加载状态
function hideLoading() {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('logisticsTimeline').style.display = 'block';
}

// 更新最后更新时间
function updateLastUpdateTime() {
  const now = new Date();
  const timeString = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  document.getElementById('lastUpdate').textContent = `最后更新：${timeString}`;
}

// 渲染物流信息
function renderShipment(shipment) {
  const timeline = document.getElementById('logisticsTimeline');
  const emptyState = document.getElementById('emptyState');
  
  // 隐藏加载状态
  hideLoading();
  
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

// 更新订单状态显示
function updateOrderStatus(order) {
  const statusElement = document.getElementById('orderStatus');
  const statusClass = getStatusClass(order.status);
  
  statusElement.textContent = order.status;
  statusElement.className = `order-status ${statusClass}`;
  
  // 更新订单时间
  const orderTime = document.getElementById('orderTime');
  orderTime.textContent = formatTime(order.createdAt || order.created_at || Date.now());
}

// 刷新物流信息
async function refresh() {
  if (isRefreshing) return;
  
  const orderId = getQuery('orderId');
  if (!orderId) {
    toast('缺少订单号', 'error');
    return;
  }
  
  currentOrderId = orderId;
  isRefreshing = true;
  
  // 更新按钮状态
  const refreshBtn = document.getElementById('refreshBtn');
  refreshBtn.disabled = true;
  refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 刷新中...';
  
  showLoading();
  
  try {
    // 并行加载订单和物流信息
    const [order, shipment] = await Promise.all([
      loadOrder(orderId),
      loadShipment(orderId)
    ]);
    
    // 更新订单信息
    document.getElementById('orderId').textContent = orderId;
    updateOrderStatus(order);
    
    // 渲染物流信息
    renderShipment(shipment);
    
    // 更新最后更新时间
    updateLastUpdateTime();
    
    toast('物流信息已更新', 'success');
    
  } catch (error) {
    console.error('刷新失败:', error);
    toast(error.message || '加载失败，请重试', 'error');
    
    // 显示空状态
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('logisticsTimeline').style.display = 'none';
  } finally {
    isRefreshing = false;
    refreshBtn.disabled = false;
    refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 刷新物流信息';
    hideLoading();
  }
}

// 自动刷新功能
function startAutoRefresh() {
  // 每30秒自动刷新一次
  refreshInterval = setInterval(() => {
    if (currentOrderId && !isRefreshing) {
      refresh();
    }
  }, 30000);
}

// 停止自动刷新
function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

// 页面可见性变化处理
function handleVisibilityChange() {
  if (document.hidden) {
    stopAutoRefresh();
  } else {
    startAutoRefresh();
  }
}

// 页面加载完成
document.addEventListener('DOMContentLoaded', () => {
  // 绑定刷新按钮事件
  document.getElementById('refreshBtn').addEventListener('click', refresh);
  
  // 绑定页面可见性变化事件
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // 初始加载
  refresh();
  
  // 开始自动刷新
  startAutoRefresh();
});

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
  stopAutoRefresh();
});

