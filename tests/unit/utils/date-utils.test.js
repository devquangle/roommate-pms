// tests/unit/utils/date-utils.test.js
import { describe, it, expect } from 'vitest';
import { getCurrentISODate, formatDateToDisplay, compareDates, daysBetween, isValidDate } from '../../../src/utils/date-utils.js';

describe('date-utils', () => {
  describe('getCurrentISODate', () => {
    // Test trường hợp bình thường
    it('should return a valid ISO date string', () => {
      const dateStr = getCurrentISODate();
      expect(typeof dateStr).toBe('string');
      expect(new Date(dateStr).getTime()).not.toBeNaN();
    });
  });

  describe('formatDateToDisplay', () => {
    // Test trường hợp bình thường
    it('should format ISO date string to dd/mm/yyyy', () => {
      expect(formatDateToDisplay('2026-07-14')).toBe('14/07/2026');
      expect(formatDateToDisplay('2026-07-14T00:00:00.000Z')).toBe('14/07/2026');
    });

    // Test trường hợp rỗng
    it('should return empty string for null, undefined, or empty string', () => {
      expect(formatDateToDisplay(null)).toBe('');
      expect(formatDateToDisplay(undefined)).toBe('');
      expect(formatDateToDisplay('')).toBe('');
    });

    // Test trường hợp dữ liệu không hợp lệ
    it('should throw error for invalid date format', () => {
      expect(() => formatDateToDisplay('invalid-date-string')).toThrowError('Chuỗi ngày không hợp lệ');
    });
  });

  describe('compareDates', () => {
    // Test trường hợp bình thường
    it('should compare two date strings correctly', () => {
      expect(compareDates('2026-07-10', '2026-07-14')).toBeLessThan(0);
      expect(compareDates('2026-07-14', '2026-07-10')).toBeGreaterThan(0);
      expect(compareDates('2026-07-14', '2026-07-14')).toBe(0);
    });

    // Test trường hợp dữ liệu không hợp lệ / rỗng
    it('should throw error if any input date is empty', () => {
      expect(() => compareDates('', '2026-07-14')).toThrow();
      expect(() => compareDates('2026-07-14', null)).toThrow();
    });

    it('should throw error if any input date is invalid', () => {
      expect(() => compareDates('invalid-date', '2026-07-14')).toThrow();
    });
  });

  describe('daysBetween', () => {
    // Test trường hợp bình thường & biên
    it('should calculate absolute days difference correctly', () => {
      expect(daysBetween('2026-07-10', '2026-07-14')).toBe(4);
      expect(daysBetween('2026-07-14', '2026-07-10')).toBe(4);
      expect(daysBetween('2026-07-14', '2026-07-14')).toBe(0);
    });

    // Test trường hợp dữ liệu không hợp lệ / rỗng
    it('should throw error if date is empty or invalid', () => {
      expect(() => daysBetween('', '2026-07-14')).toThrow();
      expect(() => daysBetween('2026-07-14', 'abc')).toThrow();
    });
  });

  describe('isValidDate', () => {
    // Test trường hợp bình thường & dữ liệu không hợp lệ / rỗng
    it('should return true for valid dates', () => {
      expect(isValidDate('2026-07-14')).toBe(true);
      expect(isValidDate('2026-07-14T10:00:00Z')).toBe(true);
    });

    it('should return false for invalid or empty dates', () => {
      expect(isValidDate('abc')).toBe(false);
      expect(isValidDate('')).toBe(false);
      expect(isValidDate(null)).toBe(false);
      expect(isValidDate(undefined)).toBe(false);
    });
  });
});
