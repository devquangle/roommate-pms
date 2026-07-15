// src/business/payment-validator.js

import { isEmpty, isPositive, isValidDate } from '../utils/validation-utils.js';
import { toNumber } from '../utils/number-utils.js';

/**
 * Validate một giao dịch thanh toán mới hoặc cập nhật.
 *
 * @param {Object} payment - Thông tin giao dịch thanh toán.
 * @param {number} payment.amount - Số tiền trả (> 0).
 * @param {string} payment.method - Phương thức ('cash' | 'transfer' ...).
 * @param {string} payment.date - Ngày thanh toán (YYYY-MM-DD).
 * @param {Object} invoice - Hóa đơn liên quan.
 * @param {number} invoice.totalAmount - Tổng tiền hóa đơn.
 * @param {number} invoice.paidAmount - Tiền đã trả trước giao dịch này.
 * @param {string} invoice.status - Trạng thái hóa đơn ('draft', 'unpaid', 'partial', 'paid', 'cancelled').
 * @param {string|null} [excludePaymentId=null] - ID giao dịch cần loại trừ khi tính công nợ (dùng khi cập nhật).
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePayment(payment, invoice, excludePaymentId = null) {
  const errors = [];

  if (!payment) {
    errors.push('Dữ liệu thanh toán trống.');
    return { valid: false, errors };
  }

  // 1. Kiểm tra hóa đơn tồn tại và trạng thái
  if (!invoice) {
    errors.push('Hóa đơn liên quan không tồn tại.');
    return { valid: false, errors };
  }

  if (invoice.status === 'cancelled') {
    errors.push('Không thể thanh toán cho hóa đơn đã hủy.');
  }

  if (invoice.status === 'draft') {
    errors.push('Không thể thanh toán cho hóa đơn chưa chốt (bản nháp).');
  }

  // 2. Kiểm tra số tiền thanh toán lớn hơn 0
  const amount = toNumber(payment.amount);
  if (isNaN(amount) || !isPositive(amount)) {
    errors.push('Số tiền thanh toán phải lớn hơn 0.');
  }

  // 3. Phương thức thanh toán bắt buộc
  if (isEmpty(payment.method)) {
    errors.push('Phương thức thanh toán không được để trống.');
  }

  // 4. Ngày thanh toán bắt buộc
  if (isEmpty(payment.date)) {
    errors.push('Ngày thanh toán không được để trống.');
  } else if (!isValidDate(payment.date)) {
    errors.push('Ngày thanh toán không hợp lệ.');
  }

  // 5. Kiểm tra nợ và cấm trả thừa
  if (invoice.status === 'paid' && !excludePaymentId) {
    errors.push('Không thể thanh toán thêm cho hóa đơn đã trả đủ.');
  }

  if (!isNaN(amount) && invoice.status !== 'cancelled' && invoice.status !== 'draft') {
    // Tính số tiền còn nợ trước giao dịch này
    const total = invoice.totalAmount;
    const currentPaid = invoice.paidAmount || 0;
    
    // Nếu là sửa giao dịch cũ, ta phải loại trừ khoản thanh toán cũ đó ra khỏi paidAmount
    let remainingDebt = total - currentPaid;
    if (excludePaymentId && payment.oldAmount !== undefined) {
      remainingDebt = total - (currentPaid - payment.oldAmount);
    }

    if (amount > remainingDebt) {
      errors.push(`Số tiền thanh toán (${amount}) không được vượt quá công nợ còn lại (${remainingDebt}).`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Kiểm tra xem có thể xóa giao dịch thanh toán này không.
 *
 * @param {Object} payment - Giao dịch cần xóa.
 * @param {Object} invoice - Hóa đơn liên quan.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function canDeletePayment(payment, invoice) {
  const errors = [];

  if (!payment) {
    errors.push('Giao dịch không tồn tại.');
    return { valid: false, errors };
  }

  if (!invoice) {
    errors.push('Hóa đơn liên quan không tồn tại.');
    return { valid: false, errors };
  }

  if (invoice.status === 'cancelled') {
    errors.push('Không thể xóa giao dịch của hóa đơn đã hủy.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
