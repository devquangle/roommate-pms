// src/services/tenant-service.js

import * as StorageService from './storage-service.js';
import { STORAGE_KEYS } from '../constants/storage-keys.js';
import { CONTRACT_STATUS, TENANT_STATUS } from '../constants/statuses.js';
import { generateId } from '../utils/id-utils.js';
import {
  validateTenant,
  validateDeleteTenant,
  normalizePhone,
  normalizeIdCard,
} from '../business/tenant-validator.js';

const KEY = STORAGE_KEYS.TENANTS;
const CONTRACTS_KEY = STORAGE_KEYS.CONTRACTS;
const ROOMS_KEY = STORAGE_KEYS.ROOMS;

// ─── READ ──────────────────────────────────────────────────────

/**
 * Lấy danh sách người thuê.
 * Mặc định chỉ trả về người thuê đang hoạt động (không bao gồm đã lưu trữ).
 *
 * @param {{ includeArchived?: boolean }} [options={}]
 * @returns {Array<Object>}
 */
export function getTenants(options = {}) {
  const all = StorageService.getAll(KEY).map(t => {
    // Chuẩn hóa: đảm bảo fullName luôn tồn tại (không xóa name để tránh lỗi tham chiếu)
    if (!t.fullName && t.name) {
      t.fullName = t.name;
    }
    return t;
  });
  if (options.includeArchived) {
    return all;
  }
  return all.filter(t => t.status !== TENANT_STATUS.INACTIVE);
}

/**
 * Lấy một người thuê theo ID (bất kể trạng thái).
 *
 * @param {string} id
 * @returns {Object|null}
 */
export function getTenantById(id) {
  const tenant = StorageService.getById(KEY, id);
  if (tenant && !tenant.fullName && tenant.name) {
    tenant.fullName = tenant.name;
  }
  return tenant;
}

// ─── SEARCH ────────────────────────────────────────────────────

/**
 * Tìm kiếm người thuê theo từ khóa.
 * So khớp trên họ tên, SĐT, CCCD, email (case-insensitive).
 * Chỉ tìm trong danh sách hoạt động (mặc định).
 *
 * @param {string} keyword - Từ khóa tìm kiếm.
 * @param {{ includeArchived?: boolean }} [options={}]
 * @returns {Array<Object>}
 */
export function searchTenants(keyword, options = {}) {
  const tenants = getTenants(options);
  if (!keyword || keyword.trim() === '') {
    return tenants;
  }
  const kw = keyword.trim().toLowerCase();
  return tenants.filter(t => {
    const fullName = (t.fullName || '').toLowerCase();
    const phone = (t.phone || '').toLowerCase();
    const idCard = (t.idCard || '').toLowerCase();
    const email = (t.email || '').toLowerCase();
    return (
      fullName.includes(kw) ||
      phone.includes(kw) ||
      idCard.includes(kw) ||
      email.includes(kw)
    );
  });
}

// ─── RENTAL HISTORY ────────────────────────────────────────────

/**
 * Lấy lịch sử thuê phòng của người thuê.
 * Trả về danh sách hợp đồng kèm thông tin phòng.
 *
 * @param {string} tenantId - ID người thuê.
 * @returns {Array<Object>} Mỗi phần tử gồm contract và room.
 */
export function getTenantRentalHistory(tenantId) {
  const contracts = StorageService.getAll(CONTRACTS_KEY);
  const rooms = StorageService.getAll(ROOMS_KEY);

  return contracts
    .filter(c => c.tenantId === tenantId)
    .map(contract => {
      const room = rooms.find(r => r.id === contract.roomId) || null;
      return { contract, room };
    })
    .sort((a, b) => {
      // Sắp xếp theo startDate giảm dần (mới nhất trước)
      return new Date(b.contract.startDate) - new Date(a.contract.startDate);
    });
}

/**
 * Lấy phòng hiện tại của người thuê (dựa trên hợp đồng active).
 *
 * @param {string} tenantId - ID người thuê.
 * @returns {{ contract: Object, room: Object|null } | null}
 *   null nếu không có hợp đồng active nào.
 */
export function getCurrentRoomOfTenant(tenantId) {
  const contracts = StorageService.getAll(CONTRACTS_KEY);
  const activeContract = contracts.find(
    c => c.tenantId === tenantId && c.status === CONTRACT_STATUS.ACTIVE
  );

  if (!activeContract) return null;

  const rooms = StorageService.getAll(ROOMS_KEY);
  const room = rooms.find(r => r.id === activeContract.roomId) || null;

  return { contract: activeContract, room };
}

// ─── CREATE ────────────────────────────────────────────────────

/**
 * Tạo người thuê mới.
 *
 * @param {Object} data
 * @param {string} data.fullName - Họ tên (bắt buộc).
 * @param {string} [data.phone] - Số điện thoại.
 * @param {string} [data.idCard] - Số CCCD.
 * @param {string} [data.email] - Email.
 * @param {string} [data.address] - Địa chỉ.
 * @returns {Object} Người thuê vừa tạo.
 * @throws {Error} Nếu dữ liệu không hợp lệ.
 */
