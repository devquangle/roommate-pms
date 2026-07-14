import { generateId, validateRequired, formatDate } from '../utils/helpers.js';

export const ContractStatus = {
  ACTIVE: 'active',
  TERMINATED: 'terminated',
  EXPIRED: 'expired'
};

export class Contract {
  /**
   * @param {Object} data
   * @param {string} [data.id]
   * @param {string} data.roomId
   * @param {string} data.tenantId
   * @param {string|Date} data.startDate
   * @param {string|Date|null} [data.endDate]
   * @param {number} data.rentPrice
   * @param {number} [data.deposit]
   * @param {string} [data.status]
   * @param {string|Date} [data.createdAt]
   * @param {string|Date} [data.updatedAt]
   */
  constructor(data = {}) {
    this.id = data.id || generateId();
    this.roomId = data.roomId;
    this.tenantId = data.tenantId;
    this.startDate = formatDate(data.startDate);
    this.endDate = data.endDate ? formatDate(data.endDate) : null;
    this.rentPrice = data.rentPrice !== undefined ? Number(data.rentPrice) : 0;
    this.deposit = data.deposit !== undefined ? Number(data.deposit) : 0;
    this.status = data.status || ContractStatus.ACTIVE;
    this.createdAt = data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString();
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt).toISOString() : new Date().toISOString();
  }

  /**
   * Validate contract properties
   * @throws {Error} if invalid
   */
  validate() {
    validateRequired(this, ['roomId', 'tenantId', 'startDate']);

    if (isNaN(new Date(this.startDate).getTime())) {
      throw new Error('Start date must be a valid date.');
    }

    if (this.endDate && isNaN(new Date(this.endDate).getTime())) {
      throw new Error('End date must be a valid date if provided.');
    }

    if (this.endDate && new Date(this.endDate) <= new Date(this.startDate)) {
      throw new Error('End date must be after start date.');
    }

    if (isNaN(this.rentPrice) || this.rentPrice < 0) {
      throw new Error('Rent price must be a non-negative number.');
    }

    if (isNaN(this.deposit) || this.deposit < 0) {
      throw new Error('Deposit must be a non-negative number.');
    }

    const validStatuses = Object.values(ContractStatus);
    if (!validStatuses.includes(this.status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}.`);
    }

    return true;
  }

  /**
   * Terminate contract early
   * @param {string|Date} endDate
   */
  terminate(endDate = new Date()) {
    this.endDate = formatDate(endDate);
    this.status = ContractStatus.TERMINATED;
    this.updatedAt = new Date().toISOString();
    this.validate();
  }

  /**
   * Check if contract is currently active for a specific date
   * @param {string|Date} [date]
   * @returns {boolean}
   */
  isActiveAt(date = new Date()) {
    if (this.status !== ContractStatus.ACTIVE) return false;
    
    const checkDate = new Date(date);
    const start = new Date(this.startDate);
    
    if (checkDate < start) return false;
    if (this.endDate && checkDate > new Date(this.endDate)) return false;
    
    return true;
  }

  /**
   * Convert to plain JS object for serialization
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      roomId: this.roomId,
      tenantId: this.tenantId,
      startDate: this.startDate,
      endDate: this.endDate,
      rentPrice: this.rentPrice,
      deposit: this.deposit,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Create Contract instance from plain object
   * @param {Object} obj
   * @returns {Contract}
   */
  static fromJSON(obj) {
    if (typeof obj === 'string') {
      obj = JSON.parse(obj);
    }
    return new Contract(obj);
  }
}
