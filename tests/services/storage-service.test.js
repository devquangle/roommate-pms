// tests/services/storage-service.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import {
  safeParse,
  getAll,
  getById,
  create,
  update,
  remove,
  exists,
  replaceAll,
  clearKey,
  clearAll,
  exportAll,
  importAll
} from '../../src/services/storage-service.js';

describe('StorageService', () => {
  const testKey = 'test_collection';

  // Yêu cầu dọn LocalStorage trước mỗi test
  beforeEach(() => {
    localStorage.clear();
  });

  // 1. getAll khi chưa có dữ liệu.
  it('1. should return an empty array when getAll is called and no data exists for key', () => {
    const result = getAll(testKey);
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  // 2. create thành công.
  it('2. should successfully create a new record and set createdAt/updatedAt', () => {
    const newItem = { id: 'item-101', name: 'Phòng 101' };
    const created = create(testKey, newItem);

    expect(created.id).toBe('item-101');
    expect(created.name).toBe('Phòng 101');
    expect(created.createdAt).toBeDefined();
    expect(created.updatedAt).toBeDefined();

    const all = getAll(testKey);
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('item-101');
  });

  // 3. Không tạo ID trùng.
  it('3. should throw error when create is called with a duplicate ID', () => {
    create(testKey, { id: 'item-101', name: 'Bản ghi 1' });
    expect(() => create(testKey, { id: 'item-101', name: 'Bản ghi 2' })).toThrow(
      `ID "item-101" đã tồn tại trong "${testKey}".`
    );
  });

  // 4. getById tìm thấy.
  it('4. should return the record when getById finds a matching ID', () => {
    create(testKey, { id: 'item-101', name: 'Phòng 101' });
    const found = getById(testKey, 'item-101');
    expect(found).not.toBeNull();
    expect(found?.id).toBe('item-101');
    expect(found?.name).toBe('Phòng 101');
  });

  // 5. getById không tìm thấy.
  it('5. should return null when getById is called for a non-existent ID', () => {
    create(testKey, { id: 'item-101', name: 'Phòng 101' });
    const found = getById(testKey, 'item-999');
    expect(found).toBeNull();
  });

  // 6. update thành công.
  it('6. should successfully update an existing record, preserving id and createdAt', () => {
    const created = create(testKey, { id: 'item-101', name: 'Phòng Cũ', price: 3000000 });
    const originalCreatedAt = created.createdAt;

    const updated = update(testKey, 'item-101', { name: 'Phòng Mới', price: 3500000 });
    expect(updated.id).toBe('item-101');
    expect(updated.name).toBe('Phòng Mới');
    expect(updated.price).toBe(3500000);
    expect(updated.createdAt).toBe(originalCreatedAt);
    expect(updated.updatedAt).toBeDefined();

    const stored = getById(testKey, 'item-101');
    expect(stored?.name).toBe('Phòng Mới');
  });

  // 7. update ID không tồn tại.
  it('7. should throw error when updating a non-existent record ID', () => {
    expect(() => update(testKey, 'non-existent-id', { name: 'Mới' })).toThrow(
      `Không tìm thấy bản ghi với ID "non-existent-id" trong "${testKey}".`
    );
  });

  // 8. remove thành công.
  it('8. should successfully remove a record by ID and return true, or return false if ID not found', () => {
    create(testKey, { id: 'item-101', name: 'Phòng 101' });
    create(testKey, { id: 'item-102', name: 'Phòng 102' });

    const isRemoved = remove(testKey, 'item-101');
    expect(isRemoved).toBe(true);
    expect(getAll(testKey)).toHaveLength(1);
    expect(getById(testKey, 'item-101')).toBeNull();

    const removeAgain = remove(testKey, 'item-101');
    expect(removeAgain).toBe(false);
  });

  // 9. replaceAll.
  it('9. should replace all items for a key with a new array, and throw error if not an array', () => {
    const newItems = [
      { id: 'item-1', name: 'One' },
      { id: 'item-2', name: 'Two' }
    ];
    replaceAll(testKey, newItems);
    expect(getAll(testKey)).toEqual(newItems);

    expect(() => replaceAll(testKey, 'not-an-array')).toThrow('Dữ liệu phải là một mảng.');
  });

  // 10. safeParse với JSON hợp lệ.
  it('10. should correctly parse valid JSON string in safeParse', () => {
    const validJsonStr = JSON.stringify({ key: 'value', number: 123 });
    const parsed = safeParse(validJsonStr, {});
    expect(parsed).toEqual({ key: 'value', number: 123 });
  });

  // 11. safeParse với JSON lỗi.
  it('11. should return fallback value when safeParse receives invalid JSON or null/undefined', () => {
    const fallbackVal = [{ default: true }];
    expect(safeParse('invalid-json-string{', fallbackVal)).toEqual(fallbackVal);
    expect(safeParse(null, fallbackVal)).toEqual(fallbackVal);
    expect(safeParse(undefined, fallbackVal)).toEqual(fallbackVal);
  });

  // 12. exportAll.
  it('12. should export all localStorage entries into a single object', () => {
    localStorage.setItem('rooms', JSON.stringify([{ id: 'r-1' }]));
    localStorage.setItem('settings', JSON.stringify({ theme: 'dark' }));
    localStorage.setItem('rawText', 'plain-text');

    const exported = exportAll();
    expect(exported.rooms).toEqual([{ id: 'r-1' }]);
    expect(exported.settings).toEqual({ theme: 'dark' });
    expect(exported.rawText).toBe('plain-text');
  });

  // 13. importAll dữ liệu hợp lệ.
  it('13. should import valid object data into localStorage', () => {
    const validData = {
      tenants: [{ id: 't-1', name: 'An' }],
      config: { active: true }
    };
    importAll(validData);

    expect(localStorage.getItem('tenants')).toBe(JSON.stringify([{ id: 't-1', name: 'An' }]));
    expect(localStorage.getItem('config')).toBe(JSON.stringify({ active: true }));
  });

  // 14. importAll dữ liệu không hợp lệ.
  it('14. should throw error when importAll is called with null, array, or primitive data', () => {
    expect(() => importAll(null)).toThrow('Dữ liệu import phải là một object.');
    expect(() => importAll([1, 2, 3])).toThrow('Dữ liệu import phải là một object.');
    expect(() => importAll('invalid-string')).toThrow('Dữ liệu import phải là một object.');
  });

  // 15. clearKey.
  it('15. should remove specific key from localStorage using clearKey', () => {
    localStorage.setItem('key-1', 'val-1');
    localStorage.setItem('key-2', 'val-2');

    clearKey('key-1');
    expect(localStorage.getItem('key-1')).toBeNull();
    expect(localStorage.getItem('key-2')).toBe('val-2');
  });

  // 16. clearAll.
  it('16. should remove all items from localStorage using clearAll', () => {
    localStorage.setItem('key-1', 'val-1');
    localStorage.setItem('key-2', 'val-2');

    clearAll();
    expect(localStorage.length).toBe(0);
  });

  describe('exists helper function', () => {
    it('should check if at least one item satisfies the predicate function', () => {
      create(testKey, { id: 'item-1', status: 'active' });
      expect(exists(testKey, item => item.status === 'active')).toBe(true);
      expect(exists(testKey, item => item.status === 'inactive')).toBe(false);
      expect(() => exists(testKey, 'not-a-func')).toThrow('predicate phải là một hàm.');
    });
  });
});

