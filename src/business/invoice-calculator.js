// src/business/invoice-calculator.js

/**
 * InvoiceCalculator – Các hàm tính toán hóa đơn thuần (pure functions).
 *
 * Quy tắc:
 * - Không chấp nhận số âm.
 * - Giảm giá không lớn hơn tạm tính.
 * - Tổng tiền không nhỏ hơn 0.
 * - Không thao tác DOM.
 * - Không thao tác LocalStorage.
 */

// ─── HELPER ────────────────────────────────────────────────────

/**
 * Ép giá trị về số không âm. Ném lỗi nếu giá trị âm.
 * @param {number} value
 * @param {string} label - Tên tham số (dùng cho thông báo lỗi).
 * @returns {number}
 */
function toNonNegative(value, label = 'Giá trị') {
  const num = Number(value);
  if (isNaN(num)) {
    throw new Error(`${label} phải là một số hợp lệ.`);
  }
  if (num < 0) {
    throw new Error(`${label} không được là số âm.`);
  }
  return num;
}

// ─── TÍNH TIỀN TỪNG LOẠI DỊCH VỤ ──────────────────────────────

/**
 * Tính tiền điện = lượng tiêu thụ × đơn giá.
 *
 * @param {number} usage - Lượng tiêu thụ (kWh). Phải >= 0.
 * @param {number} unitPrice - Đơn giá mỗi kWh (VND). Phải >= 0.
 * @returns {number} Thành tiền điện.
 */
export function calculateElectricAmount(usage, unitPrice) {
  const u = toNonNegative(usage, 'Lượng tiêu thụ điện');
  const p = toNonNegative(unitPrice, 'Đơn giá điện');
  return u * p;
}

/**
 * Tính tiền nước = lượng tiêu thụ × đơn giá.
 *
 * @param {number} usage - Lượng tiêu thụ (m³). Phải >= 0.
 * @param {number} unitPrice - Đơn giá mỗi m³ (VND). Phải >= 0.
 * @returns {number} Thành tiền nước.
 */
export function calculateWaterAmount(usage, unitPrice) {
  const u = toNonNegative(usage, 'Lượng tiêu thụ nước');
  const p = toNonNegative(unitPrice, 'Đơn giá nước');
  return u * p;
}

/**
 * Tính tiền dịch vụ cố định theo phòng (1 đơn vị × đơn giá).
 *
 * @param {number} unitPrice - Đơn giá cố định (VND). Phải >= 0.
 * @returns {number} Thành tiền dịch vụ cố định.
 */
export function calculateFixedServiceAmount(unitPrice) {
  return toNonNegative(unitPrice, 'Đơn giá dịch vụ cố định');
}

/**
 * Tính tiền dịch vụ theo số người = số người × đơn giá.
 *
 * @param {number} personCount - Số người trong phòng. Phải >= 0.
 * @param {number} unitPrice - Đơn giá mỗi người (VND). Phải >= 0.
 * @returns {number} Thành tiền dịch vụ theo người.
 */
export function calculatePerPersonAmount(personCount, unitPrice) {
  const count = toNonNegative(personCount, 'Số người');
  const p = toNonNegative(unitPrice, 'Đơn giá theo người');
  return count * p;
}

/**
 * Tính tiền dịch vụ theo số xe = số xe × đơn giá.
 *
 * @param {number} vehicleCount - Số xe đăng ký. Phải >= 0.
 * @param {number} unitPrice - Đơn giá mỗi xe (VND). Phải >= 0.
 * @returns {number} Thành tiền dịch vụ theo xe.
 */
export function calculatePerVehicleAmount(vehicleCount, unitPrice) {
  const count = toNonNegative(vehicleCount, 'Số xe');
  const p = toNonNegative(unitPrice, 'Đơn giá theo xe');
  return count * p;
}

// ─── TỔNG HỢP HÓA ĐƠN ────────────────────────────────────────

/**
 * Tính tạm tính (subtotal) = tổng tất cả các mục chi phí.
 *
 * @param {number[]} items - Mảng các thành tiền của từng mục. Mỗi phần tử phải >= 0.
 * @returns {number} Tổng tạm tính.
 */
