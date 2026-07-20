// tests/business/contract-utils.test.js
import { describe, it, expect } from 'vitest';
import {
  isDateRangeOverlap,
  hasOverlappingContract,
  determineContractStatus,
  isContractActive,
  isContractExpiringSoon
} from '../../src/business/contract-utils.js';
import { CONTRACT_STATUS } from '../../src/constants/statuses.js';

describe('ContractUtils', () => {
  describe('isDateRangeOverlap', () => {
    // 1. Hai khoảng thời gian không trùng.
    it('1. should return false when two date ranges do not overlap at all', () => {
      expect(isDateRangeOverlap('2026-01-01', '2026-06-30', '2026-07-01', '2026-12-31')).toBe(false);
      expect(isDateRangeOverlap('2026-07-01', '2026-12-31', '2026-01-01', '2026-06-30')).toBe(false);
    });

    // 2. Trùng một phần.
    it('2. should return true when two date ranges overlap partially', () => {
      expect(isDateRangeOverlap('2026-01-01', '2026-06-30', '2026-05-01', '2026-08-01')).toBe(true);
      expect(isDateRangeOverlap('2026-05-01', '2026-08-01', '2026-01-01', '2026-06-30')).toBe(true);
    });

    // 3. Trùng hoàn toàn.
    it('3. should return true when one date range completely encloses or equals another', () => {
      expect(isDateRangeOverlap('2026-01-01', '2026-12-31', '2026-03-01', '2026-09-30')).toBe(true);
      expect(isDateRangeOverlap('2026-01-01', '2026-06-30', '2026-01-01', '2026-06-30')).toBe(true);
    });

    // 4. Ngày bắt đầu bằng ngày kết thúc hợp đồng cũ.
    it('4. should return false when the start date of the new range equals the end date of the old range', () => {
      expect(isDateRangeOverlap('2026-01-01', '2026-06-30', '2026-06-30', '2026-12-31')).toBe(false);
      expect(isDateRangeOverlap('2026-06-30', '2026-12-31', '2026-01-01', '2026-06-30')).toBe(false);
    });

    it('should return false when invalid dates are provided', () => {
      expect(isDateRangeOverlap('invalid', '2026-06-30', '2026-05-01', '2026-08-01')).toBe(false);
    });
  });

  describe('hasOverlappingContract', () => {
    // 6. Hai hợp đồng khác phòng không bị xem là trùng.
    it('6. should return false when contracts belong to different rooms even with identical dates', () => {
      const newContract = { roomId: 'room-101', startDate: '2026-01-01', endDate: '2026-06-30' };
      const existingContracts = [
        { id: 'c-1', roomId: 'room-102', startDate: '2026-01-01', endDate: '2026-06-30', status: 'active' }
      ];
      const res = hasOverlappingContract(newContract, existingContracts);
      expect(res.overlap).toBe(false);
      expect(res.conflictWith).toBeNull();
    });

    it('should detect overlap for same room and return conflicting contract', () => {
      const newContract = { roomId: 'room-101', startDate: '2026-02-01', endDate: '2026-05-01' };
      const existingContracts = [
        { id: 'c-1', roomId: 'room-101', startDate: '2026-01-01', endDate: '2026-06-30', status: 'active' }
      ];
      const res = hasOverlappingContract(newContract, existingContracts);
      expect(res.overlap).toBe(true);
      expect(res.conflictWith.id).toBe('c-1');
    });

    it('should ignore self when updating contract with same ID', () => {
      const newContract = { id: 'c-1', roomId: 'room-101', startDate: '2026-01-01', endDate: '2026-06-30' };
      const existingContracts = [
        { id: 'c-1', roomId: 'room-101', startDate: '2026-01-01', endDate: '2026-06-30', status: 'active' }
      ];
      const res = hasOverlappingContract(newContract, existingContracts);
      expect(res.overlap).toBe(false);
    });

    it('should ignore terminated contracts during overlap check', () => {
      const newContract = { roomId: 'room-101', startDate: '2026-02-01', endDate: '2026-05-01' };
      const existingContracts = [
        { id: 'c-1', roomId: 'room-101', startDate: '2026-01-01', endDate: '2026-06-30', status: CONTRACT_STATUS.TERMINATED }
      ];
      const res = hasOverlappingContract(newContract, existingContracts);
      expect(res.overlap).toBe(false);
    });
  });

  describe('determineContractStatus & isContractActive', () => {
    // 9. Hợp đồng đang hiệu lực.
    it('9. should identify active contract when current date is within contract term', () => {
      const contract = { startDate: '2026-01-01', endDate: '2026-12-31', status: 'active' };
      const currentDate = '2026-07-15';
      expect(determineContractStatus(contract, currentDate)).toBe('active');
      expect(isContractActive(contract, currentDate)).toBe(true);
    });

    // 11. Hợp đồng đã hết hạn.
    it('11. should identify expired contract when current date is past end date', () => {
      const contract = { startDate: '2025-01-01', endDate: '2026-01-01', status: 'active' };
      const currentDate = '2026-07-15';
      expect(determineContractStatus(contract, currentDate)).toBe('expired');
      expect(isContractActive(contract, currentDate)).toBe(false);
    });

    it('should preserve terminated status regardless of current date', () => {
      const contract = { startDate: '2026-01-01', endDate: '2026-12-31', status: CONTRACT_STATUS.TERMINATED };
      expect(determineContractStatus(contract, '2026-07-15')).toBe(CONTRACT_STATUS.TERMINATED);
      expect(isContractActive(contract, '2026-07-15')).toBe(false);
    });
  });

  describe('isContractExpiringSoon', () => {
    // 10. Hợp đồng sắp hết hạn.
    it('10. should return true when active contract endDate is within warning days', () => {
      const contract = { startDate: '2026-01-01', endDate: '2026-08-01', status: 'active' };
      const currentDate = '2026-07-15'; // 17 ngày nữa hết hạn <= 30 ngày
      expect(isContractExpiringSoon(contract, currentDate, 30)).toBe(true);
    });

    it('10. should return false when active contract endDate is beyond warning days', () => {
      const contract = { startDate: '2026-01-01', endDate: '2026-09-30', status: 'active' };
      const currentDate = '2026-07-15'; // 77 ngày nữa hết hạn > 30 ngày
      expect(isContractExpiringSoon(contract, currentDate, 30)).toBe(false);
    });

    it('10. should return false when contract is expired or terminated', () => {
      const expiredContract = { startDate: '2025-01-01', endDate: '2026-01-01', status: 'active' };
      expect(isContractExpiringSoon(expiredContract, '2026-07-15', 30)).toBe(false);
    });
  });
});

