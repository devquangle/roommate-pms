import { describe, it, expect, beforeEach } from 'vitest';
import { TenantBusiness } from '../../src/business/tenantBusiness.js';

class MockRepository {
  constructor(initialData = []) {
    this.data = [...initialData];
  }
  getAll() { return this.data; }
  getById(id) { return this.data.find(i => i.id === id); }
  insert(item) { this.data.push(item); return item; }
  update(id, item) { 
    const idx = this.data.findIndex(i => i.id === id);
    if (idx !== -1) {
      this.data[idx] = { ...this.data[idx], ...item };
      return this.data[idx];
    }
    return null;
  }
  remove(id) {
    const before = this.data.length;
    this.data = this.data.filter(i => i.id !== id);
    return before !== this.data.length;
  }
}

describe('TenantBusiness', () => {
  let tenantRepo;
  let contractRepo;
  let tenantBusiness;

  beforeEach(() => {
    tenantRepo = new MockRepository([
      { id: 't-1', fullName: 'Nguyễn Văn A', phone: '0901234567', idCard: '079099123456' },
      { id: 't-2', fullName: 'Trần Thị B', phone: '0988111222', idCard: '123456789012' }
    ]);
    contractRepo = new MockRepository([
      { id: 'c-1', tenantId: 't-1', status: 'active' }
    ]);
    tenantBusiness = new TenantBusiness(tenantRepo, contractRepo);
  });

  describe('createTenant', () => {
    it('thêm người thuê thành công', () => {
      const newTenant = tenantBusiness.createTenant({
        fullName: 'Lê Văn C', phone: '0912345678', idCard: '011222333444'
      });
      expect(newTenant.id).toBeDefined();
      expect(newTenant.fullName).toBe('Lê Văn C');
      expect(tenantRepo.getAll().length).toBe(3);
    });

    it('báo lỗi nếu trùng CCCD (TENANT-01)', () => {
      expect(() => {
        tenantBusiness.createTenant({
          fullName: 'Trần C', phone: '0912345678', idCard: '079099123456'
        });
      }).toThrowError(/TENANT-01/);
    });

    it('báo lỗi nếu SĐT sai định dạng (TENANT-02)', () => {
      expect(() => {
        tenantBusiness.createTenant({
          fullName: 'Trần C', phone: '0912abc', idCard: '111222333'
        });
      }).toThrowError(/TENANT-02/);
    });
  });

  describe('deleteTenant', () => {
    it('xóa thành công người thuê không có hợp đồng active', () => {
      const res = tenantBusiness.deleteTenant('t-2');
      expect(res).toBe(true);
      expect(tenantRepo.getAll().length).toBe(1);
    });

    it('báo lỗi khi xóa người thuê đang có hợp đồng active (TENANT-03)', () => {
      expect(() => {
        tenantBusiness.deleteTenant('t-1');
      }).toThrowError(/TENANT-03/);
    });
  });
});
