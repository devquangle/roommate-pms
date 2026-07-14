import { StorageService } from './StorageService.js';
import { Room, RoomStatus } from '../models/Room.js';
import { Tenant, TenantStatus } from '../models/Tenant.js';
import { Contract, ContractStatus } from '../models/Contract.js';
import { UtilityReading } from '../models/UtilityReading.js';
import { ServiceConfig, WaterCalcType } from '../models/ServiceConfig.js';
import { Invoice } from '../models/Invoice.js';

const KEYS = {
  ROOMS: 'roommate_rooms',
  TENANTS: 'roommate_tenants',
  CONTRACTS: 'roommate_contracts',
  READINGS: 'roommate_readings',
  CONFIG: 'roommate_service_config',
  INVOICES: 'roommate_invoices'
};

export class RoomMateManager {
  constructor() {
    this.rooms = [];
    this.tenants = [];
    this.contracts = [];
    this.readings = [];
    this.invoices = [];
    this.config = new ServiceConfig();
    
    this.loadAll();
  }

  /**
   * Load all data collections from storage
   */
  loadAll() {
    this.rooms = StorageService.load(KEYS.ROOMS, []).map(r => Room.fromJSON(r));
    this.tenants = StorageService.load(KEYS.TENANTS, []).map(t => Tenant.fromJSON(t));
    this.contracts = StorageService.load(KEYS.CONTRACTS, []).map(c => Contract.fromJSON(c));
    this.readings = StorageService.load(KEYS.READINGS, []).map(r => UtilityReading.fromJSON(r));
    this.invoices = StorageService.load(KEYS.INVOICES, []).map(i => Invoice.fromJSON(i));
    
    const configData = StorageService.load(KEYS.CONFIG, null);
    this.config = configData ? ServiceConfig.fromJSON(configData) : new ServiceConfig();
  }

  /**
   * Save all data collections to storage
   */
  saveAll() {
    StorageService.save(KEYS.ROOMS, this.rooms.map(r => r.toJSON()));
    StorageService.save(KEYS.TENANTS, this.tenants.map(t => t.toJSON()));
    StorageService.save(KEYS.CONTRACTS, this.contracts.map(c => c.toJSON()));
    StorageService.save(KEYS.READINGS, this.readings.map(r => r.toJSON()));
    StorageService.save(KEYS.INVOICES, this.invoices.map(i => i.toJSON()));
    StorageService.save(KEYS.CONFIG, this.config.toJSON());
  }

  // ==========================================
  // ROOM OPERATIONS
  // ==========================================

  addRoom(roomData) {
    const room = new Room(roomData);
    room.validate();
    
    // Check if room name is duplicate
    if (this.rooms.some(r => r.name.toLowerCase() === room.name.toLowerCase())) {
      throw new Error(`Room with name "${room.name}" already exists.`);
    }

    this.rooms.push(room);
    this.saveAll();
    return room;
  }

  getRooms() {
    return this.rooms;
  }

  getRoom(id) {
    return this.rooms.find(r => r.id === id) || null;
  }

  updateRoom(id, updates) {
    const room = this.getRoom(id);
    if (!room) throw new Error('Room not found.');
    
    if (updates.name && updates.name !== room.name) {
      if (this.rooms.some(r => r.id !== id && r.name.toLowerCase() === updates.name.toLowerCase())) {
        throw new Error(`Room with name "${updates.name}" already exists.`);
      }
    }

    room.update(updates);
    this.saveAll();
    return room;
  }

  deleteRoom(id) {
    const room = this.getRoom(id);
    if (!room) throw new Error('Room not found.');
    
    // Check if there are active contracts or tenants in this room
    const hasActiveContract = this.contracts.some(c => c.roomId === id && c.status === ContractStatus.ACTIVE);
    const hasTenants = this.tenants.some(t => t.roomId === id && t.status === TenantStatus.ACTIVE);
    
    if (hasActiveContract || hasTenants) {
      throw new Error('Cannot delete a room that has active tenants or active contracts.');
    }

    this.rooms = this.rooms.filter(r => r.id !== id);
    this.saveAll();
  }

  // ==========================================
  // TENANT OPERATIONS
  // ==========================================

