// src/utils/number-utils.js

/**
 * Chuyển giá trị đầu vào thành number an toàn.
 * Trả về NaN nếu không thể chuyển đổi, KHÔNG ném lỗi.
 *
 * @param {*} value - Giá trị cần chuyển (string, number, null, undefined...).
 * @returns {number} Giá trị số hoặc NaN.
 *
 * @example
 * toNumber('3500000')  // 3500000
 * toNumber('12.5')     // 12.5
 * toNumber('')         // NaN
 * toNumber(null)       // NaN
 * toNumber(42)         // 42
 */
export function toNumber(value) {
  if (value === null || value === undefined || value === '') {
    return NaN;
  }
  const num = Number(value);
  return num;
}

/**
 * Chuyển giá trị đầu vào thành number an toàn.
 * Trả về giá trị mặc định nếu không thể chuyển đổi.
 *
 * @param {*} value - Giá trị cần chuyển.
 * @param {number} [defaultValue=0] - Giá trị trả về nếu chuyển đổi thất bại.
 * @returns {number} Giá trị số hợp lệ.
 *
 * @example
 * toNumberOrDefault('100', 0)    // 100
 * toNumberOrDefault('abc', 0)    // 0
 * toNumberOrDefault(null, -1)    // -1
 */
export function toNumberOrDefault(value, defaultValue = 0) {
  const num = toNumber(value);
  return isNaN(num) ? defaultValue : num;
}
