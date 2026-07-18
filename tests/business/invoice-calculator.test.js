// tests/business/invoice-calculator.test.js
import { describe, it, expect } from 'vitest';
import {
  calculateElectricAmount,
  calculateWaterAmount,
  calculateFixedServiceAmount,
  calculatePerPersonAmount,
  calculatePerVehicleAmount,
  calculateSubtotal,
  calculateDiscount,
  calculateInvoiceTotal,
  calculateRemainingDebt,
  determineInvoiceStatus
} from '../../src/business/invoice-calculator.js';

describe('InvoiceCalculator', () => {
  // 1. Tính tiền điện.
  it('should calculate electric fee correctly', () => {
    expect(calculateElectricAmount(50, 3000)).toBe(150000);
  });

  // 2. Tính tiền nước.
  it('should calculate water fee correctly', () => {
    expect(calculateWaterAmount(10, 15000)).toBe(150000);
  });

  // 3. Tính dịch vụ cố định.
  it('should calculate fixed service fee correctly', () => {
    expect(calculateFixedServiceAmount(50000)).toBe(50000);
  });

  // 4. Tính dịch vụ theo người.
  it('should calculate service fee per person correctly', () => {
    expect(calculatePerPersonAmount(3, 100000)).toBe(300000);
  });

  // 5. Tính tổng các khoản.
  it('should calculate subtotal of items correctly', () => {
    const items = [1500000, 150000, 150000, 300000];
    expect(calculateSubtotal(items)).toBe(2100000);
  });

  // 6. Áp dụng giảm giá.
  it('should apply valid discount correctly', () => {
    expect(calculateDiscount(2100000, 100000)).toBe(2000000);
  });

  // 7. Giảm giá bằng 0.
  it('should handle zero discount correctly', () => {
    expect(calculateDiscount(2100000, 0)).toBe(2100000);
  });

  // 8. Giảm giá lớn hơn tạm tính phải báo lỗi.
  it('should throw error if discount is greater than subtotal', () => {
    expect(() => calculateDiscount(2000000, 2500000)).toThrow('Giảm giá không được lớn hơn tạm tính.');
  });

  // 9. Tính còn nợ.
  it('should calculate remaining debt correctly', () => {
    expect(calculateRemainingDebt(2000000, 1500000)).toBe(500000);
    expect(calculateRemainingDebt(2000000, 2500000)).toBe(0); // Trả dư nợ về 0
  });

  // 10. Chưa thanh toán.
  it('should determine status unpaid when paid amount is zero and not overdue', () => {
    const status = determineInvoiceStatus(2000000, 0, '2026-07-20', new Date('2026-07-18'));
    expect(status).toBe('unpaid');
  });

  // 11. Thanh toán một phần.
  it('should determine status partial when paid amount is between 0 and total', () => {
    const status = determineInvoiceStatus(2000000, 500000, '2026-07-20', new Date('2026-07-18'));
    expect(status).toBe('partial');
  });

  // 12. Đã thanh toán.
  it('should determine status paid when paid amount equals or exceeds total', () => {
    const status1 = determineInvoiceStatus(2000000, 2000000, '2026-07-20', new Date('2026-07-18'));
    const status2 = determineInvoiceStatus(2000000, 2500000, '2026-07-20', new Date('2026-07-18'));
    expect(status1).toBe('paid');
    expect(status2).toBe('paid');
  });

  // 13. Quá hạn.
  it('should determine status overdue when current date exceeds due date and not fully paid', () => {
    const status1 = determineInvoiceStatus(2000000, 0, '2026-07-15', new Date('2026-07-18'));
    const status2 = determineInvoiceStatus(2000000, 500000, '2026-07-15', new Date('2026-07-18'));
    expect(status1).toBe('overdue');
    expect(status2).toBe('overdue');
  });

  // 14. Tổng tiền không được âm.
  it('should throw error when total or values are negative', () => {
    expect(() => calculateElectricAmount(-50, 3000)).toThrow('không được là số âm.');
    expect(() => calculateRemainingDebt(-2000000, 1500000)).toThrow('không được là số âm.');
  });

  // 15. Không chấp nhận NaN.
  it('should throw error when values are NaN', () => {
    expect(() => calculateElectricAmount(NaN, 3000)).toThrow('phải là một số hợp lệ.');
    expect(() => calculateDiscount(2000000, 'abc')).toThrow('phải là một số hợp lệ.');
  });
});
