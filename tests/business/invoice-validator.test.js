// tests/business/invoice-validator.test.js
import { describe, it, expect } from 'vitest';
import { validateInvoice } from '../../src/business/invoice-validator.js';

describe('InvoiceValidator', () => {
  const getBaseInvoice = () => ({
    roomId: 'room-101',
    month: 7,
    year: 2026,
    dueDate: '2026-07-25',
    roomFee: 3000000,
    electricityFee: 150000,
    waterFee: 150000,
    otherServicesFee: 100000,
    totalAmount: 3300000,
    discount: 100000,
    paidAmount: 0,
    remainingDebt: 3300000,
    serviceDetails: [
      { name: 'Dịch vụ cố định', total: 50000 },
      { name: 'Dịch vụ theo người', total: 50000 }
    ]
  });

  describe('validateInvoice - Required Test Cases (1-15)', () => {
    // 1. Tính tiền điện.
    it('1. should validate electricityFee properly when non-negative', () => {
      const invoice = { ...getBaseInvoice(), electricityFee: 150000 };
      const res = validateInvoice(invoice);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    // 2. Tính tiền nước.
    it('2. should validate waterFee properly when non-negative', () => {
      const invoice = { ...getBaseInvoice(), waterFee: 150000 };
      const res = validateInvoice(invoice);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    // 3. Tính dịch vụ cố định.
    it('3. should validate fixed service fee in serviceDetails properly', () => {
      const invoice = {
        ...getBaseInvoice(),
        serviceDetails: [{ name: 'Internet cố định', total: 100000 }]
      };
      const res = validateInvoice(invoice);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    // 4. Tính dịch vụ theo người.
    it('4. should validate per person service fee in serviceDetails properly', () => {
      const invoice = {
        ...getBaseInvoice(),
        serviceDetails: [{ name: 'Vệ sinh theo người', total: 150000 }]
      };
      const res = validateInvoice(invoice);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    // 5. Tính tổng các khoản.
    it('5. should pass validation when all fee components sum up correctly with valid totalAmount', () => {
      const invoice = getBaseInvoice();
      const res = validateInvoice(invoice);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    // 6. Áp dụng giảm giá.
    it('6. should validate valid discount amount (discount <= subtotal)', () => {
      const invoice = { ...getBaseInvoice(), discount: 200000 };
      const res = validateInvoice(invoice);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    // 7. Giảm giá bằng 0.
    it('7. should pass validation when discount is 0', () => {
      const invoice = { ...getBaseInvoice(), discount: 0 };
      const res = validateInvoice(invoice);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    // 8. Giảm giá lớn hơn tạm tính phải báo lỗi.
    it('8. should report error when discount is greater than subtotal', () => {
      const invoice = {
        ...getBaseInvoice(),
        roomFee: 3000000,
        electricityFee: 150000,
        waterFee: 150000,
        otherServicesFee: 100000,
        discount: 4000000 // Subtotal = 3400000 < discount (4000000)
      };
      const res = validateInvoice(invoice);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Giảm giá (discount) không được lớn hơn tổng tạm tính.');
    });

    // 9. Tính còn nợ.
    it('9. should validate remainingDebt properly when non-negative', () => {
      const invoice = { ...getBaseInvoice(), remainingDebt: 3300000 };
      const res = validateInvoice(invoice);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    // 10. Chưa thanh toán.
    it('10. should validate unpaid invoice (paidAmount = 0)', () => {
      const invoice = { ...getBaseInvoice(), paidAmount: 0, remainingDebt: 3300000 };
      const res = validateInvoice(invoice);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    // 11. Thanh toán một phần.
    it('11. should validate partially paid invoice (0 < paidAmount < totalAmount)', () => {
      const invoice = { ...getBaseInvoice(), paidAmount: 1000000, remainingDebt: 2300000 };
      const res = validateInvoice(invoice);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    // 12. Đã thanh toán.
    it('12. should validate fully paid invoice (paidAmount >= totalAmount)', () => {
      const invoice = { ...getBaseInvoice(), paidAmount: 3300000, remainingDebt: 0 };
      const res = validateInvoice(invoice);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    // 13. Quá hạn.
    it('13. should validate invoice having a valid dueDate regardless of past date', () => {
      const invoicePastDue = { ...getBaseInvoice(), dueDate: '2026-07-01' };
      const res = validateInvoice(invoicePastDue);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    // 14. Tổng tiền không được âm.
    it('14. should report error when totalAmount or fee components are negative', () => {
      const invoiceWithNegativeTotal = { ...getBaseInvoice(), totalAmount: -100000 };
      const resTotal = validateInvoice(invoiceWithNegativeTotal);
      expect(resTotal.valid).toBe(false);
      expect(resTotal.errors).toContain('Tổng tiền (totalAmount) phải là số không âm.');

      const invoiceWithNegativeRoomFee = { ...getBaseInvoice(), roomFee: -3000000 };
      const resRoomFee = validateInvoice(invoiceWithNegativeRoomFee);
      expect(resRoomFee.valid).toBe(false);
      expect(resRoomFee.errors).toContain('Tiền phòng (roomFee) phải là số không âm.');
    });

    // 15. Không chấp nhận NaN.
    it('15. should report error when numerical fee, discount, or total is NaN', () => {
      const invoiceWithNaNRoomFee = { ...getBaseInvoice(), roomFee: NaN };
      const resRoom = validateInvoice(invoiceWithNaNRoomFee);
      expect(resRoom.valid).toBe(false);
      expect(resRoom.errors).toContain('Tiền phòng (roomFee) phải là số không âm.');

      const invoiceWithNaNDiscount = { ...getBaseInvoice(), discount: 'invalid_number' };
      const resDiscount = validateInvoice(invoiceWithNaNDiscount);
      expect(resDiscount.valid).toBe(false);
      expect(resDiscount.errors).toContain('Giảm giá (discount) phải là số không âm.');

      const invoiceWithNaNTotal = { ...getBaseInvoice(), totalAmount: 'abc' };
      const resTotal = validateInvoice(invoiceWithNaNTotal);
      expect(resTotal.valid).toBe(false);
      expect(resTotal.errors).toContain('Tổng tiền (totalAmount) phải là số không âm.');
    });
  });

  describe('validateInvoice - General Edge Cases', () => {
    it('should fail validation when invoice object is null or not an object', () => {
      const resNull = validateInvoice(null);
      expect(resNull.valid).toBe(false);
      expect(resNull.errors).toContain('Dữ liệu hóa đơn không hợp lệ.');

      const resString = validateInvoice('invalid');
      expect(resString.valid).toBe(false);
      expect(resString.errors).toContain('Dữ liệu hóa đơn không hợp lệ.');
    });

    it('should fail validation when required fields (roomId, month, year, dueDate, roomFee, totalAmount) are missing or invalid', () => {
      const invoice = {
        roomId: '',
        month: 13,
        year: 1999,
        dueDate: 'invalid-date',
        roomFee: '',
        totalAmount: ''
      };
      const res = validateInvoice(invoice);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Mã phòng (roomId) không được để trống.');
      expect(res.errors).toContain('Tháng (month) phải là số nguyên từ 1 đến 12.');
      expect(res.errors).toContain('Năm (year) phải là số nguyên >= 2000.');
      expect(res.errors).toContain('Hạn thanh toán (dueDate) không phải là ngày hợp lệ.');
      expect(res.errors).toContain('Tiền phòng (roomFee) không được để trống.');
      expect(res.errors).toContain('Tổng tiền (totalAmount) không được để trống.');
    });

    it('should fail validation when serviceDetails elements have empty name or negative total', () => {
      const invoice = {
        ...getBaseInvoice(),
        serviceDetails: [
          { name: '', total: 50000 },
          { name: 'Rác', total: -20000 }
        ]
      };
      const res = validateInvoice(invoice);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Mục dịch vụ #1: Tên dịch vụ (name) không được để trống.');
      expect(res.errors).toContain('Mục dịch vụ #2: Thành tiền (total) phải là số không âm.');
    });
  });
});

