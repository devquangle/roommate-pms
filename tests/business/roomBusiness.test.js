import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RoomBusiness } from '../../src/business/roomBusiness.js';
import { ROOM_STATUS } from '../../src/constants/index.js';

// Mock Repository
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

describe('RoomBusiness', () => {
  let roomRepo;
  let roomBusiness;

  beforeEach(() => {
    roomRepo = new MockRepository([
      { id: 'r-1', name: 'P.101', price: 2000000, status: ROOM_STATUS.AVAILABLE, maxTenants: 2 },
      { id: 'r-2', name: 'P.102', price: 2500000, status: ROOM_STATUS.RENTED, maxTenants: 3 }
    ]);
    roomBusiness = new RoomBusiness(roomRepo);
  });

  describe('createRoom', () => {
    it('thêm phòng thành công nếu dữ liệu hợp lệ', () => {
      const newRoom = roomBusiness.createRoom({
        name: 'P.103', price: 3000000, maxTenants: 4, area: 20
      });
      expect(newRoom.id).toBeDefined();
      expect(newRoom.name).toBe('P.103');
      expect(newRoom.status).toBe(ROOM_STATUS.AVAILABLE);
      expect(roomRepo.getAll().length).toBe(3);
    });

    it('báo lỗi nếu trùng tên phòng (ROOM-01)', () => {
      expect(() => {
        roomBusiness.createRoom({ name: ' P.101 ', price: 2000000, maxTenants: 2 });
      }).toThrowError(/ROOM-01: Tên phòng đã tồn tại/);
    });

    it('báo lỗi nếu giá phòng <= 0 (ROOM-02)', () => {
      expect(() => {
        roomBusiness.createRoom({ name: 'P.999', price: -500, maxTenants: 2 });
      }).toThrowError(/ROOM-02/);
    });
    
    it('báo lỗi nếu sức chứa < 1 (ROOM-05)', () => {
      expect(() => {
        roomBusiness.createRoom({ name: 'P.999', price: 2000, maxTenants: 0 });
      }).toThrowError(/ROOM-05/);
    });
  });

  describe('updateRoom', () => {
    it('cập nhật phòng thành công', () => {
      const updated = roomBusiness.updateRoom('r-1', {
        name: 'P.101 updated', price: 2200000, maxTenants: 4
      });
      expect(updated.name).toBe('P.101 updated');
      expect(updated.price).toBe(2200000);
    });

    it('báo lỗi khi đổi tên trùng với phòng khác', () => {
      expect(() => {
        roomBusiness.updateRoom('r-1', {
          name: 'P.102', price: 2200000, maxTenants: 4
        });
      }).toThrowError(/ROOM-01: Tên phòng đã tồn tại/);
    });
  });

  describe('deleteRoom', () => {
    it('xóa thành công phòng đang trống', () => {
      const res = roomBusiness.deleteRoom('r-1');
      expect(res).toBe(true);
      expect(roomRepo.getAll().length).toBe(1);
    });

    it('báo lỗi khi xóa phòng đang thuê (ROOM-03)', () => {
      expect(() => {
        roomBusiness.deleteRoom('r-2');
      }).toThrowError(/ROOM-03/);
    });
  });
});
