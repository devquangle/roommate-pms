/**
 * Generate a unique ID (random alphanumeric string)
 * @returns {string}
 */
export function generateId() {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

/**
 * Validate that required fields are present in an object
 * @param {Object} obj
 * @param {string[]} fields
 * @throws {Error} if any field is missing or empty
 */
export function validateRequired(obj, fields) {
  for (const field of fields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
      throw new Error(`Field "${field}" is required.`);
    }
  }
}

/**
 * Format date to YYYY-MM-DD
 * @param {Date|string} date
 * @returns {string}
 */
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

/**
 * Validate billing month format (YYYY-MM)
 * @param {string} monthStr
 * @returns {boolean}
 */
export function isValidBillingMonth(monthStr) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(monthStr);
}
