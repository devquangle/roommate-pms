// src/services/invoice-service.js
//
// Service quản lý hóa đơn cho RoomMate.
// Không thao tác DOM. Giao tiếp qua StorageService (LocalStorage).
// Sử dụng InvoiceCalculator và InvoiceValidator từ tầng business.
//
// Quy tắc nghiệp vụ:
//   - Mỗi phòng chỉ có MỘT hóa đơn trong MỘT tháng.
//   - Phòng phải có hợp đồng hiệu lực.
//   - Phải có bản ghi điện nước tương ứng khi tạo tự động.
//   - Lấy giá thuê từ hợp đồng.
//   - Lấy các dịch vụ đang áp dụng → lưu snapshot vào hóa đơn.
//   - Hóa đơn đã chốt (finalized) không sửa tùy ý.
//   - Hóa đơn đã thanh toán không xóa.
//   - Hóa đơn đã hủy không được thanh toán.

import * as StorageService from './storage-service.js';
import { STORAGE_KEYS } from '../constants/storage-keys.js';
import { generateId } from '../utils/id-utils.js';
import { toNumberOrDefault } from '../utils/number-utils.js';
import {
  calculateElectricAmount,
  calculateWaterAmount,
  calculateFixedServiceAmount,
  calculatePerPersonAmount,
  calculatePerVehicleAmount,
  calculateSubtotal,
  calculateDiscount,
  calculateRemainingDebt,
  determineInvoiceStatus
} from '../business/invoice-calculator.js';
import { validateInvoice } from '../business/invoice-validator.js';
import { getRoomById } from './room-service.js';
import { getReadingByRoomAndMonth } from './meter-reading-service.js';

const KEY = STORAGE_KEYS.INVOICES;
const CONTRACTS_KEY = STORAGE_KEYS.CONTRACTS;
const SERVICES_KEY = STORAGE_KEYS.SERVICE_CONFIGS;

// ─── HELPERS (private) ─────────────────────────────────────────

/**
 * Tìm hợp đồng hiệu lực của phòng trong tháng/năm.
 * Hợp đồng "hiệu lực" nếu khoảng [startDate, endDate] giao với tháng đang xét
 * và status không phải 'terminated'.
 *
 * @param {string} roomId
 * @param {number} month - 1-12
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

/**
 * Tính toán chi tiết dịch vụ (snapshot) từ danh sách cấu hình dịch vụ
 * và dữ liệu đầu vào (chỉ số, số người, số xe).
 *
 * @param {Object} params
 * @param {Object} params.reading - Bản ghi điện nước.
 * @param {number} params.personCount - Số người trong phòng.
 * @param {number} params.vehicleCount - Số xe đăng ký.
 * @returns {{ serviceDetails: Object[], electricityFee: number, waterFee: number, otherServicesFee: number }}
 */
