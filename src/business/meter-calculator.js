// src/business/meter-calculator.js

import { toNumber } from '../utils/number-utils.js';

/**
 * Tính toán chỉ số tiêu thụ dựa trên chỉ số cũ và mới.
 *
 * @param {number|string} oldIndex
 * @param {number|string} newIndex
 * @param {string} label - Nhãn để thông báo lỗi (ví dụ: 'điện', 'nước')
 * @returns {number}
 * @throws {Error}
 */
export function calculateUsage(oldIndex, newIndex, label = 'tiêu thụ') {
  const oldVal = toNumber(oldIndex);
  const newVal = toNumber(newIndex);

  if (isNaN(oldVal) || isNaN(newVal)) {
    throw new Error(`Chỉ số ${label} cũ hoặc mới không phải là số hợp lệ.`);
  }

  if (oldVal < 0 || newVal < 0) {
    throw new Error(`Chỉ số ${label} không được âm.`);
  }

  if (newVal < oldVal) {
    throw new Error(`Chỉ số ${label} mới không được nhỏ hơn chỉ số cũ.`);
  }

  return newVal - oldVal;
}

/**
 * Tính số điện tiêu thụ.
 *
 * @param {number|string} oldIndex
 * @param {number|string} newIndex
 * @returns {number}
 */
export function calculateElectricUsage(oldIndex, newIndex) {
  return calculateUsage(oldIndex, newIndex, 'điện');
}

/**
 * Tính số nước tiêu thụ.
 *
 * @param {number|string} oldIndex
 * @param {number|string} newIndex
 * @returns {number}
 */
export function calculateWaterUsage(oldIndex, newIndex) {
  return calculateUsage(oldIndex, newIndex, 'nước');
}

/**
 * Phát hiện tiêu thụ bất thường.
 * So sánh lượng tiêu thụ hiện tại so với kỳ trước. Nếu tăng/giảm vượt quá thresholdPercent thì coi là bất thường.
 *
 * @param {number} currentUsage - Lượng tiêu thụ kỳ này.
 * @param {number} previousUsage - Lượng tiêu thụ kỳ trước.
 * @param {number} [thresholdPercent=50] - Ngưỡng phần trăm cảnh báo bất thường (mặc định 50%).
 * @returns {{ abnormal: boolean, percentChange: number, message: string }}
 */
export function detectAbnormalUsage(currentUsage, previousUsage, thresholdPercent = 50) {
  const curr = Number(currentUsage);
  const prev = Number(previousUsage);

  if (isNaN(curr) || isNaN(prev)) {
    return { abnormal: false, percentChange: 0, message: '' };
  }

  // Nếu kỳ trước bằng 0 và kỳ này có dùng -> thay đổi lớn
  if (prev === 0) {
    if (curr > 0) {
      return {
        abnormal: curr > 10, // Chỉ cảnh báo nếu lượng dùng đáng kể (>10)
        percentChange: 100,
        message: `Tiêu thụ tăng từ 0 lên ${curr}.`
      };
    }
    return { abnormal: false, percentChange: 0, message: '' };
  }

  const diff = curr - prev;
  const percentChange = (diff / prev) * 100;

  const absoluteChange = Math.abs(percentChange);
  const abnormal = absoluteChange >= thresholdPercent;

  let message = '';
  if (abnormal) {
    const direction = percentChange > 0 ? 'tăng' : 'giảm';
    message = `Tiêu thụ ${direction} bất thường ${Math.round(absoluteChange)}% so với kỳ trước (Từ ${prev} sang ${curr}).`;
  }

  return {
    abnormal,
    percentChange,
    message
  };
}

/**
 * Lấy khóa/định dạng của tháng liền trước.
 * Hỗ trợ string "YYYY-MM" hoặc object { month, year }.
 *
 * @param {string|Object} monthKey
 * @returns {string|Object}
 */
export function getPreviousMonthKey(monthKey) {
  if (typeof monthKey === 'string' && monthKey.includes('-')) {
    const [yearStr, monthStr] = monthKey.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10);
    if (isNaN(year) || isNaN(month)) {
      throw new Error('Định dạng tháng không hợp lệ.');
    }
    month--;
    if (month === 0) {
      month = 12;
      year--;
    }
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  if (monthKey && typeof monthKey === 'object') {
    let { month, year } = monthKey;
    month = parseInt(month, 10);
    year = parseInt(year, 10);
    if (isNaN(year) || isNaN(month)) {
      throw new Error('Định dạng tháng không hợp lệ.');
    }
    month--;
    if (month === 0) {
      month = 12;
      year--;
    }
    return { month, year };
  }

  throw new Error('Tham số monthKey không hợp lệ.');
}
