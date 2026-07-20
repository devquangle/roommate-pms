// tests/business/meter-calculator.test.js
import { describe, it, expect } from 'vitest';
import {
  calculateUsage,
  calculateElectricUsage,
  calculateWaterUsage,
  detectAbnormalUsage,
  getPreviousMonthKey
} from '../../src/business/meter-calculator.js';

describe('MeterCalculator', () => {
  describe('calculateUsage', () => {
    // 1. Chỉ số cũ 120, mới 165, kết quả 45.
    it('should return usage of 45 when old index is 120 and new index is 165', () => {
      expect(calculateUsage(120, 165)).toBe(45);
    });

    // 2. Chỉ số cũ bằng chỉ số mới, kết quả 0.
    it('should return 0 when old index equals new index', () => {
      expect(calculateUsage(120, 120)).toBe(0);
    });

    // 3. Chỉ số mới nhỏ hơn chỉ số cũ phải báo lỗi.
    it('should throw error when new index is smaller than old index', () => {
      expect(() => calculateUsage(150, 120)).toThrow('Chỉ số tiêu thụ mới không được nhỏ hơn chỉ số cũ.');
    });

    // 4. Chỉ số âm phải báo lỗi.
    it('should throw error when old or new index is negative', () => {
      expect(() => calculateUsage(-10, 120)).toThrow('Chỉ số tiêu thụ không được âm.');
      expect(() => calculateUsage(120, -5)).toThrow('Chỉ số tiêu thụ không được âm.');
    });

    // 5. Chuỗi số hợp lệ được xử lý đúng nếu code hỗ trợ.
    it('should parse valid numeric strings correctly', () => {
      expect(calculateUsage('120', '165')).toBe(45);
      expect(calculateUsage('  120  ', '  165  ')).toBe(45);
    });

    // 6. NaN phải báo lỗi.
    it('should throw error when index is NaN or non-numeric string', () => {
      expect(() => calculateUsage(NaN, 165)).toThrow('Chỉ số tiêu thụ cũ hoặc mới không phải là số hợp lệ.');
      expect(() => calculateUsage(120, NaN)).toThrow('Chỉ số tiêu thụ cũ hoặc mới không phải là số hợp lệ.');
      expect(() => calculateUsage('abc', 165)).toThrow('Chỉ số tiêu thụ cũ hoặc mới không phải là số hợp lệ.');
    });
  });

  describe('calculateElectricUsage & calculateWaterUsage', () => {
    it('should calculate electric usage correctly with custom label error messages', () => {
      expect(calculateElectricUsage(120, 165)).toBe(45);
      expect(() => calculateElectricUsage(150, 120)).toThrow('Chỉ số điện mới không được nhỏ hơn chỉ số cũ.');
      expect(() => calculateElectricUsage(-10, 120)).toThrow('Chỉ số điện không được âm.');
    });

    it('should calculate water usage correctly with custom label error messages', () => {
      expect(calculateWaterUsage(120, 165)).toBe(45);
      expect(() => calculateWaterUsage(150, 120)).toThrow('Chỉ số nước mới không được nhỏ hơn chỉ số cũ.');
      expect(() => calculateWaterUsage(-10, 120)).toThrow('Chỉ số nước không được âm.');
    });
  });

  describe('detectAbnormalUsage', () => {
    // 7. Phát hiện tiêu thụ tăng bất thường.
    it('should detect abnormal consumption increase when percentage exceeds threshold', () => {
      const res = detectAbnormalUsage(150, 100, 50); // Tăng 50%
      expect(res.abnormal).toBe(true);
      expect(res.percentChange).toBe(50);
      expect(res.message).toContain('Tiêu thụ tăng bất thường');
    });

    it('should not mark normal usage changes as abnormal', () => {
      const res = detectAbnormalUsage(120, 100, 50); // Tăng 20% (< 50%)
      expect(res.abnormal).toBe(false);
      expect(res.percentChange).toBe(20);
    });

    it('should handle zero previous usage correctly', () => {
      const res = detectAbnormalUsage(15, 0, 50);
      expect(res.abnormal).toBe(true);
      expect(res.message).toContain('Tiêu thụ tăng từ 0 lên 15.');
    });

    it('should return false for abnormal when input contains NaN', () => {
      const res = detectAbnormalUsage(NaN, 100);
      expect(res.abnormal).toBe(false);
      expect(res.percentChange).toBe(0);
    });
  });

  describe('getPreviousMonthKey', () => {
    // 8. Kiểm tra chỉ số cũ với tháng trước / Lấy tháng trước.
    it('should return previous month for string format YYYY-MM', () => {
      expect(getPreviousMonthKey('2026-07')).toBe('2026-06');
      expect(getPreviousMonthKey('2026-01')).toBe('2025-12');
    });

    it('should return previous month for object format { month, year }', () => {
      expect(getPreviousMonthKey({ month: 7, year: 2026 })).toEqual({ month: 6, year: 2026 });
      expect(getPreviousMonthKey({ month: 1, year: 2026 })).toEqual({ month: 12, year: 2025 });
    });

    it('should throw error for invalid monthKey input', () => {
      expect(() => getPreviousMonthKey('invalid')).toThrow('Tham số monthKey không hợp lệ.');
      expect(() => getPreviousMonthKey(null)).toThrow('Tham số monthKey không hợp lệ.');
    });
  });
});

