// tests/business/payment-flow.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import * as StorageService from '../../src/services/storage-service.js';
import { STORAGE_KEYS } from '../../src/constants/storage-keys.js';
import { createPayment, deletePayment } from '../../src/services/payment-service.js';

describe('Payment Business Flow Test', () => {
  const INVOICES_KEY = STORAGE_KEYS.INVOICES;

  // Yêu cầu dọn dữ liệu trước mỗi test
  beforeEach(() => {
    localStorage.clear();
  });

  it('should execute full payment flow: create invoice 2M -> pay 1.2M -> debt 800k (partial) -> pay 800k -> debt 0 (paid)', () => {
    // 1. Tạo hóa đơn 2.000.000
    const invoice = {
      id: 'i-flow-1',
      roomId: 'room-101',
      totalAmount: 2000000,
      paidAmount: 0,
      remainingDebt: 2000000,
      status: 'unpaid',
      dueDate: '2026-07-25'
    };
    StorageService.create(INVOICES_KEY, invoice);

    // 2. Thanh toán 1.200.000
    const payment1 = createPayment({
      invoiceId: 'i-flow-1',
      amount: 1200000,
      method: 'transfer',
      date: '2026-07-20',
      note: 'Thanh toán đợt 1'
    });
    expect(payment1.id).toBeDefined();

    // 3 & 4. Kiểm tra: Còn nợ 800.000 và trạng thái thanh toán một phần ('partial')
    let updatedInvoice = StorageService.getById(INVOICES_KEY, 'i-flow-1');
    expect(updatedInvoice.paidAmount).toBe(1200000);
    expect(updatedInvoice.remainingDebt).toBe(800000); // Còn nợ 800.000
    expect(updatedInvoice.status).toBe('partial');     // Trạng thái thanh toán một phần

    // 5. Thanh toán tiếp 800.000
    const payment2 = createPayment({
      invoiceId: 'i-flow-1',
      amount: 800000,
      method: 'cash',
      date: '2026-07-21',
      note: 'Thanh toán đợt 2'
    });
    expect(payment2.id).toBeDefined();

    // 6 & 7. Kiểm tra: Còn nợ 0 và trạng thái đã thanh toán ('paid')
    updatedInvoice = StorageService.getById(INVOICES_KEY, 'i-flow-1');
    expect(updatedInvoice.paidAmount).toBe(2000000);
    expect(updatedInvoice.remainingDebt).toBe(0);      // Còn nợ 0
    expect(updatedInvoice.status).toBe('paid');       // Trạng thái đã thanh toán
  });

  // Test bổ sung 1: Không cho thanh toán vượt công nợ.
  it('should not allow payment exceeding remaining debt', () => {
    const invoice = {
      id: 'i-flow-2',
      roomId: 'room-101',
      totalAmount: 2000000,
      paidAmount: 1200000,
      remainingDebt: 800000, // Công nợ còn 800.000
      status: 'partial',
      dueDate: '2026-07-25'
    };
    StorageService.create(INVOICES_KEY, invoice);

    // Cố tình thanh toán 900.000 vượt quá nợ còn lại (800.000)
    expect(() => createPayment({
      invoiceId: 'i-flow-2',
      amount: 900000,
      method: 'transfer',
      date: '2026-07-20'
    })).toThrow(/Số tiền thanh toán \(900000\) không được vượt quá công nợ còn lại \(800000\)/);
  });

  // Test bổ sung 2: Xóa giao dịch thanh toán phải cập nhật lại hóa đơn.
  it('should update and increase remaining debt on the invoice when a payment transaction is deleted', () => {
    const invoice = {
      id: 'i-flow-3',
      roomId: 'room-101',
      totalAmount: 2000000,
      paidAmount: 0,
      remainingDebt: 2000000,
      status: 'unpaid',
      dueDate: '2026-07-25'
    };
    StorageService.create(INVOICES_KEY, invoice);

    // Thực hiện thanh toán 1.200.000
    const payment = createPayment({
      invoiceId: 'i-flow-3',
      amount: 1200000,
      method: 'transfer',
      date: '2026-07-20'
    });

    let currentInvoice = StorageService.getById(INVOICES_KEY, 'i-flow-3');
    expect(currentInvoice.remainingDebt).toBe(800000);
    expect(currentInvoice.status).toBe('partial');

    // Xóa giao dịch thanh toán vừa tạo
    deletePayment(payment.id);

    // Kiểm tra hóa đơn đã được cập nhật lại: nợ tăng lại thành 2.000.000, trạng thái quay lại 'unpaid'
    currentInvoice = StorageService.getById(INVOICES_KEY, 'i-flow-3');
    expect(currentInvoice.paidAmount).toBe(0);
    expect(currentInvoice.remainingDebt).toBe(2000000); // Công nợ tăng lại
    expect(currentInvoice.status).toBe('unpaid');
  });

  // Test bổ sung 3: Không cho thanh toán hóa đơn đã hủy.
  it('should not allow payment for a cancelled invoice', () => {
    const invoice = {
      id: 'i-flow-4',
      roomId: 'room-101',
      totalAmount: 2000000,
      paidAmount: 0,
      remainingDebt: 2000000,
      status: 'cancelled', // Hóa đơn đã hủy
      dueDate: '2026-07-25'
    };
    StorageService.create(INVOICES_KEY, invoice);

    // Cố tình thanh toán cho hóa đơn đã hủy
    expect(() => createPayment({
      invoiceId: 'i-flow-4',
      amount: 500000,
      method: 'transfer',
      date: '2026-07-20'
    })).toThrow(/Không thể thanh toán cho hóa đơn đã hủy/);
  });
});

