// src/services/room-service.js

import * as StorageService from './storage-service.js';
import { STORAGE_KEYS } from '../constants/storage-keys.js';
import { ROOM_STATUS, CONTRACT_STATUS } from '../constants/statuses.js';
import { generateId } from '../utils/id-utils.js';
import { toNumberOrDefault } from '../utils/number-utils.js';
import {
  validateRoom,
  validateDeleteRoom,
  validateStatusChange,
  normalizeName,
} from '../business/room-validator.js';

const KEY = STORAGE_KEYS.ROOMS;
const CONTRACTS_KEY = STORAGE_KEYS.CONTRACTS;

// ─── READ ──────────────────────────────────────────────────────

/**
 * Lấy toàn bộ danh sách phòng.
 *
 * @returns {Array<Object>}
 */
export function getRooms() {
  return StorageService.getAll(KEY);
}

/**
 * Lấy một phòng theo ID.
 *
 * @param {string} id
 * @returns {Object|null}
 */
export function getRoomById(id) {
  return StorageService.getById(KEY, id);
}

/**
 * Lấy danh sách phòng đang trống (available).
 *
 * @returns {Array<Object>}
 */
export function getAvailableRooms() {
  return getRooms().filter(room => room.status === ROOM_STATUS.AVAILABLE);
}

// ─── SEARCH & FILTER ───────────────────────────────────────────

/**
 * Tìm kiếm phòng theo từ khóa.
 * So khớp trên mã phòng (name) và mô tả (description), không phân biệt hoa thường.
 *
 * @param {string} keyword - Từ khóa tìm kiếm.
 * @returns {Array<Object>} Danh sách phòng khớp.
 */
export function searchRooms(keyword) {
  if (!keyword || keyword.trim() === '') {
    return getRooms();
  }
  const kw = keyword.trim().toLowerCase();
  return getRooms().filter(room => {
    const name = (room.name || '').toLowerCase();
    const desc = (room.description || '').toLowerCase();
    return name.includes(kw) || desc.includes(kw);
  });
}

/**
 * Lọc phòng theo bộ lọc.
 *
 * @param {Object} filters - Các điều kiện lọc.
 * @param {string} [filters.status] - Lọc theo trạng thái (available | rented | maintenance).
 * @param {number} [filters.minPrice] - Giá tối thiểu.
 * @param {number} [filters.maxPrice] - Giá tối đa.
 * @returns {Array<Object>}
 */
export function filterRooms(filters = {}) {
  let rooms = getRooms();

  if (filters.status) {
    rooms = rooms.filter(r => r.status === filters.status);
  }
  if (filters.minPrice !== undefined && filters.minPrice !== null) {
    const min = Number(filters.minPrice);
    if (!isNaN(min)) {
      rooms = rooms.filter(r => r.price >= min);
    }
  }
  if (filters.maxPrice !== undefined && filters.maxPrice !== null) {
    const max = Number(filters.maxPrice);
    if (!isNaN(max)) {
      rooms = rooms.filter(r => r.price <= max);
    }
  }

  return rooms;
}

// ─── OCCUPANCY ─────────────────────────────────────────────────

/**
 * Lấy thông tin số người đang ở trong phòng.
 * Đếm số hợp đồng active trỏ tới roomId.
 *
 * @param {string} roomId - ID phòng.
 * @returns {{ room: Object|null, activeContracts: number, maxTenants: number }}
 */
export function getRoomOccupancy(roomId) {
  const room = getRoomById(roomId);
  if (!room) {
    return { room: null, activeContracts: 0, maxTenants: 0 };
  }

  const contracts = StorageService.getAll(CONTRACTS_KEY);
  const activeContracts = contracts.filter(
    c => c.roomId === roomId && c.status === CONTRACT_STATUS.ACTIVE
  ).length;

  return {
    room,
    activeContracts,
    maxTenants: room.maxTenants || 0,
  };
}

// ─── CREATE ────────────────────────────────────────────────────

/**
 * Tạo phòng mới.
 *
 * @param {Object} data - Dữ liệu phòng.
 * @param {string} data.name - Mã phòng (bắt buộc, duy nhất).
 * @param {number} data.price - Giá thuê (>= 0).
 * @param {number} data.maxTenants - Số người tối đa (> 0).
 * @param {number} [data.area] - Diện tích.
 * @param {string} [data.description] - Mô tả.
 * @returns {Object} Phòng vừa tạo.
 * @throws {Error} Nếu dữ liệu không hợp lệ.
 */
export function createRoom(data) {
  const existingRooms = getRooms();
  const result = validateRoom(data, existingRooms);

  if (!result.valid) {
    throw new Error(result.errors.join(' '));
  }

  const newRoom = {
    id: generateId('r-'),
    name: normalizeName(data.name),
    price: toNumberOrDefault(data.price, 0),
    area: toNumberOrDefault(data.area, 0),
    status: ROOM_STATUS.AVAILABLE,
    maxTenants: toNumberOrDefault(data.maxTenants, 1),
    description: (data.description || '').trim(),
  };

  return StorageService.create(KEY, newRoom);
}

// ─── UPDATE ────────────────────────────────────────────────────

/**
 * Cập nhật thông tin phòng.
 *
 * @param {string} id - ID phòng cần cập nhật.
 * @param {Object} data - Dữ liệu cập nhật.
 * @returns {Object} Phòng sau khi cập nhật.
 * @throws {Error} Nếu phòng không tồn tại hoặc dữ liệu không hợp lệ.
 */
export function updateRoom(id, data) {
  const room = getRoomById(id);
  if (!room) {
    throw new Error('Phòng không tồn tại.');
  }

  const existingRooms = getRooms();
  const result = validateRoom(data, existingRooms, id);

  if (!result.valid) {
    throw new Error(result.errors.join(' '));
  }

  // Nếu có thay đổi trạng thái, validate thêm
  if (data.status && data.status !== room.status) {
    const contracts = StorageService.getAll(CONTRACTS_KEY);
    const statusResult = validateStatusChange(room, data.status, contracts);
    if (!statusResult.valid) {
      throw new Error(statusResult.errors.join(' '));
    }
  }

  const changes = {
    name: normalizeName(data.name),
    price: toNumberOrDefault(data.price, room.price),
    area: toNumberOrDefault(data.area, room.area),
    maxTenants: toNumberOrDefault(data.maxTenants, room.maxTenants),
    description: data.description !== undefined ? data.description.trim() : room.description,
  };

  // Chỉ đưa status vào changes nếu được truyền
  if (data.status !== undefined) {
    changes.status = data.status;
  }

  return StorageService.update(KEY, id, changes);
}

// ─── DELETE ────────────────────────────────────────────────────

/**
 * Xóa phòng.
 *
 * @param {string} id - ID phòng cần xóa.
 * @returns {boolean} true nếu xóa thành công.
 * @throws {Error} Nếu phòng không tồn tại hoặc đang có hợp đồng hiệu lực.
 */
export function deleteRoom(id) {
  const room = getRoomById(id);
  const contracts = StorageService.getAll(CONTRACTS_KEY);
  const result = validateDeleteRoom(room, contracts);

  if (!result.valid) {
    throw new Error(result.errors.join(' '));
  }

  const removed = StorageService.remove(KEY, id);
  if (!removed) {
    throw new Error('Xóa phòng thất bại.');
  }
  return true;
}
