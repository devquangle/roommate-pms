import { generateId, validateRequired, isValidBillingMonth } from '../utils/helpers.js';

export class UtilityReading {
  /**
   * @param {Object} data
   * @param {string} [data.id]
   * @param {string} data.roomId
   * @param {string} data.billingMonth - Format "YYYY-MM"
   * @param {number} [data.electricityPrevious]
   * @param {number} [data.electricityCurrent]
   * @param {number} [data.waterPrevious]
   * @param {number} [data.waterCurrent]
   * @param {string|Date} [data.recordedAt]
   */
  constructor(data = {}) {
    this.id = data.id || generateId();
    this.roomId = data.roomId;
    this.billingMonth = data.billingMonth;
    this.electricityPrevious = data.electricityPrevious !== undefined ? Number(data.electricityPrevious) : 0;
    this.electricityCurrent = data.electricityCurrent !== undefined ? Number(data.electricityCurrent) : 0;
    this.waterPrevious = data.waterPrevious !== undefined ? Number(data.waterPrevious) : 0;
    this.waterCurrent = data.waterCurrent !== undefined ? Number(data.waterCurrent) : 0;
    this.recordedAt = data.recordedAt ? new Date(data.recordedAt).toISOString() : new Date().toISOString();
  }

  /**
   * Calculate electricity usage
   * @returns {number}
   */
  getElectricityUsage() {
    return Math.max(0, this.electricityCurrent - this.electricityPrevious);
  }

  /**
   * Calculate water usage
   * @returns {number}
   */
  getWaterUsage() {
    return Math.max(0, this.waterCurrent - this.waterPrevious);
  }

  /**
   * Validate readings
   * @throws {Error} if invalid
   */
  validate() {
    validateRequired(this, ['roomId', 'billingMonth']);

    if (!isValidBillingMonth(this.billingMonth)) {
      throw new Error('Billing month must be in YYYY-MM format.');
    }

    if (isNaN(this.electricityPrevious) || this.electricityPrevious < 0) {
      throw new Error('Electricity previous reading must be a non-negative number.');
    }

    if (isNaN(this.electricityCurrent) || this.electricityCurrent < 0) {
      throw new Error('Electricity current reading must be a non-negative number.');
    }

    if (this.electricityCurrent < this.electricityPrevious) {
      throw new Error('Electricity current reading cannot be less than previous reading.');
    }

    if (isNaN(this.waterPrevious) || this.waterPrevious < 0) {
      throw new Error('Water previous reading must be a non-negative number.');
    }

    if (isNaN(this.waterCurrent) || this.waterCurrent < 0) {
      throw new Error('Water current reading must be a non-negative number.');
    }

    if (this.waterCurrent < this.waterPrevious) {
      throw new Error('Water current reading cannot be less than previous reading.');
    }

    return true;
  }

  /**
   * Update index readings
   * @param {Object} updates
   */
  update(updates = {}) {
    if (updates.electricityPrevious !== undefined) this.electricityPrevious = Number(updates.electricityPrevious);
    if (updates.electricityCurrent !== undefined) this.electricityCurrent = Number(updates.electricityCurrent);
    if (updates.waterPrevious !== undefined) this.waterPrevious = Number(updates.waterPrevious);
    if (updates.waterCurrent !== undefined) this.waterCurrent = Number(updates.waterCurrent);
    
    this.recordedAt = new Date().toISOString();
    this.validate();
  }

  /**
   * Convert to plain JS object for serialization
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      roomId: this.roomId,
      billingMonth: this.billingMonth,
      electricityPrevious: this.electricityPrevious,
      electricityCurrent: this.electricityCurrent,
      waterPrevious: this.waterPrevious,
      waterCurrent: this.waterCurrent,
      recordedAt: this.recordedAt
    };
  }

  /**
   * Create UtilityReading instance from plain object
   * @param {Object} obj
   * @returns {UtilityReading}
   */
  static fromJSON(obj) {
    if (typeof obj === 'string') {
      obj = JSON.parse(obj);
    }
    return new UtilityReading(obj);
  }
}
