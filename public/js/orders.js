function authHeaders(){
  const t = localStorage.getItem('token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function fetchJSON(url, opts={}){
  const res = await fetch(url, opts);
  const text = await res.text();
  let data=null; try{ data=text?JSON.parse(text):null; }catch{}
  return { ok: res.ok, status: res.status, data, text };
}

function statusClass(st){
  return {
    pending:'st-pending', paid:'st-paid', shipped:'st-shipped', finished:'st-finished', cancelled:'st-cancelled'
  }[st] || 'st-pending';
}

function fmt(ts){
  if(!ts) return '-';
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
}

// 存储上次的订单数量，用于检测新订单
let lastOrderCount = 0;
let autoRefreshInterval = null;

async function loadOrders(showNotification = false){
  const ctn = document.getElementById('ordersContainer');
  ctn.innerHTML = '<p>加载中...</p>';
  const { ok, data } = await fetchJSON('/api/orders?me=1', { headers: { ...authHeaders() }});
  if(!ok){ ctn.innerHTML = '<p>加载失败，请重试</p>'; return; }
  const orders = data.orders || [];
  if(orders.length===0){ ctn.innerHTML = '<p>暂无订单</p>'; return; }

  ctn.innerHTML = orders.map(o => {
    // 检查是否是农户视图（有 farmerEarnings 字段）
    const isFarmerView = o.farmerEarnings !== undefined;

    if (isFarmerView) {
      // 农户视图：显示购买者、商品详情和收益
      return `
        <div class="order-card">
          <div class="order-hd">
            <div class="order-id">订单：${o.id}</div>
            <div class="order-status ${statusClass(o.status)}">${o.status}</div>
          </div>
          <div class="order-body">
            <div style="color:#2c5530;font-weight:600;margin-bottom:6px">
              <i class="fas fa-user"></i> 购买者：${o.buyerName}
            </div>
            <div style="color:#e74c3c;font-weight:600;font-size:18px;margin-bottom:6px">
              💰 您的收益：¥${o.farmerEarnings.toFixed(2)}
            </div>
            <div>订单总额：¥${o.totalAmount.toFixed(2)}</div>
            <div>创建时间：${fmt(o.createdAt)}</div>
            <div style="margin-top:8px;padding-top:8px;border-top:1px solid #eee">
              <strong>购买的您的商品：</strong><br/>
              ${(o.farmerItems||[]).map(it => `• ${it.name} x${it.qty}件，单价¥${it.price}，小计¥${(it.price * it.qty).toFixed(2)}`).join('<br/>')}
            </div>
          </div>
          <div class="order-ops">
            ${o.status==='paid' || o.status==='shipped' || o.status==='finished' ? `<a class="btn btn-outline btn-small" href="/shipments.html?orderId=${o.id}">查看物流</a>` : ''}
          </div>
        </div>
      `;
    } else {
      // 消费者视图：显示原来的内容
      return `
        <div class="order-card">
          <div class="order-hd">
            <div class="order-id">订单：${o.id}</div>
            <div class="order-status ${statusClass(o.status)}">${o.status}</div>
          </div>
          <div class="order-body">
            <div>金额：¥${o.totalAmount}</div>
            <div>创建时间：${fmt(o.createdAt)}</div>
            <div>明细：${(o.items||[]).map(it => `${it.name} x${it.qty}`).join('，')}</div>
          </div>
          <div class="order-ops">
            ${o.status==='pending' ? `<button class="btn btn-primary btn-small" onclick="pay('${o.id}')">立即支付</button>` : ''}
            ${o.status==='pending' ? `<button class="btn btn-outline btn-small" onclick="cancelOrder('${o.id}')">取消订单</button>` : ''}
            ${o.status==='paid' || o.status==='shipped' || o.status==='finished' ? `<a class="btn btn-outline btn-small" href="/shipments.html?orderId=${o.id}">查看物流</a>` : ''}
          </div>
        </div>
      `;
    }
  }).join('');

  // 检测新订单
  if (showNotification && orders.length > lastOrderCount && lastOrderCount > 0) {
    const newOrdersCount = orders.length - lastOrderCount;
    toast(`🎉 收到 ${newOrdersCount} 个新订单！`, 'ok');

    // 播放通知音效（可选）
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVqzn77BdGAg+ltryxnMoBSh+zPLaizsIGGS56+mjUBELTKXh8bllHAU2j9n0z3oqBSl+zPLaizsIG2i56+mjUBELTKXh8bllHAU2j9n0z3oqBSl+zPLaizsIG2i56+mjUBELTKXh8bllHAU2j9n0z3oqBSl+zPLaizsIG2i56+mjUBELTKXh8bllHAU2j9n0z3oqBSl+zPLaizsIG2i56+mjUBELTKXh8bllHAU2j9n0z3oqBSl+zPLaizsIG2i56+mjUBELTKXh8bllHAU2j9n0z3oqBSl+zPLaizsIG2i56+mjUBELTKXh8bllHAU2j9n0z3oqBSl+zPLaizsIG2i56+mjUBELTKXh8bllHAU2j9n0z3oqBSl+zPLaizsIG2i56+mjUBELTKXh8bllHAU2j9n0z3oqBSl+zPLaizsIG2i56+mjUBELTKXh8bllHAU2j9n0z3oqBSl+zPLaizsIG2i56+mjUBELTKXh8bllHAU2j9n0z3oqBSl+zPLaizsIG2i56+mjUBELTKXh8bllHAU2j9n0z3oqBSl+zPLaizsIG2i56+mjUBELTKXh8bllHAU2j9n0z3oqBSl+zPLaizsIG2i56+mjUBELTKXh8bllHAU2j9n0z3oqBSl+zPLaizsIG2i56+mjUBELTKXh8bllHAU2j9n0z3oqBSl+zPLaizsIG2i56+mjUBELTKXh8bllHAU2j9n0z3oqBSl+zPLaizsIG2i56+mjUBELTKXh8bllHAU2j9n0z3oqBQ==');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (e) {}
  }

  lastOrderCount = orders.length;

  // 更新最后刷新时间
  const now = new Date();
  const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  document.getElementById('lastUpdate').textContent = `最后更新：${timeStr}`;
}

async function pay(orderId){
  const r = await fetchJSON(`/api/payments/${orderId}/pay`, { method:'POST', headers:{ ...authHeaders() }});
  if(r.ok){ toast('支付成功','ok'); loadOrders(); window.location.href = `/shipments.html?orderId=${orderId}`; }
  else { toast((r.data&&r.data.error)||`支付失败(${r.status})`,'error'); }
}

async function cancelOrder(orderId){
  if(!confirm('确定取消该订单？')) return;
  const r = await fetchJSON(`/api/orders/${orderId}/cancel`, { method:'PATCH', headers:{ ...authHeaders() }});
  if(r.ok){ toast('已取消','ok'); loadOrders(); }
  else { toast((r.data&&r.data.msg)||(r.data&&r.data.error)||`取消失败(${r.status})`,'error'); }
}

// 手动刷新
async function manualRefresh() {
  const icon = document.getElementById('refreshIcon');
  icon.classList.add('fa-spin');
  await loadOrders(true);
  setTimeout(() => icon.classList.remove('fa-spin'), 500);
}

// 启动自动刷新（每10秒检查一次）
function startAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }

  autoRefreshInterval = setInterval(() => {
    loadOrders(true);
  }, 10000); // 10秒刷新一次

  console.log('✓ 自动刷新已启用，每10秒检查新订单');
}

// 停止自动刷新
function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadOrders();
  startAutoRefresh();
});

// 页面关闭时清理
window.addEventListener('beforeunload', () => {
  stopAutoRefresh();
});

