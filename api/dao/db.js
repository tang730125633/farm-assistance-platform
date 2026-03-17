const fs = require('fs');
const path = require('path');

// 数据目录路径
const DATA_DIR = path.join(__dirname, '../data');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * 读取 JSON 文件
 * @param {string} filename - 文件名（不包含路径）
 * @returns {Array|Object} 文件内容
 */
function readJsonFile(filename) {
  try {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`读取文件 ${filename} 失败:`, error);
    return [];
  }
}

/**
 * 写入 JSON 文件
 * @param {string} filename - 文件名（不包含路径）
 * @param {Array|Object} data - 要写入的数据
 * @returns {boolean} 是否成功
 */
function writeJsonFile(filename, data) {
  try {
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`写入文件 ${filename} 失败:`, error);
    return false;
  }
}

/**
 * 根据 ID 查找数据
 * @param {string} filename - 文件名
 * @param {string} id - 要查找的 ID
 * @returns {Object|null} 找到的数据或 null
 */
function findById(filename, id) {
  const data = readJsonFile(filename);
  return data.find(item => item.id === id) || null;
}

/**
 * 根据条件查找数据
 * @param {string} filename - 文件名
 * @param {Function} predicate - 查找条件函数
 * @returns {Array} 匹配的数据数组
 */
function findByCondition(filename, predicate) {
  const data = readJsonFile(filename);
  return data.filter(predicate);
}

/**
 * 添加新数据
 * @param {string} filename - 文件名
 * @param {Object} newItem - 新数据项
 * @returns {Object|null} 添加的数据或 null
 */
function addItem(filename, newItem) {
  const data = readJsonFile(filename);
  data.push(newItem);
  if (writeJsonFile(filename, data)) {
    return newItem;
  }
  return null;
}

/**
 * 更新数据
 * @param {string} filename - 文件名
 * @param {string} id - 要更新的 ID
 * @param {Object} updates - 更新数据
 * @returns {Object|null} 更新后的数据或 null
 */
function updateItem(filename, id, updates) {
  const data = readJsonFile(filename);
  const index = data.findIndex(item => item.id === id);
  if (index !== -1) {
    data[index] = { ...data[index], ...updates };
    if (writeJsonFile(filename, data)) {
      return data[index];
    }
  }
  return null;
}

/**
 * 删除数据
 * @param {string} filename - 文件名
 * @param {string} id - 要删除的 ID
 * @returns {boolean} 是否成功删除
 */
function deleteItem(filename, id) {
  const data = readJsonFile(filename);
  const filteredData = data.filter(item => item.id !== id);
  if (filteredData.length < data.length) {
    return writeJsonFile(filename, filteredData);
  }
  return false;
}

/**
 * 读取所有数据（兼容性函数）
 * @param {string} filename - 文件名
 * @returns {Array} 所有数据
 */
function readAll(filename) {
  const fullFilename = filename.endsWith('.json') ? filename : `${filename}.json`;
  return readJsonFile(fullFilename);
}

/**
 * 写入所有数据（兼容性函数）
 * @param {string} filename - 文件名
 * @param {Array} data - 要写入的数据
 * @returns {boolean} 是否成功
 */
function writeAll(filename, data) {
  const fullFilename = filename.endsWith('.json') ? filename : `${filename}.json`;
  return writeJsonFile(fullFilename, data);
}

module.exports = {
  readJsonFile,
  writeJsonFile,
  findById,
  findByCondition,
  addItem,
  updateItem,
  deleteItem,
  readAll,
  writeAll
};

