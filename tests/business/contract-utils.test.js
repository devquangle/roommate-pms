// tests/business/contract-utils.test.js
import { describe, it, expect } from 'vitest';
import {
  isDateRangeOverlap,
  hasOverlappingContract,
  determineContractStatus,
  isContractActive,
  isContractExpiringSoon
} from '../../src/business/contract-utils.js';

describe('ContractUtils', () => {
  describe('isDateRangeOverlap', () => {
    // - Hai khoảng thời gian không trùng.
    it('should return false when two date ranges do not overlap', () => {
      expect(isDateRangeOverlap('2026-01-01', '2026-06-30', '2026-07-01', '2026-12-31')).toBe(false);
    });

    // - Trùng một phần.
    it('should return true when date ranges overlap partially', () => {
      expect(isDateRangeOverlap('2026-01-01', '2026-06-30', '2026-05-01', '2026-08-01')).toBe(true);
    });

    // - Trùng hoàn toàn.
    it('should return true when date ranges overlap completely', () => {
      expect(isDateRangeOverlap('2026-01-01', '2026-06-30', '2026-02-01', '2026-05-01')).toBe(true);
    });

    // - Ngày bắt đầu bằng ngày kết thúc hợp đồng cũ.
    it('should return false when the start date of the new range matches the end date of the old range', () => {
      expect(isDateRangeOverlap('2026-01-01', '2026-06-30', '2026-06-30', '2026-12-31')).toBe(false);
    });
  });

  describe('hasOverlappingContract', () => {
    // - Hai hợp đồng khác phòng không bị xem là trùng.
    it('should return false when contracts belong to different rooms even if dates overlap', () => {
      const newContract = { roomId: 'room-1', startDate: '2026-02-01', endDate: '2026-05-01' };
      const existing = [
        { id: 'c-1', roomId: 'room-2', startDate: '2026-01-01', endDate: '2026-06-30', status: 'active' }
      ];
      expect(hasOverlappingContract(newContract, existing).overlap).toBe(false);
    });

    it('should return true when contracts belong to same room and dates overlap', () => {
      const newContract = { roomId: 'room-1', startDate: '2026-02-01', endDate: '2026-05-01' };
      const existing = [
        { id: 'c-1', roomId: 'room-1', startDate: '2026-01-01', endDate: '2026-06-30', status: 'active' }
      ];
      expect(hasOverlappingContract(newContract, existing).overlap).toBe(true);
    });
  });

  describe('determineContractStatus & isContractActive', () => {
    // - Hợp đồng đang hiệu lực.
    it('should return active for contract currently in progress', () => {
      const contract = { startDate: '2026-01-01', endDate: '2026-12-31', status: 'active' };
      expect(determineContractStatus(contract, '2026-07-15')).toBe('active');
      expect(isContractActive(contract, '2026-07-15')).toBe(true);
    });

    // - Hợp đồng đã hết hạn.
    it('should return expired for contract past its end date', () => {
      const contract = { startDate: '2026-01-01', endDate: '2026-12-31', status: 'active' };
      expect(determineContractStatus(contract, '2027-01-15')).toBe('expired');
      expect(isContractActive(contract, '2027-01-15')).toBe(false);
    });
  });

  describe('isContractExpiringSoon', () => {
    // - Hợp đồng sắp hết hạn.
    it('should return true when contract is active and expires within warning days', () => {
      const contract = { startDate: '2026-01-01', endDate: '2026-08-01', status: 'active' };
      expect(isContractExpiringSoon(contract, '2026-07-15', 30)).toBe(true); // 17 ngày nữa hết hạn
    });

    it('should return false when contract is active but expires after warning days', () => {
      const contract = { startDate: '2026-01-01', endDate: '2026-09-15', status: 'active' };
      expect(isContractExpiringSoon(contract, '2026-07-15', 30)).toBe(false); // 62 ngày nữa hết hạn
    });
  });
});
