// tests/business/meter-validator.test.js
import { describe, it, expect } from 'vitest';
import { validateMeterReading, validatePreviousIndex } from '../../src/business/meter-validator.js';

describe('MeterValidator', () => {
  describe('validateMeterReading', () => {
    // 1. Chỉ số cũ 120, mới 165, kết quả hợp lệ (tiêu thụ 45).
    it('should pass validation when old index is 120 and new index is 165', () => {
      const reading = {
        roomId: 'room-101',
        month: 7,
        year: 2026,
        electricityOld: 120,
        electricityNew: 165,
        waterOld: 20,
        waterNew: 35
      };
      const res = validateMeterReading(reading);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    // 2. Chỉ số cũ bằng chỉ số mới, kết quả 0.
    it('should pass validation when old index equals new index', () => {
      const reading = {
        roomId: 'room-101',
        month: 7,
        year: 2026,
        electricityOld: 120,
        electricityNew: 120,
        waterOld: 20,
        waterNew: 20
      };
      const res = validateMeterReading(reading);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    // 3. Chỉ số mới nhỏ hơn chỉ số cũ phải báo lỗi.
    it('should fail validation when new index is smaller than old index', () => {
      const reading = {
        roomId: 'room-101',
        month: 7,
        year: 2026,
        electricityOld: 150,
        electricityNew: 120,
        waterOld: 35,
        waterNew: 20
      };
      const res = validateMeterReading(reading);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Số điện mới không được nhỏ hơn số điện cũ.');
      expect(res.errors).toContain('Số nước mới không được nhỏ hơn số nước cũ.');
    });

    // 4. Chỉ số âm phải báo lỗi.
    it('should fail validation when old or new index is negative', () => {
      const reading = {
        roomId: 'room-101',
        month: 7,
        year: 2026,
        electricityOld: -10,
        electricityNew: 120,
        waterOld: 20,
        waterNew: -5
      };
      const res = validateMeterReading(reading);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Số điện cũ phải là số không âm.');
      expect(res.errors).toContain('Số nước mới phải là số không âm.');
    });

    // 5. Chuỗi số hợp lệ được xử lý đúng nếu code hỗ trợ.
    it('should handle valid numeric strings correctly', () => {
      const reading = {
        roomId: 'room-101',
        month: '7',
        year: '2026',
        electricityOld: '120',
        electricityNew: '165',
        waterOld: '20',
        waterNew: '35'
      };
      const res = validateMeterReading(reading);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    // 6. NaN phải báo lỗi.
    it('should fail validation when index is NaN or non-numeric string', () => {
      const reading = {
        roomId: 'room-101',
        month: 7,
        year: 2026,
        electricityOld: NaN,
        electricityNew: 165,
        waterOld: 'abc',
        waterNew: 35
      };
      const res = validateMeterReading(reading);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Số điện cũ phải là số không âm.');
      expect(res.errors).toContain('Số nước cũ phải là số không âm.');
    });

    it('should fail validation when reading parameter is null or missing', () => {
      const res = validateMeterReading(null);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Dữ liệu chỉ số trống.');
    });

    it('should fail validation for invalid roomId, month, or year', () => {
      const reading = {
        roomId: '',
        month: 13,
        year: 1999,
        electricityOld: 120,
        electricityNew: 165,
        waterOld: 20,
        waterNew: 35
      };
      const res = validateMeterReading(reading);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Phòng không được để trống.');
      expect(res.errors).toContain('Tháng không hợp lệ (phải từ 1 đến 12).');
      expect(res.errors).toContain('Năm không hợp lệ.');
    });
  });

  describe('validatePreviousIndex', () => {
    // 8. Kiểm tra chỉ số cũ với tháng trước.
    it('should pass validation when current old index matches previous month new index', () => {
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
      expect(res.errors).toHaveLength(0);
    });

    it('should fail validation when current old index does not match previous month new index', () => {
      const current = {
        electricityOld: 168, // Không khớp với 165
        waterOld: 40         // Không khớp với 35
      };
      const previous = {
        electricityNew: 165,
        waterNew: 35
      };

      const res = validatePreviousIndex(current, previous);
      expect(res.valid).toBe(false);
      expect(res.errors.some(err => err.includes('Số điện cũ (168) không khớp với số điện mới của tháng trước (165)'))).toBe(true);
      expect(res.errors.some(err => err.includes('Số nước cũ (40) không khớp với số nước mới của tháng trước (35)'))).toBe(true);
    });

    it('should pass validation if there is no previous month record', () => {
      const current = {
        electricityOld: 120,
        waterOld: 20
      };
      const res = validatePreviousIndex(current, null);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('should fail validation when current reading is null', () => {
      const res = validatePreviousIndex(null, { electricityNew: 165, waterNew: 35 });
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Dữ liệu chỉ số hiện tại trống.');
    });
  });
});

