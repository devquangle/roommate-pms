// src/services/meter-reading-service.js

import * as StorageService from './storage-service.js';
import { STORAGE_KEYS } from '../constants/storage-keys.js';
import { generateId } from '../utils/id-utils.js';
import {
  calculateElectricUsage,
  calculateWaterUsage,
  getPreviousMonthKey
} from '../business/meter-calculator.js';
import {
  validateMeterReading,
  validatePreviousIndex
} from '../business/meter-validator.js';

const KEY = STORAGE_KEYS.METER_READINGS;
const CONTRACTS_KEY = STORAGE_KEYS.CONTRACTS;
const ROOMS_KEY = STORAGE_KEYS.ROOMS;
const INVOICES_KEY = STORAGE_KEYS.INVOICES;

// ─── HELPER FUNCTIONS ────────────────────────────────────────

/**
 * Kiểm tra xem phòng có hợp đồng hiệu lực trong tháng/năm đó không.
 * Hợp đồng hiệu lực nếu khoảng [startDate, endDate] giao với tháng/năm đang xét.
 * Không tính hợp đồng đã bị hủy (terminated).
 *
 * @param {string} roomId
 * @param {number} month
 * @param {number} year
 * @returns {boolean}
 */
export function hasActiveContractInMonth(roomId, month, year) {
  const contracts = StorageService.getAll(CONTRACTS_KEY);
  const targetStart = new Date(year, month - 1, 1);
  const targetEnd = new Date(year, month, 0, 23, 59, 59, 999);

  return contracts.some(c => {
    if (c.roomId !== roomId) return false;
    if (c.status === 'terminated') return false;

    const cStart = new Date(c.startDate);
    const cEnd = new Date(c.endDate);

    return cStart <= targetEnd && cEnd >= targetStart;
  });
}

/**
 * Tìm hóa đơn tương ứng với phòng, tháng, năm.
 *
 * @param {string} roomId
 * @param {number} month
 * @param {number} year
 * @returns {Object|null}
 */
function findRelatedInvoice(roomId, month, year) {
  const invoices = StorageService.getAll(INVOICES_KEY);
  return invoices.find(inv =>
    inv.roomId === roomId &&
    inv.month === month &&
    inv.year === year
  ) || null;
}

// ─── READ ──────────────────────────────────────────────────────

/**
 * Lấy toàn bộ danh sách chỉ số điện nước.
 *
 * @returns {Array<Object>}
 */
export function getReadings() {
  return StorageService.getAll(KEY);
}

/**
 * Lấy chỉ số theo ID.
 *
 * @param {string} id
 * @returns {Object|null}
 */
export function getReadingById(id) {
  return StorageService.getById(KEY, id);
}

/**
 * Lấy chỉ số của phòng trong tháng và năm cụ thể.
 *
 * @param {string} roomId
 * @param {number} month
 * @param {number} [year] - Mặc định là năm hiện tại nếu không truyền.
 * @returns {Object|null}
 */
export function getReadingByRoomAndMonth(roomId, month, year = new Date().getFullYear()) {
  const readings = getReadings();
  return readings.find(r =>
    r.roomId === roomId &&
    r.month === month &&
    r.year === year
  ) || null;
}

/**
 * Tìm chỉ số tháng liền trước của một phòng.
 *
 * @param {string} roomId
 * @param {number} month
 * @param {number} [year] - Mặc định là năm hiện tại.
 * @returns {Object|null}
 */
export function getPreviousReading(roomId, month, year = new Date().getFullYear()) {
  try {
    const prevKey = getPreviousMonthKey({ month, year });
    return getReadingByRoomAndMonth(roomId, prevKey.month, prevKey.year);
  } catch {
    return null;
  }
}

/**
 * Lấy danh sách các phòng có hợp đồng hiệu lực trong tháng nhưng chưa có ghi chỉ số.
 *
 * @param {number} month
 * @param {number} [year] - Mặc định là năm hiện tại.
 * @returns {Array<Object>} Danh sách phòng.
 */
export function getRoomsWithoutReading(month, year = new Date().getFullYear()) {
  const rooms = StorageService.getAll(ROOMS_KEY);
  return rooms.filter(room => {
    // 1. Phải có hợp đồng hiệu lực trong tháng đó
    const hasContract = hasActiveContractInMonth(room.id, month, year);
    if (!hasContract) return false;

    // 2. Chưa được ghi chỉ số trong tháng đó
    const hasReading = getReadingByRoomAndMonth(room.id, month, year);
    return !hasReading;
  });
}