export function calculateSubtotal(items) {
  if (!Array.isArray(items)) {
    throw new Error('Danh sách mục chi phí phải là một mảng.');
  }
  return items.reduce((sum, item, index) => {
    const val = toNonNegative(item, `Mục chi phí #${index + 1}`);
    return sum + val;
  }, 0);
}

/**
 * Tính số tiền sau khi trừ giảm giá.
 * Giảm giá không được lớn hơn tạm tính và không được âm.
 *
 * @param {number} subtotal - Tổng tạm tính. Phải >= 0.
 * @param {number} discount - Số tiền giảm giá. Phải >= 0 và <= subtotal.
 * @returns {number} Số tiền sau giảm giá (luôn >= 0).
 */
export function calculateDiscount(subtotal, discount) {
  const sub = toNonNegative(subtotal, 'Tạm tính');
  const disc = toNonNegative(discount, 'Giảm giá');
  if (disc > sub) {
    throw new Error('Giảm giá không được lớn hơn tạm tính.');
  }
  return sub - disc;
}

/**
 * Tính tổng tiền hóa đơn = tạm tính (tổng items) - giảm giá.
 *
 * @param {number[]} items - Mảng các thành tiền của từng mục.
 * @param {number} [discount=0] - Số tiền giảm giá (mặc định 0).
 * @returns {number} Tổng tiền hóa đơn (luôn >= 0).
 */
export function calculateInvoiceTotal(items, discount = 0) {
  const subtotal = calculateSubtotal(items);
  return calculateDiscount(subtotal, discount);
}

/**
 * Tính số tiền còn nợ = tổng tiền - đã trả.
 *
 * @param {number} total - Tổng tiền hóa đơn. Phải >= 0.
 * @param {number} paidAmount - Số tiền đã trả. Phải >= 0.
 * @returns {number} Số tiền còn nợ (luôn >= 0, nếu trả dư thì trả về 0).
 */
export function calculateRemainingDebt(total, paidAmount) {
  const t = toNonNegative(total, 'Tổng tiền');
  const p = toNonNegative(paidAmount, 'Số tiền đã trả');
  return Math.max(0, t - p);
}

// ─── XÁC ĐỊNH TRẠNG THÁI HÓA ĐƠN ─────────────────────────────

/**
 * Xác định trạng thái hóa đơn dựa trên tổng tiền, số đã trả, hạn đóng và ngày hiện tại.
 *
 * Quy tắc:
 * - total = 0                              → 'paid'
 * - paidAmount >= total                     → 'paid'
 * - paidAmount = 0 và quá hạn              → 'overdue'
 * - 0 < paidAmount < total và quá hạn      → 'overdue'
 * - paidAmount = 0 và chưa quá hạn        → 'unpaid'
 * - 0 < paidAmount < total và chưa quá hạn → 'partial'
 *
 * @param {number} total - Tổng tiền hóa đơn. Phải >= 0.
 * @param {number} paidAmount - Số tiền đã trả. Phải >= 0.
 * @param {string|Date} dueDate - Hạn thanh toán.
 * @param {Date} [currentDate=new Date()] - Ngày hiện tại (dùng để so sánh quá hạn).
 * @returns {'paid'|'unpaid'|'partial'|'overdue'} Trạng thái hóa đơn.
 */
export function determineInvoiceStatus(total, paidAmount, dueDate, currentDate = new Date()) {
  const t = toNonNegative(total, 'Tổng tiền');
  const p = toNonNegative(paidAmount, 'Số tiền đã trả');

  // Đã trả đủ hoặc tổng = 0
  if (t === 0 || p >= t) {
    return 'paid';
  }

  // Kiểm tra quá hạn
  const due = new Date(dueDate);
  const now = currentDate instanceof Date ? currentDate : new Date(currentDate);
  const isOverdue = now > due;

  if (isOverdue) {
    return 'overdue';
  }

  // Chưa trả gì
  if (p === 0) {
    return 'unpaid';
  }

  // Trả một phần
  return 'partial';
}
