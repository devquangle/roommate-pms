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
 * Tạo bản sao sâu (deep clone) của dữ liệu.
 *
 * @param {*} data
 * @returns {*}
 */
function deepClone(data) {
  return typeof structuredClone === 'function'
    ? structuredClone(data)
    : JSON.parse(JSON.stringify(data));
}

/**
 * Ghi một collection vào LocalStorage.
 * Tạo bản sao sâu để không ảnh hưởng object gốc.
 * Tự động chuẩn hóa các trường tính toán (dueDate, remainingDebt, electricityUsage, …).
 *
 * @param {string} key - Khóa LocalStorage.
 * @param {*} data - Dữ liệu cần ghi (mảng hoặc object).
 */
function writeToStorage(key, data) {
  const clone = deepClone(data);

  // 1. Chuẩn hóa hóa đơn: thêm dueDate + remainingDebt nếu thiếu
  if (key === STORAGE_KEYS.INVOICES && Array.isArray(clone)) {
    clone.forEach(inv => {
      // dueDate mặc định = ngày 15 của tháng hóa đơn
      if (!inv.dueDate) {
        inv.dueDate = `${inv.year}-${String(inv.month).padStart(2, '0')}-15`;
      }

      // Tính remainingDebt từ lịch sử thanh toán
      if (inv.remainingDebt === undefined) {
        const relatedPayments = SEED_PAYMENTS.filter(p => p.invoiceId === inv.id);
        const totalPaid = relatedPayments.reduce((sum, p) => sum + p.amount, 0);
        inv.remainingDebt = Math.max(0, inv.totalAmount - totalPaid);

        // Tự động xác nhận lại status dựa trên thanh toán thực tế
        if (inv.status !== 'draft' && inv.status !== 'cancelled') {
          if (inv.remainingDebt === 0) {
            inv.status = 'paid';
          } else if (totalPaid > 0) {
            inv.status = 'partial';
          } else {
            inv.status = 'unpaid';
          }
        }
      }
    });
  }

  // 2. Chuẩn hóa chỉ số điện nước: tính sẵn lượng tiêu thụ
  if (key === STORAGE_KEYS.METER_READINGS && Array.isArray(clone)) {
    clone.forEach(r => {
      if (r.electricityUsage === undefined) {
        r.electricityUsage = Math.max(0, r.electricityNew - r.electricityOld);
      }
      if (r.waterUsage === undefined) {
        r.waterUsage = Math.max(0, r.waterNew - r.waterOld);
      }
    });
  }

  localStorage.setItem(key, JSON.stringify(clone));
}

/**
 * Sửa lỗi dữ liệu (Data Repair) cho dữ liệu đã có trong localStorage.
 * Bổ sung các trường bắt buộc bị thiếu mà không ghi đè dữ liệu người dùng.
 *
 * @param {string} key - Khóa localStorage.
 */
function repairExistingData(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;

    const items = JSON.parse(raw);
    if (!Array.isArray(items)) return;

    let modified = false;

    items.forEach(item => {
      // Hợp đồng: bổ sung ngày nếu thiếu
      if (key === STORAGE_KEYS.CONTRACTS) {
        if (!item.startDate) { item.startDate = '2026-01-01'; modified = true; }
        if (!item.endDate)   { item.endDate = '2027-01-01';   modified = true; }
      }

      // Hóa đơn: bổ sung dueDate nếu thiếu
      if (key === STORAGE_KEYS.INVOICES) {
        if (!item.dueDate) {
          item.dueDate = item.month && item.year
            ? `${item.year}-${String(item.month).padStart(2, '0')}-15`
            : '2026-07-31';
          modified = true;
        }
      }

      // Thanh toán: bổ sung date nếu thiếu
      if (key === STORAGE_KEYS.PAYMENTS) {
        if (!item.date) { item.date = '2026-07-15'; modified = true; }
      }

      // Người thuê: chuẩn hóa fullName từ name (legacy)
      if (key === STORAGE_KEYS.TENANTS) {
        if (!item.fullName && item.name) {
          item.fullName = item.name;
          modified = true;
        }
      }
    });

    if (modified) {
      writeToStorage(key, items);
    }
  } catch (e) {
    console.error('[SeedService] Lỗi khi sửa dữ liệu LocalStorage:', e);
  }
}

/**
 * Nạp dữ liệu mẫu vào LocalStorage **chỉ khi chưa có dữ liệu**.
 * Không ghi đè nếu người dùng đã có dữ liệu thực.
 * Nếu đã có dữ liệu, chỉ chạy Data Repair để bổ sung trường thiếu.
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
    } else {
      // Chỉ sửa lỗi dữ liệu, không ghi đè
      repairExistingData(key);
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
