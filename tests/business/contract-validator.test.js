// tests/business/contract-validator.test.js
import { describe, it, expect } from 'vitest';
import { validateContract, validateOccupancyLimit } from '../../src/business/contract-validator.js';
import { ROOM_STATUS } from '../../src/constants/statuses.js';

describe('ContractValidator', () => {
  const getValidContract = () => ({
    roomId: 'room-101',
    tenantId: 'tenant-001',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    roomPrice: 3000000,
    deposit: 3000000
  });

  describe('validateContract', () => {
    it('should pass validation with valid contract data', () => {
      const contract = getValidContract();
      const res = validateContract(contract);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    // 1 & 4. Khoảng thời gian không trùng và ngày bắt đầu = ngày kết thúc hợp đồng cũ.
    it('1 & 4. should pass validation when date range does not overlap with existing contract', () => {
      const contract = {
        ...getValidContract(),
        startDate: '2026-07-01',
        endDate: '2026-12-31'
      };
      const context = {
        existingContracts: [
          { id: 'c-old', roomId: 'room-101', startDate: '2026-01-01', endDate: '2026-07-01', status: 'active' }
        ]
      };
      const res = validateContract(contract, context);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    // 2 & 3. Trùng một phần và trùng hoàn toàn.
    it('2 & 3. should fail validation when date range overlaps with existing contract on same room', () => {
      const contract = {
        ...getValidContract(),
        startDate: '2026-05-01',
        endDate: '2026-10-01'
      };
      const context = {
        existingContracts: [
          { id: 'c-1', roomId: 'room-101', startDate: '2026-01-01', endDate: '2026-06-30', status: 'active' }
        ]
      };
      const res = validateContract(contract, context);
      expect(res.valid).toBe(false);
      expect(res.errors.some(err => err.includes('Hợp đồng trùng thời gian với hợp đồng c-1'))).toBe(true);
    });

    // 5. Ngày kết thúc nhỏ hơn ngày bắt đầu.
    it('5. should report error when end date is before or equal to start date', () => {
      const contractEndDateBeforeStart = {
        ...getValidContract(),
        startDate: '2026-07-01',
        endDate: '2026-06-30'
      };
      const res1 = validateContract(contractEndDateBeforeStart);
      expect(res1.valid).toBe(false);
      expect(res1.errors).toContain('Ngày kết thúc phải sau ngày bắt đầu.');

      const contractSameDates = {
        ...getValidContract(),
        startDate: '2026-07-01',
        endDate: '2026-07-01'
      };
      const res2 = validateContract(contractSameDates);
      expect(res2.valid).toBe(false);
      expect(res2.errors).toContain('Ngày kết thúc phải sau ngày bắt đầu.');
    });

    // 6. Hai hợp đồng khác phòng không bị xem là trùng.
    it('6. should pass validation when existing contract is for a different room', () => {
      const contract = getValidContract();
      const context = {
        existingContracts: [
          { id: 'c-diff', roomId: 'room-102', startDate: '2026-01-01', endDate: '2026-12-31', status: 'active' }
        ]
      };
      const res = validateContract(contract, context);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    // 7. Phòng sửa chữa không được ký hợp đồng.
    it('7. should report error when signing contract for room in maintenance', () => {
      const contract = getValidContract();
      const context = {
        room: { id: 'room-101', status: ROOM_STATUS.MAINTENANCE }
      };
      const res = validateContract(contract, context);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Không thể ký hợp đồng cho phòng đang bảo trì.');
    });

    it('should report error when required fields are missing or invalid', () => {
      const contract = {
        roomId: '',
        tenantId: '',
        startDate: 'invalid',
        endDate: 'invalid',
        roomPrice: -1,
        deposit: -1
      };
      const res = validateContract(contract);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Phòng không được để trống.');
      expect(res.errors).toContain('Người thuê không được để trống.');
      expect(res.errors).toContain('Ngày bắt đầu không hợp lệ.');
      expect(res.errors).toContain('Ngày kết thúc không hợp lệ.');
      expect(res.errors).toContain('Giá thuê không được là số âm.');
      expect(res.errors).toContain('Tiền cọc không được là số âm.');
    });
  });

  describe('validateOccupancyLimit', () => {
    // 8. Số người vượt sức chứa.
    it('8. should report error when tenant count exceeds room capacity', () => {
      const room = { id: 'room-101', maxTenants: 2 };
      const tenantIds = ['tenant-1', 'tenant-2', 'tenant-3']; // 3 người > 2
      const res = validateOccupancyLimit(room, tenantIds);
      expect(res.valid).toBe(false);
      expect(res.errors[0]).toContain('Số người thuê (3) vượt quá sức chứa phòng (tối đa 2).');
    });

    it('8. should pass validation when tenant count is within room capacity', () => {
      const room = { id: 'room-101', maxTenants: 2 };
      const tenantIds = ['tenant-1', 'tenant-2'];
      const res = validateOccupancyLimit(room, tenantIds);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('should report error when room object is missing', () => {
      const res = validateOccupancyLimit(null, ['tenant-1']);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Phòng không tồn tại.');
    });
  });
});

