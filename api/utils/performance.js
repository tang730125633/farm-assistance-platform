/**
 * 性能监控工具
 */

// 性能统计
const performanceStats = {
  requests: 0,
  totalResponseTime: 0,
  errors: 0,
  cacheHits: 0,
  cacheMisses: 0
};

/**
 * 性能监控中间件
 */
function performanceMiddleware(req, res, next) {
  const startTime = Date.now();
  
  // 增加请求计数
  performanceStats.requests++;
  
  // 监听响应完成
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    performanceStats.totalResponseTime += responseTime;
    
    // 记录慢请求
    if (responseTime > 1000) {
      console.warn(`慢请求: ${req.method} ${req.originalUrl} - ${responseTime}ms`);
    }
    
    // 记录错误
    if (res.statusCode >= 400) {
      performanceStats.errors++;
    }
  });
  
  next();
}

/**
 * 获取性能统计
 */
function getPerformanceStats() {
  const avgResponseTime = performanceStats.requests > 0 
    ? Math.round(performanceStats.totalResponseTime / performanceStats.requests)
    : 0;
    
  const errorRate = performanceStats.requests > 0
    ? Math.round((performanceStats.errors / performanceStats.requests) * 100)
    : 0;
    
  const cacheHitRate = (performanceStats.cacheHits + performanceStats.cacheMisses) > 0
    ? Math.round((performanceStats.cacheHits / (performanceStats.cacheHits + performanceStats.cacheMisses)) * 100)
    : 0;

  return {
    requests: performanceStats.requests,
    averageResponseTime: avgResponseTime,
    errorRate: errorRate,
    cacheHitRate: cacheHitRate,
    cacheHits: performanceStats.cacheHits,
    cacheMisses: performanceStats.cacheMisses
  };
}

/**
 * 重置性能统计
 */
function resetPerformanceStats() {
  performanceStats.requests = 0;
  performanceStats.totalResponseTime = 0;
  performanceStats.errors = 0;
  performanceStats.cacheHits = 0;
  performanceStats.cacheMisses = 0;
}

/**
 * 记录缓存命中
 */
function recordCacheHit() {
  performanceStats.cacheHits++;
}

/**
 * 记录缓存未命中
 */
function recordCacheMiss() {
  performanceStats.cacheMisses++;
}

module.exports = {
  performanceMiddleware,
  getPerformanceStats,
  resetPerformanceStats,
  recordCacheHit,
  recordCacheMiss
};
