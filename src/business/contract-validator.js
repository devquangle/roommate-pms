// src/business/contract-validator.js

/**
 * Validator thuần cho nghiệp vụ hợp đồng.
 * Không thao tác DOM, không thao tác LocalStorage.
 * Tất cả các hàm nhận dữ liệu đầu vào và trả về kết quả rõ ràng.
 */

import { isEmpty, isNonNegative, isValidDate } from '../utils/validation-utils.js';
import { ROOM_STATUS } from '../constants/statuses.js';
import { hasOverlappingContract } from './contract-utils.js';

/**
 * Validate dữ liệu hợp đồng khi tạo mới hoặc cập nhật.
 *
 * @param {Object} contract - Dữ liệu hợp đồng cần validate.
 * @param {string} contract.roomId    - ID phòng (bắt buộc).
 * @param {string} contract.tenantId  - ID người thuê (bắt buộc).
 * @param {string} contract.startDate - Ngày bắt đầu (bắt buộc).
 * @param {string} contract.endDate   - Ngày kết thúc (bắt buộc).
 * @param {number} contract.roomPrice - Giá thuê (>= 0).
 * @param {number} contract.deposit   - Tiền cọc (>= 0).
 * @param {Object} [context={}] - Ngữ cảnh bổ sung.
 * @param {Object} [context.room]              - Thông tin phòng (để kiểm tra trạng thái).
 * @param {Array<Object>} [context.existingContracts] - Hợp đồng hiện có (để kiểm tra trùng).
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateContract(contract, context = {}) {
  const errors = [];

  // ── Trường bắt buộc ──────────────────────────────────────

  if (isEmpty(contract.roomId)) {
    errors.push('Phòng không được để trống.');
  }

  if (isEmpty(contract.tenantId)) {
    errors.push('Người thuê không được để trống.');
  }

  // ── Ngày tháng ───────────────────────────────────────────

  if (isEmpty(contract.startDate)) {
    errors.push('Ngày bắt đầu không được để trống.');
  } else if (!isValidDate(contract.startDate)) {
    errors.push('Ngày bắt đầu không hợp lệ.');
  }

  if (isEmpty(contract.endDate)) {
    errors.push('Ngày kết thúc không được để trống.');
  } else if (!isValidDate(contract.endDate)) {
    errors.push('Ngày kết thúc không hợp lệ.');
  }

  // Ngày kết thúc phải sau ngày bắt đầu
  if (isValidDate(contract.startDate) && isValidDate(contract.endDate)) {
    const start = new Date(contract.startDate).getTime();
    const end = new Date(contract.endDate).getTime();
    if (end <= start) {
      errors.push('Ngày kết thúc phải sau ngày bắt đầu.');
    }
  }

  // ── Giá và cọc ───────────────────────────────────────────

  if (contract.roomPrice === undefined || contract.roomPrice === null || contract.roomPrice === '') {
    errors.push('Giá thuê không được để trống.');
  } else if (!isNonNegative(contract.roomPrice)) {
    errors.push('Giá thuê không được là số âm.');
  }

  if (contract.deposit === undefined || contract.deposit === null || contract.deposit === '') {
    errors.push('Tiền cọc không được để trống.');
  } else if (!isNonNegative(contract.deposit)) {
    errors.push('Tiền cọc không được là số âm.');
  }

  // ── Trạng thái phòng ─────────────────────────────────────

  if (context.room) {
    const room = context.room;
    if (room.status === ROOM_STATUS.MAINTENANCE) {
      errors.push('Không thể ký hợp đồng cho phòng đang bảo trì.');
    }
  }

  // ── Trùng thời gian ──────────────────────────────────────

  if (
    context.existingContracts &&
    !isEmpty(contract.roomId) &&
    isValidDate(contract.startDate) &&
    isValidDate(contract.endDate)
  ) {
    const { overlap, conflictWith } = hasOverlappingContract(
      contract,
      context.existingContracts
    );
    if (overlap) {
      const cId = conflictWith ? conflictWith.id : '';
      errors.push(
        `Hợp đồng trùng thời gian với hợp đồng ${cId} trên cùng phòng.`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate số người thuê không vượt quá sức chứa phòng.
 *
 * @param {Object} room - Thông tin phòng.
 * @param {number} room.maxTenants - Số người tối đa.
 * @param {Array<string>} tenantIds - Danh sách ID người thuê muốn ở phòng này.
 * @returns {{ valid: boolean, errors: string[] }}
 *
 * @example
 * validateOccupancyLimit({ maxTenants: 2 }, ['t-001', 't-002', 't-003'])
 * // → { valid: false, errors: ['Số người thuê (3) vượt quá sức chứa phòng (tối đa 2).'] }
 */
export function validateOccupancyLimit(room, tenantIds = []) {
  const errors = [];

  if (!room) {
    errors.push('Phòng không tồn tại.');
    return { valid: false, errors };
  }

  const max = room.maxTenants || 0;
  const count = tenantIds.length;

  if (count > max) {
    errors.push(
      `Số người thuê (${count}) vượt quá sức chứa phòng (tối đa ${max}).`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
