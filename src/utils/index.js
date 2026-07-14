// src/utils/index.js
export function generateId(prefix = '') {
  return `${prefix}${crypto.randomUUID()}`;
}

export function formatMoney(amount) {
  if (isNaN(amount)) return '0 đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('vi-VN').format(date);
}

export function getCurrentISODate() {
  return new Date().toISOString();
}
