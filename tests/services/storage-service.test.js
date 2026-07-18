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

  // - getAll khi chưa có dữ liệu.
  it('should return an empty array when no data exists for the key', () => {
    const list = getAll(testKey);
    expect(list).toEqual([]);
  });

  // - create thành công.
  it('should successfully create a new record and append createdAt/updatedAt timestamps', () => {
    const newItem = { id: 'item-1', name: 'Test Object' };
    const created = create(testKey, newItem);

    expect(created.id).toBe('item-1');
    expect(created.name).toBe('Test Object');
    expect(created.createdAt).toBeDefined();
    expect(created.updatedAt).toBeDefined();

    const list = getAll(testKey);
    expect(list.length).toBe(1);
    expect(list[0].id).toBe('item-1');
  });

  // - Không tạo ID trùng.
  it('should throw error when trying to create a record with an existing ID', () => {
    create(testKey, { id: 'item-1', name: 'First' });
    expect(() => create(testKey, { id: 'item-1', name: 'Second' })).toThrow(/đã tồn tại/);
  });

  // - getById tìm thấy.
  it('should retrieve the correct record by ID', () => {
    create(testKey, { id: 'item-1', name: 'Target' });
    const found = getById(testKey, 'item-1');
    expect(found).not.toBeNull();
    expect(found.name).toBe('Target');
  });

  // - getById không tìm thấy.
  it('should return null when retrieving by ID and it does not exist', () => {
    create(testKey, { id: 'item-1', name: 'Target' });
    const found = getById(testKey, 'item-2');
    expect(found).toBeNull();
  });

  // - update thành công.
  it('should successfully update record fields while maintaining ID and createdAt timestamp', () => {
    const created = create(testKey, { id: 'item-1', name: 'Original', score: 10 });
    const originalCreatedAt = created.createdAt;

    const updated = update(testKey, 'item-1', { name: 'Modified', score: 20 });
    expect(updated.name).toBe('Modified');
    expect(updated.score).toBe(20);
    expect(updated.createdAt).toBe(originalCreatedAt);
    expect(updated.updatedAt).toBeDefined();

    const list = getAll(testKey);
    expect(list[0].name).toBe('Modified');
  });

  // - update ID không tồn tại.
  it('should throw error when updating a record that does not exist', () => {
    expect(() => update(testKey, 'non-existent', { name: 'Fail' })).toThrow(/Không tìm thấy/);
  });

  // - remove thành công.
  it('should remove a record by ID and return true, or false if ID not found', () => {
    create(testKey, { id: 'item-1', name: 'Delete Me' });
    
    const removed = remove(testKey, 'item-1');
    expect(removed).toBe(true);
    expect(getAll(testKey)).toEqual([]);

    const removeNonExistent = remove(testKey, 'item-1');
    expect(removeNonExistent).toBe(false);
  });

  // - replaceAll.
  it('should replace all records with a new array, and throw error if not an array', () => {
    const list = [{ id: 'item-1', val: 1 }, { id: 'item-2', val: 2 }];
    replaceAll(testKey, list);
    expect(getAll(testKey)).toEqual(list);

    expect(() => replaceAll(testKey, 'not-an-array')).toThrow(/phải là một mảng/);
  });

  // - safeParse với JSON hợp lệ.
  it('should parse valid JSON correctly', () => {
    const dataObj = { success: true };
    const str = JSON.stringify(dataObj);
    expect(safeParse(str)).toEqual(dataObj);
  });

  // - safeParse với JSON lỗi.
  it('should fallback to default value when parsing invalid JSON', () => {
    expect(safeParse('invalid-json-content', { fallback: true })).toEqual({ fallback: true });
    expect(safeParse(null, [])).toEqual([]);
  });

  // - exportAll.
  it('should export all key-values present in localStorage', () => {
    localStorage.setItem('k-1', JSON.stringify({ x: 1 }));
    localStorage.setItem('k-2', 'raw-string');

    const exported = exportAll();
    expect(exported['k-1']).toEqual({ x: 1 });
    expect(exported['k-2']).toBe('raw-string');
  });

  // - importAll dữ liệu hợp lệ.
  it('should import multiple key-values into localStorage', () => {
    const rawData = {
      'imported-1': { active: true },
      'imported-2': [1, 2]
    };
    importAll(rawData);

    expect(localStorage.getItem('imported-1')).toBe(JSON.stringify({ active: true }));
    expect(localStorage.getItem('imported-2')).toBe(JSON.stringify([1, 2]));
  });

  // - importAll dữ liệu không hợp lệ.
  it('should throw error when importing null, array, or string', () => {
    expect(() => importAll(null)).toThrow(/phải là một object/);
    expect(() => importAll([])).toThrow(/phải là một object/);
    expect(() => importAll('raw-text')).toThrow(/phải là một object/);
  });

  // - clearKey.
  it('should clear specific key from localStorage', () => {
    localStorage.setItem('k-1', 'v-1');
    localStorage.setItem('k-2', 'v-2');
    clearKey('k-1');

    expect(localStorage.getItem('k-1')).toBeNull();
    expect(localStorage.getItem('k-2')).toBe('v-2');
  });

  // - clearAll.
  it('should clear all items in localStorage', () => {
    localStorage.setItem('k-1', 'v-1');
    localStorage.setItem('k-2', 'v-2');
    clearAll();

    expect(localStorage.length).toBe(0);
  });

  describe('exists', () => {
    it('should return true if a record matching predicate exists', () => {
      create(testKey, { id: 'item-1', status: 'pending' });
      expect(exists(testKey, item => item.status === 'pending')).toBe(true);
      expect(exists(testKey, item => item.status === 'approved')).toBe(false);
      expect(() => exists(testKey, 'not-a-function')).toThrow(/phải là một hàm/i);
    });
  });
});