// ─── SEARCH & FILTER ───────────────────────────────────────────

/**
 * Lọc danh sách chỉ số.
 *
 * @param {Object} filters
 * @param {string} [filters.roomId]
 * @param {number} [filters.month]
 * @param {number} [filters.year]
 * @returns {Array<Object>}
 */
export function filterReadings(filters = {}) {
  let list = getReadings();

  if (filters.roomId) {
    list = list.filter(r => r.roomId === filters.roomId);
  }
  if (filters.month !== undefined && filters.month !== null) {
    list = list.filter(r => r.month === Number(filters.month));
  }
  if (filters.year !== undefined && filters.year !== null) {
    list = list.filter(r => r.year === Number(filters.year));
  }

  // Sắp xếp theo năm và tháng giảm dần (mới nhất lên đầu)
  return list.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return b.month - a.month;
  });
}

// ─── CREATE ────────────────────────────────────────────────────

/**
 * Ghi nhận chỉ số điện nước mới cho một phòng.
 *
 * @param {Object} data
 * @param {string} data.roomId
 * @param {number} data.month
 * @param {number} [data.year] - Mặc định năm hiện tại.
 * @param {number} [data.electricityOld] - Tự lấy từ tháng trước nếu để trống.
 * @param {number} data.electricityNew
 * @param {number} [data.waterOld] - Tự lấy từ tháng trước nếu để trống.
 * @param {number} data.waterNew
 * @returns {{ reading: Object, warnings: string[] }}
 * @throws {Error}
 */
export function createReading(data) {
  const month = Number(data.month);
  const year = Number(data.year || new Date().getFullYear());
  const roomId = data.roomId;

  // 1. Chỉ ghi chỉ số cho phòng có hợp đồng hiệu lực trong tháng đó
  if (!hasActiveContractInMonth(roomId, month, year)) {
    throw new Error('Chỉ được ghi nhận chỉ số cho phòng đang có hợp đồng hiệu lực trong tháng này.');
  }

  // 2. Mỗi phòng chỉ có một bản ghi trong một tháng
  const existing = getReadingByRoomAndMonth(roomId, month, year);
  if (existing) {
    throw new Error('Phòng này đã được ghi chỉ số trong tháng đã chọn.');
  }

  // 3. Tự lấy chỉ số cũ từ tháng trước nếu có
  const prevReading = getPreviousReading(roomId, month, year);
  let elecOld = data.electricityOld !== undefined && data.electricityOld !== null && data.electricityOld !== ''
    ? Number(data.electricityOld)
    : (prevReading ? prevReading.electricityNew : 0);

  let waterOld = data.waterOld !== undefined && data.waterOld !== null && data.waterOld !== ''
    ? Number(data.waterOld)
    : (prevReading ? prevReading.waterNew : 0);

  const readingToValidate = {
    roomId,
    month,
    year,
    electricityOld: elecOld,
    electricityNew: Number(data.electricityNew),
    waterOld: waterOld,
    waterNew: Number(data.waterNew)
  };

  // 4. Validate nghiệp vụ cơ bản
  const valResult = validateMeterReading(readingToValidate);
  if (!valResult.valid) {
    throw new Error(valResult.errors.join(' '));
  }

  // 5. Cảnh báo nếu chỉ số cũ khác chỉ số mới tháng trước
  const warnings = [];
  if (prevReading) {
    const prevCheck = validatePreviousIndex(readingToValidate, prevReading);
    if (!prevCheck.valid) {
      warnings.push(...prevCheck.errors);
    }
  }

  // 6. Tính toán lượng tiêu thụ
  const electricityUsage = calculateElectricUsage(readingToValidate.electricityOld, readingToValidate.electricityNew);
  const waterUsage = calculateWaterUsage(readingToValidate.waterOld, readingToValidate.waterNew);

  const newReading = {
    id: generateId('m-'),
    ...readingToValidate,
    electricityUsage,
    waterUsage
  };

  // Ghi vào LocalStorage
  const saved = StorageService.create(KEY, newReading);

  return {
    reading: saved,
    warnings
  };
}

// ─── UPDATE ────────────────────────────────────────────────────

