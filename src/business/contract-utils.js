// src/business/contract-utils.js

/**
 * Các hàm tiện ích thuần cho nghiệp vụ hợp đồng.
 * Không thao tác DOM, không thao tác LocalStorage.
 * Tất cả đều là pure functions — dễ viết unit test.
 */

import { CONTRACT_STATUS } from '../constants/statuses.js';

/**
 * Kiểm tra hai khoảng thời gian có giao nhau hay không.
 * Hai khoảng [startA, endA] và [startB, endB] giao nhau khi startA < endB VÀ startB < endA.
 *
 * @param {string|Date} startA - Ngày bắt đầu khoảng A.
 * @param {string|Date} endA   - Ngày kết thúc khoảng A.
 * @param {string|Date} startB - Ngày bắt đầu khoảng B.
 * @param {string|Date} endB   - Ngày kết thúc khoảng B.
 * @returns {boolean} true nếu hai khoảng giao nhau.
 *
 * @example
 * isDateRangeOverlap('2026-01-01', '2026-06-30', '2026-03-01', '2026-12-31') // true
 * isDateRangeOverlap('2026-01-01', '2026-06-30', '2026-07-01', '2026-12-31') // false
 */
export function isDateRangeOverlap(startA, endA, startB, endB) {
  const sA = new Date(startA).getTime();
  const eA = new Date(endA).getTime();
  const sB = new Date(startB).getTime();
  const eB = new Date(endB).getTime();

  if (isNaN(sA) || isNaN(eA) || isNaN(sB) || isNaN(eB)) {
    return false;
  }

  return sA < eB && sB < eA;
}

/**
 * Kiểm tra hợp đồng mới có trùng thời gian với hợp đồng hiện có trên cùng phòng không.
 * Chỉ xét các hợp đồng active hoặc chưa terminated trên cùng roomId.
 *
 * @param {Object} newContract - Hợp đồng mới (hoặc đang sửa).
 * @param {string} newContract.roomId - ID phòng.
 * @param {string} newContract.startDate - Ngày bắt đầu.
 * @param {string} newContract.endDate   - Ngày kết thúc.
 * @param {string} [newContract.id]      - ID hợp đồng (loại trừ khi update).
 * @param {Array<Object>} existingContracts - Danh sách hợp đồng hiện có.
 * @returns {{ overlap: boolean, conflictWith: Object|null }}
 */
export function hasOverlappingContract(newContract, existingContracts = []) {
  const conflicting = existingContracts.find(existing => {
    // Bỏ qua chính nó (khi update)
    if (newContract.id && existing.id === newContract.id) return false;

    // Chỉ xét cùng phòng
    if (existing.roomId !== newContract.roomId) return false;

    // Bỏ qua hợp đồng đã thanh lý
    if (existing.status === CONTRACT_STATUS.TERMINATED) return false;

    // Kiểm tra giao nhau
    return isDateRangeOverlap(
      newContract.startDate, newContract.endDate,
      existing.startDate, existing.endDate
    );
  });

  return {
    overlap: !!conflicting,
    conflictWith: conflicting || null,
  };
}

/**
 * Xác định trạng thái hợp đồng dựa trên ngày hiện tại.
 * Nếu hợp đồng đã được thanh lý (terminated), giữ nguyên.
 *
 * @param {Object} contract - Hợp đồng cần xác định trạng thái.
 * @param {string|Date} [currentDate=new Date()] - Ngày hiện tại.
 * @returns {string} Trạng thái: 'active' | 'expired' | 'terminated'.
 *
 * @example
 * determineContractStatus({ startDate: '2026-01-01', endDate: '2027-01-01', status: 'active' }, '2026-07-15')
 * // → 'active'
 *
 * determineContractStatus({ startDate: '2025-01-01', endDate: '2026-01-01', status: 'active' }, '2026-07-15')
 * // → 'expired'
 */
export function determineContractStatus(contract, currentDate = new Date()) {
  // Giữ nguyên nếu đã thanh lý
  if (contract.status === CONTRACT_STATUS.TERMINATED) {
    return CONTRACT_STATUS.TERMINATED;
  }

  const now = new Date(currentDate).getTime();
  const end = new Date(contract.endDate).getTime();
  const start = new Date(contract.startDate).getTime();

  if (isNaN(now) || isNaN(end) || isNaN(start)) {
    return contract.status || CONTRACT_STATUS.EXPIRED;
  }

  // Chưa bắt đầu hoặc đang trong thời hạn
  if (now < end && now >= start) {
    return CONTRACT_STATUS.ACTIVE;
  }

  // Chưa bắt đầu (ngày hiện tại trước startDate)
  if (now < start) {
    return CONTRACT_STATUS.ACTIVE;
  }

  // Đã quá endDate
  return CONTRACT_STATUS.EXPIRED;
}

/**
 * Kiểm tra hợp đồng có đang hiệu lực không.
 *
 * @param {Object} contract
 * @param {string|Date} [currentDate=new Date()]
 * @returns {boolean}
 */
export function isContractActive(contract, currentDate = new Date()) {
  return determineContractStatus(contract, currentDate) === CONTRACT_STATUS.ACTIVE;
}

/**
 * Kiểm tra hợp đồng có sắp hết hạn không.
 *
 * @param {Object} contract
 * @param {string|Date} [currentDate=new Date()] - Ngày hiện tại.
 * @param {number} [warningDays=30] - Số ngày cảnh báo trước khi hết hạn.
 * @returns {boolean} true nếu hợp đồng đang active và endDate trong vòng warningDays.
 *
 * @example
 * // contract.endDate = '2026-08-01', currentDate = '2026-07-15', warningDays = 30
 * isContractExpiringSoon(contract, '2026-07-15', 30) // true (17 ngày nữa hết hạn)
 */
export function isContractExpiringSoon(contract, currentDate = new Date(), warningDays = 30) {
  // Chỉ cảnh báo hợp đồng đang active
  if (!isContractActive(contract, currentDate)) {
    return false;
  }

  const now = new Date(currentDate).getTime();
  const end = new Date(contract.endDate).getTime();

  if (isNaN(now) || isNaN(end)) {
    return false;
  }

  const daysRemaining = (end - now) / (1000 * 60 * 60 * 24);
  return daysRemaining >= 0 && daysRemaining <= warningDays;
}
