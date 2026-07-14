// src/utils/id-utils.js

/**
 * Tạo một ID chuỗi duy nhất.
 * Sử dụng crypto.randomUUID() nếu có, fallback sang timestamp + random.
 *
 * @param {string} [prefix=''] - Tiền tố gắn trước ID (ví dụ 'r-', 't-').
 * @returns {string} Chuỗi ID duy nhất.
 *
 * @example
 * generateId()        // "a1b2c3d4-..."
 * generateId('r-')    // "r-a1b2c3d4-..."
 */
export function generateId(prefix = '') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}${crypto.randomUUID()}`;
  }
  // Fallback cho môi trường không hỗ trợ crypto.randomUUID
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}${timestamp}-${random}`;
}
