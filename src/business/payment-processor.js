// src/business/payment-processor.js

import { toNumberOrDefault } from '../utils/number-utils.js';

/**
 * Tính tổng số tiền đã thanh toán từ danh sách các giao dịch.
 *
 * @param {Array<Object>} payments - Mảng giao dịch thanh toán.
 * @returns {number}
 */
export function calculateTotalPaid(payments = []) {
  if (!Array.isArray(payments)) return 0;
  return payments.reduce((sum, p) => sum + Math.max(0, toNumberOrDefault(p.amount, 0)), 0);
}

/**
 * Tính số tiền nợ còn lại (công nợ) của hóa đơn dựa trên các giao dịch thanh toán.
 *
 * @param {number} invoiceTotal
 * @param {Array<Object>} payments
 * @returns {number}
 */
export function calculateRemainingAmount(invoiceTotal, payments = []) {
  const total = Math.max(0, toNumberOrDefault(invoiceTotal, 0));
  const paid = calculateTotalPaid(payments);
  return Math.max(0, total - paid);
}

/**
 * Xác định trạng thái của hóa đơn dựa trên danh sách thanh toán và hạn đóng.
 *
 * @param {number} invoiceTotal - Tổng tiền hóa đơn.
 * @param {Array<Object>} payments - Danh sách giao dịch thanh toán.
 * @param {string} dueDate - Hạn đóng (YYYY-MM-DD).
 * @param {string|Date} [currentDate=new Date()] - Ngày hiện tại.
 * @returns {string} Trạng thái ('paid' | 'partial' | 'unpaid')
 */
export function determinePaymentStatus(invoiceTotal, payments = [], dueDate, currentDate = new Date()) {
  const total = Math.max(0, toNumberOrDefault(invoiceTotal, 0));
  const paid = calculateTotalPaid(payments);

  if (total === 0) {
    return 'paid';
  }

  if (paid >= total) {
    return 'paid';
  }

  if (paid > 0 && paid < total) {
    return 'partial';
  }

  return 'unpaid';
}

/**
 * Gom nhóm và tổng hợp số tiền thanh toán theo phương thức (cash, transfer...).
 *
 * @param {Array<Object>} payments - Danh sách giao dịch thanh toán.
 * @returns {Object} Đối tượng gom nhóm, ví dụ: { cash: 1200000, transfer: 3500000 }
 */
export function groupPaymentsByMethod(payments = []) {
  const groups = {};
  if (!Array.isArray(payments)) return groups;

  payments.forEach(p => {
    const method = p.method || 'other';
    const amount = Math.max(0, toNumberOrDefault(p.amount, 0));
    groups[method] = (groups[method] || 0) + amount;
  });

  return groups;
}
