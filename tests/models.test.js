import { describe, it, expect } from 'vitest';
import { Room, RoomStatus } from '../src/models/Room.js';
import { Tenant, TenantStatus } from '../src/models/Tenant.js';
import { Contract, ContractStatus } from '../src/models/Contract.js';
import { UtilityReading } from '../src/models/UtilityReading.js';
import { ServiceConfig, WaterCalcType, ServiceType } from '../src/models/ServiceConfig.js';
import { Invoice, PaymentStatus } from '../src/models/Invoice.js';

describe('Data Models', () => {
  
  describe('Room Model', () => {
    it('should create room with default values', () => {
      const room = new Room({ name: 'Phòng 101', rentPrice: 2000000 });
      expect(room.id).toBeDefined();
      expect(room.status).toBe(RoomStatus.EMPTY);
      expect(room.maxOccupants).toBe(2);
      expect(room.description).toBe('');
      expect(room.createdAt).toBeDefined();
    });

    it('should validate correctly and throw on invalid values', () => {
      const validRoom = new Room({ name: 'Phòng 102', rentPrice: 2500000 });
      expect(validRoom.validate()).toBe(true);

      const invalidName = new Room({ name: '', rentPrice: 2000000 });
      expect(() => invalidName.validate()).toThrow();

      const invalidPrice = new Room({ name: '103', rentPrice: -500 });
      expect(() => invalidPrice.validate()).toThrow();

      const invalidOccupants = new Room({ name: '104', rentPrice: 2000000, maxOccupants: 0 });
      expect(() => invalidOccupants.validate()).toThrow();

      const invalidStatus = new Room({ name: '105', rentPrice: 2000000, status: 'unknown' });
      expect(() => invalidStatus.validate()).toThrow();
    });

    it('should update values and set updatedAt', () => {
      const room = new Room({ 
        name: '101', 
        rentPrice: 2000000, 
        createdAt: '2026-01-01T00:00:00.000Z', 
        updatedAt: '2026-01-01T00:00:00.000Z' 
      });
      const initialUpdated = room.updatedAt;
      
      room.update({ rentPrice: 2200000, status: RoomStatus.MAINTENANCE });
      expect(room.rentPrice).toBe(2200000);
      expect(room.status).toBe(RoomStatus.MAINTENANCE);
      expect(room.updatedAt).not.toBe(initialUpdated);
    });

    it('should serialize to and from JSON', () => {
      const room = new Room({ name: '102', rentPrice: 3000000 });
      const json = room.toJSON();
      expect(json.name).toBe('102');
      expect(json.rentPrice).toBe(3000000);

      const deserialized = Room.fromJSON(json);
      expect(deserialized).toBeInstanceOf(Room);
      expect(deserialized.name).toBe('102');
      expect(deserialized.id).toBe(room.id);
    });
  });

  describe('Tenant Model', () => {
    it('should validate phone and ID card patterns', () => {
      const validTenant = new Tenant({ name: 'Nguyen Van A', phone: '0987654321', idCard: '123456789' });
      expect(validTenant.validate()).toBe(true);

      const invalidPhone = new Tenant({ name: 'Nguyen Van A', phone: '123', idCard: '123456789' });
      expect(() => invalidPhone.validate()).toThrow();

      const invalidIdCard = new Tenant({ name: 'Nguyen Van A', phone: '0987654321', idCard: '12345' });
      expect(() => invalidIdCard.validate()).toThrow();

      const invalidEmail = new Tenant({ name: 'A', phone: '0987654321', idCard: '123456789', email: 'not-an-email' });
      expect(() => invalidEmail.validate()).toThrow();
    });

    it('should assign and remove room', () => {
      const tenant = new Tenant({ name: 'A', phone: '0987654321', idCard: '123456789' });
      expect(tenant.roomId).toBeNull();

      tenant.assignRoom('room-123');
      expect(tenant.roomId).toBe('room-123');
      expect(tenant.status).toBe(TenantStatus.ACTIVE);

      tenant.removeRoom();
      expect(tenant.roomId).toBeNull();
      expect(tenant.status).toBe(TenantStatus.INACTIVE);
    });
  });

  describe('Contract Model', () => {
    it('should validate start and end dates', () => {
      const contract = new Contract({
        roomId: 'room-1',
        tenantId: 'tenant-1',
        startDate: '2026-07-01',
        endDate: '2027-07-01',
        rentPrice: 2000000,
        deposit: 2000000
      });
      expect(contract.validate()).toBe(true);

      const invalidDateRange = new Contract({
        roomId: 'room-1',
        tenantId: 'tenant-1',
        startDate: '2026-07-01',
        endDate: '2026-06-01',
        rentPrice: 2000000
      });
      expect(() => invalidDateRange.validate()).toThrow();
    });

    it('should check active dates correctly', () => {
      const contract = new Contract({
        roomId: 'room-1',
        tenantId: 'tenant-1',
        startDate: '2026-07-01',
        endDate: '2026-12-31',
        rentPrice: 2000000
      });

      expect(contract.isActiveAt('2026-06-30')).toBe(false);
      expect(contract.isActiveAt('2026-07-01')).toBe(true);
      expect(contract.isActiveAt('2026-09-15')).toBe(true);
      expect(contract.isActiveAt('2026-12-31')).toBe(true);
      expect(contract.isActiveAt('2027-01-01')).toBe(false);
    });

    it('should terminate contract', () => {
      const contract = new Contract({
        roomId: 'room-1',
        tenantId: 'tenant-1',
        startDate: '2026-07-01',
        rentPrice: 2000000
      });

      contract.terminate('2026-08-15');
      expect(contract.endDate).toBe('2026-08-15');
      expect(contract.status).toBe(ContractStatus.TERMINATED);
      expect(contract.isActiveAt('2026-08-16')).toBe(false);
    });
  });

  describe('UtilityReading Model', () => {
    it('should calculate electricity and water usages', () => {
      const reading = new UtilityReading({
        roomId: 'room-1',
        billingMonth: '2026-07',
        electricityPrevious: 100,
        electricityCurrent: 150,
        waterPrevious: 20,
        waterCurrent: 35
      });

      expect(reading.getElectricityUsage()).toBe(50);
      expect(reading.getWaterUsage()).toBe(15);
      expect(reading.validate()).toBe(true);
    });

    it('should throw if current reading is less than previous', () => {
      const invalidElec = new UtilityReading({
        roomId: 'room-1',
        billingMonth: '2026-07',
        electricityPrevious: 100,
        electricityCurrent: 90
      });
      expect(() => invalidElec.validate()).toThrow();

      const invalidWater = new UtilityReading({
        roomId: 'room-1',
        billingMonth: '2026-07',
        waterPrevious: 50,
        waterCurrent: 45
      });
      expect(() => invalidWater.validate()).toThrow();
    });
  });

  describe('ServiceConfig Model', () => {
    it('should handle custom services addition, updates, and removal', () => {
      const config = new ServiceConfig({
        electricityUnitPrice: 4000,
        waterUnitPrice: 25000,
        waterCalculationType: WaterCalcType.PER_CUBIC
      });

      expect(config.otherServices.length).toBe(0);

      config.addService({ name: 'WiFi', price: 100000, type: ServiceType.FLAT });
      expect(config.otherServices.length).toBe(1);
      expect(config.otherServices[0].name).toBe('WiFi');
      expect(config.otherServices[0].price).toBe(100000);

      const wifiId = config.otherServices[0].id;
      config.updateService(wifiId, { price: 120000 });
      expect(config.otherServices[0].price).toBe(120000);

      config.removeService(wifiId);
      expect(config.otherServices.length).toBe(0);
    });
  });

  describe('Invoice Model', () => {
    it('should calculate invoice total amounts correctly for cubic water calc', () => {
      const invoice = new Invoice({
        roomId: 'room-1',
        billingMonth: '2026-07',
        roomRent: 2000000,
        electricityDetails: {
          previous: 100,
          current: 150, // 50 usage
          unitPrice: 3000 // 150,000 total
        },
        waterDetails: {
          previous: 10,
          current: 18, // 8 usage
          unitPrice: 20000, // 160,000 total
          calculationType: 'per_cubic'
        },
        services: [
          { name: 'Wifi', price: 100000, quantity: 1, type: 'flat' },
          { name: 'Cleaning', price: 50000, quantity: 2, type: 'per_person' } // 100,000 total
        ]
      });

      // roomRent (2,000,000) + elec (150,000) + water (160,000) + services (200,000) = 2,510,000
      expect(invoice.totalAmount).toBe(2510000);
      expect(invoice.paymentStatus).toBe(PaymentStatus.UNPAID);
    });

    it('should calculate water per person correctly', () => {
      const invoice = new Invoice({
        roomId: 'room-1',
        billingMonth: '2026-07',
        roomRent: 2000000,
        electricityDetails: { previous: 100, current: 150, unitPrice: 3000 },
        waterDetails: {
          unitPrice: 100000,
          calculationType: 'per_person',
          occupantsCount: 3 // 300,000 total water
        }
      });

      // 2,000,000 + 150,000 + 300,000 = 2,450,000
      expect(invoice.totalAmount).toBe(2450000);
    });

    it('should transition payment status on recording payments', () => {
      const invoice = new Invoice({
        roomId: 'room-1',
        billingMonth: '2026-07',
        roomRent: 2000000,
        electricityDetails: { previous: 100, current: 100, unitPrice: 3000 },
        waterDetails: { previous: 0, current: 0, unitPrice: 20000 }
      });

      expect(invoice.totalAmount).toBe(2000000);
      expect(invoice.paymentStatus).toBe(PaymentStatus.UNPAID);

      invoice.recordPayment(500000, '2026-07-15');
      expect(invoice.paidAmount).toBe(500000);
      expect(invoice.paymentStatus).toBe(PaymentStatus.PARTIALLY_PAID);
      expect(invoice.paymentDate).toBeNull();

      invoice.recordPayment(1500000, '2026-07-16');
      expect(invoice.paidAmount).toBe(2000000);
      expect(invoice.paymentStatus).toBe(PaymentStatus.PAID);
      expect(invoice.paymentDate).toBe('2026-07-16');
    });
  });
});
