import { generateId, validateRequired } from '../utils/helpers.js';

export const TenantStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
};

export class Tenant {
  /**
   * @param {Object} data
   * @param {string} [data.id]
   * @param {string} data.name
   * @param {string} data.phone
   * @param {string} data.idCard
   * @param {string} [data.email]
   * @param {string|null} [data.roomId]
   * @param {string} [data.status]
   * @param {string|Date} [data.createdAt]
   * @param {string|Date} [data.updatedAt]
   */
  constructor(data = {}) {
    this.id = data.id || generateId();
    this.name = data.name;
    this.phone = data.phone;
    this.idCard = data.idCard;
    this.email = data.email || '';
    this.roomId = data.roomId || null;
    this.status = data.status || TenantStatus.ACTIVE;
    this.createdAt = data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString();
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt).toISOString() : new Date().toISOString();
  }

  /**
   * Validate tenant properties
   * @throws {Error} if invalid
   */
  validate() {
    validateRequired(this, ['name', 'phone', 'idCard']);

    if (typeof this.name !== 'string' || this.name.trim() === '') {
      throw new Error('Tenant name must be a non-empty string.');
    }

    // Simple phone number validation (e.g. 9 to 11 digits)
    const cleanPhone = this.phone.replace(/[\s.-]/g, '');
    if (!/^\+?\d{9,12}$/.test(cleanPhone)) {
      throw new Error('Invalid phone number format.');
    }

    // Simple ID card (CCCD/CMND) validation (typically 9 or 12 digits in Vietnam)
    const cleanIdCard = this.idCard.replace(/\s/g, '');
    if (!/^\d{9}$|^\d{12}$/.test(cleanIdCard)) {
      throw new Error('ID Card (CCCD/CMND) must be 9 or 12 digits.');
    }

    if (this.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      throw new Error('Invalid email format.');
    }

    const validStatuses = Object.values(TenantStatus);
    if (!validStatuses.includes(this.status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}.`);
    }

    return true;
  }

  /**
   * Update tenant details
   * @param {Object} updates
   */
  update(updates = {}) {
    if (updates.name !== undefined) this.name = updates.name;
    if (updates.phone !== undefined) this.phone = updates.phone;
    if (updates.idCard !== undefined) this.idCard = updates.idCard;
    if (updates.email !== undefined) this.email = updates.email;
    if (updates.roomId !== undefined) this.roomId = updates.roomId;
    if (updates.status !== undefined) this.status = updates.status;

    this.updatedAt = new Date().toISOString();
    this.validate();
  }

  /**
   * Assign tenant to a room
   * @param {string} roomId
   */
  assignRoom(roomId) {
    this.roomId = roomId;
    this.status = TenantStatus.ACTIVE;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Remove tenant from room
   */
  removeRoom() {
    this.roomId = null;
    this.status = TenantStatus.INACTIVE;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Convert to plain JS object for serialization
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      phone: this.phone,
      idCard: this.idCard,
      email: this.email,
      roomId: this.roomId,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Create Tenant instance from plain object
   * @param {Object} obj
   * @returns {Tenant}
   */
  static fromJSON(obj) {
    if (typeof obj === 'string') {
      obj = JSON.parse(obj);
    }
    return new Tenant(obj);
  }
}
