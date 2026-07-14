import { generateId, validateRequired } from '../utils/helpers.js';

export const RoomStatus = {
  EMPTY: 'empty',
  RENTED: 'rented',
  MAINTENANCE: 'maintenance'
};

export class Room {
  /**
   * @param {Object} data
   * @param {string} [data.id]
   * @param {string} data.name
   * @param {number} data.rentPrice
   * @param {string} [data.status]
   * @param {number} [data.maxOccupants]
   * @param {string} [data.description]
   * @param {string|Date} [data.createdAt]
   * @param {string|Date} [data.updatedAt]
   */
  constructor(data = {}) {
    this.id = data.id || generateId();
    this.name = data.name;
    this.rentPrice = data.rentPrice !== undefined ? Number(data.rentPrice) : 0;
    this.status = data.status || RoomStatus.EMPTY;
    this.maxOccupants = data.maxOccupants !== undefined ? Number(data.maxOccupants) : 2;
    this.description = data.description || '';
    this.createdAt = data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString();
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt).toISOString() : new Date().toISOString();
  }

  /**
   * Validate room properties
   * @throws {Error} if invalid
   */
  validate() {
    validateRequired(this, ['name']);
    
    if (typeof this.name !== 'string' || this.name.trim() === '') {
      throw new Error('Room name must be a non-empty string.');
    }

    if (isNaN(this.rentPrice) || this.rentPrice < 0) {
      throw new Error('Rent price must be a non-negative number.');
    }

    if (isNaN(this.maxOccupants) || this.maxOccupants <= 0) {
      throw new Error('Max occupants must be a positive integer.');
    }

    const validStatuses = Object.values(RoomStatus);
    if (!validStatuses.includes(this.status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}.`);
    }

    return true;
  }

  /**
   * Update room details
   * @param {Object} updates
   */
  update(updates = {}) {
    if (updates.name !== undefined) this.name = updates.name;
    if (updates.rentPrice !== undefined) this.rentPrice = Number(updates.rentPrice);
    if (updates.status !== undefined) this.status = updates.status;
    if (updates.maxOccupants !== undefined) this.maxOccupants = Number(updates.maxOccupants);
    if (updates.description !== undefined) this.description = updates.description;
    
    this.updatedAt = new Date().toISOString();
    this.validate();
  }

  /**
   * Convert to plain JS object for serialization
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      rentPrice: this.rentPrice,
      status: this.status,
      maxOccupants: this.maxOccupants,
      description: this.description,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Create Room instance from plain object
   * @param {Object} obj
   * @returns {Room}
   */
  static fromJSON(obj) {
    if (typeof obj === 'string') {
      obj = JSON.parse(obj);
    }
    return new Room(obj);
  }
}
