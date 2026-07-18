// tests/business/rental-flow.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { createRoom, getRoomById } from '../../src/services/room-service.js';
import { createTenant, getTenantById } from '../../src/services/tenant-service.js';
import { createContract, getContractById, activateContract } from '../../src/services/contract-service.js';
import { ROOM_STATUS, CONTRACT_STATUS } from '../../src/constants/statuses.js';

describe('Rental Business Flow Integration Test', () => {
  // Yêu cầu dọn dữ liệu trước mỗi test
  beforeEach(() => {
    localStorage.clear();
  });

  // Test luồng nghiệp vụ đầy đủ
  it('should successfully execute the full rental flow: create empty room -> create tenant -> create draft contract -> activate contract -> room becomes rented', () => {
    // 1. Tạo phòng trống (Tạo dữ liệu test độc lập)
    const room = createRoom({
      id: 'P201',
      name: 'Phòng 201',
      floor: 'Tầng 2',
      type: 'standard',
      price: 2000000,
      maxTenants: 2,
      area: 20,
      description: 'Phòng trống tầng 2'
    });
    expect(room.id).toBe('P201'); // Đã chuẩn hóa ID
    expect(room.status).toBe(ROOM_STATUS.AVAILABLE);

    // 2. Tạo người thuê
    const tenant = createTenant({
      fullName: 'Trần Văn B',
      phone: '0912345678',
      idCard: '012345678901',
      email: 'vanb@gmail.com',
      address: 'Đà Nẵng'
    });
    expect(tenant.id).toBeDefined();

    // 3. Lập hợp đồng nháp
    const contract = createContract({
      roomId: room.id,
      tenantId: tenant.id,
      startDate: '2026-08-01',
      endDate: '2027-08-01',
      roomPrice: 2000000,
      deposit: 2000000,
      status: CONTRACT_STATUS.DRAFT // Lập hợp đồng ở trạng thái Nháp
    });

    // - Kiểm tra hợp đồng được lưu.
    const savedContract = getContractById(contract.id);
    expect(savedContract).not.toBeNull();
    expect(savedContract.roomId).toBe('P201');

    // - Kiểm tra trạng thái hợp đồng lúc đầu là Draft.
    expect(savedContract.status).toBe(CONTRACT_STATUS.DRAFT);

    // Kiểm tra trạng thái phòng vẫn là trống (AVAILABLE) khi hợp đồng nháp chưa có hiệu lực
    let currentRoom = getRoomById(room.id);
    expect(currentRoom.status).toBe(ROOM_STATUS.AVAILABLE);

    // 4. Kích hoạt hợp đồng
    const activated = activateContract(contract.id);

    // - Kiểm tra trạng thái hợp đồng sau khi kích hoạt.
    expect(activated.status).toBe(CONTRACT_STATUS.ACTIVE);

    // - Kiểm tra trạng thái phòng chuyển thành ĐANG THUÊ (RENTED).
    currentRoom = getRoomById(room.id);
    expect(currentRoom.status).toBe(ROOM_STATUS.RENTED);

    // - Kiểm tra người thuê liên kết đúng.
    expect(activated.tenantId).toBe(tenant.id);
    expect(activated.roomId).toBe(room.id);
  });

  // - Có thêm test không cho ký hợp đồng trùng.
  it('should prevent creating a contract that overlaps in date range on the same room', () => {
    // Tạo phòng & hai người thuê độc lập
    const room = createRoom({ id: 'P202', name: 'Phòng 202', price: 3000000, maxTenants: 2 });
    const tenant1 = createTenant({ fullName: 'Người thuê thứ nhất', phone: '0901112222' });
    const tenant2 = createTenant({ fullName: 'Người thuê thứ hai', phone: '0903334444' });

    // Hợp đồng 1: Active từ 01/08/2026 -> 01/08/2027
    createContract({
      roomId: room.id,
      tenantId: tenant1.id,
      startDate: '2026-08-01',
      endDate: '2027-08-01',
      roomPrice: 3000000,
      deposit: 3000000,
      status: CONTRACT_STATUS.ACTIVE
    });

    // Hợp đồng 2: Cố tình trùng từ 01/10/2026 -> 01/03/2027
    const overlappingContract = {
      roomId: room.id,
      tenantId: tenant2.id,
      startDate: '2026-10-01',
      endDate: '2027-03-01',
      roomPrice: 3000000,
      deposit: 3000000,
      status: CONTRACT_STATUS.ACTIVE
    };

    expect(() => createContract(overlappingContract)).toThrow(/trùng thời gian/);
  });
});
