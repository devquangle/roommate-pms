// src/utils/currency-utils.js

/**
 * Định dạng số tiền sang tiền Việt Nam (VND).
 * Sử dụng Intl.NumberFormat để đảm bảo format chuẩn locale.
 *
 * @param {number} amount - Số tiền (number nguyên hoặc thập phân).
 * @returns {string} Chuỗi tiền đã format, ví dụ "3.500.000 ₫".
 *
 * @example
 * formatCurrency(3500000)  // "3.500.000 ₫"
 * formatCurrency(0)        // "0 ₫"
 * formatCurrency(null)     // "0 ₫"
 */
export function formatCurrency(amount) {
  const value = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value);
}
