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
    // - Chỉ số cũ 120, mới 165, kết quả 45.
    it('should return usage of 45 when old is 120 and new is 165', () => {
      expect(calculateUsage(120, 165)).toBe(45);
    });

    // - Chỉ số cũ bằng chỉ số mới, kết quả 0.
    it('should return 0 when old index equals new index', () => {
      expect(calculateUsage(120, 120)).toBe(0);
    });

    // - Chỉ số mới nhỏ hơn chỉ số cũ phải báo lỗi.
    it('should throw error when new index is smaller than old index', () => {
      expect(() => calculateUsage(150, 120)).toThrow('Chỉ số tiêu thụ mới không được nhỏ hơn chỉ số cũ.');
    });

    // - Chỉ số âm phải báo lỗi.
    it('should throw error when index is negative', () => {
      expect(() => calculateUsage(-10, 120)).toThrow('Chỉ số tiêu thụ không được âm.');
      expect(() => calculateUsage(120, -5)).toThrow('Chỉ số tiêu thụ không được âm.');
    });

    // - Chuỗi số hợp lệ được xử lý đúng.
    it('should parse valid string numbers correctly', () => {
      expect(calculateUsage('120', '165')).toBe(45);
      expect(calculateUsage('  120  ', '  165  ')).toBe(45);
    });

    // - NaN phải báo lỗi.
    it('should throw error when index is NaN or invalid non-numeric string', () => {
      expect(() => calculateUsage(NaN, 165)).toThrow('Chỉ số tiêu thụ cũ hoặc mới không phải là số hợp lệ.');
      expect(() => calculateUsage(120, 'abc')).toThrow('Chỉ số tiêu thụ cũ hoặc mới không phải là số hợp lệ.');
    });
  });

  describe('detectAbnormalUsage', () => {
    // - Phát hiện tiêu thụ tăng bất thường.
    it('should detect abnormal consumption increase', () => {
      const res = detectAbnormalUsage(150, 100, 50); // Tăng 50%
      expect(res.abnormal).toBe(true);
      expect(res.percentChange).toBe(50);
      expect(res.message).toContain('Tiêu thụ tăng bất thường');
    });

    it('should handle normal usage differences without warning', () => {
      const res = detectAbnormalUsage(120, 100, 50); // Tăng 20% (< 50%)
      expect(res.abnormal).toBe(false);
      expect(res.percentChange).toBe(20);
    });
  });

  describe('getPreviousMonthKey', () => {
    it('should return previous month for string month keys', () => {
      expect(getPreviousMonthKey('2026-07')).toBe('2026-06');
      expect(getPreviousMonthKey('2026-01')).toBe('2025-12');
    });

    it('should return previous month for object month keys', () => {
      expect(getPreviousMonthKey({ month: 7, year: 2026 })).toEqual({ month: 6, year: 2026 });
      expect(getPreviousMonthKey({ month: 1, year: 2026 })).toEqual({ month: 12, year: 2025 });
    });
  });
});
