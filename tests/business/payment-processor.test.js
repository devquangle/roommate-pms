// tests/business/payment-processor.test.js
import { describe, it, expect } from 'vitest';
import {
  calculateTotalPaid,
  calculateRemainingAmount,
  determinePaymentStatus,
  groupPaymentsByMethod
} from '../../src/business/payment-processor.js';

describe('PaymentProcessor', () => {
  describe('calculateTotalPaid', () => {
    // 7. Nhiều giao dịch cộng đúng tổng.
    it('7. should sum multiple positive payment transaction amounts correctly', () => {
      const payments = [
        { amount: 1000000 },
        { amount: 500000 },
        { amount: 300000 }
      ];
      expect(calculateTotalPaid(payments)).toBe(1800000);
    });

    it('should ignore negative or invalid payment amounts in calculateTotalPaid', () => {
      const payments = [
        { amount: 1000000 },
        { amount: -500000 },
        { amount: 'invalid' }
      ];
      expect(calculateTotalPaid(payments)).toBe(1000000);
    });
  });

  describe('calculateRemainingAmount', () => {
    // 8. Xóa giao dịch làm tăng lại công nợ.
    it('8. should increase remaining debt when a payment transaction is removed', () => {
      const total = 2000000;
      const initialPayments = [
        { id: 'p-1', amount: 500000 },
        { id: 'p-2', amount: 300000 }
      ];

      // Công nợ ban đầu = 2000000 - 800000 = 1200000
      const initialRemaining = calculateRemainingAmount(total, initialPayments);
      expect(initialRemaining).toBe(1200000);

      // Xóa giao dịch p-2 (300,000)
      const updatedPayments = initialPayments.filter(p => p.id !== 'p-2');

      // Công nợ mới = 2000000 - 500000 = 1500000 (tăng lại 300k)
      const newRemaining = calculateRemainingAmount(total, updatedPayments);
      expect(newRemaining).toBe(1500000);
      expect(newRemaining).toBeGreaterThan(initialRemaining);
    });
  });

  describe('determinePaymentStatus', () => {
    // 9. Xác định chưa thanh toán.
    it('9. should determine status "unpaid" when no payment transactions exist', () => {
      expect(determinePaymentStatus(1000000, [])).toBe('unpaid');
    });

    // 10. Xác định thanh toán một phần.
    it('10. should determine status "partial" when total paid is greater than 0 but less than invoice total', () => {
      const payments = [{ amount: 400000 }];
      expect(determinePaymentStatus(1000000, payments)).toBe('partial');
    });

    // 11. Xác định đã thanh toán.
    it('11. should determine status "paid" when total paid meets or exceeds invoice total or invoice total is 0', () => {
      expect(determinePaymentStatus(1000000, [{ amount: 1000000 }])).toBe('paid');
      expect(determinePaymentStatus(1000000, [{ amount: 1200000 }])).toBe('paid');
      expect(determinePaymentStatus(0, [])).toBe('paid');
    });

    // 12. Xác định quá hạn.
    it('12. should handle payment status check with due dates properly', () => {
      const pastDueDate = '2026-07-01';
      const currentDate = new Date('2026-07-20');
      // Khi chưa thanh toán hoặc thanh toán 1 phần mà quá hạn
      const status = determinePaymentStatus(1000000, [], pastDueDate, currentDate);
      expect(status).toBe('unpaid');
    });
  });

  describe('groupPaymentsByMethod', () => {
    it('should aggregate payments by payment method correctly', () => {
      const payments = [
        { amount: 1000000, method: 'cash' },
        { amount: 2000000, method: 'transfer' },
        { amount: 500000, method: 'cash' }
      ];
      expect(groupPaymentsByMethod(payments)).toEqual({
        cash: 1500000,
        transfer: 2000000
      });
    });
  });
});

