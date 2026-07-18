// tests/unit/utils/id-utils.test.js
import { describe, it, expect, vi } from 'vitest';
import { generateId } from '../../../src/utils/id-utils.js';

describe('id-utils', () => {
  describe('generateId', () => {
    // Test trường hợp bình thường
    it('should generate an ID as a string', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(10);
    });

    it('should prefix the generated ID when prefix is supplied', () => {
      const prefix = 'test-';
      const id = generateId(prefix);
      expect(id.startsWith(prefix)).toBe(true);
    });

    // Test trường hợp biên và rỗng
    it('should handle empty prefix properly', () => {
      const id = generateId('');
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(10);
    });

    // Mock môi trường không hỗ trợ crypto.randomUUID (Fallback case)
    it('should fallback to Date.now when crypto randomUUID is unavailable', () => {
      const originalCrypto = globalThis.crypto;
      
      // Định nghĩa tạm thời crypto là undefined
      Object.defineProperty(globalThis, 'crypto', {
        value: undefined,
        writable: true,
        configurable: true
      });

      const id = generateId('r-');
      expect(id.startsWith('r-')).toBe(true);
      expect(id.includes('-')).toBe(true);

      // Khôi phục lại
      Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
        writable: true,
        configurable: true
      });
    });

    // Mock sử dụng crypto.randomUUID
    it('should use crypto.randomUUID when available', () => {
      const originalCrypto = globalThis.crypto;
      const mockRandomUUID = vi.fn().mockReturnValue('mock-uuid-val-4567');
      
      Object.defineProperty(globalThis, 'crypto', {
        value: { randomUUID: mockRandomUUID },
        writable: true,
        configurable: true
      });

      const id = generateId('p-');
      expect(id).toBe('p-mock-uuid-val-4567');
      expect(mockRandomUUID).toHaveBeenCalledTimes(1);

      // Khôi phục lại
      Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
        writable: true,
        configurable: true
      });
    });
  });
});
