// src/business/tenant-validator.js

import { isEmpty, isValidPhone } from '../utils/validation-utils.js';

/**
 * Chuẩn hóa số điện thoại: xóa khoảng trắng, dấu gạch ngang, dấu chấm.
 *
 * @param {string} phone
 * @returns {string} Chuỗi SĐT đã chuẩn hóa.
 */
export function normalizePhone(phone) {
  if (typeof phone !== 'string') return '';
  return phone.replace(/[\s\-\.]/g, '').trim();
}

/**
 * Chuẩn hóa số CCCD: xóa khoảng trắng.
 *
 * @param {string} idCard
 * @returns {string} Chuỗi CCCD đã chuẩn hóa.
 */
export function normalizeIdCard(idCard) {
  if (typeof idCard !== 'string') return '';
  return idCard.replace(/\s/g, '').trim();
}

/**
 * Validate dữ liệu người thuê khi tạo mới hoặc cập nhật.
 *
 * @param {Object} data - Dữ liệu cần validate.
 * @param {string} data.fullName - Họ tên (bắt buộc).
 * @param {string} [data.phone] - Số điện thoại.
 * @param {string} [data.idCard] - Số CCCD.
 * @param {Array<Object>} existingTenants - Danh sách người thuê hiện có (để kiểm tra trùng CCCD).
 * @param {string|null} [excludeId=null] - ID người thuê cần loại trừ (dùng khi update).
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateTenant(data, existingTenants = [], excludeId = null) {
  const errors = [];

  // Họ tên bắt buộc
  if (isEmpty(data.fullName)) {
    errors.push('Họ tên không được để trống.');
  }

  // Số điện thoại – nếu nhập thì phải đúng định dạng
  if (!isEmpty(data.phone)) {
    const normalized = normalizePhone(data.phone);
    if (!isValidPhone(normalized)) {
      errors.push('Số điện thoại không đúng định dạng (10 chữ số, bắt đầu bằng 0).');
    }
  }

  // CCCD – nếu nhập thì kiểm tra trùng
  if (!isEmpty(data.idCard)) {
    const normalizedId = normalizeIdCard(data.idCard);
    const isDuplicate = existingTenants.some(
      t => t.id !== excludeId && normalizeIdCard(t.idCard) === normalizedId && normalizedId !== ''
    );
    if (isDuplicate) {
      errors.push('Số CCCD đã tồn tại trong hệ thống.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate trước khi xóa người thuê.
 * Không cho xóa nếu đang có hợp đồng hiệu lực.
 *
 * @param {Object} tenant - Người thuê cần xóa.
 * @param {Array<Object>} contracts - Danh sách hợp đồng.
 * @returns {{ valid: boolean, errors: string[], canArchive: boolean }}
 *   - canArchive: true nếu không thể xóa nhưng có thể lưu trữ.
 */
export function validateDeleteTenant(tenant, contracts = []) {
  const errors = [];

  if (!tenant) {
    errors.push('Người thuê không tồn tại.');
    return { valid: false, errors, canArchive: false };
  }

  const hasActiveContract = contracts.some(
    c => c.tenantId === tenant.id && c.status === 'active'
  );

  if (hasActiveContract) {
    errors.push('Không thể xóa người thuê đang có hợp đồng hiệu lực.');
    return { valid: false, errors, canArchive: true };
  }

  return { valid: true, errors, canArchive: false };
}
