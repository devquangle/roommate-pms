// src/services/report-service.js

import * as StorageService from './storage-service.js';
import { STORAGE_KEYS } from '../constants/storage-keys.js';
import { ROOM_STATUS } from '../constants/statuses.js';
import {
  calculateOccupancyRate,
  sumField,
  calculatePercentages
} from '../business/report-calculator.js';
import { getExpiringContracts } from './contract-service.js';
import { calculateDaysOverdue } from './debt-service.js';

const ROOMS_KEY = STORAGE_KEYS.ROOMS;
const TENANTS_KEY = STORAGE_KEYS.TENANTS;
const INVOICES_KEY = STORAGE_KEYS.INVOICES;
const PAYMENTS_KEY = STORAGE_KEYS.PAYMENTS;
const METERS_KEY = STORAGE_KEYS.METER_READINGS;

// ─── ROOM STATS ────────────────────────────────────────────────

/**
 * Lấy thống kê số lượng phòng và tỷ lệ lấp đầy.
 *
 * @returns {{ total: number, available: number, rented: number, maintenance: number, occupancyRate: number }}
 */
export function getRoomStats() {
  const rooms = StorageService.getAll(ROOMS_KEY);
  const total = rooms.length;
  const available = rooms.filter(r => r.status === ROOM_STATUS.AVAILABLE).length;
  const rented = rooms.filter(r => r.status === ROOM_STATUS.RENTED).length;
  const maintenance = rooms.filter(r => r.status === ROOM_STATUS.MAINTENANCE).length;
  const occupancyRate = calculateOccupancyRate(rented, total);

  return {
    total,
    available,
    rented,
    maintenance,
    occupancyRate
  };
}

// ─── TENANT STATS ──────────────────────────────────────────────

/**
 * Lấy tổng số người thuê đang hoạt động (active).
 *
 * @returns {number}
 */
export function getTenantStats() {
  const tenants = StorageService.getAll(TENANTS_KEY);
  return tenants.filter(t => t.status !== 'inactive').length;
}

// ─── FINANCIAL STATS ───────────────────────────────────────────

/**
 * Lấy tổng quan tài chính (công nợ, trễ hạn, doanh thu, thực thu).
 *
 * @param {string|Date} [currentDate=new Date()]
 * @returns {{ totalDebt: number, overdueCount: number, totalRevenue: number, totalCollected: number }}
 */
export function getFinancialOverview(currentDate = new Date()) {
  const invoices = StorageService.getAll(INVOICES_KEY);
  const payments = StorageService.getAll(PAYMENTS_KEY);

  // Chỉ xét hóa đơn đã chốt, bỏ qua draft và cancelled
  const activeInvoices = invoices.filter(inv => inv.status !== 'cancelled' && inv.status !== 'draft');

  const totalDebt = activeInvoices.reduce((sum, inv) => sum + inv.remainingDebt, 0);
  const overdueCount = activeInvoices.filter(inv => calculateDaysOverdue(inv.dueDate, currentDate) > 0).length;

  const totalRevenue = sumField(activeInvoices, 'totalAmount');
  const totalCollected = sumField(payments, 'amount');

  return {
    totalDebt,
    overdueCount,
    totalRevenue,
    totalCollected
  };
}

/**
 * Thống kê doanh thu (hóa đơn chốt) và thực thu (tiền đóng thực tế) theo tháng.
 * Trả về danh sách sắp xếp tăng dần theo thời gian để vẽ biểu đồ.
 *
 * @returns {Array<Object>} Mảng các phần tử { monthKey, month, year, revenue, collected }
 */
