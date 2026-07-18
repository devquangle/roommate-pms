// tests/unit/utils/validation-utils.test.js
import { describe, it, expect } from 'vitest';
import { isEmpty, isValidPhone, isNonNegative, isPositive, isValidDate } from '../../../src/utils/validation-utils.js';

describe('validation-utils', () => {
  describe('isEmpty', () => {
    // Test trường hợp bình thường
    it('should return false for non-empty string', () => {
      expect(isEmpty('hello')).toBe(false);
      expect(isEmpty('a')).toBe(false);
    });

    // Test trường hợp rỗng & khoảng trắng
    it('should return true for null, undefined, empty string and whitespaces', () => {
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
      expect(isEmpty('')).toBe(true);
      expect(isEmpty('   ')).toBe(true);
    });
  });

  describe('isValidPhone', () => {
    // Test trường hợp bình thường
    it('should return true for valid 10-digit Vietnamese phone number starting with 0', () => {
      expect(isValidPhone('0901234567')).toBe(true);
      expect(isValidPhone(' 0987654321 ')).toBe(true); // trim check
    });

    // Test trường hợp rỗng / không hợp lệ
    it('should return false for empty or non-string inputs', () => {
      expect(isValidPhone('')).toBe(false);
      expect(isValidPhone(null)).toBe(false);
    });

    it('should return false for invalid phone format', () => {
      expect(isValidPhone('901234567')).toBe(false); // Không bắt đầu bằng 0
      expect(isValidPhone('090123456')).toBe(false);  // Chỉ có 9 chữ số
      expect(isValidPhone('09012345678')).toBe(false); // Có tới 11 chữ số
      expect(isValidPhone('090123456a')).toBe(false); // Chứa chữ cái
    });
  });

  describe('isNonNegative', () => {
    // Test trường hợp bình thường
    it('should return true for non-negative numbers', () => {
      expect(isNonNegative(0)).toBe(true);
      expect(isNonNegative(123)).toBe(true);
      expect(isNonNegative('456')).toBe(true);
    });

    // Test trường hợp dữ liệu rỗng / không hợp lệ / âm
    it('should return false for negative numbers', () => {
      expect(isNonNegative(-1)).toBe(false);
      expect(isNonNegative('-99')).toBe(false);
    });

    it('should return false for non-numeric strings', () => {
      expect(isNonNegative('abc')).toBe(false);
    });
  });

  describe('isPositive', () => {
    // Test trường hợp bình thường
    it('should return true for positive numbers', () => {
      expect(isPositive(1)).toBe(true);
      expect(isPositive('99.9')).toBe(true);
    });

    // Test trường hợp biên và không hợp lệ
    it('should return false for zero', () => {
      expect(isPositive(0)).toBe(false);
      expect(isPositive('0')).toBe(false);
    });

    it('should return false for negative numbers and non-numeric strings', () => {
      expect(isPositive(-10)).toBe(false);
      expect(isPositive('abc')).toBe(false);
    });
  });

  describe('isValidDate', () => {
    // Test trường hợp bình thường
    it('should return true for valid date strings', () => {
      expect(isValidDate('2026-07-14')).toBe(true);
      expect(isValidDate('2026-07-14T00:00:00.000Z')).toBe(true);
    });

    // Test trường hợp rỗng / không hợp lệ
    it('should return false for empty or invalid dates', () => {
      expect(isValidDate('')).toBe(false);
      expect(isValidDate(null)).toBe(false);
      expect(isValidDate('invalid-date')).toBe(false);
    });
  });
});
