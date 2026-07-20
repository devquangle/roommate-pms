// tests/business/payment-validator.test.js
import { describe, it, expect } from 'vitest';
import { validatePayment, canDeletePayment } from '../../src/business/payment-validator.js';

describe('PaymentValidator', () => {
  const getValidInvoice = () => ({
    totalAmount: 1000000,
    paidAmount: 0,
    status: 'unpaid'
  });

  const getValidPayment = () => ({
    amount: 500000,
    method: 'transfer',
    date: '2026-07-20'
  });

  describe('validatePayment - Required Test Cases (1-6 & Edge Cases)', () => {
    // 1. Thanh toán hợp lệ.
    it('1. should pass validation for valid payment with positive amount within remaining debt', () => {
      const payment = getValidPayment();
      const invoice = getValidInvoice();
      const res = validatePayment(payment, invoice);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    // 2. Thanh toán bằng 0.
    it('2. should report error when payment amount is 0', () => {
      const payment = { ...getValidPayment(), amount: 0 };
      const invoice = getValidInvoice();
      const res = validatePayment(payment, invoice);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Số tiền thanh toán phải lớn hơn 0.');
    });

    // 3. Thanh toán âm.
    it('3. should report error when payment amount is negative', () => {
      const payment = { ...getValidPayment(), amount: -100000 };
      const invoice = getValidInvoice();
      const res = validatePayment(payment, invoice);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Số tiền thanh toán phải lớn hơn 0.');
    });

    // 4. Thanh toán vượt công nợ.
    it('4. should report error when payment amount exceeds remaining debt', () => {
      const invoice = { totalAmount: 1000000, paidAmount: 400000, status: 'partial' }; // Công nợ còn = 600,000
      const payment = { ...getValidPayment(), amount: 800000 }; // 800,000 > 600,000
      const res = validatePayment(payment, invoice);
      expect(res.valid).toBe(false);
      expect(res.errors.some(err => err.includes('không được vượt quá công nợ còn lại'))).toBe(true);
    });

    // 5. Thanh toán hóa đơn đã hủy.
    it('5. should report error when paying for a cancelled invoice', () => {
      const invoice = { ...getValidInvoice(), status: 'cancelled' };
      const payment = getValidPayment();
      const res = validatePayment(payment, invoice);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Không thể thanh toán cho hóa đơn đã hủy.');
    });

    // 6. Thanh toán hóa đơn đã trả đủ.
    it('6. should report error when paying for an invoice already paid in full', () => {
      const invoice = { totalAmount: 1000000, paidAmount: 1000000, status: 'paid' };
      const payment = { ...getValidPayment(), amount: 100000 };
      const res = validatePayment(payment, invoice);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Không thể thanh toán thêm cho hóa đơn đã trả đủ.');
    });

    it('should report error when paying for a draft invoice', () => {
      const invoice = { ...getValidInvoice(), status: 'draft' };
      const payment = getValidPayment();
      const res = validatePayment(payment, invoice);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Không thể thanh toán cho hóa đơn chưa chốt (bản nháp).');
    });

    it('should report error when payment method or date is missing', () => {
      const paymentNoMethod = { amount: 500000, method: '', date: '2026-07-20' };
      const res1 = validatePayment(paymentNoMethod, getValidInvoice());
      expect(res1.valid).toBe(false);
      expect(res1.errors).toContain('Phương thức thanh toán không được để trống.');

      const paymentNoDate = { amount: 500000, method: 'cash', date: '' };
      const res2 = validatePayment(paymentNoDate, getValidInvoice());
      expect(res2.valid).toBe(false);
      expect(res2.errors).toContain('Ngày thanh toán không được để trống.');
    });

    it('should handle updating existing payment with excludePaymentId correctly', () => {
      const invoice = { totalAmount: 1000000, paidAmount: 500000, status: 'partial' };
      // Giả sử sửa giao dịch 500,000 thành 600,000 (oldAmount = 500,000)
      const payment = { amount: 600000, method: 'transfer', date: '2026-07-20', oldAmount: 500000 };
      const res = validatePayment(payment, invoice, 'payment-1');
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });
  });

  describe('canDeletePayment - Required Test Cases (8 & Deletion Rules)', () => {
    // 8. Xóa giao dịch làm tăng lại công nợ / Kiểm tra cho phép xóa giao dịch.
    it('8. should allow deletion of a payment on an active/unpaid/partial invoice', () => {
      const payment = { id: 'p-1', amount: 500000 };
      const invoice = { status: 'unpaid' };
      const res = canDeletePayment(payment, invoice);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('should reject deletion of a payment on a cancelled invoice', () => {
      const payment = { id: 'p-1', amount: 500000 };
      const invoice = { status: 'cancelled' };
      const res = canDeletePayment(payment, invoice);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Không thể xóa giao dịch của hóa đơn đã hủy.');
    });

    it('should report error when payment or invoice object is missing', () => {
      const resNullPayment = canDeletePayment(null, { status: 'unpaid' });
      expect(resNullPayment.valid).toBe(false);
      expect(resNullPayment.errors).toContain('Giao dịch không tồn tại.');

      const resNullInvoice = canDeletePayment({ id: 'p-1' }, null);
      expect(resNullInvoice.valid).toBe(false);
      expect(resNullInvoice.errors).toContain('Hóa đơn liên quan không tồn tại.');
    });
  });
});

