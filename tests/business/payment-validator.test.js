// tests/business/payment-validator.test.js
import { describe, it, expect } from 'vitest';
import { validatePayment, canDeletePayment } from '../../src/business/payment-validator.js';

describe('PaymentValidator', () => {
  describe('validatePayment', () => {
    // - Thanh toán hợp lệ.
    it('should pass when amount is positive and less than or equal to remaining debt', () => {
      const payment = { amount: 500000, method: 'transfer', date: '2026-07-18' };
      const invoice = { totalAmount: 1000000, paidAmount: 0, status: 'unpaid' };
      const res = validatePayment(payment, invoice);
      expect(res.valid).toBe(true);
      expect(res.errors.length).toBe(0);
    });

    // - Thanh toán bằng 0.
    it('should fail when payment amount is zero', () => {
      const payment = { amount: 0, method: 'transfer', date: '2026-07-18' };
      const invoice = { totalAmount: 1000000, paidAmount: 0, status: 'unpaid' };
      const res = validatePayment(payment, invoice);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Số tiền thanh toán phải lớn hơn 0.');
    });

    // - Thanh toán âm.
    it('should fail when payment amount is negative', () => {
      const payment = { amount: -100000, method: 'transfer', date: '2026-07-18' };
      const invoice = { totalAmount: 1000000, paidAmount: 0, status: 'unpaid' };
      const res = validatePayment(payment, invoice);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Số tiền thanh toán phải lớn hơn 0.');
    });

    // - Thanh toán vượt công nợ.
    it('should fail when payment amount exceeds remaining debt', () => {
      const payment = { amount: 800000, method: 'transfer', date: '2026-07-18' };
      const invoice = { totalAmount: 1000000, paidAmount: 400000, status: 'partial' }; // Nợ còn lại = 600000
      const res = validatePayment(payment, invoice);
      expect(res.valid).toBe(false);
      expect(res.errors.some(err => err.includes('không được vượt quá công nợ còn lại'))).toBe(true);
    });

    // - Thanh toán hóa đơn đã hủy.
    it('should fail when paying for a cancelled invoice', () => {
      const payment = { amount: 500000, method: 'transfer', date: '2026-07-18' };
      const invoice = { totalAmount: 1000000, paidAmount: 0, status: 'cancelled' };
      const res = validatePayment(payment, invoice);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Không thể thanh toán cho hóa đơn đã hủy.');
    });

    // - Thanh toán hóa đơn đã trả đủ.
    it('should fail when paying for an invoice that is already paid in full', () => {
      const payment = { amount: 100000, method: 'transfer', date: '2026-07-18' };
      const invoice = { totalAmount: 1000000, paidAmount: 1000000, status: 'paid' };
      const res = validatePayment(payment, invoice);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Không thể thanh toán thêm cho hóa đơn đã trả đủ.');
    });
  });

  describe('canDeletePayment', () => {
    it('should allow deletion of a payment on an active invoice', () => {
      const payment = { id: 'p-1', amount: 500000 };
      const invoice = { status: 'unpaid' };
      const res = canDeletePayment(payment, invoice);
      expect(res.valid).toBe(true);
    });

    it('should reject deletion of a payment on a cancelled invoice', () => {
      const payment = { id: 'p-1', amount: 500000 };
      const invoice = { status: 'cancelled' };
      const res = canDeletePayment(payment, invoice);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Không thể xóa giao dịch của hóa đơn đã hủy.');
    });
  });
});
