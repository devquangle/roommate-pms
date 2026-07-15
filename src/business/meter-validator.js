// src/business/meter-validator.js

import { isEmpty, isNonNegative } from '../utils/validation-utils.js';
import { toNumber } from '../utils/number-utils.js';

/**
 * Validate một bản ghi số điện nước mới hoặc cập nhật.
 *
 * @param {Object} reading - Bản ghi ghi chỉ số điện nước.
 * @param {string} reading.roomId - ID phòng.
 * @param {number} reading.month - Tháng (1-12).
 * @param {number} reading.year - Năm.
 * @param {number} reading.electricityOld - Số điện cũ.
 * @param {number} reading.electricityNew - Số điện mới.
 * @param {number} reading.waterOld - Số nước cũ.
 * @param {number} reading.waterNew - Số nước mới.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateMeterReading(reading) {
  const errors = [];

  if (!reading) {
    errors.push('Dữ liệu chỉ số trống.');
    return { valid: false, errors };
  }

  // Kiểm tra ID phòng
  if (isEmpty(reading.roomId)) {
    errors.push('Phòng không được để trống.');
  }

  // Kiểm tra tháng, năm
  const month = toNumber(reading.month);
  const year = toNumber(reading.year);
  if (isNaN(month) || month < 1 || month > 12) {
    errors.push('Tháng không hợp lệ (phải từ 1 đến 12).');
  }
  if (isNaN(year) || year < 2000) {
    errors.push('Năm không hợp lệ.');
  }

  // Validate điện
  const elecOld = toNumber(reading.electricityOld);
  const elecNew = toNumber(reading.electricityNew);

  if (isNaN(elecOld) || !isNonNegative(elecOld)) {
    errors.push('Số điện cũ phải là số không âm.');
  }
  if (isNaN(elecNew) || !isNonNegative(elecNew)) {
    errors.push('Số điện mới phải là số không âm.');
  }
  if (!isNaN(elecOld) && !isNaN(elecNew) && elecNew < elecOld) {
    errors.push('Số điện mới không được nhỏ hơn số điện cũ.');
  }

  // Validate nước
  const waterOld = toNumber(reading.waterOld);
  const waterNew = toNumber(reading.waterNew);

  if (isNaN(waterOld) || !isNonNegative(waterOld)) {
    errors.push('Số nước cũ phải là số không âm.');
  }
  if (isNaN(waterNew) || !isNonNegative(waterNew)) {
    errors.push('Số nước mới phải là số không âm.');
  }
  if (!isNaN(waterOld) && !isNaN(waterNew) && waterNew < waterOld) {
    errors.push('Số nước mới không được nhỏ hơn số nước cũ.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Kiểm tra tính nhất quán giữa chỉ số hiện tại với chỉ số của tháng trước đó.
 * Số cũ tháng này phải bằng số mới của tháng trước đó.
 *
 * @param {Object} currentReading - Chỉ số tháng đang nhập.
 * @param {Object|null} previousReading - Chỉ số của tháng trước liền kề (nếu có).
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePreviousIndex(currentReading, previousReading) {
  const errors = [];

  if (!currentReading) {
    errors.push('Dữ liệu chỉ số hiện tại trống.');
    return { valid: false, errors };
  }

  if (!previousReading) {
    // Không có chỉ số tháng trước thì coi như hợp lệ (tháng đầu tiên)
    return { valid: true, errors };
  }

  const currElecOld = toNumber(currentReading.electricityOld);
  const prevElecNew = toNumber(previousReading.electricityNew);

  const currWaterOld = toNumber(currentReading.waterOld);
  const prevWaterNew = toNumber(previousReading.waterNew);

  if (!isNaN(currElecOld) && !isNaN(prevElecNew) && currElecOld !== prevElecNew) {
    errors.push(`Số điện cũ (${currElecOld}) không khớp với số điện mới của tháng trước (${prevElecNew}).`);
  }

  if (!isNaN(currWaterOld) && !isNaN(prevWaterNew) && currWaterOld !== prevWaterNew) {
    errors.push(`Số nước cũ (${currWaterOld}) không khớp với số nước mới của tháng trước (${prevWaterNew}).`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
