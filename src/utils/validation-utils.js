// src/utils/validation-utils.js

/**
 * Kiểm tra chuỗi rỗng (null, undefined, chỉ chứa khoảng trắng đều coi là rỗng).
 *
 * @param {*} value - Giá trị cần kiểm tra.
 * @returns {boolean} true nếu rỗng.
 *
 * @example
 * isEmpty('')        // true
 * isEmpty('  ')      // true
 * isEmpty(null)      // true
 * isEmpty(undefined) // true
 * isEmpty('hello')   // false
 */
export function isEmpty(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

/**
 * Kiểm tra số điện thoại Việt Nam cơ bản.
 * Chấp nhận 10 chữ số, bắt đầu bằng 0.
 *
 * @param {string} phone - Chuỗi số điện thoại.
 * @returns {boolean} true nếu hợp lệ.
 *
 * @example
 * isValidPhone('0901234567')  // true
 * isValidPhone('901234567')   // false  (không bắt đầu bằng 0)
 * isValidPhone('090123456')   // false  (chỉ 9 số)
 * isValidPhone('09012345678') // false  (11 số)
 */
export function isValidPhone(phone) {
  if (isEmpty(phone)) return false;
  const regex = /^0\d{9}$/;
  return regex.test(phone.trim());
}

/**
 * Kiểm tra một giá trị số không âm (>= 0).
 *
 * @param {*} value - Giá trị cần kiểm tra.
 * @returns {boolean} true nếu value là number hợp lệ và >= 0.
 *
 * @example
 * isNonNegative(0)     // true
 * isNonNegative(100)   // true
 * isNonNegative(-1)    // false
 * isNonNegative('abc') // false
 */
export function isNonNegative(value) {
  const num = Number(value);
  return !isNaN(num) && num >= 0;
}

/**
 * Kiểm tra một giá trị số dương (> 0).
 *
 * @param {*} value - Giá trị cần kiểm tra.
 * @returns {boolean} true nếu value là number hợp lệ và > 0.
 *
 * @example
 * isPositive(1)     // true
 * isPositive(0)     // false
 * isPositive(-5)    // false
 */
export function isPositive(value) {
  const num = Number(value);
  return !isNaN(num) && num > 0;
}

/**
 * Kiểm tra chuỗi có phải ngày hợp lệ hay không.
 *
 * @param {string} value - Chuỗi ngày cần kiểm tra (ISO hoặc yyyy-mm-dd).
 * @returns {boolean} true nếu hợp lệ.
 *
 * @example
 * isValidDate('2026-07-14')                 // true
 * isValidDate('2026-07-14T00:00:00.000Z')  // true
 * isValidDate('not-a-date')                 // false
 * isValidDate('')                           // false
 */
export function isValidDate(value) {
  if (isEmpty(value)) return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}
