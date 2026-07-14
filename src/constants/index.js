// src/constants/index.js
export const ROOM_STATUS = {
  AVAILABLE: 'available',
  RENTED: 'rented',
  MAINTENANCE: 'maintenance'
};

export const CONTRACT_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  TERMINATED: 'terminated'
};

export const INVOICE_STATUS = {
  UNPAID: 'unpaid',
  PARTIAL: 'partial',
  PAID: 'paid'
};

export const LOCAL_STORAGE_KEYS = {
  ROOMS: 'rooms',
  TENANTS: 'tenants',
  CONTRACTS: 'contracts',
  METER_READINGS: 'meterReadings',
  SERVICE_CONFIGS: 'serviceConfigs',
  INVOICES: 'invoices',
  PAYMENTS: 'payments',
  APP_SETTINGS: 'appSettings'
};
