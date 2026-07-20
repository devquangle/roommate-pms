// tests/business/invoice-flow.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { createRoom, getRoomById } from '../../src/services/room-service.js';
import { createTenant } from '../../src/services/tenant-service.js';
import { createContract } from '../../src/services/contract-service.js';
import { createServiceConfig } from '../../src/services/service-config-service.js';
import { createReading } from '../../src/services/meter-reading-service.js';
import { generateInvoiceForRoom } from '../../src/services/invoice-service.js';
import { ROOM_STATUS, CONTRACT_STATUS } from '../../src/constants/statuses.js';

describe('Invoice Business Flow Test', () => {
  // Yêu cầu dọn dữ liệu trước mỗi test
  beforeEach(() => {
    localStorage.clear();
  });

  it('should execute the full invoice creation flow and verify all business rules', () => {
    // 1. Tạo phòng
    const room = createRoom({
      id: 'P101',
      name: 'Phòng 101',
      floor: 'Tầng 1',
      type: 'standard',
      price: 3000000,
      maxTenants: 2,
      area: 25,
      description: 'Phòng tầng 1'
    });

    // 2. Tạo người thuê đại diện
    const tenant = createTenant({
      fullName: 'Nguyễn Văn A',
      phone: '0912345678',
      idCard: '012345678901',
      email: 'nva@gmail.com'
    });

    // 3. Ký hợp đồng hiệu lực (Room Price trong hợp đồng = 3,000,000; có 2 xe máy)
    createContract({
      roomId: room.id,
      tenantId: tenant.id,
      startDate: '2026-08-01',
      endDate: '2027-08-01',
      roomPrice: 3000000,
      deposit: 3000000,
      status: CONTRACT_STATUS.ACTIVE,
      vehicles: 2
    });

    // Kiểm tra phòng đã chuyển sang trạng thái đang thuê (RENTED)
    const rentedRoom = getRoomById(room.id);
    expect(rentedRoom.status).toBe(ROOM_STATUS.RENTED);

    // 4. Tạo cấu hình dịch vụ
    createServiceConfig({
      code: 'DIEN',
      name: 'Điện tiêu thụ',
      calcMethod: 'usage',
      unitPrice: 3000,
      unit: 'kWh'
    });

    createServiceConfig({
      code: 'NUOC',
      name: 'Nước tiêu thụ',
      calcMethod: 'usage',
      unitPrice: 15000,
      unit: 'm3'
    });

    createServiceConfig({
      code: 'WIFI',
      name: 'Mạng Wifi',
      calcMethod: 'fixed',
      unitPrice: 100000,
      unit: 'phòng'
    });

    createServiceConfig({
      code: 'XE',
      name: 'Phí gửi xe',
      calcMethod: 'perVehicle',
      unitPrice: 50000,
      unit: 'xe'
    });

    // 5. Ghi chỉ số điện nước tháng 8/2026
    // - Chỉ số điện: cũ 120, mới 165 (tiêu thụ 45 kWh)
    // - Chỉ số nước: cũ 20, mới 35 (tiêu thụ 15 m3)
    const { reading } = createReading({
      roomId: room.id,
      month: 8,
      year: 2026,
      electricityOld: 120,
      electricityNew: 165,
      waterOld: 20,
      waterNew: 35
    });

    // 1. Kiểm tra Điện tiêu thụ đúng (165 - 120 = 45)
    expect(reading.electricityUsage).toBe(45);

    // 2. Kiểm tra Nước tiêu thụ đúng (35 - 20 = 15)
    expect(reading.waterUsage).toBe(15);

    // 6. Tạo hóa đơn cho phòng tháng 8/2026
    const invoice = generateInvoiceForRoom(room.id, 8, 2026);

    // 3. Kiểm tra Tiền điện đúng (45 kWh * 3,000 VND = 135,000 VND)
    expect(invoice.electricityFee).toBe(135000);

    // 4. Kiểm tra Tiền nước đúng (15 m3 * 15,000 VND = 225,000 VND)
    expect(invoice.waterFee).toBe(225000);

    // 5. Kiểm tra Tiền phòng lấy từ hợp đồng (3,000,000 VND)
    expect(invoice.roomFee).toBe(3000000);

    // 6. Kiểm tra Dịch vụ được tính đúng (Wifi 100,000 + 2 xe * 50,000 = 200,000 VND)
    expect(invoice.otherServicesFee).toBe(200000);

    // 7. Kiểm tra Tổng hóa đơn đúng (3,000,000 + 135,000 + 225,000 + 200,000 = 3,560,000 VND)
    expect(invoice.totalAmount).toBe(3560000);

    // 8. Kiểm tra Trạng thái ban đầu đúng ('draft')
    expect(invoice.status).toBe('draft');

    // 9. Kiểm tra Không tạo hóa đơn trùng phòng và tháng
    expect(() => generateInvoiceForRoom(room.id, 8, 2026)).toThrow(
      `Phòng này đã có hóa đơn trong tháng 8/2026.`
    );
  });

  // 10. Không tạo hóa đơn nếu thiếu chỉ số.
  it('10. should throw error when attempting to generate invoice without meter readings', () => {
    const room = createRoom({
      id: 'P102',
      name: 'Phòng 102',
      price: 3500000,
      maxTenants: 2
    });

    const tenant = createTenant({
      fullName: 'Lê Văn B',
      phone: '0987654321'
    });

    createContract({
      roomId: room.id,
      tenantId: tenant.id,
      startDate: '2026-08-01',
      endDate: '2027-08-01',
      roomPrice: 3500000,
      deposit: 3500000,
      status: CONTRACT_STATUS.ACTIVE
    });

    // Cố tình tạo hóa đơn khi CHƯA ghi chỉ số điện nước cho tháng 8/2026
    expect(() => generateInvoiceForRoom(room.id, 8, 2026)).toThrow(
      `Chưa có chỉ số điện nước của phòng trong tháng 8/2026. Vui lòng ghi chỉ số trước.`
    );
  });
});


