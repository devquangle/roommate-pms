// tests/business/invoice-flow.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { createRoom, getRoomById } from '../../src/services/room-service.js';
import { createTenant } from '../../src/services/tenant-service.js';
import { createContract } from '../../src/services/contract-service.js';
import { createServiceConfig } from '../../src/services/service-config-service.js';
import { createReading } from '../../src/services/meter-reading-service.js';
import { generateInvoiceForRoom } from '../../src/services/invoice-service.js';
import { ROOM_STATUS, CONTRACT_STATUS } from '../../src/constants/statuses.js';

describe('Invoice Flow Integration Test', () => {
  // Yêu cầu dọn dữ liệu trước mỗi test
  beforeEach(() => {
    localStorage.clear();
  });

  it('should successfully execute the invoice creation flow with correct pricing and snapshot services', () => {
    // 1. Tạo phòng trống (Tạo dữ liệu test độc lập)
    const room = createRoom({
      id: 'P301',
      name: 'Phòng 301',
      floor: 'Tầng 3',
      type: 'standard',
      price: 3000000,
      maxTenants: 3,
      area: 25,
      description: 'Phòng tầng 3'
    });

    // 2. Tạo người thuê
    const tenant = createTenant({
      fullName: 'Phạm Văn C',
      phone: '0981112222',
      idCard: '012345678902',
      email: 'vanc@gmail.com'
    });

    // 3. Ký hợp đồng active (Có 2 xe máy, 2 người ở gồm 1 đại diện + 1 người ở cùng)
    createContract({
      roomId: room.id,
      tenantId: tenant.id,
      startDate: '2026-08-01',
      endDate: '2027-08-01',
      roomPrice: 3000000,
      deposit: 3000000,
      status: CONTRACT_STATUS.ACTIVE,
      coTenantIds: ['co-tenant-1'], // tổng cộng 2 người ở
      vehicles: 2
    });

    // Trạng thái phòng chuyển sang RENTED
    expect(getRoomById(room.id).status).toBe(ROOM_STATUS.RENTED);

    // 4. Tạo cấu hình dịch vụ
    // Điện tiêu thụ: đơn giá 3000 VND / kWh
    createServiceConfig({
      code: 'DIEN',
      name: 'Điện tiêu thụ',
      calcMethod: 'usage',
      unitPrice: 3000,
      unit: 'kWh'
    });

    // Nước tiêu thụ: đơn giá 15000 VND / m3
    createServiceConfig({
      code: 'NUOC',
      name: 'Nước tiêu thụ',
      calcMethod: 'usage',
      unitPrice: 15000,
      unit: 'm3'
    });

    // Internet Wifi: cố định 100000 VND / phòng
    createServiceConfig({
      code: 'WIFI',
      name: 'Mạng Wifi',
      calcMethod: 'fixed',
      unitPrice: 100000,
      unit: 'phòng'
    });

    // Phí gửi xe: theo số lượng xe 50000 VND / xe
    createServiceConfig({
      code: 'XE',
      name: 'Phí gửi xe',
      calcMethod: 'perVehicle',
      unitPrice: 50000,
      unit: 'xe'
    });

    // 5. Ghi chỉ số điện nước tháng 8/2026
    // Điện: cũ 100, mới 150 -> tiêu thụ 50 kWh
    // Nước: cũ 20, mới 32 -> tiêu thụ 12 m3
    const { reading } = createReading({
      roomId: room.id,
      month: 8,
      year: 2026,
      electricityOld: 100,
      electricityNew: 150,
      waterOld: 20,
      waterNew: 32
    });

    // - Điện tiêu thụ đúng: 50 kWh
    // - Nước tiêu thụ đúng: 12 m3
    expect(reading.electricityUsage).toBe(50);
    expect(reading.waterUsage).toBe(12);

    // 6. Tạo hóa đơn tự động tháng 8/2026
    const invoice = generateInvoiceForRoom(room.id, 8, 2026);

    // - Tiền điện đúng: 50 * 3000 = 150000 VND
    expect(invoice.electricityFee).toBe(150000);

    // - Tiền nước đúng: 12 * 15000 = 180000 VND
    expect(invoice.waterFee).toBe(180000);

    // - Tiền phòng lấy từ hợp đồng: 3000000 VND
    expect(invoice.roomFee).toBe(3000000);

    // - Dịch vụ được tính đúng:
    // Mạng Wifi (cố định) = 100000 VND
    // Phí gửi xe (2 xe * 50000) = 100000 VND
    // Tổng otherServicesFee = 200000 VND
    expect(invoice.otherServicesFee).toBe(200000);

    // - Tổng hóa đơn đúng:
    // Tiền phòng (3000000) + Điện (150000) + Nước (180000) + Phí khác (200000) = 3530000 VND
    expect(invoice.totalAmount).toBe(3530000);

    // - Trạng thái ban đầu đúng: 'draft'
    expect(invoice.status).toBe('draft');

    // - Không tạo hóa đơn trùng phòng và tháng.
    expect(() => generateInvoiceForRoom(room.id, 8, 2026)).toThrow(/đã có hóa đơn/);
  });

  // - Không tạo hóa đơn nếu thiếu chỉ số.
  it('should fail to generate invoice when meter reading is missing', () => {
    const room = createRoom({ id: 'P302', name: 'Phòng 302', price: 3000000, maxTenants: 2 });
    const tenant = createTenant({ fullName: 'Trần Văn D', phone: '0901234444' });
    createContract({
      roomId: room.id,
      tenantId: tenant.id,
      startDate: '2026-08-01',
      endDate: '2027-08-01',
      roomPrice: 3000000,
      deposit: 3000000,
      status: CONTRACT_STATUS.ACTIVE
    });

    // Cố tình lập hóa đơn khi chưa ghi điện nước của tháng 8/2026
    expect(() => generateInvoiceForRoom(room.id, 8, 2026)).toThrow(/Chưa có chỉ số điện nước/);
  });
});
