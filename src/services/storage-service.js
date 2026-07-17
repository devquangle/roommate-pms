// src/services/storage-service.js

import { getCurrentISODate } from '../utils/date-utils.js';

// Hàm xử lý khi không đọc/ghi được LocalStorage
function handleStorageError(error) {
  console.error("LocalStorage Error:", error);
  const root = document.getElementById('page-content') || document.getElementById('app-root');
  if (root) {
    import('../components/error-state.js').then(module => {
      root.innerHTML = module.renderErrorState('storage-error', {
        customMsg: error.message,
        showHomeBtn: false,
        actionId: 'btnErrorActionRetryStorage',
        actionText: '🔄 Thử lại'
      });
      document.getElementById('btnErrorActionRetryStorage')?.addEventListener('click', () => {
        window.location.reload();
      });
    });
  }
}

function safeGetItem(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    handleStorageError(error);
    throw error;
  }
}

function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    handleStorageError(error);
    throw error;
  }
}

function safeRemoveItem(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    handleStorageError(error);
    throw error;
  }
}

function safeClear() {
  try {
    localStorage.clear();
  } catch (error) {
    handleStorageError(error);
    throw error;
  }
}

/**
 * Parse chuỗi JSON an toàn.
 * Trả về fallback nếu value là null/undefined hoặc JSON không hợp lệ.
 *
 * @param {string|null} value - Chuỗi JSON cần parse.
 * @param {*} [fallback=[]] - Giá trị trả về khi parse thất bại.
 * @returns {*} Kết quả parse hoặc fallback.
 */
export function safeParse(value, fallback = []) {
  if (value === null || value === undefined) {
    return fallback;
  }
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/**
 * Lấy toàn bộ mảng dữ liệu theo key.
 * Trả về mảng rỗng nếu key chưa tồn tại hoặc dữ liệu lỗi.
 *
 * @param {string} key - Khóa LocalStorage.
 * @returns {Array<Object>} Mảng các bản ghi.
 */
export function getAll(key) {
  const raw = safeGetItem(key);
  const data = safeParse(raw, []);
  return Array.isArray(data) ? data : [];
}

/**
 * Tìm một bản ghi theo ID.
 *
 * @param {string} key - Khóa LocalStorage.
 * @param {string} id - ID cần tìm.
 * @returns {Object|null} Bản ghi tìm được hoặc null.
 */
export function getById(key, id) {
  const items = getAll(key);
  return items.find(item => item.id === id) || null;
}

/**
 * Tạo bản ghi mới.
 * - Không cho phép ID trùng.
 * - Tự động gắn createdAt và updatedAt.
 * - Không thay đổi object đầu vào (tạo bản sao).
 *
 * @param {string} key - Khóa LocalStorage.
 * @param {Object} item - Bản ghi cần tạo (bắt buộc có trường `id`).
 * @returns {Object} Bản ghi đã được lưu (bao gồm createdAt, updatedAt).
 * @throws {Error} Nếu item không có id hoặc id đã tồn tại.
 */
export function create(key, item) {
  if (!item || !item.id) {
    throw new Error('Bản ghi phải có trường "id".');
  }

  const items = getAll(key);

  if (items.some(existing => existing.id === item.id)) {
    throw new Error(`ID "${item.id}" đã tồn tại trong "${key}".`);
  }

  const now = getCurrentISODate();
  const newItem = {
    ...item,
    createdAt: item.createdAt || now,
    updatedAt: item.updatedAt || now,
  };

  items.push(newItem);
  safeSetItem(key, JSON.stringify(items));

  return newItem;
}

/**
 * Cập nhật một bản ghi theo ID.
 * - Chỉ ghi đè các trường có trong `changes`, giữ nguyên các trường còn lại.
 * - Tự động cập nhật updatedAt.
 * - Không thay đổi object đầu vào.
 *
 * @param {string} key - Khóa LocalStorage.
 * @param {string} id - ID bản ghi cần cập nhật.
 * @param {Object} changes - Object chứa các trường cần thay đổi.
 * @returns {Object} Bản ghi sau khi cập nhật.
 * @throws {Error} Nếu không tìm thấy bản ghi với ID tương ứng.
 */
export function update(key, id, changes) {
  const items = getAll(key);
  const index = items.findIndex(item => item.id === id);

  if (index === -1) {
    throw new Error(`Không tìm thấy bản ghi với ID "${id}" trong "${key}".`);
  }

  const now = getCurrentISODate();
  const updatedItem = {
    ...items[index],
    ...changes,
    id,                     // Đảm bảo không đổi id
    createdAt: items[index].createdAt, // Giữ nguyên createdAt
    updatedAt: now,
  };

  items[index] = updatedItem;
  safeSetItem(key, JSON.stringify(items));

  return updatedItem;
}

/**
 * Xóa một bản ghi theo ID.
 *
 * @param {string} key - Khóa LocalStorage.
 * @param {string} id - ID bản ghi cần xóa.
 * @returns {boolean} true nếu xóa thành công, false nếu không tìm thấy.
 */
export function remove(key, id) {
  const items = getAll(key);
  const index = items.findIndex(item => item.id === id);

  if (index === -1) return false;

  items.splice(index, 1);
  safeSetItem(key, JSON.stringify(items));
  return true;
}

/**
 * Kiểm tra xem có bản ghi nào thỏa mãn điều kiện hay không.
 *
 * @param {string} key - Khóa LocalStorage.
 * @param {Function} predicate - Hàm kiểm tra (nhận vào record, trả về boolean).
 * @returns {boolean} true nếu có ít nhất 1 bản ghi thỏa mãn.
 */
export function exists(key, predicate) {
  if (typeof predicate !== 'function') {
    throw new Error('predicate phải là một hàm.');
  }
  const items = getAll(key);
  return items.some(predicate);
}

/**
 * Thay thế toàn bộ dữ liệu của một key bằng mảng mới.
 *
 * @param {string} key - Khóa LocalStorage.
 * @param {Array<Object>} items - Mảng dữ liệu mới.
 * @throws {Error} Nếu items không phải mảng.
 */
export function replaceAll(key, items) {
  if (!Array.isArray(items)) {
    throw new Error('Dữ liệu phải là một mảng.');
  }
  safeSetItem(key, JSON.stringify(items));
}

/**
 * Xóa dữ liệu của một key cụ thể.
 *
 * @param {string} key - Khóa LocalStorage cần xóa.
 */
export function clearKey(key) {
  safeRemoveItem(key);
}

/**
 * Xóa toàn bộ LocalStorage.
 */
export function clearAll() {
  safeClear();
}

/**
 * Export toàn bộ dữ liệu LocalStorage thành một object.
 * Mỗi key sẽ được parse từ JSON, nếu lỗi thì lấy giá trị thô.
 *
 * @returns {Object} Object chứa tất cả key-value trong LocalStorage.
 */
export function exportAll() {
  const data = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const raw = safeGetItem(key);
      data[key] = safeParse(raw, raw);
    }
  } catch (error) {
    handleStorageError(error);
  }
  return data;
}

/**
 * Import dữ liệu vào LocalStorage, ghi đè toàn bộ các key có trong data.
 * - data phải là một plain object.
 * - Mỗi value sẽ được JSON.stringify trước khi lưu.
 *
 * @param {Object} data - Object chứa dữ liệu cần import.
 * @throws {Error} Nếu data không phải object hoặc là null/array.
 */
export function importAll(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Dữ liệu import phải là một object.');
  }

  const keys = Object.keys(data);
  for (const key of keys) {
    const value = data[key];
    safeSetItem(key, JSON.stringify(value));
  }
}
