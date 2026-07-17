// src/services/service-config-service.js

import * as StorageService from './storage-service.js';
import { STORAGE_KEYS } from '../constants/storage-keys.js';
import { generateId } from '../utils/id-utils.js';
import { toNumberOrDefault } from '../utils/number-utils.js';
import {
  validateServiceConfig,
  normalizeServiceCode
} from '../business/service-config-validator.js';

const KEY = STORAGE_KEYS.SERVICE_CONFIGS;
const INVOICES_KEY = STORAGE_KEYS.INVOICES;

/**
 * Lấy toàn bộ danh sách cấu hình dịch vụ.
 *
 * @returns {Array<Object>}
 */
export function getServiceConfigs() {
  return StorageService.getAll(KEY);
}

/**
 * Lấy cấu hình dịch vụ theo ID.
 *
 * @param {string} id
 * @returns {Object|null}
 */
export function getServiceConfigById(id) {
  return StorageService.getById(KEY, id);
}

/**
 * Tạo cấu hình dịch vụ mới.
 *
 * @param {Object} data
 * @returns {Object}
 * @throws {Error}
 */
export function createServiceConfig(data) {
  const existing = getServiceConfigs();
  const result = validateServiceConfig(data, existing);

  if (!result.valid) {
    throw new Error(result.errors.join(' '));
  }

  const newConfig = {
    id: generateId('s-'),
    code: normalizeServiceCode(data.code),
    name: data.name.trim(),
    calcMethod: data.calcMethod,
    unitPrice: toNumberOrDefault(data.unitPrice, 0),
    unit: data.unit.trim(),
    status: data.status || 'active',
    startDate: data.startDate || new Date().toISOString().split('T')[0],
    endDate: data.endDate || '',
    description: (data.description || '').trim(),
    createdAt: new Date().toISOString()
  };

  return StorageService.create(KEY, newConfig);
}

/**
 * Cập nhật cấu hình dịch vụ.
 *
 * @param {string} id
 * @param {Object} data
 * @returns {Object}
 * @throws {Error}
 */
export function updateServiceConfig(id, data) {
  const config = getServiceConfigById(id);
  if (!config) {
    throw new Error('Dịch vụ không tồn tại.');
  }

  const existing = getServiceConfigs();
  const merged = { ...config, ...data };
  const result = validateServiceConfig(merged, existing, id);

  if (!result.valid) {
    throw new Error(result.errors.join(' '));
  }

  const changes = {
    code: normalizeServiceCode(merged.code),
    name: merged.name.trim(),
    calcMethod: merged.calcMethod,
    unitPrice: toNumberOrDefault(merged.unitPrice, config.unitPrice),
    unit: merged.unit.trim(),
    description: (merged.description || '').trim(),
    startDate: merged.startDate || config.startDate || '',
    endDate: merged.endDate !== undefined ? merged.endDate : (config.endDate || ''),
    status: merged.status || config.status || 'active'
  };

  return StorageService.update(KEY, id, changes);
}

/**
 * Kiểm tra xem dịch vụ đã được sử dụng trong bất kỳ hóa đơn nào chưa.
 *
 * @param {Object} config - Cấu hình dịch vụ cần kiểm tra.
 * @returns {boolean}
 */
export function isServiceUsedInInvoices(config) {
  if (!config) return false;
  const invoices = StorageService.getAll(INVOICES_KEY);
  const normalizedCode = normalizeServiceCode(config.code || config.id);
  const nameLower = config.name.toLowerCase();

  return invoices.some(inv => {
    if (!Array.isArray(inv.serviceDetails)) return false;
    return inv.serviceDetails.some(detail => {
      const detailCode = normalizeServiceCode(detail.code || detail.serviceId || '');
      const detailName = (detail.name || '').toLowerCase();
      return (detailCode === normalizedCode || detailName === nameLower);
    });
  });
}

/**
 * Xóa cấu hình dịch vụ.
 * Không cho xóa nếu dịch vụ đã từng xuất hiện trong hóa đơn.
 *
 * @param {string} id
 * @returns {boolean}
 * @throws {Error}
 */
export function deleteServiceConfig(id) {
  const config = getServiceConfigById(id);
  if (!config) {
    throw new Error('Dịch vụ không tồn tại.');
  }

  if (isServiceUsedInInvoices(config)) {
    throw new Error('Không thể xóa dịch vụ đã được sử dụng trong hóa đơn. Vui lòng chọn ngưng áp dụng.');
  }

  const removed = StorageService.remove(KEY, id);
  if (!removed) {
    throw new Error('Xóa dịch vụ thất bại.');
  }
  return true;
}

/**
 * Ngưng áp dụng dịch vụ.
 *
 * @param {string} id
 * @returns {Object}
 */
export function deactivateServiceConfig(id) {
  const config = getServiceConfigById(id);
  if (!config) {
    throw new Error('Dịch vụ không tồn tại.');
  }
  return StorageService.update(KEY, id, { status: 'inactive' });
}

/**
 * Kích hoạt lại dịch vụ.
 *
 * @param {string} id
 * @returns {Object}
 */
export function activateServiceConfig(id) {
  const config = getServiceConfigById(id);
  if (!config) {
    throw new Error('Dịch vụ không tồn tại.');
  }
  return StorageService.update(KEY, id, { status: 'active' });
}

/**
 * Tìm kiếm dịch vụ theo từ khóa.
 *
 * @param {string} keyword
 * @returns {Array<Object>}
 */
export function searchServiceConfigs(keyword) {
  const list = getServiceConfigs();
  if (!keyword || keyword.trim() === '') {
    return list;
  }
  const kw = keyword.trim().toLowerCase();
  return list.filter(item => {
    const code = (item.code || '').toLowerCase();
    const name = (item.name || '').toLowerCase();
    const desc = (item.description || '').toLowerCase();
    return code.includes(kw) || name.includes(kw) || desc.includes(kw);
  });
}

/**
 * Lọc dịch vụ.
 *
 * @param {Object} filters
 * @param {string} [filters.status] - 'active' | 'inactive'
 * @param {string} [filters.calcMethod] - 'usage' | 'fixed' | 'perPerson' | 'perVehicle' | 'manual'
 * @returns {Array<Object>}
 */
export function filterServiceConfigs(filters = {}) {
  let list = getServiceConfigs();

  if (filters.status) {
    list = list.filter(item => item.status === filters.status);
  }
  if (filters.calcMethod) {
    list = list.filter(item => item.calcMethod === filters.calcMethod);
  }

  return list;
}
