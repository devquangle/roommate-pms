// tests/unit/utils/currency-utils.test.js
import { describe, it, expect } from 'vitest';
import { formatCurrency } from '../../../src/utils/currency-utils.js';

describe('currency-utils', () => {
  describe('formatCurrency', () => {
    // Hàm normalize để chuẩn hóa dấu cách đặc biệt của hệ thống
    const normalize = (str) => str.replace(/\s/g, ' ').replace(/\u00A0/g, ' ').trim();

    // Test trường hợp bình thường
    it('should format normal amounts to VND format', () => {
      const formatted = normalize(formatCurrency(3500000));
      expect(formatted).toContain('3.500.000');
      expect(formatted).toMatch(/(₫|đ|VND)/i);
    });

    // Test trường hợp biên
    it('should format zero correctly', () => {
      const formatted = normalize(formatCurrency(0));
      expect(formatted).toContain('0');
    });

    it('should format negative number correctly', () => {
      const formatted = normalize(formatCurrency(-1000));
      expect(formatted).toContain('1.000');
      expect(formatted.startsWith('-')).toBe(true);
    });

    // Test trường hợp dữ liệu rỗng và không hợp lệ
    it('should fallback to 0 when amount is null, undefined, or NaN', () => {
      const resNull = normalize(formatCurrency(null));
      const resUndefined = normalize(formatCurrency(undefined));
      const resNaN = normalize(formatCurrency(NaN));
      const resString = normalize(formatCurrency('not-a-number'));

      expect(resNull).toContain('0');
      expect(resUndefined).toContain('0');
      expect(resNaN).toContain('0');
      expect(resString).toContain('0');
    });
  });
});
