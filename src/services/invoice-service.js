// src/services/invoice-service.js

import * as StorageService from './storage-service.js';
import { STORAGE_KEYS } from '../constants/storage-keys.js';
import { ROOM_STATUS } from '../constants/statuses.js';
import { generateId } from '../utils/id-utils.js';
import { toNumberOrDefault } from '../utils/number-utils.js';
import { getCurrentISODate } from '../utils/date-utils.js';
import {
  calculateElectricAmount,
  calculateWaterAmount,
  calculateFixedServiceAmount,
  calculatePerPersonAmount,
  calculatePerVehicleAmount,
  calculateSubtotal,
  calculateInvoiceTotal,
  determineInvoiceStatus,
  calculateRemainingDebt
} from '../business/invoice-calculator.js';
import { validateInvoice } from '../business/invoice-validator.js';
import { getRoomById } from './room-service.js';
import { getReadingByRoomAndMonth } from './meter-reading-service.js';

const KEY = STORAGE_KEYS.INVOICES;
const CONTRACTS_KEY = STORAGE_KEYS.CONTRACTS;
const SERVICES_KEY = STORAGE_KEYS.SERVICE_CONFIGS;

// ─── HELPERS ───────────────────────────────────────────────────

/**
 * Tìm hợp đồng hiệu lực của phòng trong tháng/năm.
 *
 * @param {string} roomId
 * @param {number} month
 * @param {number} year
 * @returns {Object|null}
 */
function getActiveContractForRoomInMonth(roomId, month, year) {
  const contracts = StorageService.getAll(CONTRACTS_KEY);
  const targetStart = new Date(year, month - 1, 1);
  const targetEnd = new Date(year, month, 0, 23, 59, 59, 999);

  return contracts.find(c => {
    if (c.roomId !== roomId) return false;
    if (c.status === 'terminated') return false;

    const cStart = new Date(c.startDate);
    const cEnd = new Date(c.endDate);
    return cStart <= targetEnd && cEnd >= targetStart;
  }) || null;
}

// ─── READ ──────────────────────────────────────────────────────

/**
 * Lấy toàn bộ danh sách hóa đơn.
 *
 * @returns {Array<Object>}
 */
export function getInvoices() {
  return StorageService.getAll(KEY);
}

/**
 * Lấy hóa đơn theo ID.
 *
 * @param {string} id
 * @returns {Object|null}
 */
export function getInvoiceById(id) {
  return StorageService.getById(KEY, id);
}

/**
 * Lấy hóa đơn của phòng trong tháng và năm cụ thể.
 *
 * @param {string} roomId
 * @param {number} month
 * @param {number} [year] - Mặc định là năm hiện hành.
 * @returns {Object|null}
 */
export function getInvoiceByRoomAndMonth(roomId, month, year = new Date().getFullYear()) {
  const list = getInvoices();
  return list.find(inv =>
    inv.roomId === roomId &&
    inv.month === Number(month) &&
    inv.year === Number(year)
  ) || null;
}

// ─── SEARCH & FILTER ───────────────────────────────────────────

/**
 * Lọc danh sách hóa đơn.
 *
 * @param {Object} filters
 * @param {string} [filters.roomId]
 * @param {number} [filters.month]
 * @param {number} [filters.year]
 * @param {string} [filters.status] - 'draft' | 'unpaid' | 'partial' | 'paid' | 'cancelled'
 * @returns {Array<Object>}
 */
export function filterInvoices(filters = {}) {
  let list = getInvoices();

  if (filters.roomId) {
    list = list.filter(inv => inv.roomId === filters.roomId);
  }
  if (filters.month !== undefined && filters.month !== null) {
    list = list.filter(inv => inv.month === Number(filters.month));
  }
  if (filters.year !== undefined && filters.year !== null) {
    list = list.filter(inv => inv.year === Number(filters.year));
  }
  if (filters.status) {
    list = list.filter(inv => inv.status === filters.status);
  }

  // Sắp xếp theo hạn thanh toán giảm dần (mới nhất lên trước)
  return list.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
}

// ─── GENERATE INVOICES ─────────────────────────────────────────

/**
 * Tạo tự động hóa đơn nháp (draft) cho một phòng trong tháng/năm cụ thể.
 *
 * @param {string} roomId
 * @param {number} month
 * @param {number} [year] - Mặc định là năm hiện hành.
 * @returns {Object} Hóa đơn vừa được tạo.
 * @throws {Error}
 */
