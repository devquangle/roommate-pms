// src/utils/date-utils.js

/**
 * Lấy ngày giờ hiện tại theo định dạng ISO 8601.
 *
 * @returns {string} Chuỗi ISO, ví dụ "2026-07-14T13:00:00.000Z".
 */
export function getCurrentISODate() {
  return new Date().toISOString();
}

/**
 * Chuyển chuỗi ngày ISO hoặc yyyy-mm-dd sang định dạng dd/mm/yyyy.
 *
 * @param {string} isoString - Chuỗi ngày ISO hoặc yyyy-mm-dd.
 * @returns {string} Chuỗi ngày dạng dd/mm/yyyy.
 * @throws {Error} Nếu chuỗi đầu vào không phải ngày hợp lệ.
 *
 * @example
 * formatDateToDisplay('2026-07-14T00:00:00.000Z') // "14/07/2026"
 * formatDateToDisplay('2026-07-14')                 // "14/07/2026"
 */
export function formatDateToDisplay(isoString) {
  if (!isoString) {
    throw new Error('Chuỗi ngày không được để trống.');
  }
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    throw new Error(`Chuỗi ngày không hợp lệ: "${isoString}".`);
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * So sánh hai ngày (chỉ so sánh phần ngày, bỏ qua giờ phút giây).
 *
 * @param {string} dateA - Chuỗi ngày thứ nhất (ISO hoặc yyyy-mm-dd).
 * @param {string} dateB - Chuỗi ngày thứ hai (ISO hoặc yyyy-mm-dd).
 * @returns {number} Số âm nếu dateA < dateB, 0 nếu bằng, số dương nếu dateA > dateB.
 * @throws {Error} Nếu một trong hai chuỗi không phải ngày hợp lệ.
 *
 * @example
 * compareDates('2026-07-10', '2026-07-14') // < 0
 * compareDates('2026-07-14', '2026-07-14') // 0
 */
export function compareDates(dateA, dateB) {
  const a = parseDateOnly(dateA);
  const b = parseDateOnly(dateB);
  return a.getTime() - b.getTime();
}

/**
 * Tính số ngày giữa hai ngày (|dateB - dateA|).
 *
 * @param {string} dateA - Chuỗi ngày thứ nhất.
 * @param {string} dateB - Chuỗi ngày thứ hai.
 * @returns {number} Số ngày chênh lệch (luôn >= 0).
 * @throws {Error} Nếu một trong hai chuỗi không phải ngày hợp lệ.
 *
 * @example
 * daysBetween('2026-07-10', '2026-07-14') // 4
 */
export function daysBetween(dateA, dateB) {
  const a = parseDateOnly(dateA);
  const b = parseDateOnly(dateB);
  const diffMs = Math.abs(b.getTime() - a.getTime());
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Kiểm tra xem chuỗi có phải ngày hợp lệ hay không.
 *
 * @param {string} value - Chuỗi cần kiểm tra.
 * @returns {boolean} true nếu hợp lệ.
 */
export function isValidDate(value) {
  if (!value) return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * Chuyển chuỗi ngày thành Date object chỉ chứa phần ngày (00:00:00 UTC).
 * Hàm nội bộ dùng cho compareDates và daysBetween.
 *
 * @param {string} dateString - Chuỗi ngày.
 * @returns {Date} Date object đã chuẩn hóa về 00:00:00 UTC.
 * @throws {Error} Nếu chuỗi không hợp lệ.
 */
function parseDateOnly(dateString) {
  if (!dateString) {
    throw new Error('Chuỗi ngày không được để trống.');
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Chuỗi ngày không hợp lệ: "${dateString}".`);
  }
  // Chuẩn hóa về 00:00:00 UTC để so sánh chính xác
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}
