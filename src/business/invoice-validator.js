// src/business/invoice-validator.js

import { isEmpty, isNonNegative, isValidDate } from '../utils/validation-utils.js';
import { toNumber } from '../utils/number-utils.js';

/**
 * Validate thông tin hóa đơn khi tạo mới hoặc cập nhật.
 *
 * @param {Object} invoice - Bản ghi hóa đơn.
 * @param {string} invoice.roomId
 * @param {number} invoice.month
 * @param {number} invoice.year
 * @param {number} invoice.roomFee
 * @param {number} invoice.electricityFee
 * @param {number} invoice.waterFee
 * @param {number} invoice.otherServicesFee
 * @param {number} invoice.discount
 * @param {number} invoice.totalAmount
 * @param {string} invoice.dueDate
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateInvoice(invoice) {
  const errors = [];

  if (!invoice) {
    errors.push('Dữ liệu hóa đơn trống.');
    return { valid: false, errors };
  }

  // 1. Kiểm tra phòng
  if (isEmpty(invoice.roomId)) {
    errors.push('Phòng không được để trống.');
  }

  // 2. Kiểm tra tháng, năm
  const month = toNumber(invoice.month);
  const year = toNumber(invoice.year);
  if (isNaN(month) || month < 1 || month > 12) {
    errors.push('Tháng không hợp lệ.');
  }
  if (isNaN(year) || year < 2000) {
    errors.push('Năm không hợp lệ.');
  }

  // 3. Kiểm tra hạn nộp
  if (isEmpty(invoice.dueDate)) {
    errors.push('Hạn thanh toán không được để trống.');
  } else if (!isValidDate(invoice.dueDate)) {
    errors.push('Hạn thanh toán không hợp lệ.');
  }

  // 4. Kiểm tra các khoản phí không âm
  const roomFee = toNumber(invoice.roomFee);
  const elecFee = toNumber(invoice.electricityFee);
  const waterFee = toNumber(invoice.waterFee);
  const otherFee = toNumber(invoice.otherServicesFee);
  const discount = toNumber(invoice.discount);
  const total = toNumber(invoice.totalAmount);

  if (isNaN(roomFee) || !isNonNegative(roomFee)) {
    errors.push('Tiền phòng phải là số không âm.');
  }
  if (isNaN(elecFee) || !isNonNegative(elecFee)) {
    errors.push('Tiền điện phải là số không âm.');
  }
  if (isNaN(waterFee) || !isNonNegative(waterFee)) {
    errors.push('Tiền nước phải là số không âm.');
  }
  if (isNaN(otherFee) || !isNonNegative(otherFee)) {
    errors.push('Tiền dịch vụ khác phải là số không âm.');
  }
  if (isNaN(discount) || !isNonNegative(discount)) {
    errors.push('Tiền giảm giá phải là số không âm.');
  }
  if (isNaN(total) || !isNonNegative(total)) {
    errors.push('Tổng tiền hóa đơn phải là số không âm.');
  }

  // 5. Kiểm tra logic giảm giá so với tạm tính
  const subtotal = roomFee + elecFee + waterFee + otherFee;
  if (!isNaN(subtotal) && !isNaN(discount) && discount > subtotal) {
    errors.push('Tiền giảm giá không được lớn hơn tổng tiền tạm tính.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
