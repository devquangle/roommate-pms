// src/services/payment-service.js

import * as StorageService from './storage-service.js';
import { STORAGE_KEYS } from '../constants/storage-keys.js';
import { generateId } from '../utils/id-utils.js';
import { toNumberOrDefault } from '../utils/number-utils.js';
import {
  calculateTotalPaid,
  calculateRemainingAmount,
  determinePaymentStatus
} from '../business/payment-processor.js';
import {
  validatePayment,
  canDeletePayment
} from '../business/payment-validator.js';

const KEY = STORAGE_KEYS.PAYMENTS;
const INVOICES_KEY = STORAGE_KEYS.INVOICES;

// ─── READ ──────────────────────────────────────────────────────

/**
 * Lấy toàn bộ danh sách giao dịch thanh toán.
 *
 * @returns {Array<Object>}
 */
export function getPayments() {
  return StorageService.getAll(KEY);
}

/**
 * Lấy giao dịch thanh toán theo ID.
 *
 * @param {string} id
 * @returns {Object|null}
 */
export function getPaymentById(id) {
  return StorageService.getById(KEY, id);
}

/**
 * Lấy danh sách giao dịch thanh toán của một hóa đơn.
 *
 * @param {string} invoiceId
 * @returns {Array<Object>}
 */
export function getPaymentsByInvoice(invoiceId) {
  const all = getPayments();
  return all.filter(p => p.invoiceId === invoiceId);
}

/**
 * Tính tổng số tiền đã trả cho một hóa đơn.
 *
 * @param {string} invoiceId
 * @returns {number}
 */
export function getTotalPaidByInvoice(invoiceId) {
  const payments = getPaymentsByInvoice(invoiceId);
  return calculateTotalPaid(payments);
}

// ─── SYNC INVOICE STATUS ───────────────────────────────────────

/**
 * Đồng bộ trạng thái thanh toán và công nợ của hóa đơn.
 *
 * @param {string} invoiceId
 * @returns {Object} Hóa đơn đã cập nhật.
 */
export function syncInvoicePaymentStatus(invoiceId) {
  const invoice = StorageService.getById(INVOICES_KEY, invoiceId);
  if (!invoice) {
    throw new Error('Hóa đơn liên quan không tồn tại.');
  }

  const payments = getPaymentsByInvoice(invoiceId);
  const paidAmount = calculateTotalPaid(payments);
  const remainingDebt = calculateRemainingAmount(invoice.totalAmount, payments);
  const status = determinePaymentStatus(invoice.totalAmount, payments, invoice.dueDate);

  // Cập nhật hóa đơn
  return StorageService.update(INVOICES_KEY, invoiceId, {
    paidAmount,
    remainingDebt,
    status
  });
}

// ─── SEARCH & FILTER ───────────────────────────────────────────

/**
 * Lọc danh sách thanh toán.
 *
 * @param {Object} filters
 * @param {string} [filters.invoiceId]
 * @param {string} [filters.method]
 * @returns {Array<Object>}
 */
export function filterPayments(filters = {}) {
  let list = getPayments();

  if (filters.invoiceId) {
    list = list.filter(p => p.invoiceId === filters.invoiceId);
  }
  if (filters.method) {
    list = list.filter(p => p.method === filters.method);
  }

  // Sắp xếp theo ngày thanh toán giảm dần (mới nhất trước)
  return list.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// ─── CREATE PAYMENT ────────────────────────────────────────────

/**
 * Thêm một giao dịch thanh toán mới.
 * Tự động cập nhật số tiền đã trả và trạng thái của hóa đơn tương ứng.
 *
 * @param {Object} data
 * @param {string} data.invoiceId - ID hóa đơn.
 * @param {number} data.amount - Số tiền.
 * @param {string} data.method - Phương thức ('cash' | 'transfer').
 * @param {string} data.date - Ngày đóng tiền.
 * @param {string} [data.note]
 * @returns {Object} Giao dịch thanh toán đã tạo.
 * @throws {Error}
 */
export function createPayment(data) {
  const invoice = StorageService.getById(INVOICES_KEY, data.invoiceId);
  if (!invoice) {
    throw new Error('Không thể lập thanh toán vì hóa đơn không tồn tại.');
  }

  // Validate bằng validator nghiệp vụ thuần
  const valResult = validatePayment(data, invoice);
  if (!valResult.valid) {
    throw new Error(valResult.errors.join(' '));
  }

  const newPayment = {
    id: generateId('p-'),
    invoiceId: data.invoiceId,
    amount: toNumberOrDefault(data.amount, 0),
    method: data.method,
    date: data.date,
    note: (data.note || '').trim()
  };

  // Lưu giao dịch thanh toán
  const savedPayment = StorageService.create(KEY, newPayment);

  try {
    // Đồng bộ lại hóa đơn
    syncInvoicePaymentStatus(data.invoiceId);
  } catch (err) {
    // Nếu đồng bộ hóa đơn thất bại, xóa payment vừa lưu để tránh không nhất quán dữ liệu (Rollback)
    StorageService.remove(KEY, savedPayment.id);
    throw err;
  }

  return savedPayment;
}

// ─── DELETE PAYMENT ────────────────────────────────────────────

/**
 * Xóa một giao dịch thanh toán.
 * Tự động tính toán lại số tiền đã trả và trạng thái của hóa đơn tương ứng.
 *
 * @param {string} id - ID giao dịch thanh toán cần xóa.
 * @returns {boolean}
 * @throws {Error}
 */
export function deletePayment(id) {
  const payment = getPaymentById(id);
  if (!payment) {
    throw new Error('Giao dịch thanh toán không tồn tại.');
  }

  const invoice = StorageService.getById(INVOICES_KEY, payment.invoiceId);
  if (!invoice) {
    throw new Error('Hóa đơn liên quan không tồn tại.');
  }

  // Validate nghiệp vụ xóa
  const valResult = canDeletePayment(payment, invoice);
  if (!valResult.valid) {
    throw new Error(valResult.errors.join(' '));
  }

  // Xóa giao dịch thanh toán
  const removed = StorageService.remove(KEY, id);
  if (!removed) {
    throw new Error('Xóa giao dịch thanh toán thất bại.');
  }

  try {
    // Đồng bộ lại hóa đơn (tính toán lại nợ và trạng thái sau khi mất giao dịch này)
    syncInvoicePaymentStatus(payment.invoiceId);
  } catch (err) {
    // Nếu cập nhật hóa đơn lỗi, khôi phục lại payment cũ để đảm bảo toàn vẹn dữ liệu
    StorageService.create(KEY, payment);
    throw err;
  }

  return true;
}
