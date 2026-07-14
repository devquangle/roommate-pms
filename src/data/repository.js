// src/data/repository.js
// Base repository để thao tác với LocalStorage
export class Repository {
  constructor(collectionName) {
    this.collectionName = collectionName;
  }

  getAll() {
    try {
      const data = localStorage.getItem(this.collectionName);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error(`Error reading ${this.collectionName} from LocalStorage:`, error);
      return [];
    }
  }

  getById(id) {
    const items = this.getAll();
    return items.find(item => item.id === id) || null;
  }

  saveAll(items) {
    try {
      localStorage.setItem(this.collectionName, JSON.stringify(items));
      return true;
    } catch (error) {
      console.error(`Error saving ${this.collectionName} to LocalStorage:`, error);
      return false;
    }
  }

  insert(item) {
    const items = this.getAll();
    items.push(item);
    this.saveAll(items);
    return item;
  }

  update(id, updatedData) {
    const items = this.getAll();
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updatedData, updatedAt: new Date().toISOString() };
      this.saveAll(items);
      return items[index];
    }
    return null;
  }

  remove(id) {
    const items = this.getAll();
    const filteredItems = items.filter(item => item.id !== id);
    if (items.length !== filteredItems.length) {
      this.saveAll(filteredItems);
      return true;
    }
    return false;
  }
}
