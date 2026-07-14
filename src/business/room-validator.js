// src/business/room-validator.js

import { isEmpty, isNonNegative, isPositive } from '../utils/validation-utils.js';
import { ROOM_STATUS } from '../constants/statuses.js';

/**
 * Chuẩn hóa mã phòng: trim, uppercase.
 * Dùng trước mọi phép so sánh trùng lặp.
 *
 * @param {string} name - Mã phòng gốc.
 * @returns {string} Mã phòng đã chuẩn hóa.
 */
export function normalizeName(name) {
  if (typeof name !== 'string') return '';
  return name.trim().toUpperCase();
}

/**
 * Validate dữ liệu phòng khi tạo mới hoặc cập nhật.
 *
 * @param {Object} data - Dữ liệu phòng cần validate.
 * @param {Array<Object>} existingRooms - Danh sách phòng hiện có (để kiểm tra trùng).
 * @param {string|null} [excludeId=null] - ID phòng cần loại trừ khi kiểm tra trùng (dùng khi update).
 * @returns {{ valid: boolean, errors: string[] }} Kết quả validation.
 */
export function validateRoom(data, existingRooms = [], excludeId = null) {
  const errors = [];

  // Mã phòng (name) bắt buộc
  if (isEmpty(data.name)) {
    errors.push('Mã phòng không được để trống.');
  } else {
    // Kiểm tra trùng mã phòng (so sánh sau khi chuẩn hóa)
    const normalized = normalizeName(data.name);
    const isDuplicate = existingRooms.some(
      room => room.id !== excludeId && normalizeName(room.name) === normalized
    );
    if (isDuplicate) {
      errors.push('Mã phòng đã tồn tại trong hệ thống.');
    }
  }

  // Giá thuê không âm
  if (data.price === undefined || data.price === null || data.price === '') {
    errors.push('Giá thuê không được để trống.');
  } else if (!isNonNegative(data.price)) {
    errors.push('Giá thuê không được là số âm.');
  }

  // Số người tối đa > 0
  if (data.maxTenants === undefined || data.maxTenants === null || data.maxTenants === '') {
    errors.push('Số người tối đa không được để trống.');
  } else if (!isPositive(data.maxTenants)) {
    errors.push('Số người tối đa phải lớn hơn 0.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate trước khi xóa phòng.
 * Không cho xóa phòng đang có hợp đồng hiệu lực.
 *
 * @param {Object} room - Phòng cần xóa.
 * @param {Array<Object>} contracts - Danh sách hợp đồng.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateDeleteRoom(room, contracts = []) {
  const errors = [];

  if (!room) {
    errors.push('Phòng không tồn tại.');
    return { valid: false, errors };
  }

  const hasActiveContract = contracts.some(
    c => c.roomId === room.id && c.status === 'active'
  );
  if (hasActiveContract) {
    errors.push('Không thể xóa phòng đang có hợp đồng hiệu lực.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate chuyển trạng thái phòng.
 *
 * @param {Object} room - Phòng hiện tại.
 * @param {string} newStatus - Trạng thái mới.
 * @param {Array<Object>} contracts - Danh sách hợp đồng.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateStatusChange(room, newStatus, contracts = []) {
  const errors = [];

  if (!room) {
    errors.push('Phòng không tồn tại.');
    return { valid: false, errors };
  }

  const validStatuses = Object.values(ROOM_STATUS);
  if (!validStatuses.includes(newStatus)) {
    errors.push(`Trạng thái "${newStatus}" không hợp lệ.`);
    return { valid: false, errors };
  }

  const hasActiveContract = contracts.some(
    c => c.roomId === room.id && c.status === 'active'
  );

  // Không cho chuyển thành available nếu đang có HĐ active
  if (newStatus === ROOM_STATUS.AVAILABLE && hasActiveContract) {
    errors.push('Không thể chuyển phòng thành trống khi đang có hợp đồng hiệu lực.');
  }

  // Không cho thuê phòng đang bảo trì
  if (newStatus === ROOM_STATUS.RENTED && room.status === ROOM_STATUS.MAINTENANCE) {
    errors.push('Không thể cho thuê phòng đang trong trạng thái bảo trì.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
