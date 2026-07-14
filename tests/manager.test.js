import { describe, it, expect, beforeEach } from 'vitest';
import { RoomMateManager } from '../src/services/RoomMateManager.js';
import { RoomStatus } from '../src/models/Room.js';
import { TenantStatus } from '../src/models/Tenant.js';
import { ContractStatus } from '../src/models/Contract.js';
import { WaterCalcType, ServiceType } from '../src/models/ServiceConfig.js';
import { PaymentStatus } from '../src/models/Invoice.js';

describe('RoomMateManager Service Orchestrator', () => {
  let manager;

  beforeEach(() => {
    manager = new RoomMateManager();
    manager.clearAllData();
  });

  describe('Room and Tenant Management', () => {
    it('should add, update, and delete rooms', () => {
      const room = manager.addRoom({ name: '101', rentPrice: 2000000 });
      expect(manager.getRooms().length).toBe(1);
      expect(manager.getRoom(room.id)).toBeDefined();

      manager.updateRoom(room.id, { description: 'Room with view' });
      expect(manager.getRoom(room.id).description).toBe('Room with view');

      manager.deleteRoom(room.id);
      expect(manager.getRooms().length).toBe(0);
    });

    it('should prevent adding rooms with duplicate names', () => {
      manager.addRoom({ name: '101', rentPrice: 2000000 });
      expect(() => manager.addRoom({ name: '101', rentPrice: 2500000 })).toThrow();
    });

    it('should add, update, and delete tenants', () => {
      const tenant = manager.addTenant({ name: 'Nguyen Van A', phone: '0987654321', idCard: '123456789012' });
      expect(manager.getTenants().length).toBe(1);
      expect(manager.getTenant(tenant.id)).toBeDefined();

      manager.updateTenant(tenant.id, { email: 'a@gmail.com' });
      expect(manager.getTenant(tenant.id).email).toBe('a@gmail.com');

      manager.deleteTenant(tenant.id);
      expect(manager.getTenants().length).toBe(0);
    });

    it('should prevent duplicate CCCD/ID Card numbers', () => {
      manager.addTenant({ name: 'User A', phone: '0987654321', idCard: '123456789012' });
      expect(() => manager.addTenant({ name: 'User B', phone: '0123456789', idCard: '123456789012' })).toThrow();
    });
  });

  describe('Contract Workflows', () => {
    it('should handle full contract lifecycle (creation, occupancy change, termination)', () => {
      const room = manager.addRoom({ name: '101', rentPrice: 2000000 });
      const tenant1 = manager.addTenant({ name: 'User A', phone: '0987654321', idCard: '123456789012' });
      const tenant2 = manager.addTenant({ name: 'User B', phone: '0123456789', idCard: '987654321098' });

      // Create contract
      const contract = manager.createContract({
        roomId: room.id,
        tenantId: tenant1.id,
        startDate: '2026-07-01',
        rentPrice: 2000000,
        deposit: 2000000
      });

      expect(contract).toBeDefined();
      expect(contract.status).toBe(ContractStatus.ACTIVE);
      
      // Verification of side-effects
      const updatedRoom = manager.getRoom(room.id);
      expect(updatedRoom.status).toBe(RoomStatus.RENTED);
      
      const updatedTenant1 = manager.getTenant(tenant1.id);
      expect(updatedTenant1.roomId).toBe(room.id);
      expect(updatedTenant1.status).toBe(TenantStatus.ACTIVE);

      // Manually add second tenant to room
      manager.updateTenant(tenant2.id, { roomId: room.id });
      expect(manager.getTenantsInRoom(room.id).length).toBe(2);

      // Terminate contract
      manager.terminateContract(contract.id, '2026-08-31');
      expect(contract.status).toBe(ContractStatus.TERMINATED);
      expect(contract.endDate).toBe('2026-08-31');

      // Verify room reset to empty and tenants evicted
      expect(manager.getRoom(room.id).status).toBe(RoomStatus.EMPTY);
      expect(manager.getTenant(tenant1.id).roomId).toBeNull();
      expect(manager.getTenant(tenant1.id).status).toBe(TenantStatus.INACTIVE);
      expect(manager.getTenant(tenant2.id).roomId).toBeNull();
      expect(manager.getTenant(tenant2.id).status).toBe(TenantStatus.INACTIVE);
    });

    it('should throw when leasing an already rented room', () => {
      const room = manager.addRoom({ name: '101', rentPrice: 2000000 });
      const tenant1 = manager.addTenant({ name: 'User A', phone: '0987654321', idCard: '123456789012' });
      const tenant2 = manager.addTenant({ name: 'User B', phone: '0123456789', idCard: '987654321098' });

      manager.createContract({
        roomId: room.id,
        tenantId: tenant1.id,
        startDate: '2026-07-01',
        rentPrice: 2000000
      });

      // Try renting again
      expect(() => manager.createContract({
        roomId: room.id,
        tenantId: tenant2.id,
        startDate: '2026-07-05',
        rentPrice: 2000000
      })).toThrow();
    });
  });

  describe('Invoice Generation and Billing', () => {
    it('should generate invoice using recorded utility readings', () => {
      const room = manager.addRoom({ name: '201', rentPrice: 3000000 });
      const tenant = manager.addTenant({ name: 'User A', phone: '0987654321', idCard: '123456789012' });
      
      manager.createContract({
        roomId: room.id,
        tenantId: tenant.id,
        startDate: '2026-07-01',
        rentPrice: 3000000
      });

      // Record reading for July
      manager.recordReading({
        roomId: room.id,
        billingMonth: '2026-07',
        electricityPrevious: 1000,
        electricityCurrent: 1150, // 150 usage
        waterPrevious: 100,
        waterCurrent: 110 // 10 usage
      });

      // Configure rates
      manager.updateServiceConfig({
        electricityUnitPrice: 4000, // 150 * 4000 = 600,000
        waterUnitPrice: 20000, // 10 * 20000 = 200,000
        waterCalculationType: WaterCalcType.PER_CUBIC,
        otherServices: [
          { name: 'Wifi', price: 100000, type: ServiceType.FLAT },
          { name: 'Trash', price: 30000, type: ServiceType.PER_ROOM }
        ]
      });

      // Generate invoice
      const invoice = manager.generateInvoice(room.id, '2026-07');
      expect(invoice).toBeDefined();
      expect(invoice.billingMonth).toBe('2026-07');
      expect(invoice.roomRent).toBe(3000000);
      expect(invoice.electricityDetails.usage).toBe(150);
      expect(invoice.electricityDetails.total).toBe(600000);
      expect(invoice.waterDetails.usage).toBe(10);
      expect(invoice.waterDetails.total).toBe(200000);
      
      // rent (3,000,000) + elec (600,000) + water (200,000) + services (130,000) = 3,930,000
      expect(invoice.totalAmount).toBe(3930000);
      expect(invoice.paymentStatus).toBe(PaymentStatus.UNPAID);

      // Record payment
      manager.recordInvoicePayment(invoice.id, 3930000);
      expect(invoice.paymentStatus).toBe(PaymentStatus.PAID);
      expect(invoice.paidAmount).toBe(3930000);
    });

    it('should generate invoice using water calculated per person', () => {
      const room = manager.addRoom({ name: '202', rentPrice: 3000000 });
      const tenant1 = manager.addTenant({ name: 'User A', phone: '0987654321', idCard: '123456789012' });
      const tenant2 = manager.addTenant({ name: 'User B', phone: '0123456789', idCard: '987654321098' });

      manager.createContract({
        roomId: room.id,
        tenantId: tenant1.id,
        startDate: '2026-07-01',
        rentPrice: 3000000
      });

      // Add second tenant
      manager.updateTenant(tenant2.id, { roomId: room.id });

      // Record reading for July
      manager.recordReading({
        roomId: room.id,
        billingMonth: '2026-07',
        electricityPrevious: 100,
        electricityCurrent: 100,
        waterPrevious: 10,
        waterCurrent: 10
      });

      // Config water rate per person
      manager.updateServiceConfig({
        electricityUnitPrice: 4000,
        waterUnitPrice: 100000,
        waterCalculationType: WaterCalcType.PER_PERSON, // 2 occupants * 100,000 = 200,000
        otherServices: [
          { name: 'Clean', price: 50000, type: ServiceType.PER_PERSON } // 2 occupants * 50,000 = 100,000
        ]
      });

      const invoice = manager.generateInvoice(room.id, '2026-07');
      expect(invoice.waterDetails.total).toBe(200000);
      expect(invoice.services[0].total).toBe(100000);
      
      // rent (3,000,000) + water (200,000) + clean (100,000) = 3,300,000
      expect(invoice.totalAmount).toBe(3300000);
    });
  });
});
