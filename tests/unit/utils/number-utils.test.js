// tests/unit/utils/number-utils.test.js
import { describe, it, expect } from 'vitest';
import { toNumber, toNumberOrDefault } from '../../../src/utils/number-utils.js';

describe('number-utils', () => {
  describe('toNumber', () => {
    // Test trường hợp bình thường
    it('should convert numeric values and strings to number', () => {
      expect(toNumber(123)).toBe(123);
      expect(toNumber('456')).toBe(456);
      expect(toNumber('78.9')).toBe(78.9);
    });

    // Test trường hợp rỗng / không hợp lệ
    it('should return NaN for null, undefined, and empty string', () => {
      expect(toNumber(null)).toBeNaN();
      expect(toNumber(undefined)).toBeNaN();
      expect(toNumber('')).toBeNaN();
    });

    it('should return NaN for invalid numeric strings', () => {
      expect(toNumber('abc')).toBeNaN();
    });
  });

  describe('toNumberOrDefault', () => {
    // Test trường hợp bình thường
    it('should return the number if conversion is successful', () => {
      expect(toNumberOrDefault('123', 0)).toBe(123);
      expect(toNumberOrDefault(45.6, 9)).toBe(45.6);
    });

    // Test trường hợp biên
    it('should use default value when conversion fails', () => {
      expect(toNumberOrDefault('abc', 10)).toBe(10);
      expect(toNumberOrDefault(null, -1)).toBe(-1);
      expect(toNumberOrDefault(undefined, 5)).toBe(5);
      expect(toNumberOrDefault('', 100)).toBe(100);
    });
  });
});