/**
 * Cập nhật chỉ số điện nước.
 *
 * @param {string} id
 * @param {Object} data
 * @returns {{ reading: Object, warnings: string[] }}
 * @throws {Error}
 */
export function updateReading(id, data) {
  const reading = getReadingById(id);
  if (!reading) {
    throw new Error('Không tìm thấy bản ghi chỉ số.');
  }

  const month = Number(data.month !== undefined ? data.month : reading.month);
  const year = Number(data.year !== undefined ? data.year : reading.year);
  const roomId = data.roomId || reading.roomId;

  // 1. Kiểm tra hợp đồng hiệu lực
  if (!hasActiveContractInMonth(roomId, month, year)) {
    throw new Error('Không thể cập nhật chỉ số cho phòng không có hợp đồng hiệu lực trong tháng này.');
  }

  // 2. Kiểm tra trùng (nếu đổi tháng/năm/phòng)
  if (roomId !== reading.roomId || month !== reading.month || year !== reading.year) {
    const dup = getReadingByRoomAndMonth(roomId, month, year);
    if (dup && dup.id !== id) {
      throw new Error('Đã tồn tại bản ghi chỉ số khác của phòng này trong tháng đã chọn.');
    }
  }

  const elecOld = Number(data.electricityOld !== undefined ? data.electricityOld : reading.electricityOld);
  const elecNew = Number(data.electricityNew !== undefined ? data.electricityNew : reading.electricityNew);
  const waterOld = Number(data.waterOld !== undefined ? data.waterOld : reading.waterOld);
  const waterNew = Number(data.waterNew !== undefined ? data.waterNew : reading.waterNew);

  const readingToValidate = {
    roomId,
    month,
    year,
    electricityOld: elecOld,
    electricityNew: elecNew,
    waterOld: waterOld,
    waterNew: waterNew
  };

  // Validate nghiệp vụ cơ bản
  const valResult = validateMeterReading(readingToValidate);
  if (!valResult.valid) {
    throw new Error(valResult.errors.join(' '));
  }

  // Cảnh báo chỉ số cũ không khớp tháng trước
  const warnings = [];
  const prevReading = getPreviousReading(roomId, month, year);
  if (prevReading && prevReading.id !== id) {
    const prevCheck = validatePreviousIndex(readingToValidate, prevReading);
    if (!prevCheck.valid) {
      warnings.push(...prevCheck.errors);
    }
  }

  // Cảnh báo nếu đã có hóa đơn trong tháng đó
  const relatedInvoice = findRelatedInvoice(roomId, month, year);
  if (relatedInvoice) {
    warnings.push(`Cảnh báo: Hóa đơn của phòng này trong tháng ${month}/${year} đã được lập (Mã hóa đơn: ${relatedInvoice.id}). Việc chỉnh sửa chỉ số điện nước có thể làm sai lệch hóa đơn.`);
  }

  // Tính lại tiêu thụ
  const electricityUsage = calculateElectricUsage(elecOld, elecNew);
  const waterUsage = calculateWaterUsage(waterOld, waterNew);

  const changes = {
    roomId,
    month,
    year,
    electricityOld: elecOld,
    electricityNew: elecNew,
    waterOld: waterOld,
    waterNew: waterNew,
    electricityUsage,
    waterUsage
  };

  const updated = StorageService.update(KEY, id, changes);

  return {
    reading: updated,
    warnings
  };
}

// ─── DELETE ────────────────────────────────────────────────────

/**
 * Xóa bản ghi chỉ số.
 *
 * @param {string} id
 * @returns {boolean}
 * @throws {Error}
 */
export function deleteReading(id) {
  const reading = getReadingById(id);
  if (!reading) {
    throw new Error('Bản ghi chỉ số không tồn tại.');
  }

  // Nếu đã lập hóa đơn cho chỉ số này thì cảnh báo chặn xóa cứng (để bảo toàn tính nhất quán)
  const invoice = findRelatedInvoice(reading.roomId, reading.month, reading.year);
  if (invoice) {
    throw new Error(`Không thể xóa chỉ số này vì đã lập hóa đơn tương ứng (Mã hóa đơn: ${invoice.id}).`);
  }

  const removed = StorageService.remove(KEY, id);
  if (!removed) {
    throw new Error('Xóa bản ghi chỉ số thất bại.');
  }
  return true;
}
