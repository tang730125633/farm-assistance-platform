/**
 * 统一错误处理工具
 */

/**
 * 创建标准错误响应
 * @param {string} code - 错误代码
 * @param {string} message - 错误消息
 * @param {number} statusCode - HTTP状态码
 * @returns {Object} 错误响应对象
 */
function createErrorResponse(code, message, statusCode = 400) {
  return {
    error: {
      code,
      message
    },
    statusCode
  };
}

/**
 * 常用错误响应
 */
const ERRORS = {
  // 认证相关
  UNAUTHORIZED: createErrorResponse('UNAUTHORIZED', '需要登录', 401),
  FORBIDDEN: createErrorResponse('FORBIDDEN', '权限不足', 403),
  INVALID_TOKEN: createErrorResponse('INVALID_TOKEN', '无效的Token', 401),
  
  // 资源相关
  NOT_FOUND: createErrorResponse('NOT_FOUND', '资源不存在', 404),
  ALREADY_EXISTS: createErrorResponse('ALREADY_EXISTS', '资源已存在', 409),
  
  // 业务逻辑相关
  INVALID_INPUT: createErrorResponse('INVALID_INPUT', '输入参数无效', 400),
  INSUFFICIENT_STOCK: createErrorResponse('INSUFFICIENT_STOCK', '库存不足', 400),
  ORDER_CANNOT_CANCEL: createErrorResponse('ORDER_CANNOT_CANCEL', '订单无法取消', 400),
  ORDER_ALREADY_PAID: createErrorResponse('ORDER_ALREADY_PAID', '订单已支付', 409),
  ORDER_ALREADY_REFUNDED: createErrorResponse('ORDER_ALREADY_REFUNDED', '订单已退款', 409),
  
  // 系统相关
  INTERNAL_ERROR: createErrorResponse('INTERNAL_ERROR', '服务器内部错误', 500),
  DATABASE_ERROR: createErrorResponse('DATABASE_ERROR', '数据库操作失败', 500),
  NETWORK_ERROR: createErrorResponse('NETWORK_ERROR', '网络错误', 500)
};

/**
 * 发送错误响应
 * @param {Object} res - Express响应对象
 * @param {Object} errorResponse - 错误响应对象
 * @param {string} customMessage - 自定义错误消息（可选）
 */
function sendErrorResponse(res, errorResponse, customMessage = null) {
  const response = {
    error: {
      code: errorResponse.error.code,
      message: customMessage || errorResponse.error.message
    }
  };
  
  res.status(errorResponse.statusCode).json(response);
}

/**
 * 处理异步函数中的错误
 * @param {Function} asyncFn - 异步函数
 * @returns {Function} Express中间件函数
 */
function asyncHandler(asyncFn) {
  return (req, res, next) => {
    Promise.resolve(asyncFn(req, res, next)).catch(next);
  };
}

/**
 * 验证必填字段
 * @param {Object} data - 要验证的数据
 * @param {Array} requiredFields - 必填字段数组
 * @throws {Error} 如果验证失败
 */
function validateRequiredFields(data, requiredFields) {
  const missingFields = requiredFields.filter(field => 
    data[field] === undefined || data[field] === null || data[field] === ''
  );
  
  if (missingFields.length > 0) {
    const error = new Error(`缺少必填字段: ${missingFields.join(', ')}`);
    error.name = 'ValidationError';
    error.missingFields = missingFields;
    throw error;
  }
}

/**
 * 验证数值范围
 * @param {number} value - 要验证的数值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @param {string} fieldName - 字段名称
 * @throws {Error} 如果验证失败
 */
function validateNumberRange(value, min, max, fieldName) {
  if (typeof value !== 'number' || isNaN(value)) {
    const error = new Error(`${fieldName}必须是有效数值`);
    error.name = 'ValidationError';
    throw error;
  }
  
  if (value < min || value > max) {
    const error = new Error(`${fieldName}必须在${min}到${max}之间`);
    error.name = 'ValidationError';
    throw error;
  }
}

module.exports = {
  createErrorResponse,
  ERRORS,
  sendErrorResponse,
  asyncHandler,
  validateRequiredFields,
  validateNumberRange
};
