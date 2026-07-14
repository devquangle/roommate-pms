import { generateId, validateRequired, isValidBillingMonth, formatDate } from '../utils/helpers.js';

export const PaymentStatus = {
  UNPAID: 'unpaid',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid'
};

export class Invoice {
  /**
   * @param {Object} data
   * @param {string} [data.id]
   * @param {string} data.roomId
   * @param {string} data.billingMonth - Format "YYYY-MM"
   * @param {number} data.roomRent
   * 
   * @param {Object} data.electricityDetails
   * @param {number} data.electricityDetails.previous
   * @param {number} data.electricityDetails.current
   * @param {number} data.electricityDetails.unitPrice
   * 
   * @param {Object} data.waterDetails
   * @param {number} [data.waterDetails.previous]
   * @param {number} [data.waterDetails.current]
   * @param {number} data.waterDetails.unitPrice
   * @param {string} data.waterDetails.calculationType - 'per_cubic' | 'per_person'
   * @param {number} data.waterDetails.occupantsCount - number of occupants for 'per_person' calc
   * 
   * @param {Array<Object>} [data.services] - Array of { name, price, quantity, type, total }
   * @param {number} [data.paidAmount]
   * @param {string} [data.dueDate]
   * @param {string|null} [data.paymentDate]
   * @param {string} [data.notes]
   * @param {string|Date} [data.createdAt]
   * @param {string|Date} [data.updatedAt]
   */
  constructor(data = {}) {
    this.id = data.id || generateId();
    this.roomId = data.roomId;
    this.billingMonth = data.billingMonth;
    this.roomRent = Number(data.roomRent) || 0;

    // Electricity details
    const elec = data.electricityDetails || {};
    this.electricityDetails = {
      previous: Number(elec.previous) || 0,
      current: Number(elec.current) || 0,
      usage: 0,
      unitPrice: Number(elec.unitPrice) || 0,
      total: 0
    };

    // Water details
    const water = data.waterDetails || {};
    this.waterDetails = {
      previous: Number(water.previous) || 0,
      current: Number(water.current) || 0,
      calculationType: water.calculationType || 'per_cubic',
      occupantsCount: Number(water.occupantsCount) || 1,
      usage: 0,
      unitPrice: Number(water.unitPrice) || 0,
      total: 0
    };

    // Additional services
    this.services = (data.services || []).map(service => ({
      name: service.name,
      price: Number(service.price) || 0,
      quantity: Number(service.quantity) || 1,
      type: service.type || 'flat',
      total: 0
    }));

    this.totalAmount = 0;
    this.paidAmount = data.paidAmount !== undefined ? Number(data.paidAmount) : 0;
    this.paymentStatus = PaymentStatus.UNPAID;
    this.dueDate = data.dueDate ? formatDate(data.dueDate) : formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // Default due date is 7 days from now
    this.paymentDate = data.paymentDate ? formatDate(data.paymentDate) : null;
    this.notes = data.notes || '';
    this.createdAt = data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString();
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt).toISOString() : new Date().toISOString();

    // Perform initial calculations
    this.calculateTotals();
  }

  /**
   * Recalculate bill usage and totals
   */
  calculateTotals() {
    // 1. Electricity
    this.electricityDetails.usage = Math.max(0, this.electricityDetails.current - this.electricityDetails.previous);
    this.electricityDetails.total = this.electricityDetails.usage * this.electricityDetails.unitPrice;

    // 2. Water
    if (this.waterDetails.calculationType === 'per_cubic') {
      this.waterDetails.usage = Math.max(0, this.waterDetails.current - this.waterDetails.previous);
      this.waterDetails.total = this.waterDetails.usage * this.waterDetails.unitPrice;
    } else {
      // Charged per person
      this.waterDetails.usage = this.waterDetails.occupantsCount;
      this.waterDetails.total = this.waterDetails.usage * this.waterDetails.unitPrice;
    }

    // 3. Services
    let servicesTotal = 0;
    for (const service of this.services) {
      service.total = service.price * service.quantity;
      servicesTotal += service.total;
    }

    // 4. Total Amount
    this.totalAmount = this.roomRent + this.electricityDetails.total + this.waterDetails.total + servicesTotal;

    // 5. Payment Status
    this.updatePaymentStatus();
  }

  /**
   * Update payment status based on total and paid amount
   */
  updatePaymentStatus() {
    if (this.paidAmount <= 0) {
      this.paymentStatus = PaymentStatus.UNPAID;
      this.paymentDate = null;
    } else if (this.paidAmount >= this.totalAmount) {
      this.paymentStatus = PaymentStatus.PAID;
      if (!this.paymentDate) {
        this.paymentDate = formatDate(new Date());
      }
    } else {
      this.paymentStatus = PaymentStatus.PARTIALLY_PAID;
      this.paymentDate = null; // Still in progress
    }
  }

  /**
   * Record a payment
   * @param {number} amount
   * @param {string|Date} [date]
   */
  recordPayment(amount, date = new Date()) {
    if (isNaN(amount) || amount < 0) {
      throw new Error('Payment amount must be a positive number.');
    }
    
    this.paidAmount += Number(amount);
    
    if (this.paidAmount >= this.totalAmount) {
      this.paymentDate = formatDate(date);
    }
    
    this.updatedAt = new Date().toISOString();
    this.calculateTotals();
  }

  /**
   * Reset payment
   */
  resetPayment() {
    this.paidAmount = 0;
    this.paymentDate = null;
    this.paymentStatus = PaymentStatus.UNPAID;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Validate invoice properties
   * @throws {Error} if invalid
   */
  validate() {
    validateRequired(this, ['roomId', 'billingMonth']);

    if (!isValidBillingMonth(this.billingMonth)) {
      throw new Error('Billing month must be in YYYY-MM format.');
    }

    if (isNaN(this.roomRent) || this.roomRent < 0) {
      throw new Error('Room rent must be a non-negative number.');
    }

    if (this.electricityDetails.current < this.electricityDetails.previous) {
      throw new Error('Electricity current reading cannot be less than previous.');
    }

    if (this.waterDetails.calculationType === 'per_cubic' && this.waterDetails.current < this.waterDetails.previous) {
      throw new Error('Water current reading cannot be less than previous.');
    }

    if (isNaN(this.paidAmount) || this.paidAmount < 0) {
      throw new Error('Paid amount must be a non-negative number.');
    }

    if (this.dueDate && isNaN(new Date(this.dueDate).getTime())) {
      throw new Error('Due date must be a valid date.');
    }

    if (this.paymentDate && isNaN(new Date(this.paymentDate).getTime())) {
      throw new Error('Payment date must be a valid date.');
    }

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
      billingMonth: this.billingMonth,
      roomRent: this.roomRent,
      electricityDetails: { ...this.electricityDetails },
      waterDetails: { ...this.waterDetails },
      services: this.services.map(s => ({ ...s })),
      totalAmount: this.totalAmount,
      paidAmount: this.paidAmount,
      paymentStatus: this.paymentStatus,
      dueDate: this.dueDate,
      paymentDate: this.paymentDate,
      notes: this.notes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Create Invoice instance from plain object
   * @param {Object} obj
   * @returns {Invoice}
   */
  static fromJSON(obj) {
    if (typeof obj === 'string') {
      obj = JSON.parse(obj);
    }
    return new Invoice(obj);
  }
}