export function createTenant(data) {
  const existingTenants = StorageService.getAll(KEY);
  const result = validateTenant(data, existingTenants);

  if (!result.valid) {
    throw new Error(result.errors.join(' '));
  }

  const newTenant = {
    id: generateId('t-'),
    fullName: (data.fullName || '').trim(),
    phone: normalizePhone(data.phone || ''),
    idCard: normalizeIdCard(data.idCard || ''),
    email: (data.email || '').trim(),
    address: (data.address || '').trim(),
    dob: data.dob || '',
    gender: data.gender || '',
    occupation: (data.occupation || '').trim(),
    licensePlate: (data.licensePlate || '').trim(),
    vehicleType: (data.vehicleType || '').trim(),
    emergencyName: (data.emergencyName || '').trim(),
    emergencyPhone: normalizePhone(data.emergencyPhone || ''),
    emergencyRelation: (data.emergencyRelation || '').trim(),
    notes: (data.notes || '').trim(),
    status: TENANT_STATUS.ACTIVE,
  };

  return StorageService.create(KEY, newTenant);
}

// ─── UPDATE ────────────────────────────────────────────────────

/**
 * Cập nhật thông tin người thuê.
 *
 * @param {string} id - ID người thuê cần cập nhật.
 * @param {Object} data - Dữ liệu cập nhật.
 * @returns {Object} Người thuê sau khi cập nhật.
 * @throws {Error} Nếu người thuê không tồn tại hoặc dữ liệu không hợp lệ.
 */
export function updateTenant(id, data) {
  const tenant = getTenantById(id);
  if (!tenant) {
    throw new Error('Người thuê không tồn tại.');
  }

  const existingTenants = StorageService.getAll(KEY);
  const result = validateTenant(data, existingTenants, id);

  if (!result.valid) {
    throw new Error(result.errors.join(' '));
  }

  const changes = {
    fullName: (data.fullName || '').trim(),
    phone: normalizePhone(data.phone || ''),
    idCard: normalizeIdCard(data.idCard || ''),
    email: data.email !== undefined ? (data.email || '').trim() : tenant.email,
    address: data.address !== undefined ? (data.address || '').trim() : tenant.address,
    dob: data.dob !== undefined ? data.dob : tenant.dob,
    gender: data.gender !== undefined ? data.gender : tenant.gender,
    occupation: data.occupation !== undefined ? (data.occupation || '').trim() : tenant.occupation,
    licensePlate: data.licensePlate !== undefined ? (data.licensePlate || '').trim() : tenant.licensePlate,
    vehicleType: data.vehicleType !== undefined ? (data.vehicleType || '').trim() : tenant.vehicleType,
    emergencyName: data.emergencyName !== undefined ? (data.emergencyName || '').trim() : tenant.emergencyName,
    emergencyPhone: data.emergencyPhone !== undefined ? normalizePhone(data.emergencyPhone || '') : tenant.emergencyPhone,
    emergencyRelation: data.emergencyRelation !== undefined ? (data.emergencyRelation || '').trim() : tenant.emergencyRelation,
    notes: data.notes !== undefined ? (data.notes || '').trim() : tenant.notes,
  };

  return StorageService.update(KEY, id, changes);
}

// ─── ARCHIVE ───────────────────────────────────────────────────

/**
 * Lưu trữ (archive) người thuê.
 * Chuyển status thành 'inactive' để ẩn khỏi danh sách mặc định
 * nhưng vẫn giữ dữ liệu cho lịch sử.
 *
 * @param {string} id - ID người thuê cần lưu trữ.
 * @returns {Object} Người thuê sau khi lưu trữ.
 * @throws {Error} Nếu người thuê không tồn tại hoặc đã lưu trữ.
 */
export function archiveTenant(id) {
  const tenant = getTenantById(id);
  if (!tenant) {
    throw new Error('Người thuê không tồn tại.');
  }

  if (tenant.status === TENANT_STATUS.INACTIVE) {
    throw new Error('Người thuê đã được lưu trữ trước đó.');
  }

  return StorageService.update(KEY, id, { status: TENANT_STATUS.INACTIVE });
}

// ─── DELETE ────────────────────────────────────────────────────

/**
 * Xóa người thuê.
 *
 * @param {string} id - ID người thuê cần xóa.
 * @returns {boolean} true nếu xóa thành công.
 * @throws {Error} Nếu không thể xóa (có HĐ active). Message kèm gợi ý lưu trữ.
 */
export function deleteTenant(id) {
  const tenant = getTenantById(id);
  const contracts = StorageService.getAll(CONTRACTS_KEY);
  const result = validateDeleteTenant(tenant, contracts);

  if (!result.valid) {
    const message = result.canArchive
      ? result.errors.join(' ') + ' Bạn có thể lưu trữ (archive) thay vì xóa.'
      : result.errors.join(' ');
    throw new Error(message);
  }

  const removed = StorageService.remove(KEY, id);
  if (!removed) {
    throw new Error('Xóa người thuê thất bại.');
  }
  return true;
}