function buildServiceSnapshot({ reading, personCount, vehicleCount }) {
  const serviceConfigs = StorageService.getAll(SERVICES_KEY).filter(s => s.status !== 'inactive');
  const serviceDetails = [];

  let electricityFee = 0;
  let waterFee = 0;
  let otherServicesFee = 0;

  serviceConfigs.forEach(config => {
    let usage = 1;
    let total = 0;

    switch (config.calcMethod) {
      case 'usage':
        if (config.code === 'DIEN' || config.type === 'electricity') {
          usage = reading.electricityUsage;
          total = calculateElectricAmount(usage, config.unitPrice);
          electricityFee = total;
        } else if (config.code === 'NUOC' || config.type === 'water') {
          usage = reading.waterUsage;
          total = calculateWaterAmount(usage, config.unitPrice);
          waterFee = total;
        }
        break;

      case 'fixed':
        usage = 1;
        total = calculateFixedServiceAmount(config.unitPrice);
        otherServicesFee += total;
        break;

      case 'perPerson':
        usage = personCount;
        total = calculatePerPersonAmount(usage, config.unitPrice);
        otherServicesFee += total;
        break;

      case 'perVehicle':
        usage = vehicleCount;
        total = calculatePerVehicleAmount(usage, config.unitPrice);
        otherServicesFee += total;
        break;

      case 'manual':
        usage = 0;
        total = 0;
        break;

      default:
        break;
    }

    // Lưu snapshot: tên dịch vụ, đơn giá, số lượng, thành tiền
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

  return { serviceDetails, electricityFee, waterFee, otherServicesFee };
}

/**
 * Tạo ngày hạn đóng mặc định: ngày 10 của tháng kế tiếp.
 *
 * @param {number} month
 * @param {number} year
 * @returns {string} ISO date string YYYY-MM-DD
 */
function buildDefaultDueDate(month, year) {
  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-10`;
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
 * Mỗi phòng chỉ có duy nhất 1 hóa đơn trong 1 tháng.
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
 * Lọc danh sách hóa đơn theo nhiều tiêu chí.
 *
 * @param {Object} filters
 * @param {string}  [filters.roomId]
 * @param {number}  [filters.month]
 * @param {number}  [filters.year]
 * @param {string}  [filters.status] - 'draft'|'unpaid'|'partial'|'paid'|'overdue'|'cancelled'
 * @param {string}  [filters.keyword] - Tìm theo mã hóa đơn hoặc tên phòng.
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
    if (filters.status === 'overdue') {
      // Lọc hóa đơn quá hạn: chưa trả đủ + quá ngày đóng
      const now = new Date();
      list = list.filter(inv => {
        if (inv.status === 'paid' || inv.status === 'cancelled') return false;
        return new Date(inv.dueDate) < now;
      });
    } else {
      list = list.filter(inv => inv.status === filters.status);
    }
  }
  if (filters.keyword) {
    const kw = filters.keyword.toLowerCase();
    list = list.filter(inv => {
      const room = getRoomById(inv.roomId);
      const roomName = (room?.name || '').toLowerCase();
      return inv.id.toLowerCase().includes(kw) || roomName.includes(kw);
    });
  }

  // Sắp xếp theo hạn thanh toán giảm dần (mới nhất lên trước)
  return list.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
}

// ─── GENERATE INVOICES (TỰ ĐỘNG) ──────────────────────────────

/**
 * Tạo tự động hóa đơn nháp (draft) cho MỘT phòng trong tháng/năm cụ thể.
 *
 * Quy trình:
 * 1. Kiểm tra trùng lặp (mỗi phòng 1 hóa đơn / tháng).
 * 2. Phòng phải có hợp đồng hiệu lực.
 * 3. Phải có bản ghi điện nước tương ứng.
 * 4. Lấy giá thuê từ hợp đồng.
 * 5. Lấy dịch vụ đang áp dụng → lưu snapshot.
 * 6. Tính tổng tiền bằng InvoiceCalculator.
 * 7. Validate bằng InvoiceValidator.
 * 8. Lưu với status = 'draft'.
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

  // 1. Kiểm tra trùng lặp
  const existing = getInvoiceByRoomAndMonth(roomId, m, y);
  if (existing) {
    throw new Error(`Phòng này đã có hóa đơn trong tháng ${m}/${y}.`);
  }

  // 2. Phòng phải có hợp đồng hiệu lực
  const contract = getActiveContractForRoomInMonth(roomId, m, y);
  if (!contract) {
    throw new Error(`Phòng không có hợp đồng hiệu lực trong tháng ${m}/${y}.`);
  }

  // 3. Phải có bản ghi điện nước tương ứng
  const reading = getReadingByRoomAndMonth(roomId, m, y);
  if (!reading) {
    throw new Error(`Chưa có chỉ số điện nước của phòng trong tháng ${m}/${y}. Vui lòng ghi chỉ số trước.`);
  }

  // 4. Lấy giá thuê từ hợp đồng
  const roomFee = toNumberOrDefault(contract.roomPrice, 0);

  // 5. Tính số người và số xe
  const personCount = 1 + (contract.coTenantIds ? contract.coTenantIds.length : 0);
  const vehicleCount = Number(contract.vehicles) || 0;

  // 6. Lấy dịch vụ đang áp dụng → lưu snapshot
  const { serviceDetails, electricityFee, waterFee, otherServicesFee } =
    buildServiceSnapshot({ reading, personCount, vehicleCount });

  // 7. Tính tổng bằng InvoiceCalculator
  const items = [roomFee, electricityFee, waterFee, otherServicesFee];
  const subtotal = calculateSubtotal(items);
  const discount = 0;
  const totalAmount = calculateDiscount(subtotal, discount);
  const remainingDebt = calculateRemainingDebt(totalAmount, 0);

  // 8. Tạo hạn đóng mặc định: ngày 10 tháng sau
  const dueDate = buildDefaultDueDate(m, y);

  const room = getRoomById(roomId);

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
    discount,
    totalAmount,
    paidAmount: 0,
    remainingDebt,
    dueDate,
    status: 'draft',
    serviceDetails,
    note: `Hóa đơn tiền nhà tháng ${m}/${y} phòng ${room?.name || roomId}`
  };

  // 9. Validate
  const valResult = validateInvoice(newInvoice);
  if (!valResult.valid) {
    throw new Error(valResult.errors.join(' '));
  }

  // 10. Lưu
  return StorageService.create(KEY, newInvoice);
}

/**
 * Tự động tạo hóa đơn nháp cho TẤT CẢ các phòng có hợp đồng hiệu lực
 * trong tháng mà chưa có hóa đơn.
 *
 * @param {number} month
 * @param {number} [year]
 * @returns {{ created: Array<Object>, failed: Array<{ roomId: string, roomName: string, error: string }> }}
 */
export function generateInvoicesForMonth(month, year = new Date().getFullYear()) {
  const rooms = StorageService.getAll(STORAGE_KEYS.ROOMS);
  const created = [];
  const failed = [];

  rooms.forEach(room => {
    // Chỉ tạo cho phòng có hợp đồng hiệu lực
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

// ─── CREATE (THỦ CÔNG) ────────────────────────────────────────

/**
 * Tạo một hóa đơn thủ công (bắt đầu bằng trạng thái draft).
 * Dành cho trường hợp nhập liệu tay mà không qua generateInvoiceForRoom.
 *
 * @param {Object} data
 * @returns {Object}
 * @throws {Error}
 */
export function createInvoice(data) {
  const m = Number(data.month);
  const y = Number(data.year || new Date().getFullYear());
  const roomId = data.roomId;

  // Mỗi phòng chỉ có 1 hóa đơn / tháng
  const existing = getInvoiceByRoomAndMonth(roomId, m, y);
  if (existing) {
    throw new Error(`Hóa đơn cho phòng này trong tháng ${m}/${y} đã tồn tại.`);
  }

  const roomFee = toNumberOrDefault(data.roomFee, 0);
  const electricityFee = toNumberOrDefault(data.electricityFee, 0);
  const waterFee = toNumberOrDefault(data.waterFee, 0);
  const otherServicesFee = toNumberOrDefault(data.otherServicesFee, 0);
  const discount = toNumberOrDefault(data.discount, 0);

  const items = [roomFee, electricityFee, waterFee, otherServicesFee];
  const subtotal = calculateSubtotal(items);
  const totalAmount = calculateDiscount(subtotal, discount);
  const remainingDebt = calculateRemainingDebt(totalAmount, 0);

  const newInvoice = {
    id: generateId('i-'),
    roomId,
    contractId: data.contractId || '',
    month: m,
    year: y,
    roomFee,
    electricityFee,
    waterFee,
    otherServicesFee,
    discount,
    totalAmount,
    paidAmount: 0,
    remainingDebt,
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

// ─── UPDATE DRAFT ──────────────────────────────────────────────

/**
 * Cập nhật hóa đơn nháp (draft). Hóa đơn đã chốt không sửa tùy ý.
 *
 * @param {string} id
 * @param {Object} data - Các trường cần thay đổi.
 * @returns {Object}
 * @throws {Error}
 */
export function updateDraftInvoice(id, data) {
  const invoice = getInvoiceById(id);
  if (!invoice) {
    throw new Error('Hóa đơn không tồn tại.');
  }

  if (invoice.status !== 'draft') {
    throw new Error('Không thể chỉnh sửa hóa đơn đã chốt.');
  }

  const roomFee = toNumberOrDefault(
    data.roomFee !== undefined ? data.roomFee : invoice.roomFee, 0
  );
  const electricityFee = toNumberOrDefault(
    data.electricityFee !== undefined ? data.electricityFee : invoice.electricityFee, 0
  );
  const waterFee = toNumberOrDefault(
    data.waterFee !== undefined ? data.waterFee : invoice.waterFee, 0
  );
  const otherServicesFee = toNumberOrDefault(
    data.otherServicesFee !== undefined ? data.otherServicesFee : invoice.otherServicesFee, 0
  );
  const discount = toNumberOrDefault(
    data.discount !== undefined ? data.discount : invoice.discount, 0
  );

  const items = [roomFee, electricityFee, waterFee, otherServicesFee];
  const subtotal = calculateSubtotal(items);
  const totalAmount = calculateDiscount(subtotal, discount);
  const paidAmount = toNumberOrDefault(invoice.paidAmount, 0);
  const remainingDebt = calculateRemainingDebt(totalAmount, paidAmount);

  const changes = {
    roomFee,
    electricityFee,
    waterFee,
    otherServicesFee,
    discount,
    totalAmount,
    remainingDebt,
    dueDate: data.dueDate || invoice.dueDate,
    serviceDetails: data.serviceDetails || invoice.serviceDetails,
    note: data.note !== undefined ? String(data.note).trim() : invoice.note
  };

  const merged = { ...invoice, ...changes };
  const valResult = validateInvoice(merged);
  if (!valResult.valid) {
    throw new Error(valResult.errors.join(' '));
  }

  return StorageService.update(KEY, id, changes);
}

// ─── DELETE DRAFT ──────────────────────────────────────────────

/**
 * Xóa hóa đơn nháp.
 * - Hóa đơn đã chốt/đã phát sinh thanh toán → không xóa.
 * - Hóa đơn đã thanh toán → không xóa.
 *
 * @param {string} id
 * @returns {boolean}
 * @throws {Error}
 */
export function deleteDraftInvoice(id) {
  const invoice = getInvoiceById(id);
  if (!invoice) {
    throw new Error('Hóa đơn không tồn tại.');
  }

  if (invoice.status === 'paid') {
    throw new Error('Hóa đơn đã thanh toán không được phép xóa.');
  }

  if (invoice.status !== 'draft') {
    throw new Error('Chỉ được phép xóa hóa đơn nháp (draft).');
  }

  const removed = StorageService.remove(KEY, id);
  if (!removed) {
    throw new Error('Xóa hóa đơn nháp thất bại.');
  }
  return true;
}

// ─── LIFECYCLE CONTROLS ────────────────────────────────────────

/**
 * Chốt hóa đơn: chuyển status từ draft → unpaid.
 * Sau khi chốt, hóa đơn không thể sửa tùy ý nữa.
 *
 * @param {string} id
 * @returns {Object}
 * @throws {Error}
 */
export function finalizeInvoice(id) {
  const invoice = getInvoiceById(id);
  if (!invoice) {
    throw new Error('Hóa đơn không tồn tại.');
  }

  if (invoice.status !== 'draft') {
    throw new Error('Chỉ có thể chốt hóa đơn nháp (draft).');
  }

  return StorageService.update(KEY, id, { status: 'unpaid' });
}

/**
 * Hủy hóa đơn.
 * - Hóa đơn đã thanh toán (paid) hoặc thanh toán một phần (partial) → không hủy.
 * - Hóa đơn đã hủy rồi → không hủy lại.
 *
 * @param {string} id
 * @returns {Object}
 * @throws {Error}
 */
export function cancelInvoice(id) {
  const invoice = getInvoiceById(id);
  if (!invoice) {
    throw new Error('Hóa đơn không tồn tại.');
  }

  if (invoice.status === 'paid') {
    throw new Error('Không thể hủy hóa đơn đã thanh toán đầy đủ.');
  }

  if (invoice.status === 'partial') {
    throw new Error('Không thể hủy hóa đơn đã phát sinh thanh toán một phần.');
  }

  if (invoice.status === 'cancelled') {
    throw new Error('Hóa đơn đã bị hủy từ trước.');
  }

  return StorageService.update(KEY, id, { status: 'cancelled' });
}

// ─── RECALCULATE ───────────────────────────────────────────────

/**
 * Tính toán lại hóa đơn nháp dựa trên chỉ số mới nhất, biểu giá hiện hành
 * và giá thuê phòng từ hợp đồng. Giữ nguyên discount hiện tại.
 *
 * @param {string} id
 * @returns {Object}
 * @throws {Error}
 */
export function recalculateInvoice(id) {
  const invoice = getInvoiceById(id);
  if (!invoice) {
    throw new Error('Hóa đơn không tồn tại.');
  }

  if (invoice.status !== 'draft') {
    throw new Error('Hóa đơn đã chốt không thể tính toán lại.');
  }

  // Đọc lại hợp đồng
  const contract = getActiveContractForRoomInMonth(invoice.roomId, invoice.month, invoice.year);
  if (!contract) {
    throw new Error('Không tìm thấy hợp đồng hiệu lực để tính toán lại.');
  }

  // Đọc lại chỉ số
  const reading = getReadingByRoomAndMonth(invoice.roomId, invoice.month, invoice.year);
  if (!reading) {
    throw new Error('Không tìm thấy chỉ số điện nước để tính toán lại.');
  }

  const roomFee = toNumberOrDefault(contract.roomPrice, 0);
  const personCount = 1 + (contract.coTenantIds ? contract.coTenantIds.length : 0);
  const vehicleCount = 1;

  const { serviceDetails, electricityFee, waterFee, otherServicesFee } =
    buildServiceSnapshot({ reading, personCount, vehicleCount });

  // Giữ nguyên discount cũ
  const discount = toNumberOrDefault(invoice.discount, 0);

  const items = [roomFee, electricityFee, waterFee, otherServicesFee];
  const subtotal = calculateSubtotal(items);
  // Nếu discount cũ > subtotal mới → reset discount về 0
  const safeDiscount = discount > subtotal ? 0 : discount;
  const totalAmount = calculateDiscount(subtotal, safeDiscount);
  const paidAmount = toNumberOrDefault(invoice.paidAmount, 0);
  const remainingDebt = calculateRemainingDebt(totalAmount, paidAmount);

  const changes = {
    roomFee,
    electricityFee,
    waterFee,
    otherServicesFee,
    discount: safeDiscount,
    totalAmount,
    remainingDebt,
    serviceDetails
  };

  return StorageService.update(KEY, id, changes);
}
