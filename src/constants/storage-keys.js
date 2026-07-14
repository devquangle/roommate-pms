// src/constants/storage-keys.js

/**
 * Các khóa dùng để đọc/ghi dữ liệu trong LocalStorage.
 * Mỗi collection tương ứng một khóa duy nhất.
 */
export const STORAGE_KEYS = Object.freeze({
  ROOMS: 'rooms',
  TENANTS: 'tenants',
  CONTRACTS: 'contracts',
  METER_READINGS: 'meterReadings',
  SERVICE_CONFIGS: 'serviceConfigs',
  INVOICES: 'invoices',
  PAYMENTS: 'payments',
  APP_SETTINGS: 'appSettings',
});