  addTenant(tenantData) {
    const tenant = new Tenant(tenantData);
    tenant.validate();

    // Check for unique CCCD/ID card
    if (this.tenants.some(t => t.idCard === tenant.idCard)) {
      throw new Error(`Tenant with ID Card "${tenant.idCard}" already exists.`);
    }

    this.tenants.push(tenant);
    this.saveAll();
    return tenant;
  }

  getTenants() {
    return this.tenants;
  }

  getTenant(id) {
    return this.tenants.find(t => t.id === id) || null;
  }

  getTenantsInRoom(roomId) {
    return this.tenants.filter(t => t.roomId === roomId && t.status === TenantStatus.ACTIVE);
  }

  updateTenant(id, updates) {
    const tenant = this.getTenant(id);
    if (!tenant) throw new Error('Tenant not found.');

    if (updates.idCard && updates.idCard !== tenant.idCard) {
      if (this.tenants.some(t => t.id !== id && t.idCard === updates.idCard)) {
        throw new Error(`Tenant with ID Card "${updates.idCard}" already exists.`);
      }
    }

    tenant.update(updates);
    
    // If tenant room ID was updated manually, verify room exists and is rented
    if (updates.roomId !== undefined) {
      if (updates.roomId) {
        const room = this.getRoom(updates.roomId);
        if (!room) throw new Error('Target room does not exist.');
      }
    }

    this.saveAll();
    return tenant;
  }

  deleteTenant(id) {
    const tenant = this.getTenant(id);
    if (!tenant) throw new Error('Tenant not found.');

    // If tenant is currently renting a room, they must leave first
    if (tenant.roomId && tenant.status === TenantStatus.ACTIVE) {
      throw new Error('Cannot delete tenant who is actively occupying a room. Terminate contract or remove from room first.');
    }

    this.tenants = this.tenants.filter(t => t.id !== id);
    this.saveAll();
  }

  // ==========================================
  // CONTRACT OPERATIONS
  // ==========================================

  createContract(contractData) {
    const contract = new Contract(contractData);
    contract.validate();

    // Validate room exists and is vacant
    const room = this.getRoom(contract.roomId);
    if (!room) throw new Error('Room not found.');
    if (room.status !== RoomStatus.EMPTY) {
      throw new Error(`Room "${room.name}" is not vacant (Current status: ${room.status}).`);
    }

    // Validate tenant exists
    const tenant = this.getTenant(contract.tenantId);
    if (!tenant) throw new Error('Tenant not found.');

    // Save contract
    this.contracts.push(contract);

    // Update room status
    room.update({ status: RoomStatus.RENTED });

    // Assign main tenant to room
    tenant.assignRoom(room.id);

    this.saveAll();
    return contract;
  }

  terminateContract(contractId, terminationDate = new Date()) {
    const contract = this.contracts.find(c => c.id === contractId);
    if (!contract) throw new Error('Contract not found.');

    contract.terminate(terminationDate);

    // Set Room status back to empty
    const room = this.getRoom(contract.roomId);
    if (room) {
      room.update({ status: RoomStatus.EMPTY });
    }

    // Evict all tenants occupying that room
    this.tenants.forEach(t => {
      if (t.roomId === contract.roomId) {
        t.removeRoom();
      }
    });

    this.saveAll();
    return contract;
  }

  getContracts() {
    return this.contracts;
  }

  getActiveContractForRoom(roomId, date = new Date()) {
    return this.contracts.find(c => c.roomId === roomId && c.isActiveAt(date)) || null;
  }

  // ==========================================
  // UTILITY READINGS OPERATIONS
  // ==========================================

  recordReading(readingData) {
    const reading = new UtilityReading(readingData);
    
    // Check if room exists
    const room = this.getRoom(reading.roomId);
    if (!room) throw new Error('Room not found.');

    reading.validate();

    // Check if duplicate reading exists for this month/room
    const duplicateIndex = this.readings.findIndex(
      r => r.roomId === reading.roomId && r.billingMonth === reading.billingMonth
    );

    if (duplicateIndex !== -1) {
      // Overwrite the existing reading
      this.readings[duplicateIndex] = reading;
    } else {
      this.readings.push(reading);
    }

    this.saveAll();
    return reading;
  }

