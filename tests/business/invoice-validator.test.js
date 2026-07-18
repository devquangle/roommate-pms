// tests/business/invoice-validator.test.js
import { describe, it, expect } from 'vitest';
import { validateInvoice } from '../../src/business/invoice-validator.js';

describe('InvoiceValidator', () => {
  describe('validateInvoice', () => {
    // Test trường hợp bình thường
    it('should pass validation with valid invoice data', () => {
      const validInvoice = {
        roomId: 'r-1',
        month: 7,
        year: 2026,
        dueDate: '2026-07-20',
        roomFee: 3000000,
        electricityFee: 150000,
        waterFee: 50000,
        otherServicesFee: 100000,
        totalAmount: 3200000,
        discount: 100000,
        paidAmount: 0,
        remainingDebt: 3200000,
        serviceDetails: [
          { name: 'Wifi', total: 100000 }
        ]
      };
      const res = validateInvoice(validInvoice);
      expect(res.valid).toBe(true);
      expect(res.errors.length).toBe(0);
    });

    // Test trường hợp rỗng & không hợp lệ
    it('should fail validation when roomId is empty', () => {
      const invoice = {
        roomId: '',
        month: 7,
        year: 2026,
        dueDate: '2026-07-20',
        roomFee: 3000000,
        totalAmount: 3000000
      };
      const res = validateInvoice(invoice);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Mã phòng (roomId) không được để trống.');
    });

    it('should fail validation when month is invalid', () => {
      const invoice = {
        roomId: 'r-1',
        month: 13, // Ngoài khoảng 1-12
        year: 2026,
        dueDate: '2026-07-20',
        roomFee: 3000000,
        totalAmount: 3000000
      };
      const res = validateInvoice(invoice);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Tháng (month) phải là số nguyên từ 1 đến 12.');
    });

    it('should fail validation when year is invalid', () => {
      const invoice = {
        roomId: 'r-1',
        month: 7,
        year: 1999, // Nhỏ hơn 2000
        dueDate: '2026-07-20',
        roomFee: 3000000,
        totalAmount: 3000000
      };
      const res = validateInvoice(invoice);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Năm (year) phải là số nguyên >= 2000.');
    });

    it('should fail validation when dueDate is invalid format', () => {
      const invoice = {
        roomId: 'r-1',
        month: 7,
        year: 2026,
        dueDate: 'abc', // Không phải ngày hợp lệ
        roomFee: 3000000,
        totalAmount: 3000000
      };
      const res = validateInvoice(invoice);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Hạn thanh toán (dueDate) không phải là ngày hợp lệ.');
    });

    it('should fail validation when roomFee is negative', () => {
      const invoice = {
        roomId: 'r-1',
        month: 7,
        year: 2026,
        dueDate: '2026-07-20',
        roomFee: -3000000, // Số âm
        totalAmount: 3000000
      };
      const res = validateInvoice(invoice);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Tiền phòng (roomFee) phải là số không âm.');
    });

    it('should fail validation when discount is greater than subtotal', () => {
      const invoice = {
        roomId: 'r-1',
        month: 7,
        year: 2026,
        dueDate: '2026-07-20',
        roomFee: 3000000,
        electricityFee: 150000,
        totalAmount: 3150000,
        discount: 3500000 // Lớn hơn tạm tính (3150000)
      };
      const res = validateInvoice(invoice);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Giảm giá (discount) không được lớn hơn tổng tạm tính.');
    });

    it('should fail validation when serviceDetails elements are invalid', () => {
      const invoice = {
        roomId: 'r-1',
        month: 7,
        year: 2026,
        dueDate: '2026-07-20',
        roomFee: 3000000,
        totalAmount: 3000000,
        serviceDetails: [
          { name: '', total: 10000 }, // Trống tên
          { name: 'Internet', total: -50000 } // Thành tiền âm
        ]
      };
      const res = validateInvoice(invoice);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Mục dịch vụ #1: Tên dịch vụ (name) không được để trống.');
      expect(res.errors).toContain('Mục dịch vụ #2: Thành tiền (total) phải là số không âm.');
    });
  });
});
