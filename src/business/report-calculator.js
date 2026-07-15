// src/business/report-calculator.js

import { toNumberOrDefault } from '../utils/number-utils.js';

/**
 * Tính tỷ lệ lấp đầy (phần trăm phòng đang thuê).
 *
 * @param {number} rentedCount
 * @param {number} totalCount
 * @returns {number} Tỷ lệ lấp đầy từ 0 đến 100.
 */
export function calculateOccupancyRate(rentedCount, totalCount) {
  const rented = Math.max(0, toNumberOrDefault(rentedCount, 0));
  const total = Math.max(0, toNumberOrDefault(totalCount, 0));

  if (total === 0) return 0;
  return Number(((rented / total) * 100).toFixed(2));
}

/**
 * Cộng tổng giá trị của một trường trong mảng các đối tượng.
 *
 * @param {Array<Object>} list
 * @param {string} key
 * @returns {number}
 */
export function sumField(list = [], key) {
  if (!Array.isArray(list)) return 0;
  return list.reduce((sum, item) => sum + Math.max(0, toNumberOrDefault(item[key], 0)), 0);
}

/**
 * Thống kê tỷ lệ phần trăm phân bố trạng thái/nhóm.
 *
 * @param {Object} counts - Bản đồ đếm số lượng, ví dụ: { paid: 5, unpaid: 2 }
 * @returns {Object} Bản đồ tỷ lệ phần trăm, ví dụ: { paid: 71.43, unpaid: 28.57 }
 */
export function calculatePercentages(counts = {}) {
  const total = Object.values(counts).reduce((sum, val) => sum + val, 0);
  const percentages = {};

  if (total === 0) {
    Object.keys(counts).forEach(key => {
      percentages[key] = 0;
    });
    return percentages;
  }

  Object.entries(counts).forEach(([key, val]) => {
    percentages[key] = Number(((val / total) * 100).toFixed(2));
  });

  return percentages;
}