  getReadings() {
    return this.readings;
  }

  getReadingForRoom(roomId, billingMonth) {
    return this.readings.find(r => r.roomId === roomId && r.billingMonth === billingMonth) || null;
  }

  getLatestReadingForRoom(roomId) {
    const roomReadings = this.readings
      .filter(r => r.roomId === roomId)
      .sort((a, b) => b.billingMonth.localeCompare(a.billingMonth));
    return roomReadings[0] || null;
  }

  // ==========================================
  // CONFIG OPERATIONS
  // ==========================================

  getServiceConfig() {
    return this.config;
  }

  updateServiceConfig(configData) {
    this.config = new ServiceConfig(configData);
    this.config.validate();
    this.saveAll();
    return this.config;
  }

  // ==========================================
  // INVOICE OPERATIONS
  // ==========================================

  generateInvoice(roomId, billingMonth, dueDate = null) {
    // 1. Fetch Room
    const room = this.getRoom(roomId);
    if (!room) throw new Error('Room not found.');

    // 2. Fetch Active Contract
    // Check billing at middle/end of billing month (e.g. YYYY-MM-28)
    const checkDate = new Date(`${billingMonth}-28`);
    const contract = this.getActiveContractForRoom(roomId, checkDate);
    if (!contract) {
      throw new Error(`No active contract found for Room "${room.name}" in month ${billingMonth}.`);
    }

    // 3. Find utility readings for this month
    const currentReading = this.getReadingForRoom(roomId, billingMonth);
    if (!currentReading) {
      throw new Error(`Utility reading not found for Room "${room.name}" in month ${billingMonth}. Please record readings first.`);
    }

    // 4. Calculate active occupants
    const occupants = this.getTenantsInRoom(roomId);
    const occupantsCount = occupants.length || 1; // Default to 1 if no registered tenants but room is occupied

    // 5. Construct invoice details
    const invoiceData = {
      roomId: roomId,
      billingMonth: billingMonth,
      roomRent: contract.rentPrice,
      
      electricityDetails: {
        previous: currentReading.electricityPrevious,
        current: currentReading.electricityCurrent,
        unitPrice: this.config.electricityUnitPrice
      },

      waterDetails: {
        previous: currentReading.waterPrevious,
        current: currentReading.waterCurrent,
        calculationType: this.config.waterCalculationType,
        occupantsCount: occupantsCount,
        unitPrice: this.config.waterUnitPrice
      },

      services: this.config.otherServices.map(service => {
        let quantity = 1;
        if (service.type === 'per_person') {
          quantity = occupantsCount;
        }
        return {
          name: service.name,
          price: service.price,
          quantity: quantity,
          type: service.type
        };
      })
    };

    if (dueDate) {
      invoiceData.dueDate = dueDate;
    }

    const invoice = new Invoice(invoiceData);
    invoice.validate();

    // Check if invoice already exists for this room/month
    const existingIndex = this.invoices.findIndex(
      inv => inv.roomId === roomId && inv.billingMonth === billingMonth
    );

    if (existingIndex !== -1) {
      // Overwrite/update invoice
      this.invoices[existingIndex] = invoice;
    } else {
      this.invoices.push(invoice);
    }

    this.saveAll();
    return invoice;
  }

  getInvoices() {
    return this.invoices;
  }

  getInvoice(id) {
    return this.invoices.find(i => i.id === id) || null;
  }

  recordInvoicePayment(invoiceId, amount, date = new Date()) {
    const invoice = this.getInvoice(invoiceId);
    if (!invoice) throw new Error('Invoice not found.');

    invoice.recordPayment(amount, date);
    this.saveAll();
    return invoice;
  }

  deleteInvoice(invoiceId) {
    const invoice = this.getInvoice(invoiceId);
    if (!invoice) throw new Error('Invoice not found.');

    this.invoices = this.invoices.filter(i => i.id !== invoiceId);
    this.saveAll();
  }

  /**
   * Helper to clear all data (useful for test setup/reset)
   */
  clearAllData() {
    this.rooms = [];
    this.tenants = [];
    this.contracts = [];
    this.readings = [];
    this.invoices = [];
    this.config = new ServiceConfig();
    this.saveAll();
  }
}