export function getMonthlyRevenueAndCollected() {
  const invoices = StorageService.getAll(INVOICES_KEY).filter(inv => inv.status !== 'cancelled' && inv.status !== 'draft');
  const payments = StorageService.getAll(PAYMENTS_KEY);

  const monthlyData = {};

  // Gom doanh thu (theo tháng của hóa đơn)
  invoices.forEach(inv => {
    if (typeof inv.month !== 'number' || typeof inv.year !== 'number') return;
    const key = `${inv.year}-${String(inv.month).padStart(2, '0')}`;
    if (!monthlyData[key]) {
      monthlyData[key] = { monthKey: key, month: inv.month, year: inv.year, revenue: 0, collected: 0 };
    }
    monthlyData[key].revenue += inv.totalAmount;
  });

  // Gom thực thu (theo tháng đóng tiền của giao dịch)
  payments.forEach(p => {
    if (!p.date) return;
    const [yearStr, monthStr] = p.date.split('-');
    const key = `${yearStr}-${monthStr}`;
    if (!monthlyData[key]) {
      const month = parseInt(monthStr, 10);
      const year = parseInt(yearStr, 10);
      monthlyData[key] = { monthKey: key, month, year, revenue: 0, collected: 0 };
    }
    monthlyData[key].collected += p.amount;
  });

  // Chuyển sang mảng và sắp xếp theo thời gian tăng dần
  return Object.values(monthlyData).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
}

// ─── CONSUMPTION STATS ─────────────────────────────────────────

/**
 * Thống kê tổng lượng tiêu thụ điện và nước theo tháng.
 *
 * @returns {Array<Object>} Mảng các phần tử { monthKey, month, year, totalElectricity, totalWater }
 */
export function getMonthlyConsumption() {
  const readings = StorageService.getAll(METERS_KEY);
  const monthlyData = {};

  readings.forEach(r => {
    const key = `${r.year}-${String(r.month).padStart(2, '0')}`;
    if (!monthlyData[key]) {
      monthlyData[key] = { monthKey: key, month: r.month, year: r.year, totalElectricity: 0, totalWater: 0 };
    }
    monthlyData[key].totalElectricity += r.electricityUsage || 0;
    monthlyData[key].totalWater += r.waterUsage || 0;
  });

  return Object.values(monthlyData).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
}

/**
 * Thống kê tiêu thụ điện của từng phòng trong một tháng cụ thể.
 *
 * @param {number} month
 * @param {number} year
 * @returns {Array<Object>} Mảng các phần tử { roomId, roomName, usage } sắp xếp theo lượng dùng giảm dần.
 */
export function getElectricityConsumptionByRoom(month, year) {
  const readings = StorageService.getAll(METERS_KEY).filter(r => r.month === Number(month) && r.year === Number(year));
  const rooms = StorageService.getAll(ROOMS_KEY);

  return readings.map(r => {
    const room = rooms.find(rm => rm.id === r.roomId);
    return {
      roomId: r.roomId,
      roomName: room ? room.name : r.roomId,
      usage: r.electricityUsage || 0
    };
  }).sort((a, b) => b.usage - a.usage);
}

// ─── DISTRIBUTION STATS ────────────────────────────────────────

/**
 * Thống kê tỷ lệ phân bố các trạng thái hóa đơn.
 *
 * @returns {{ counts: Object, percentages: Object }}
 */
export function getInvoiceStatusRatios() {
  const invoices = StorageService.getAll(INVOICES_KEY);
  const counts = { draft: 0, unpaid: 0, partial: 0, paid: 0, cancelled: 0 };

  invoices.forEach(inv => {
    const status = inv.status || 'draft';
    if (counts[status] !== undefined) {
      counts[status]++;
    }
  });

  const percentages = calculatePercentages(counts);

  return {
    counts,
    percentages
  };
}

/**
 * Thống kê phân bố doanh thu theo phương thức thanh toán.
 *
 * @returns {Object} Bản đồ, ví dụ: { cash: 12000000, transfer: 35000000 }
 */
export function getPaymentMethodDistribution() {
  const payments = StorageService.getAll(PAYMENTS_KEY);
  const distribution = { cash: 0, transfer: 0 };

  payments.forEach(p => {
    const method = p.method || 'transfer';
    const amount = p.amount || 0;
    distribution[method] = (distribution[method] || 0) + amount;
  });

  return distribution;
}

// ─── CONTRACTS EXPIRING REPORT ─────────────────────────────────

/**
 * Danh sách hợp đồng sắp hết hạn (trong 30 ngày).
 *
 * @returns {Array<Object>}
 */
export function getExpiringContractsReport() {
  return getExpiringContracts(30);
}
