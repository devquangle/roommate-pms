// src/services/debt-service.js

import * as StorageService from './storage-service.js';
import { STORAGE_KEYS } from '../constants/storage-keys.js';
import { daysBetween, isValidDate } from '../utils/date-utils.js';

const INVOICES_KEY = STORAGE_KEYS.INVOICES;

/**
 * Lấy danh sách các hóa đơn còn nợ (chưa thanh toán xong và đã chốt).
 * Bỏ qua hóa đơn nháp (draft) và hóa đơn hủy (cancelled).
 *
 * @returns {Array<Object>}
 */
export function getOutstandingInvoices() {
  const invoices = StorageService.getAll(INVOICES_KEY);
  return invoices.filter(inv =>
    (inv.status === 'unpaid' || inv.status === 'partial') &&
    inv.remainingDebt > 0
  );
}

/**
 * Tính số ngày quá hạn của hóa đơn.
 *
 * @param {string} dueDate - Ngày hạn đóng (YYYY-MM-DD).
 * @param {string|Date} [currentDate=new Date()] - Ngày so sánh.
 * @returns {number} Số ngày quá hạn (>= 0). Trả về 0 nếu chưa quá hạn.
 */
export function calculateDaysOverdue(dueDate, currentDate = new Date()) {
  if (!dueDate || !isValidDate(dueDate)) return 0;

  const due = new Date(dueDate);
  const curr = new Date(currentDate);

  // Chỉ lấy phần ngày để so sánh
  due.setHours(0, 0, 0, 0);
  curr.setHours(0, 0, 0, 0);

  if (curr <= due) {
    return 0;
  }

  try {
    const dueStr = due.toISOString().split('T')[0];
    const currStr = curr.toISOString().split('T')[0];
    return daysBetween(dueStr, currStr);
  } catch {
    return 0;
  }
}

/**
 * Lấy danh sách các hóa đơn quá hạn.
 *
 * @param {string|Date} [currentDate=new Date()]
 * @returns {Array<Object>}
 */
export function getOverdueInvoices(currentDate = new Date()) {
  const outstanding = getOutstandingInvoices();
  return outstanding.filter(inv => calculateDaysOverdue(inv.dueDate, currentDate) > 0);
}

/**
 * Tính tổng công nợ hiện tại.
 *
 * @returns {number}
 */
export function getTotalDebt() {
  const outstanding = getOutstandingInvoices();
  return outstanding.reduce((sum, inv) => sum + inv.remainingDebt, 0);
}

/**
 * Thống kê nợ theo phòng.
 * Trả về mảng các đối tượng chứa roomId, roomName, và tổng nợ của phòng đó.
 *
 * @returns {Array<Object>}
 */
export function getDebtByRoom() {
  const outstanding = getOutstandingInvoices();
  const rooms = StorageService.getAll(STORAGE_KEYS.ROOMS);

  const roomDebts = {};

  outstanding.forEach(inv => {
    roomDebts[inv.roomId] = (roomDebts[inv.roomId] || 0) + inv.remainingDebt;
  });

  return Object.entries(roomDebts).map(([roomId, debt]) => {
    const room = rooms.find(r => r.id === roomId);
    return {
      roomId,
      roomName: room ? room.name : roomId,
      totalDebt: debt
    };
  }).sort((a, b) => b.totalDebt - a.totalDebt); // Sắp xếp nợ giảm dần
}

/**
 * Thống kê nợ theo tháng.
 * Trả về mảng các đối tượng chứa month, year, và tổng nợ.
 *
 * @returns {Array<Object>}
 */
export function getDebtByMonth() {
  const outstanding = getOutstandingInvoices();
  const monthDebts = {};

  outstanding.forEach(inv => {
    const key = `${inv.year}-${String(inv.month).padStart(2, '0')}`;
    monthDebts[key] = (monthDebts[key] || 0) + inv.remainingDebt;
  });

  return Object.entries(monthDebts).map(([key, debt]) => {
    const [year, month] = key.split('-');
    return {
      month: Number(month),
      year: Number(year),
      totalDebt: debt
    };
  }).sort((a, b) => b.year - a.year || b.month - a.month);
}
