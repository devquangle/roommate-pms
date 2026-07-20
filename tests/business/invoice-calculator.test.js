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
  it('1. should calculate electric fee correctly (usage * unitPrice)', () => {
    expect(calculateElectricAmount(50, 3000)).toBe(150000);
    expect(calculateElectricAmount(0, 3000)).toBe(0);
  });

  // 2. Tính tiền nước.
  it('2. should calculate water fee correctly (usage * unitPrice)', () => {
    expect(calculateWaterAmount(10, 15000)).toBe(150000);
    expect(calculateWaterAmount(0, 15000)).toBe(0);
  });

  // 3. Tính dịch vụ cố định.
  it('3. should calculate fixed service fee correctly', () => {
    expect(calculateFixedServiceAmount(50000)).toBe(50000);
    expect(calculateFixedServiceAmount(0)).toBe(0);
  });

  // 4. Tính dịch vụ theo người.
  it('4. should calculate service fee per person correctly (personCount * unitPrice)', () => {
    expect(calculatePerPersonAmount(3, 100000)).toBe(300000);
    expect(calculatePerPersonAmount(0, 100000)).toBe(0);
    expect(calculatePerVehicleAmount(2, 50000)).toBe(100000);
  });

  // 5. Tính tổng các khoản.
  it('5. should calculate subtotal and total of items correctly', () => {
    const items = [1500000, 150000, 150000, 300000];
    expect(calculateSubtotal(items)).toBe(2100000);
    expect(calculateInvoiceTotal(items, 100000)).toBe(2000000);
  });

  // 6. Áp dụng giảm giá.
  it('6. should apply valid discount correctly', () => {
    expect(calculateDiscount(2100000, 100000)).toBe(2000000);
    expect(calculateDiscount(500000, 500000)).toBe(0);
  });

  // 7. Giảm giá bằng 0.
  it('7. should handle zero discount correctly without changing subtotal', () => {
    expect(calculateDiscount(2100000, 0)).toBe(2100000);
    expect(calculateInvoiceTotal([100000, 200000], 0)).toBe(300000);
  });

  // 8. Giảm giá lớn hơn tạm tính phải báo lỗi.
  it('8. should throw error if discount is greater than subtotal', () => {
    expect(() => calculateDiscount(2000000, 2500000)).toThrow('Giảm giá không được lớn hơn tạm tính.');
    expect(() => calculateInvoiceTotal([100000, 200000], 400000)).toThrow('Giảm giá không được lớn hơn tạm tính.');
  });

  // 9. Tính còn nợ.
  it('9. should calculate remaining debt correctly', () => {
    expect(calculateRemainingDebt(2000000, 1500000)).toBe(500000);
    expect(calculateRemainingDebt(2000000, 2000000)).toBe(0);
    expect(calculateRemainingDebt(2000000, 2500000)).toBe(0); // Trả dư nợ về 0
  });

  // 10. Chưa thanh toán.
  it('10. should determine status "unpaid" when paid amount is 0 and not overdue', () => {
    const status = determineInvoiceStatus(2000000, 0, '2026-07-25', new Date('2026-07-20'));
    expect(status).toBe('unpaid');
  });

  // 11. Thanh toán một phần.
  it('11. should determine status "partial" when paid amount is between 0 and total', () => {
    const status = determineInvoiceStatus(2000000, 500000, '2026-07-25', new Date('2026-07-20'));
    expect(status).toBe('partial');
  });

  // 12. Đã thanh toán.
  it('12. should determine status "paid" when paid amount equals or exceeds total, or total is 0', () => {
    const statusPaidExact = determineInvoiceStatus(2000000, 2000000, '2026-07-25', new Date('2026-07-20'));
    const statusPaidOver = determineInvoiceStatus(2000000, 2500000, '2026-07-25', new Date('2026-07-20'));
    const statusZeroTotal = determineInvoiceStatus(0, 0, '2026-07-25', new Date('2026-07-20'));
    expect(statusPaidExact).toBe('paid');
    expect(statusPaidOver).toBe('paid');
    expect(statusZeroTotal).toBe('paid');
  });

  // 13. Quá hạn.
  it('13. should determine status "overdue" when current date is past due date and invoice is not fully paid', () => {
    const statusUnpaidOverdue = determineInvoiceStatus(2000000, 0, '2026-07-15', new Date('2026-07-20'));
    const statusPartialOverdue = determineInvoiceStatus(2000000, 500000, '2026-07-15', new Date('2026-07-20'));
    expect(statusUnpaidOverdue).toBe('overdue');
    expect(statusPartialOverdue).toBe('overdue');
  });

  // 14. Tổng tiền không được âm.
  it('14. should throw error when inputs or calculated amounts are negative', () => {
    expect(() => calculateElectricAmount(-50, 3000)).toThrow('không được là số âm.');
    expect(() => calculateWaterAmount(10, -15000)).toThrow('không được là số âm.');
    expect(() => calculatePerPersonAmount(-2, 100000)).toThrow('không được là số âm.');
    expect(() => calculateSubtotal([-100, 200])).toThrow('không được là số âm.');
    expect(() => calculateRemainingDebt(-2000000, 1500000)).toThrow('không được là số âm.');
  });

  // 15. Không chấp nhận NaN.
  it('15. should throw error when any input value is NaN or invalid string', () => {
    expect(() => calculateElectricAmount(NaN, 3000)).toThrow('phải là một số hợp lệ.');
    expect(() => calculateWaterAmount(10, NaN)).toThrow('phải là một số hợp lệ.');
    expect(() => calculateDiscount(2000000, 'abc')).toThrow('phải là một số hợp lệ.');
    expect(() => calculateSubtotal([100000, NaN])).toThrow('phải là một số hợp lệ.');
    expect(() => calculateRemainingDebt(NaN, 500000)).toThrow('phải là một số hợp lệ.');
  });
});

