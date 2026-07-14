import { validateRequired, generateId } from '../utils/helpers.js';

export const WaterCalcType = {
  PER_CUBIC: 'per_cubic',  // Calculate by usage: (current - previous) * unitPrice
  PER_PERSON: 'per_person' // Calculate by occupants count: occupantsCount * unitPrice
};

export const ServiceType = {
  FLAT: 'flat',             // Flat charge per room
  PER_PERSON: 'per_person', // Charged per occupant in the room
  PER_ROOM: 'per_room'      // Charged per room (similar to flat, but can scale, e.g. based on room size or standard room charge)
};

export class ServiceConfig {
  /**
   * @param {Object} data
   * @param {number} [data.electricityUnitPrice] - Default unit price for electricity (e.g. 3500 VNĐ/kWh)
   * @param {number} [data.waterUnitPrice] - Default unit price for water (e.g. 20000 VNĐ/m3 or 100000 VNĐ/person)
   * @param {string} [data.waterCalculationType] - 'per_cubic' or 'per_person'
   * @param {Array<Object>} [data.otherServices] - Array of other services
   */
  constructor(data = {}) {
    this.electricityUnitPrice = data.electricityUnitPrice !== undefined ? Number(data.electricityUnitPrice) : 3500;
    this.waterUnitPrice = data.waterUnitPrice !== undefined ? Number(data.waterUnitPrice) : 20000;
    this.waterCalculationType = data.waterCalculationType || WaterCalcType.PER_CUBIC;
    
    // Parse list of other services
    this.otherServices = (data.otherServices || []).map(service => ({
      id: service.id || generateId(),
      name: service.name,
      price: Number(service.price) || 0,
      type: service.type || ServiceType.FLAT
    }));
  }

  /**
   * Validate service configurations
   * @throws {Error} if invalid
   */
  validate() {
    if (isNaN(this.electricityUnitPrice) || this.electricityUnitPrice < 0) {
      throw new Error('Electricity unit price must be a non-negative number.');
    }

    if (isNaN(this.waterUnitPrice) || this.waterUnitPrice < 0) {
      throw new Error('Water unit price must be a non-negative number.');
    }

    const validWaterTypes = Object.values(WaterCalcType);
    if (!validWaterTypes.includes(this.waterCalculationType)) {
      throw new Error(`Invalid water calculation type. Must be one of: ${validWaterTypes.join(', ')}.`);
    }

    for (const service of this.otherServices) {
      validateRequired(service, ['name', 'price', 'type']);
      if (typeof service.name !== 'string' || service.name.trim() === '') {
        throw new Error('Service name must be a non-empty string.');
      }
      if (isNaN(service.price) || service.price < 0) {
        throw new Error(`Service "${service.name}" price must be a non-negative number.`);
      }
      const validServiceTypes = Object.values(ServiceType);
      if (!validServiceTypes.includes(service.type)) {
        throw new Error(`Service "${service.name}" type must be one of: ${validServiceTypes.join(', ')}.`);
      }
    }

    return true;
  }

  /**
   * Add a new service
   * @param {Object} serviceData
   */
  addService(serviceData) {
    const service = {
      id: serviceData.id || generateId(),
      name: serviceData.name,
      price: Number(serviceData.price) || 0,
      type: serviceData.type || ServiceType.FLAT
    };
    this.otherServices.push(service);
    this.validate();
  }

  /**
   * Remove a service by ID
   * @param {string} id
   */
  removeService(id) {
    this.otherServices = this.otherServices.filter(s => s.id !== id);
  }

  /**
   * Update a service by ID
   * @param {string} id
   * @param {Object} updates
   */
  updateService(id, updates) {
    const index = this.otherServices.findIndex(s => s.id === id);
    if (index !== -1) {
      this.otherServices[index] = {
        ...this.otherServices[index],
        ...updates
      };
      if (updates.price !== undefined) {
        this.otherServices[index].price = Number(updates.price);
      }
      this.validate();
    }
  }

  /**
   * Convert to plain JS object for serialization
   * @returns {Object}
   */
  toJSON() {
    return {
      electricityUnitPrice: this.electricityUnitPrice,
      waterUnitPrice: this.waterUnitPrice,
      waterCalculationType: this.waterCalculationType,
      otherServices: this.otherServices
    };
  }

  /**
   * Create ServiceConfig instance from plain object
   * @param {Object} obj
   * @returns {ServiceConfig}
   */
  static fromJSON(obj) {
    if (typeof obj === 'string') {
      obj = JSON.parse(obj);
    }
    return new ServiceConfig(obj);
  }
}