export function generateInvoiceForRoom(roomId, month, year = new Date().getFullYear()) {
  const m = Number(month);
  const y = Number(year);

  // 1. Kiểm tra xem phòng này đã có hóa đơn trong tháng chưa
  const existing = getInvoiceByRoomAndMonth(roomId, m, y);
  if (existing) {
    throw new Error(`Phòng này đã lập hóa đơn trong tháng ${m}/${y}.`);
  }

  // 2. Phòng phải có hợp đồng hiệu lực
  const contract = getActiveContractForRoomInMonth(roomId, m, y);
  if (!contract) {
    throw new Error(`Phòng không có hợp đồng hiệu lực trong tháng ${m}/${y}.`);
  }

  // 3. Phải có bản ghi ghi chỉ số điện nước tương ứng
  const reading = getReadingByRoomAndMonth(roomId, m, y);
  if (!reading) {
    throw new Error(`Chưa có chỉ số điện nước của phòng trong tháng ${m}/${y}. Vui lòng ghi chỉ số trước.`);
  }

  // 4. Lấy giá thuê từ hợp đồng
  const roomFee = contract.roomPrice;

  // 5. Lấy các dịch vụ đang áp dụng và lập snapshot
  const serviceConfigs = StorageService.getAll(SERVICES_KEY).filter(s => s.status === 'active');
  const serviceDetails = [];

  let electricityFee = 0;
  let waterFee = 0;
  let otherServicesFee = 0;

  // Lấy tổng số người trong phòng (chủ hộ + người ở cùng)
  const personCount = 1 + (contract.coTenantIds ? contract.coTenantIds.length : 0);
  const vehicleCount = 1; // Mặc định 1 xe mỗi phòng nếu tính phí xe

  serviceConfigs.forEach(config => {
    let usage = 1;
    let total = 0;

    if (config.calcMethod === 'usage') {
      if (config.code === 'DIEN' || config.type === 'electricity') {
        usage = reading.electricityUsage;
        total = calculateElectricAmount(usage, config.unitPrice);
        electricityFee = total;
      } else if (config.code === 'NUOC' || config.type === 'water') {
        usage = reading.waterUsage;
        total = calculateWaterAmount(usage, config.unitPrice);
        waterFee = total;
      }
    } else if (config.calcMethod === 'fixed') {
      usage = 1;
      total = calculateFixedServiceAmount(config.unitPrice);
      otherServicesFee += total;
    } else if (config.calcMethod === 'perPerson') {
      usage = personCount;
      total = calculatePerPersonAmount(usage, config.unitPrice);
      otherServicesFee += total;
    } else if (config.calcMethod === 'perVehicle') {
      usage = vehicleCount;
      total = calculatePerVehicleAmount(usage, config.unitPrice);
      otherServicesFee += total;
    } else if (config.calcMethod === 'manual') {
      usage = 0;
      total = 0;
      otherServicesFee += total;
    }

    serviceDetails.push({
      serviceId: config.id,
      code: config.code,
      name: config.name,
      calcMethod: config.calcMethod,
      unitPrice: config.unitPrice,
      usage,
      unit: config.unit,
      total
    });
  });

  const totalAmount = roomFee + electricityFee + waterFee + otherServicesFee;

  // Tạo hạn đóng là ngày 10 của tháng tiếp theo
  let nextMonth = m + 1;
  let nextYear = y;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  const dueDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-10`;

  const newInvoice = {
    id: generateId('i-'),
    roomId,
    contractId: contract.id,
    month: m,
    year: y,
    roomFee,
    electricityFee,
    waterFee,
    otherServicesFee,
    discount: 0,
    totalAmount,
    paidAmount: 0,
    remainingDebt: totalAmount,
    dueDate,
    status: 'draft', // Bắt đầu ở dạng draft
    serviceDetails,
    note: `Hóa đơn tiền nhà tháng ${m}/${y} phòng ${getRoomById(roomId)?.name || roomId}`
  };

  const valResult = validateInvoice(newInvoice);
  if (!valResult.valid) {
    throw new Error(valResult.errors.join(' '));
  }

  return StorageService.create(KEY, newInvoice);
}

/**
 * Tự động tạo hóa đơn nháp cho tất cả các phòng có hợp đồng hiệu lực trong tháng mà chưa có hóa đơn.
 *
 * @param {number} month
 * @param {number} [year]
 * @returns {{ created: Array<Object>, failed: Array<{ roomId: string, error: string }> }}
 */
export function generateInvoicesForMonth(month, year = new Date().getFullYear()) {
  const rooms = StorageService.getAll(STORAGE_KEYS.ROOMS);
  const created = [];
  const failed = [];

  rooms.forEach(room => {
    // Chỉ tạo nếu phòng có hợp đồng hiệu lực trong tháng
    const contract = getActiveContractForRoomInMonth(room.id, month, year);
    if (!contract) return;

    // Bỏ qua nếu đã có hóa đơn
    const existing = getInvoiceByRoomAndMonth(room.id, month, year);
    if (existing) return;

    try {
      const inv = generateInvoiceForRoom(room.id, month, year);
      created.push(inv);
    } catch (err) {
      failed.push({
        roomId: room.id,
        roomName: room.name,
        error: err.message
      });
    }
  });

  return { created, failed };
}

// ─── CRUD DRAFT INVOICE ────────────────────────────────────────

/**
 * Tạo một hóa đơn thủ công (bắt đầu bằng trạng thái draft).
 *
 * @param {Object} data
 * @returns {Object}
 */
export function createInvoice(data) {
  const m = Number(data.month);
  const y = Number(data.year || new Date().getFullYear());
  const roomId = data.roomId;

  const existing = getInvoiceByRoomAndMonth(roomId, m, y);
  if (existing) {
    throw new Error(`Hóa đơn cho phòng này trong tháng ${m}/${y} đã tồn tại.`);
  }

  const roomFee = toNumberOrDefault(data.roomFee, 0);
  const elecFee = toNumberOrDefault(data.electricityFee, 0);
  const waterFee = toNumberOrDefault(data.waterFee, 0);
  const otherFee = toNumberOrDefault(data.otherServicesFee, 0);
  const discount = toNumberOrDefault(data.discount, 0);

  const subtotal = roomFee + elecFee + waterFee + otherFee;
  const totalAmount = calculateInvoiceTotal(subtotal, discount);

  const newInvoice = {
    id: generateId('i-'),
    roomId,
    contractId: data.contractId || '',
    month: m,
    year: y,
    roomFee,
    electricityFee: elecFee,
    waterFee: waterFee,
    otherServicesFee: otherFee,
    discount,
    totalAmount,
    paidAmount: 0,
    remainingDebt: totalAmount,
    dueDate: data.dueDate,
    status: 'draft',
    serviceDetails: data.serviceDetails || [],
    note: (data.note || '').trim()
  };

  const valResult = validateInvoice(newInvoice);
  if (!valResult.valid) {
    throw new Error(valResult.errors.join(' '));
  }

  return StorageService.create(KEY, newInvoice);
}

/**
 * Cập nhật hóa đơn nháp (draft). Không được sửa hóa đơn đã chốt.
 *
 * @param {string} id
 * @param {Object} data
 * @returns {Object}
 */
export function updateDraftInvoice(id, data) {
  const invoice = getInvoiceById(id);
  if (!invoice) {
    throw new Error('Hóa đơn không tồn tại.');
  }

  if (invoice.status !== 'draft') {
    throw new Error('Không thể chỉnh sửa hóa đơn đã chốt.');
  }

  const roomFee = toNumberOrDefault(data.roomFee !== undefined ? data.roomFee : invoice.roomFee, 0);
  const elecFee = toNumberOrDefault(data.electricityFee !== undefined ? data.electricityFee : invoice.electricityFee, 0);
  const waterFee = toNumberOrDefault(data.waterFee !== undefined ? data.waterFee : invoice.waterFee, 0);
  const otherFee = toNumberOrDefault(data.otherServicesFee !== undefined ? data.otherServicesFee : invoice.otherServicesFee, 0);
  const discount = toNumberOrDefault(data.discount !== undefined ? data.discount : invoice.discount, 0);

  const subtotal = roomFee + elecFee + waterFee + otherFee;
  const totalAmount = calculateInvoiceTotal(subtotal, discount);

  const changes = {
    roomFee,
    electricityFee: elecFee,
    waterFee: waterFee,
    otherServicesFee: otherFee,
    discount,
    totalAmount,
    remainingDebt: totalAmount,
    dueDate: data.dueDate || invoice.dueDate,
    serviceDetails: data.serviceDetails || invoice.serviceDetails,
    note: data.note !== undefined ? data.note.trim() : invoice.note
  };

  const merged = { ...invoice, ...changes };
  const valResult = validateInvoice(merged);
  if (!valResult.valid) {
    throw new Error(valResult.errors.join(' '));
  }

  return StorageService.update(KEY, id, changes);
}

/**
 * Xóa hóa đơn nháp. Không cho phép xóa hóa đơn đã chốt/thanh toán.
 *
 * @param {string} id
 * @returns {boolean}
 */
export function deleteDraftInvoice(id) {
  const invoice = getInvoiceById(id);
  if (!invoice) {
    throw new Error('Hóa đơn không tồn tại.');
  }

  if (invoice.status !== 'draft') {
    throw new Error('Hóa đơn đã chốt không được phép xóa.');
  }

  const removed = StorageService.remove(KEY, id);
  if (!removed) {
    throw new Error('Xóa hóa đơn nháp thất bại.');
  }
  return true;
}

// ─── LIFECYCLE CONTROLS ────────────────────────────────────────

/**
 * Chốt hóa đơn (chuyển status từ draft thành unpaid).
 *
 * @param {string} id
 * @returns {Object}
 */
export function finalizeInvoice(id) {
  const invoice = getInvoiceById(id);
  if (!invoice) {
    throw new Error('Hóa đơn không tồn tại.');
  }

  if (invoice.status !== 'draft') {
    throw new Error('Hóa đơn đã chốt rồi.');
  }

  // Chuyển sang unpaid
  return StorageService.update(KEY, id, { status: 'unpaid' });
}

/**
 * Hủy hóa đơn.
 *
 * @param {string} id
 * @returns {Object}
 */
export function cancelInvoice(id) {
  const invoice = getInvoiceById(id);
  if (!invoice) {
    throw new Error('Hóa đơn không tồn tại.');
  }

  if (invoice.status === 'paid' || invoice.status === 'partial') {
    throw new Error('Không thể hủy hóa đơn đã phát sinh thanh toán.');
  }

  if (invoice.status === 'cancelled') {
    throw new Error('Hóa đơn đã bị hủy từ trước.');
  }

  return StorageService.update(KEY, id, { status: 'cancelled' });
}

/**
 * Tính toán lại hóa đơn nháp dựa trên chỉ số mới nhất và biểu giá hiện hành.
 *
 * @param {string} id
 * @returns {Object}
 */
export function recalculateInvoice(id) {
  const invoice = getInvoiceById(id);
  if (!invoice) {
    throw new Error('Hóa đơn không tồn tại.');
  }

  if (invoice.status !== 'draft') {
    throw new Error('Hóa đơn đã chốt không thể tính toán lại.');
  }

  // Đọc lại chỉ số và hợp đồng để sinh lại
  const contract = getActiveContractForRoomInMonth(invoice.roomId, invoice.month, invoice.year);
  if (!contract) {
    throw new Error('Không tìm thấy hợp đồng hiệu lực để tính toán lại.');
  }

  const reading = getReadingByRoomAndMonth(invoice.roomId, invoice.month, invoice.year);
  if (!reading) {
    throw new Error('Không tìm thấy chỉ số điện nước để tính toán lại.');
  }

  const roomFee = contract.roomPrice;
  const serviceConfigs = StorageService.getAll(SERVICES_KEY).filter(s => s.status === 'active');
  const serviceDetails = [];

  let electricityFee = 0;
  let waterFee = 0;
  let otherServicesFee = 0;

  const personCount = 1 + (contract.coTenantIds ? contract.coTenantIds.length : 0);
  const vehicleCount = 1;

  serviceConfigs.forEach(config => {
    let usage = 1;
    let total = 0;

    if (config.calcMethod === 'usage') {
      if (config.code === 'DIEN' || config.type === 'electricity') {
        usage = reading.electricityUsage;
        total = calculateElectricAmount(usage, config.unitPrice);
        electricityFee = total;
      } else if (config.code === 'NUOC' || config.type === 'water') {
        usage = reading.waterUsage;
        total = calculateWaterAmount(usage, config.unitPrice);
        waterFee = total;
      }
    } else if (config.calcMethod === 'fixed') {
      usage = 1;
      total = calculateFixedServiceAmount(config.unitPrice);
      otherServicesFee += total;
    } else if (config.calcMethod === 'perPerson') {
      usage = personCount;
      total = calculatePerPersonAmount(usage, config.unitPrice);
      otherServicesFee += total;
    } else if (config.calcMethod === 'perVehicle') {
      usage = vehicleCount;
      total = calculatePerVehicleAmount(usage, config.unitPrice);
      otherServicesFee += total;
    } else if (config.calcMethod === 'manual') {
      usage = 0;
      total = 0;
      otherServicesFee += total;
    }

    serviceDetails.push({
      serviceId: config.id,
      code: config.code,
      name: config.name,
      calcMethod: config.calcMethod,
      unitPrice: config.unitPrice,
      usage,
      unit: config.unit,
      total
    });
  });

  const totalAmount = roomFee + electricityFee + waterFee + otherServicesFee;

  const changes = {
    roomFee,
    electricityFee,
    waterFee,
    otherServicesFee,
    totalAmount,
    remainingDebt: totalAmount,
    serviceDetails
  };

  return StorageService.update(KEY, id, changes);
}
