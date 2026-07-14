// src/constants/payment-methods.js

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
