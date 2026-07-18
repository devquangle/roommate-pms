// tests/business/payment-flow.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import * as StorageService from '../../src/services/storage-service.js';
import { STORAGE_KEYS } from '../../src/constants/storage-keys.js';
import { createPayment, deletePayment, getPaymentsByInvoice } from '../../src/services/payment-service.js';

describe('Payment Flow Integration Test', () => {
  const INVOICES_KEY = STORAGE_KEYS.INVOICES;

  // Yêu cầu dọn dữ liệu trước mỗi test
  beforeEach(() => {
    localStorage.clear();
  });

  it('should successfully execute payment flow: create invoice 2M -> pay 1.2M -> nợ 800k (partial) -> pay 800k -> nợ 0 (paid)', () => {
    // 1. Tạo hóa đơn 2.000.000 (Tạo dữ liệu test độc lập)
    const invoice = {
      id: 'i-test-1',
      roomId: 'room-1',
      totalAmount: 2000000,
      paidAmount: 0,
      remainingDebt: 2000000,
      status: 'unpaid',
      dueDate: '2026-07-20'
    };
    StorageService.create(INVOICES_KEY, invoice);

    // 2. Thanh toán 1.200.000
    const payment1 = createPayment({
      invoiceId: 'i-test-1',
      amount: 1200000,
      method: 'transfer',
      date: '2026-07-18',
      note: 'Lần 1'
    });
    expect(payment1.id).toBeDefined();

    // Kiểm tra nợ còn 800.000 và trạng thái thanh toán một phần (partial)
    let updatedInvoice = StorageService.getById(INVOICES_KEY, 'i-test-1');
    expect(updatedInvoice.remainingDebt).toBe(800000);
    expect(updatedInvoice.paidAmount).toBe(1200000);
    expect(updatedInvoice.status).toBe('partial');

    // 3. Thanh toán tiếp 800.000
    const payment2 = createPayment({
      invoiceId: 'i-test-1',
      amount: 800000,
      method: 'cash',
      date: '2026-07-18',
      note: 'Lần 2'
    });
    expect(payment2.id).toBeDefined();

    // Kiểm tra nợ còn 0 và trạng thái đã thanh toán (paid)
    updatedInvoice = StorageService.getById(INVOICES_KEY, 'i-test-1');
    expect(updatedInvoice.remainingDebt).toBe(0);
    expect(updatedInvoice.paidAmount).toBe(2000000);
    expect(updatedInvoice.status).toBe('paid');
  });

  // - Không cho thanh toán vượt công nợ.
  it('should not allow payment exceeding remaining debt', () => {
    const invoice = {
      id: 'i-test-2',
      roomId: 'room-1',
      totalAmount: 2000000,
      paidAmount: 0,
      remainingDebt: 2000000,
      status: 'unpaid',
      dueDate: '2026-07-20'
    };
    StorageService.create(INVOICES_KEY, invoice);

    // Thử thanh toán vượt công nợ (2.100.000 > 2.000.000)
    expect(() => createPayment({
      invoiceId: 'i-test-2',
      amount: 2100000,
      method: 'transfer',
      date: '2026-07-18'
    })).toThrow(/không được vượt quá công nợ còn lại/);
  });

  // - Xóa giao dịch thanh toán phải cập nhật lại hóa đơn.
  it('should update and recalculate the invoice when a payment transaction is deleted', () => {
    const invoice = {
      id: 'i-test-3',
      roomId: 'room-1',
      totalAmount: 2000000,
      paidAmount: 0,
      remainingDebt: 2000000,
      status: 'unpaid',
      dueDate: '2026-07-20'
    };
    StorageService.create(INVOICES_KEY, invoice);

    // Thanh toán 1.200.000
    const payment = createPayment({
      invoiceId: 'i-test-3',
      amount: 1200000,
      method: 'transfer',
      date: '2026-07-18'
    });

    // Xác nhận đã lưu nợ là 800k
    let updatedInvoice = StorageService.getById(INVOICES_KEY, 'i-test-3');
    expect(updatedInvoice.remainingDebt).toBe(800000);
    expect(updatedInvoice.status).toBe('partial');

    // Xóa giao dịch thanh toán
    deletePayment(payment.id);

    // Kiểm tra nợ quay lại 2.000.000 và trạng thái về chưa thanh toán (unpaid)
    updatedInvoice = StorageService.getById(INVOICES_KEY, 'i-test-3');
    expect(updatedInvoice.remainingDebt).toBe(2000000);
    expect(updatedInvoice.paidAmount).toBe(0);
    expect(updatedInvoice.status).toBe('unpaid');
  });

  // - Không cho thanh toán hóa đơn đã hủy.
  it('should not allow payment for a cancelled invoice', () => {
    const invoice = {
      id: 'i-test-4',
      roomId: 'room-1',
      totalAmount: 2000000,
      paidAmount: 0,
      remainingDebt: 2000000,
      status: 'cancelled', // Trạng thái đã hủy
      dueDate: '2026-07-20'
    };
    StorageService.create(INVOICES_KEY, invoice);

    expect(() => createPayment({
      invoiceId: 'i-test-4',
      amount: 500000,
      method: 'transfer',
      date: '2026-07-18'
    })).toThrow(/Không thể thanh toán cho hóa đơn đã hủy/);
  });
});
