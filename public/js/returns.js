// 退货管理功能
let currentUser = null;
let userRole = null;
let currentTab = 'my';

// 工具函数
function authHeaders() {
  const t = localStorage.getItem('token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function showToast(msg, type = 'ok') {
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = `position:fixed;top:100px;right:20px;background:${type === 'error' ? '#e74c3c' : '#27ae60'};color:#fff;padding:12px 20px;border-radius:6px;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.15)`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

function fmt(ts) {
  if (!ts) return '-';
  try { return new Date(ts).toLocaleString('zh-CN'); } catch { return ts; }
}

function statusText(st) {
  return { pending: '待审核', approved: '已同意', rejected: '已拒绝' }[st] || st;
}

function statusClass(st) {
  return { pending: 'st-pending', approved: 'st-approved', rejected: 'st-rejected' }[st] || 'st-pending';
}

// 获取当前用户信息
async function getCurrentUser() {
  try {
    const res = await fetch('/api/auth/me', { headers: authHeaders() });
    if (res.ok) {
      const data = await res.json();
      currentUser = data.user;
      userRole = data.user.role;
      return data.user;
    }
  } catch (e) {}
  return null;
}

// 加载退货列表
async function loadReturns() {
  const user = await getCurrentUser();
  if (!user) {
    showToast('请先登录', 'error');
    setTimeout(() => window.location.href = '/', 1500);
    return;
  }

  // 根据角色显示不同标签
  const pendingTab = document.getElementById('pendingTab');
  const allTab = document.getElementById('allTab');

  if (user.role === 'admin') {
    pendingTab.style.display = 'block';
    allTab.style.display = 'block';
  } else if (user.role === 'farmer') {
    pendingTab.style.display = 'block';
  }

  // 加载对应标签内容
  if (currentTab === 'my') {
    await loadMyReturns();
  } else if (currentTab === 'pending') {
    await loadPendingReturns();
  } else if (currentTab === 'all') {
    await loadAllReturns();
  }
}

// 加载我的退货申请
async function loadMyReturns() {
  const container = document.getElementById('myReturnsList');
  try {
    const res = await fetch('/api/returns', { headers: authHeaders() });
    const data = await res.json();

    if (!res.ok) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>加载失败</p></div>`;
      return;
    }

    const returns = data.returns || [];
    if (returns.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-inbox"></i>
          <p>暂无退货申请</p>
          <p style="font-size:14px;color:#999;margin-top:8px">在订单页面可以申请退货</p>
        </div>`;
      return;
    }

    container.innerHTML = returns.map(r => `
      <div class="return-card">
        <div class="return-hd">
          <div class="return-id">退货单号：${r.id}</div>
          <div class="return-status ${statusClass(r.status)}">${statusText(r.status)}</div>
        </div>
        <div class="return-body">
          <div><strong>关联订单：</strong>${r.orderId}</div>
          <div><strong>退款金额：</strong>¥${r.refundAmount}</div>
          <div><strong>申请时间：</strong>${fmt(r.createdAt)}</div>
          ${r.orderInfo ? `
            <div class="product-list">
              <strong>订单商品：</strong>
              ${r.orderInfo.items.map(it => `
                <div class="product-item">
                  ${it.productImage ? `<img src="${it.productImage}" class="product-img" onerror="this.style.display='none'">` : ''}
                  <span>${it.name} x${it.qty}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
          <div class="reason-text">
            <strong>退货原因：</strong>${r.reason}
          </div>
          ${r.images && r.images.length > 0 ? `
            <div style="margin-top:10px">
              <strong>凭证图片：</strong>
              <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">
                ${r.images.map(img => `<img src="${img}" class="preview-img" onclick="window.open('${img}')">`).join('')}
              </div>
            </div>
          ` : ''}
          ${r.adminComment ? `<div class="admin-comment"><strong>处理意见：</strong>${r.adminComment}</div>` : ''}
        </div>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>加载失败</p></div>`;
  }
}

// 加载待审核退货（农户/管理员）
async function loadPendingReturns() {
  const container = document.getElementById('pendingReturnsList');
  try {
    const res = await fetch('/api/returns?status=pending', { headers: authHeaders() });
    const data = await res.json();

    if (!res.ok) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>加载失败</p></div>`;
      return;
    }

    const returns = data.returns || [];
    if (returns.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-check-circle"></i>
          <p>暂无待审核退货申请</p>
        </div>`;
      return;
    }

    container.innerHTML = returns.map(r => `
      <div class="return-card">
        <div class="return-hd">
          <div class="return-id">退货单号：${r.id}</div>
          <div class="return-status st-pending">待审核</div>
        </div>
        <div class="return-body">
          <div><strong>关联订单：</strong>${r.orderId}</div>
          <div><strong>退款金额：</strong>¥${r.refundAmount}</div>
          <div><strong>申请人：</strong>${r.userInfo ? r.userInfo.username : '-'}</div>
          <div><strong>申请时间：</strong>${fmt(r.createdAt)}</div>
          ${r.orderInfo ? `
            <div class="product-list">
              <strong>订单商品：</strong>
              ${r.orderInfo.items.map(it => `
                <div class="product-item">
                  ${it.productImage ? `<img src="${it.productImage}" class="product-img" onerror="this.style.display='none'">` : ''}
                  <span>${it.name} x${it.qty}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
          <div class="reason-text">
            <strong>退货原因：</strong>${r.reason}
          </div>
          ${r.images && r.images.length > 0 ? `
            <div style="margin-top:10px">
              <strong>凭证图片：</strong>
              <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">
                ${r.images.map(img => `<img src="${img}" class="preview-img" onclick="window.open('${img}')">`).join('')}
              </div>
            </div>
          ` : ''}
        </div>
        <div class="return-ops">
          <button class="btn btn-primary btn-small" onclick="openProcessModal('${r.id}')">
            <i class="fas fa-gavel"></i> 处理申请
          </button>
        </div>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>加载失败</p></div>`;
  }
}

// 加载所有退货（管理员）
async function loadAllReturns() {
  const container = document.getElementById('allReturnsList');
  try {
    const res = await fetch('/api/returns', { headers: authHeaders() });
    const data = await res.json();

    if (!res.ok) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>加载失败</p></div>`;
      return;
    }

    const returns = data.returns || [];
    if (returns.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-inbox"></i>
          <p>暂无退货记录</p>
        </div>`;
      return;
    }

    container.innerHTML = returns.map(r => `
      <div class="return-card">
        <div class="return-hd">
          <div class="return-id">退货单号：${r.id}</div>
          <div class="return-status ${statusClass(r.status)}">${statusText(r.status)}</div>
        </div>
        <div class="return-body">
          <div><strong>关联订单：</strong>${r.orderId}</div>
          <div><strong>退款金额：</strong>¥${r.refundAmount}</div>
          <div><strong>申请人：</strong>${r.userInfo ? r.userInfo.username : '-'}</div>
          <div><strong>申请时间：</strong>${fmt(r.createdAt)}</div>
          ${r.orderInfo ? `
            <div class="product-list">
              <strong>订单商品：</strong>
              ${r.orderInfo.items.map(it => `
                <div class="product-item">
                  ${it.productImage ? `<img src="${it.productImage}" class="product-img" onerror="this.style.display='none'">` : ''}
                  <span>${it.name} x${it.qty}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
          <div class="reason-text">
            <strong>退货原因：</strong>${r.reason}
          </div>
          ${r.adminComment ? `<div class="admin-comment"><strong>处理意见：</strong>${r.adminComment}</div>` : ''}
        </div>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>加载失败</p></div>`;
  }
}

// 标签切换
document.getElementById('tabNav').addEventListener('click', (e) => {
  if (e.target.tagName === 'BUTTON') {
    document.querySelectorAll('.tab-nav button').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');

    currentTab = e.target.dataset.tab;
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.getElementById(currentTab + 'Returns').style.display = 'block';

    loadReturns();
  }
});

// 从订单页申请退货（通过URL参数）
function initApplyFromOrder() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('applyFor');
  if (orderId) {
    openApplyModal(orderId);
  }
}

// ===== 申请退货弹窗功能 =====
let selectedImages = [];

async function openApplyModal(orderId) {
  selectedImages = [];
  document.getElementById('imagePreview').innerHTML = '';

  // 如果没有传入 orderId，显示订单选择器
  if (!orderId) {
    try {
      const res = await fetch('/api/orders?me=1', { headers: authHeaders() });
      const data = await res.json();
      const orders = (data.orders || []).filter(o => o.status === 'paid');

      if (orders.length === 0) {
        showToast('没有可退货的订单（只有已支付订单可申请退货）', 'error');
        return;
      }

      // 构建订单选择列表
      const orderOptions = orders.map(o => `
        <option value="${o.id}">${o.id.substring(0, 8)}... - ¥${o.totalAmount} - ${o.items.map(it => it.name).join(', ')}</option>
      `).join('');

      // 清空并重建订单信息区域
      document.getElementById('applyOrderInfo').innerHTML = `
        <div class="form-group" style="margin-bottom:0">
          <label>选择要退货的订单 <span style="color:#e74c3c">*</span></label>
          <select id="applyOrderSelect" class="form-control" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px" onchange="loadOrderDetails(this.value)">
            <option value="">请选择订单...</option>
            ${orderOptions}
          </select>
        </div>
      `;
      // 重新插入 selectedOrderDetails
      const detailsDiv = document.createElement('div');
      detailsDiv.id = 'selectedOrderDetails';
      detailsDiv.style.cssText = 'margin-top:10px;padding:10px;background:#e8f5e9;border-radius:6px;display:none';
      document.getElementById('applyOrderInfo').appendChild(detailsDiv);

      document.getElementById('applyOrderId').value = '';
    } catch (e) {
      showToast('加载订单列表失败', 'error');
      return;
    }
  } else {
    // 有指定 orderId，直接加载
    document.getElementById('applyOrderId').value = orderId;
    loadOrderDetails(orderId);
  }

  document.getElementById('applyModal').classList.add('active');
}

// 加载订单详情
async function loadOrderDetails(orderId) {
  if (!orderId) {
    document.getElementById('selectedOrderDetails').style.display = 'none';
    return;
  }

  document.getElementById('applyOrderId').value = orderId;

  try {
    const res = await fetch(`/api/orders/${orderId}`, { headers: authHeaders() });
    const data = await res.json();
    if (res.ok && data.order) {
      const order = data.order;
      document.getElementById('selectedOrderDetails').innerHTML = `
        <div><strong>订单号：</strong>${order.id}</div>
        <div><strong>订单金额：</strong>¥${order.totalAmount}</div>
        <div><strong>订单商品：</strong>${order.items.map(it => `${it.name} x${it.qty}`).join('，')}</div>
        <div><strong>创建时间：</strong>${fmt(order.createdAt)}</div>
      `;
      document.getElementById('selectedOrderDetails').style.display = 'block';
    }
  } catch (e) {}
}

function closeApplyModal() {
  document.getElementById('applyModal').classList.remove('active');
  document.getElementById('applyForm').reset();
  document.getElementById('imagePreview').innerHTML = '';
  selectedImages = [];
}

function previewImages(input) {
  selectedImages = [];
  const preview = document.getElementById('imagePreview');
  preview.innerHTML = '';

  if (input.files && input.files.length > 0) {
    if (input.files.length > 3) {
      showToast('最多只能上传3张图片', 'error');
      input.value = '';
      return;
    }

    Array.from(input.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        selectedImages.push(e.target.result);
        preview.innerHTML += `<img src="${e.target.result}" class="preview-img">`;
      };
      reader.readAsDataURL(file);
    });
  }
}

// 提交退货申请
document.getElementById('applyForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const orderId = document.getElementById('applyOrderId').value;
  const reason = document.getElementById('applyReason').value.trim();

  if (!reason) {
    showToast('请填写退货原因', 'error');
    return;
  }

  try {
    const res = await fetch('/api/returns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify({
        orderId,
        reason,
        items: [], // 简化处理，整单退货
        images: selectedImages
      })
    });

    const data = await res.json();

    if (res.ok) {
      showToast('退货申请提交成功');
      closeApplyModal();
      loadReturns();
    } else {
      showToast(data.error?.message || data.error || '提交失败', 'error');
    }
  } catch (e) {
    showToast('网络错误', 'error');
  }
});

// ===== 处理退货弹窗功能 =====
let currentProcessReturnId = null;

async function openProcessModal(returnId) {
  currentProcessReturnId = returnId;

  // 获取退货详情
  try {
    const res = await fetch(`/api/returns/${returnId}`, { headers: authHeaders() });
    const data = await res.json();
    if (res.ok && data.return) {
      const r = data.return;
      document.getElementById('processReturnInfo').innerHTML = `
        <div><strong>退货单号：</strong>${r.id}</div>
        <div><strong>关联订单：</strong>${r.orderId}</div>
        <div><strong>退款金额：</strong>¥${r.refundAmount}</div>
        <div><strong>申请人：</strong>${r.userInfo ? r.userInfo.username : '-'}</div>
        <div><strong>退货原因：</strong>${r.reason}</div>
      `;
    }
  } catch (e) {}

  document.getElementById('processModal').classList.add('active');
}

function closeProcessModal() {
  document.getElementById('processModal').classList.remove('active');
  document.getElementById('processForm').reset();
  currentProcessReturnId = null;
}

// 提交处理结果
document.getElementById('processForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!currentProcessReturnId) return;

  const status = document.getElementById('processStatus').value;
  const comment = document.getElementById('processComment').value.trim();

  if (!status) {
    showToast('请选择处理结果', 'error');
    return;
  }

  try {
    const res = await fetch(`/api/returns/${currentProcessReturnId}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify({ status, comment })
    });

    const data = await res.json();

    if (res.ok) {
      showToast('处理成功');
      closeProcessModal();
      loadReturns();
    } else {
      showToast(data.error || '处理失败', 'error');
    }
  } catch (e) {
    showToast('网络错误', 'error');
  }
});

// 点击弹窗外部关闭
window.onclick = function(e) {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('active');
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  loadReturns();
  initApplyFromOrder();
});
