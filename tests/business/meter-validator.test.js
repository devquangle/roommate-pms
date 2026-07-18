// tests/business/meter-validator.test.js
import { describe, it, expect } from 'vitest';
import { validateMeterReading, validatePreviousIndex } from '../../src/business/meter-validator.js';

describe('MeterValidator', () => {
  describe('validateMeterReading', () => {
    // Test trường hợp bình thường
    it('should pass validation with valid attributes', () => {
      const reading = {
        roomId: 'r-1',
        month: 7,
        year: 2026,
        electricityOld: 120,
        electricityNew: 165,
        waterOld: 20,
        waterNew: 35
      };
      const res = validateMeterReading(reading);
      expect(res.valid).toBe(true);
      expect(res.errors.length).toBe(0);
    });

    // Test trường hợp biên và không hợp lệ
    it('should fail when roomId is missing', () => {
      const reading = {
        roomId: '',
        month: 7,
        year: 2026,
        electricityOld: 120,
        electricityNew: 165,
        waterOld: 20,
        waterNew: 35
      };
      const res = validateMeterReading(reading);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Phòng không được để trống.');
    });

    it('should fail when month is outside 1-12 range', () => {
      const reading = {
        roomId: 'r-1',
        month: 13,
        year: 2026,
        electricityOld: 120,
        electricityNew: 165,
        waterOld: 20,
        waterNew: 35
      };
      const res = validateMeterReading(reading);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Tháng không hợp lệ (phải từ 1 đến 12).');
    });

    it('should fail when new index is smaller than old index', () => {
      const reading = {
        roomId: 'r-1',
        month: 7,
        year: 2026,
        electricityOld: 150,
        electricityNew: 120,
        waterOld: 20,
        waterNew: 35
      };
      const res = validateMeterReading(reading);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Số điện mới không được nhỏ hơn số điện cũ.');
    });

    it('should fail when index is negative', () => {
      const reading = {
        roomId: 'r-1',
        month: 7,
        year: 2026,
        electricityOld: -10,
        electricityNew: 120,
        waterOld: 20,
        waterNew: 35
      };
      const res = validateMeterReading(reading);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Số điện cũ phải là số không âm.');
    });
  });

  describe('validatePreviousIndex', () => {
    // - Kiểm tra chỉ số cũ với tháng trước.
    it('should succeed when current month old index matches previous month new index', () => {
      const current = {
        electricityOld: 165,
        waterOld: 35
      };
      const previous = {
        electricityNew: 165,
        waterNew: 35
      };

      const res = validatePreviousIndex(current, previous);
      expect(res.valid).toBe(true);
      expect(res.errors.length).toBe(0);
    });

    it('should fail when current month old index does not match previous month new index', () => {
      const current = {
        electricityOld: 168, // không khớp
        waterOld: 35
      };
      const previous = {
        electricityNew: 165,
        waterNew: 35
      };

      const res = validatePreviousIndex(current, previous);
      expect(res.valid).toBe(false);
      expect(res.errors.some(err => err.includes('Số điện cũ (168) không khớp với số điện mới của tháng trước (165)'))).toBe(true);
    });

    it('should pass if there is no previous month record', () => {
      const current = {
        electricityOld: 120,
        waterOld: 20
      };
      const res = validatePreviousIndex(current, null);
      expect(res.valid).toBe(true);
    });
  });
});
