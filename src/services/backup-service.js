// src/services/backup-service.js

import * as StorageService from './storage-service.js';
import { STORAGE_KEYS } from '../constants/storage-keys.js';
import { validateBackupData } from '../business/import-validator.js';
import { resetToSeedData } from './seed-service.js';

// Bản đồ ánh xạ giữa các key trong file JSON sao lưu (camelCase sạch) và các key LocalStorage thực tế
export const BACKUP_KEY_MAP = {
  rooms: STORAGE_KEYS.ROOMS,
  tenants: STORAGE_KEYS.TENANTS,
  contracts: STORAGE_KEYS.CONTRACTS,
  meterReadings: STORAGE_KEYS.METER_READINGS,
  serviceConfigs: STORAGE_KEYS.SERVICE_CONFIGS,
  invoices: STORAGE_KEYS.INVOICES,
  payments: STORAGE_KEYS.PAYMENTS,
  appSettings: STORAGE_KEYS.APP_SETTINGS
};

/**
 * Xuất toàn bộ dữ liệu ứng dụng hiện tại thành đối tượng JSON.
 *
 * @returns {Object} Đối tượng chứa tất cả các collection.
 */
export function exportData() {
  const backup = {};
  for (const [backupKey, storageKey] of Object.entries(BACKUP_KEY_MAP)) {
    const raw = localStorage.getItem(storageKey);
    backup[backupKey] = StorageService.safeParse(raw, backupKey === 'appSettings' ? null : []);
  }
  return backup;
}

/**
 * Tải file sao lưu dữ liệu (.json) về máy khách.
 * Tên file có dạng: roommate_backup_YYYYMMDD_HHMMSS.json
 */
export function downloadBackup() {
  const data = exportData();
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });

  // Định dạng ngày giờ: YYYYMMDD_HHMMSS
  const now = new Date();
  const YYYY = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const DD = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const filename = `roommate_backup_${YYYY}${MM}${DD}_${hh}${mm}${ss}.json`;

  // Tạo thẻ click ngầm để tải file
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Đọc nội dung file JSON được người dùng tải lên.
 *
 * @param {File} file
 * @returns {Promise<Object>}
 */
export function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Chưa chọn file sao lưu.'));
      return;
    }
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      reject(new Error('Định dạng file không đúng. Yêu cầu tải lên file có đuôi .json'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        resolve(parsed);
      } catch {
        reject(new Error('Không thể đọc file. Cú pháp JSON của file bị lỗi.'));
      }
    };
    reader.onerror = () => reject(new Error('Lỗi khi đọc file.'));
    reader.readAsText(file);
  });
}

/**
 * Tạo một bản sao lưu tạm thời vào LocalStorage trước khi tiến hành ghi đè dữ liệu.
 * Đề phòng trường hợp ghi đè xảy ra sự cố có thể rollback.
 */
export function createBackupBeforeImport() {
  const currentData = exportData();
  localStorage.setItem('roommate_backup_rollback', JSON.stringify(currentData));
}

/**
 * Khôi phục dữ liệu từ bản sao lưu tạm thời đề phòng sự cố import.
 */
export function rollbackImport() {
  const rawRollback = localStorage.getItem('roommate_backup_rollback');
  if (!rawRollback) return;
  try {
    const backup = JSON.parse(rawRollback);
    resetAllData();
    for (const [backupKey, storageKey] of Object.entries(BACKUP_KEY_MAP)) {
      if (backup[backupKey] !== undefined) {
        localStorage.setItem(storageKey, JSON.stringify(backup[backupKey]));
      }
    }
  } catch (e) {
    console.error('[BackupService] Lỗi rollback dữ liệu:', e);
  }
}

/**
 * Xóa sạch toàn bộ dữ liệu hiện có trong LocalStorage của RoomMate.
 */
export function resetAllData() {
  for (const storageKey of Object.values(BACKUP_KEY_MAP)) {
    localStorage.removeItem(storageKey);
  }
}

/**
 * Khôi phục lại dữ liệu mẫu gốc (Seed Data).
 */
export function restoreSeedData() {
  resetToSeedData();
}

/**
 * Nhập khẩu dữ liệu từ đối tượng JSON vào LocalStorage.
 *
 * @param {Object} data - Dữ liệu đã được validate.
 * @param {Object} options
 * @param {boolean} [options.overwrite=false] - Ghi đè toàn bộ dữ liệu cũ.
 * @param {boolean} [options.merge=false] - Gộp dữ liệu (cập nhật nếu trùng ID, tạo mới nếu chưa có).
 * @throws {Error} Nếu dữ liệu không hợp lệ.
 */
export function importData(data, options = { overwrite: false, merge: true }) {
  // 1. Kiểm tra validation cấu trúc dữ liệu trước khi thay đổi bất kỳ thứ gì
  const valResult = validateBackupData(data);
  if (!valResult.valid) {
    throw new Error(`Nhập dữ liệu thất bại: ${valResult.errors.join(' ')}`);
  }

  // 2. Xử lý ghi đè (Overwrite)
  if (options.overwrite) {
    // Lưu backup đề phòng
    createBackupBeforeImport();
    
    try {
      // Xóa và ghi đè
      resetAllData();

      for (const [backupKey, storageKey] of Object.entries(BACKUP_KEY_MAP)) {
        if (data[backupKey] !== undefined) {
          localStorage.setItem(storageKey, JSON.stringify(data[backupKey]));
        }
      }

      return { success: true, mode: 'overwrite' };
    } catch (err) {
      // Khôi phục lại dữ liệu cũ từ rollback
      rollbackImport();
      throw new Error(`Ghi đè dữ liệu thất bại: ${err.message}. Đã khôi phục dữ liệu cũ.`);
    }
  }

  // 3. Xử lý gộp dữ liệu (Merge)
  if (options.merge) {
    for (const [backupKey, storageKey] of Object.entries(BACKUP_KEY_MAP)) {
      if (data[backupKey] === undefined) continue;

      if (backupKey === 'appSettings') {
        // Ghi đè cấu hình ứng dụng
        localStorage.setItem(storageKey, JSON.stringify(data[backupKey]));
        continue;
      }

      // Xử lý các collection mảng
      const currentList = StorageService.getAll(storageKey);
      const importList = data[backupKey];

      importList.forEach(importItem => {
        const index = currentList.findIndex(item => item.id === importItem.id);
        if (index !== -1) {
          // Trùng ID -> Cập nhật ghi đè phần tử cũ
          currentList[index] = { ...currentList[index], ...importItem };
        } else {
          // Chưa có ID -> Thêm mới
          currentList.push(importItem);
        }
      });

      localStorage.setItem(storageKey, JSON.stringify(currentList));
    }

    return { success: true, mode: 'merge' };
  }

  throw new Error('Chưa chọn phương thức nhập dữ liệu (ghi đè hoặc gộp).');
}
