/**
 * 简单的内存缓存工具
 */

class SimpleCache {
  constructor(ttl = 300000) { // 默认5分钟TTL
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, value, ttl = this.ttl) {
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { value, expiresAt });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  // 清理过期项
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// 创建缓存实例
const cache = new SimpleCache();

// 定期清理过期项
setInterval(() => {
  cache.cleanup();
}, 60000); // 每分钟清理一次

/**
 * 缓存中间件
 * @param {number} ttl - 缓存时间（毫秒）
 * @param {Function} keyGenerator - 缓存键生成函数
 */
function cacheMiddleware(ttl = 300000, keyGenerator = null) {
  return (req, res, next) => {
    const key = keyGenerator ? keyGenerator(req) : `${req.method}:${req.originalUrl}`;
    
    // 只缓存GET请求
    if (req.method !== 'GET') {
      return next();
    }
    
    const cached = cache.get(key);
    if (cached) {
      return res.json(cached);
    }
    
    // 保存原始res.json方法
    const originalJson = res.json.bind(res);
    
    // 重写res.json方法以添加缓存
    res.json = function(data) {
      cache.set(key, data, ttl);
      return originalJson(data);
    };
    
    next();
  };
}

/**
 * 请求去重中间件
 */
class RequestDeduplicator {
  constructor() {
    this.pendingRequests = new Map();
  }

  async deduplicate(key, requestFn) {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }
}

const requestDeduplicator = new RequestDeduplicator();

/**
 * 请求去重中间件
 * @param {Function} keyGenerator - 请求键生成函数
 */
function deduplicationMiddleware(keyGenerator = null) {
  return (req, res, next) => {
    const key = keyGenerator ? keyGenerator(req) : `${req.method}:${req.originalUrl}:${JSON.stringify(req.query)}`;
    
    // 只对GET请求进行去重
    if (req.method !== 'GET') {
      return next();
    }

    // 这里需要修改路由处理逻辑，暂时跳过
    next();
  };
}

module.exports = {
  cache,
  cacheMiddleware,
  requestDeduplicator,
  deduplicationMiddleware
};
