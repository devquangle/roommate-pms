// src/services/seed-service.js

import { STORAGE_KEYS } from '../constants/storage-keys.js';
import {
  SEED_ROOMS,
  SEED_TENANTS,
  SEED_CONTRACTS,
  SEED_METER_READINGS,
  SEED_SERVICE_CONFIGS,
  SEED_INVOICES,
  SEED_PAYMENTS,
  SEED_APP_SETTINGS,
} from '../data/seed-data.js';

/**
 * Danh sách các collection chính và dữ liệu seed tương ứng.
 * Mỗi entry là [key trong localStorage, mảng dữ liệu mẫu].
 */
const SEED_MAP = [
  [STORAGE_KEYS.ROOMS,           SEED_ROOMS],
  [STORAGE_KEYS.TENANTS,         SEED_TENANTS],
  [STORAGE_KEYS.CONTRACTS,       SEED_CONTRACTS],
  [STORAGE_KEYS.METER_READINGS,  SEED_METER_READINGS],
  [STORAGE_KEYS.SERVICE_CONFIGS, SEED_SERVICE_CONFIGS],
  [STORAGE_KEYS.INVOICES,        SEED_INVOICES],
  [STORAGE_KEYS.PAYMENTS,        SEED_PAYMENTS],
];

/**
 * Kiểm tra xem một key đã có dữ liệu trong LocalStorage chưa.
 *
 * @param {string} key - Khóa LocalStorage.
 * @returns {boolean} true nếu key tồn tại và chứa mảng có phần tử.
 */
function hasData(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}

/**
 * Ghi một collection vào LocalStorage.
 * Tạo bản sao sâu (structuredClone hoặc JSON round-trip) để không ảnh hưởng object gốc.
 *
 * @param {string} key - Khóa LocalStorage.
 * @param {*} data - Dữ liệu cần ghi (mảng hoặc object).
 */
function writeToStorage(key, data) {
  const clone = typeof structuredClone === 'function'
    ? structuredClone(data)
    : JSON.parse(JSON.stringify(data));
  localStorage.setItem(key, JSON.stringify(clone));
}

/**
 * Nạp dữ liệu mẫu vào LocalStorage **chỉ khi chưa có dữ liệu**.
 * Không ghi đè nếu người dùng đã có dữ liệu thực.
 *
 * @returns {{ seeded: boolean, keys: string[] }}
 *   - seeded: true nếu có ít nhất 1 collection được nạp.
 *   - keys: danh sách các key đã được nạp.
 */
export function seedIfEmpty() {
  const seededKeys = [];

  for (const [key, data] of SEED_MAP) {
    if (!hasData(key)) {
      writeToStorage(key, data);
      seededKeys.push(key);
    }
  }

  // AppSettings là object, kiểm tra riêng
  if (!localStorage.getItem(STORAGE_KEYS.APP_SETTINGS)) {
    writeToStorage(STORAGE_KEYS.APP_SETTINGS, SEED_APP_SETTINGS);
    seededKeys.push(STORAGE_KEYS.APP_SETTINGS);
  }

  return {
    seeded: seededKeys.length > 0,
    keys: seededKeys,
  };
}

/**
 * Xóa toàn bộ dữ liệu hiện tại và nạp lại dữ liệu mẫu.
 * ⚠️ Hành động này không thể hoàn tác.
 *
 * @returns {{ keys: string[] }} Danh sách các key đã được reset.
 */
export function resetToSeedData() {
  const resetKeys = [];

  for (const [key, data] of SEED_MAP) {
    writeToStorage(key, data);
    resetKeys.push(key);
  }

  writeToStorage(STORAGE_KEYS.APP_SETTINGS, SEED_APP_SETTINGS);
  resetKeys.push(STORAGE_KEYS.APP_SETTINGS);

  return { keys: resetKeys };
}
