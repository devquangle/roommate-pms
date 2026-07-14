/**
 * StorageService wraps localStorage and falls back to an in-memory store
 * when localStorage is not available (e.g. during Node.js/Vitest test runs).
 */
class MemoryStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

const isLocalStorageAvailable = () => {
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

const storageInstance = isLocalStorageAvailable() ? window.localStorage : new MemoryStorage();

export const StorageService = {
  /**
   * Save data under a key
   * @param {string} key
   * @param {any} value
   */
  save(key, value) {
    storageInstance.setItem(key, JSON.stringify(value));
  },

  /**
   * Load data by key
   * @param {string} key
   * @param {any} defaultValue
   * @returns {any}
   */
  load(key, defaultValue = null) {
    const data = storageInstance.getItem(key);
    if (!data) return defaultValue;
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error(`Failed to parse storage key "${key}":`, e);
      return defaultValue;
    }
  },

  /**
   * Remove key from storage
   * @param {string} key
   */
  remove(key) {
    storageInstance.removeItem(key);
  },

  /**
   * Clear all keys in storage
   */
  clear() {
    storageInstance.clear();
  }
};
