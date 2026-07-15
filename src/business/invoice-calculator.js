// src/business/invoice-calculator.js

import { toNumberOrDefault } from '../utils/number-utils.js';

/**
 * Tính tiền điện: lượng dùng x đơn giá.
 *
 * @param {number} usage
 * @param {number} unitPrice
 * @returns {number}
 */
export function calculateElectricAmount(usage, unitPrice) {
  const u = Math.max(0, toNumberOrDefault(usage, 0));
  const p = Math.max(0, toNumberOrDefault(unitPrice, 0));
  return u * p;
}

/**
 * Tính tiền nước: lượng dùng x đơn giá.
 *
 * @param {number} usage
 * @param {number} unitPrice
 * @returns {number}
 */
export function calculateWaterAmount(usage, unitPrice) {
  const u = Math.max(0, toNumberOrDefault(usage, 0));
  const p = Math.max(0, toNumberOrDefault(unitPrice, 0));
  return u * p;
}

/**
 * Tính tiền dịch vụ cố định (theo phòng).
 *
 * @param {number} unitPrice
 * @returns {number}
 */
export function calculateFixedServiceAmount(unitPrice) {
  return Math.max(0, toNumberOrDefault(unitPrice, 0));
}

/**
 * Tính tiền dịch vụ theo số người.
 *
 * @param {number} personCount
 * @param {number} unitPrice
 * @returns {number}
 */
export function calculatePerPersonAmount(personCount, unitPrice) {
  const c = Math.max(0, toNumberOrDefault(personCount, 0));
  const p = Math.max(0, toNumberOrDefault(unitPrice, 0));
  return c * p;
}

/**
 * Tính tiền dịch vụ theo số xe.
 *
 * @param {number} vehicleCount
 * @param {number} unitPrice
 * @returns {number}
 */
export function calculatePerVehicleAmount(vehicleCount, unitPrice) {
  const c = Math.max(0, toNumberOrDefault(vehicleCount, 0));
  const p = Math.max(0, toNumberOrDefault(unitPrice, 0));
  return c * p;
}

/**
 * Tính tổng tạm tính (subtotal) của các khoản phí dịch vụ & phòng.
 *
 * @param {Array<Object>} items - Danh sách các mục dịch vụ/phí, mỗi mục có trường `total` hoặc `amount`.
 * @returns {number}
 */
export function calculateSubtotal(items = []) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => {
    const val = toNumberOrDefault(item.total !== undefined ? item.total : item.amount, 0);
    return sum + Math.max(0, val);
  }, 0);
}

/**
 * Tính số tiền giảm giá. Không được lớn hơn tạm tính.
 *
 * @param {number} subtotal
 * @param {number} discount
 * @returns {number}
 */
export function calculateDiscount(subtotal, discount) {
  const sub = Math.max(0, toNumberOrDefault(subtotal, 0));
  const disc = Math.max(0, toNumberOrDefault(discount, 0));
  return Math.min(sub, disc);
}

/**
 * Tính tổng tiền hóa đơn sau khi trừ giảm giá.
 *
 * @param {Array<Object>|number} itemsOrSubtotal - Danh sách các mục hoặc số tiền tạm tính.
 * @param {number} discount
 * @returns {number}
 */
export function calculateInvoiceTotal(itemsOrSubtotal, discount) {
  let subtotal = 0;
  if (Array.isArray(itemsOrSubtotal)) {
    subtotal = calculateSubtotal(itemsOrSubtotal);
  } else {
    subtotal = toNumberOrDefault(itemsOrSubtotal, 0);
  }

  const actualDiscount = calculateDiscount(subtotal, discount);
  return Math.max(0, subtotal - actualDiscount);
}

/**
 * Tính số tiền còn nợ (công nợ còn lại).
 *
 * @param {number} total - Tổng tiền hóa đơn.
 * @param {number} paidAmount - Số tiền đã thanh toán.
 * @returns {number}
 */
export function calculateRemainingDebt(total, paidAmount) {
  const tot = Math.max(0, toNumberOrDefault(total, 0));
  const paid = Math.max(0, toNumberOrDefault(paidAmount, 0));
  return Math.max(0, tot - paid);
}

/**
 * Xác định trạng thái của hóa đơn dựa trên số tiền đã thanh toán, tổng tiền, hạn đóng và ngày hiện tại.
 *
 * @param {number} total - Tổng tiền hóa đơn.
 * @param {number} paidAmount - Số tiền đã trả.
 * @param {string} dueDate - Hạn đóng hóa đơn (YYYY-MM-DD).
 * @param {string|Date} [currentDate=new Date()] - Ngày hiện tại để so sánh hạn.
 * @returns {string} Trạng thái ('paid' | 'partial' | 'unpaid')
 */
export function determineInvoiceStatus(total, paidAmount, dueDate, currentDate = new Date()) {
  const tot = Math.max(0, toNumberOrDefault(total, 0));
  const paid = Math.max(0, toNumberOrDefault(paidAmount, 0));

  if (tot === 0) {
    return 'paid';
  }

  if (paid >= tot) {
    return 'paid';
  }

  if (paid > 0 && paid < tot) {
    return 'partial';
  }

  return 'unpaid';
}
