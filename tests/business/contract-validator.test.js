// tests/business/contract-validator.test.js
import { describe, it, expect } from 'vitest';
import { validateContract, validateOccupancyLimit } from '../../src/business/contract-validator.js';
import { ROOM_STATUS } from '../../src/constants/statuses.js';

describe('ContractValidator', () => {
  describe('validateContract', () => {
    // Test trường hợp bình thường
    it('should validate successfully for valid contract data', () => {
      const contract = {
        roomId: 'room-1',
        tenantId: 'tenant-1',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        roomPrice: 3000000,
        deposit: 3000000
      };
      const res = validateContract(contract);
      expect(res.valid).toBe(true);
      expect(res.errors.length).toBe(0);
    });

    // - Ngày kết thúc nhỏ hơn ngày bắt đầu.
    it('should fail when end date is less than or equal to start date', () => {
      const contract = {
        roomId: 'room-1',
        tenantId: 'tenant-1',
        startDate: '2026-07-01',
        endDate: '2026-06-30', // ngày kết thúc trước ngày bắt đầu
        roomPrice: 3000000,
        deposit: 3000000
      };
      const res = validateContract(contract);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Ngày kết thúc phải sau ngày bắt đầu.');
    });

    // - Phòng sửa chữa không được ký hợp đồng.
    it('should fail when signing a contract for a room in maintenance', () => {
      const contract = {
        roomId: 'room-1',
        tenantId: 'tenant-1',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        roomPrice: 3000000,
        deposit: 3000000
      };
      const context = {
        room: { id: 'room-1', status: ROOM_STATUS.MAINTENANCE }
      };
      const res = validateContract(contract, context);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Không thể ký hợp đồng cho phòng đang bảo trì.');
    });

    it('should fail when the contract dates overlap with existing contract', () => {
      const contract = {
        roomId: 'room-1',
        tenantId: 'tenant-2',
        startDate: '2026-02-01',
        endDate: '2026-05-01',
        roomPrice: 3000000,
        deposit: 3000000
      };
      const context = {
        existingContracts: [
          { id: 'c-1', roomId: 'room-1', startDate: '2026-01-01', endDate: '2026-12-31', status: 'active' }
        ]
      };
      const res = validateContract(contract, context);
      expect(res.valid).toBe(false);
      expect(res.errors.some(err => err.includes('Hợp đồng trùng thời gian với hợp đồng c-1'))).toBe(true);
    });
  });

  describe('validateOccupancyLimit', () => {
    // - Số người vượt sức chứa.
    it('should fail when number of tenants exceeds max capacity of the room', () => {
      const room = { id: 'room-1', maxTenants: 2 };
      const tenantIds = ['t-1', 't-2', 't-3']; // 3 người > sức chứa 2
      const res = validateOccupancyLimit(room, tenantIds);
      expect(res.valid).toBe(false);
      expect(res.errors[0]).toContain('Số người thuê (3) vượt quá sức chứa phòng (tối đa 2).');
    });

    it('should pass when number of tenants does not exceed room capacity', () => {
      const room = { id: 'room-1', maxTenants: 2 };
      const tenantIds = ['t-1', 't-2'];
      const res = validateOccupancyLimit(room, tenantIds);
      expect(res.valid).toBe(true);
    });
  });
});
