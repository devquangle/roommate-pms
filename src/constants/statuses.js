// src/constants/statuses.js

/**
 * Trạng thái phòng.
 */
export const ROOM_STATUS = Object.freeze({
  AVAILABLE: 'available',
  RENTED: 'rented',
  MAINTENANCE: 'maintenance',
});

export const ROOM_STATUS_LABELS = Object.freeze({
  [ROOM_STATUS.AVAILABLE]: 'Trống',
  [ROOM_STATUS.RENTED]: 'Đang thuê',
  [ROOM_STATUS.MAINTENANCE]: 'Bảo trì',
});

/**
 * Trạng thái người thuê.
 */
export const TENANT_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
});

export const TENANT_STATUS_LABELS = Object.freeze({
  [TENANT_STATUS.ACTIVE]: 'Đang thuê',
  [TENANT_STATUS.INACTIVE]: 'Đã rời',
});

/**
 * Trạng thái hợp đồng.
 */
export const CONTRACT_STATUS = Object.freeze({
  DRAFT: 'draft',
  ACTIVE: 'active',
  EXPIRED: 'expired',
  TERMINATED: 'terminated',
});

export const CONTRACT_STATUS_LABELS = Object.freeze({
  [CONTRACT_STATUS.DRAFT]: 'Bản nháp',
  [CONTRACT_STATUS.ACTIVE]: 'Hiệu lực',
  [CONTRACT_STATUS.EXPIRED]: 'Hết hạn',
  [CONTRACT_STATUS.TERMINATED]: 'Đã thanh lý',
});

/**
 * Trạng thái hóa đơn.
 */
export const INVOICE_STATUS = Object.freeze({
  DRAFT: 'draft',
  UNPAID: 'unpaid',
  PARTIAL: 'partial',
  PAID: 'paid',
  CANCELLED: 'cancelled',
});

export const INVOICE_STATUS_LABELS = Object.freeze({
  [INVOICE_STATUS.DRAFT]: 'Bản nháp',
  [INVOICE_STATUS.UNPAID]: 'Chưa thanh toán',
  [INVOICE_STATUS.PARTIAL]: 'Thanh toán một phần',
  [INVOICE_STATUS.PAID]: 'Đã thanh toán',
  [INVOICE_STATUS.CANCELLED]: 'Đã hủy',
});

/**
 * Phương thức thanh toán.
 */
export const PAYMENT_METHOD = Object.freeze({
  CASH: 'cash',
  TRANSFER: 'transfer',
});

export const PAYMENT_METHOD_LABELS = Object.freeze({
  [PAYMENT_METHOD.CASH]: 'Tiền mặt',
  [PAYMENT_METHOD.TRANSFER]: 'Chuyển khoản',
});
