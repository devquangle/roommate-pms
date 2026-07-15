// src/business/service-config-validator.js

import { isEmpty, isNonNegative } from '../utils/validation-utils.js';

export const CALC_METHODS = Object.freeze({
  USAGE: 'usage',
  FIXED: 'fixed',
  PER_PERSON: 'perPerson',
  PER_VEHICLE: 'perVehicle',
  MANUAL: 'manual'
});

export const CALC_METHOD_LABELS = Object.freeze({
  [CALC_METHODS.USAGE]: 'Theo lượng sử dụng',
  [CALC_METHODS.FIXED]: 'Cố định theo phòng',
  [CALC_METHODS.PER_PERSON]: 'Theo số người',
  [CALC_METHODS.PER_VEHICLE]: 'Theo số xe',
  [CALC_METHODS.MANUAL]: 'Nhập thủ công'
});

/**
 * Chuẩn hóa mã dịch vụ (code).
 *
 * @param {string} code
 * @returns {string}
 */
export function normalizeServiceCode(code) {
  if (typeof code !== 'string') return '';
  return code.trim().toUpperCase();
}

/**
 * Validate cấu hình dịch vụ.
 *
 * @param {Object} data - Dữ liệu dịch vụ.
 * @param {Array<Object>} existingConfigs - Các dịch vụ hiện có để check trùng mã.
 * @param {string|null} [excludeId=null] - ID cần loại trừ khi check trùng.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateServiceConfig(data, existingConfigs = [], excludeId = null) {
  const errors = [];

  // Mã dịch vụ bắt buộc và không trùng
  if (isEmpty(data.code)) {
    errors.push('Mã dịch vụ không được để trống.');
  } else {
    const normalizedCode = normalizeServiceCode(data.code);
    const isDuplicate = existingConfigs.some(
      item => item.id !== excludeId && normalizeServiceCode(item.code || item.id) === normalizedCode
    );
    if (isDuplicate) {
      errors.push('Mã dịch vụ đã tồn tại.');
    }
  }

  // Tên bắt buộc
  if (isEmpty(data.name)) {
    errors.push('Tên dịch vụ không được để trống.');
  }

  // Đơn giá không âm
  if (data.unitPrice === undefined || data.unitPrice === null || data.unitPrice === '') {
    errors.push('Đơn giá không được để trống.');
  } else if (!isNonNegative(data.unitPrice)) {
    errors.push('Đơn giá không được là số âm.');
  }

  // Cách tính hợp lệ
  const validMethods = Object.values(CALC_METHODS);
  if (isEmpty(data.calcMethod)) {
    errors.push('Cách tính không được để trống.');
  } else if (!validMethods.includes(data.calcMethod)) {
    errors.push('Cách tính không hợp lệ.');
  }

  // Đơn vị tính bắt buộc
  if (isEmpty(data.unit)) {
    errors.push('Đơn vị tính không được để trống.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
