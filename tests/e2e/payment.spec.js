// tests/e2e/payment.spec.js
import { test, expect } from '@playwright/test';

test.describe('RoomMate Payments & Dashboard Updates E2E', () => {

  test.beforeEach(async ({ page }) => {
    // Dọn LocalStorage trước mỗi test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('1. THANH TOÁN MỘT PHẦN: Thanh toán một phần hóa đơn và kiểm tra nợ giảm', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const room = { id: 'P901', name: 'Phòng 901', floor: 'Tầng 9', type: 'standard', price: 2000000, area: 25, status: 'rented', maxTenants: 3 };
      const tenant = { id: 't-test-901', fullName: 'Nguyễn Văn H', phone: '0901234567', status: 'active' };
      const contract = { id: 'c-test-901', roomId: 'P901', tenantId: 't-test-901', startDate: '2026-07-01', endDate: '2027-07-01', roomPrice: 2000000, deposit: 2000000, status: 'active' };
      const invoice = {
        id: 'i-test-pay-1',
        roomId: 'P901',
        contractId: 'c-test-901',
        month: 7,
        year: 2026,
        totalAmount: 2000000,
        paidAmount: 0,
        remainingDebt: 2000000,
        status: 'unpaid',
        dueDate: '2026-08-10'
      };

      localStorage.setItem('rooms', JSON.stringify([room]));
      localStorage.setItem('tenants', JSON.stringify([tenant]));
      localStorage.setItem('contracts', JSON.stringify([contract]));
      localStorage.setItem('invoices', JSON.stringify([invoice]));
    });

    // Mở trang Thanh toán và tạo phiếu thu một phần (1.200.000 VNĐ)
    await page.goto('/payments');
    await page.locator('[data-testid="btn-add-payment"]').click();
    await expect(page.locator('[data-testid="payment-form-modal"]')).toBeVisible();

    await page.locator('[data-testid="select-invoice"]').selectOption('i-test-pay-1');
    await page.locator('[data-testid="input-amount"]').fill('1200000');
    await page.locator('[data-testid="select-method"]').selectOption('transfer');

    await page.locator('[data-testid="btn-payment-save"]').click();
    await expect(page.locator('[data-testid="payment-form-modal"]')).toBeHidden();

    // Kiểm tra hóa đơn cập nhật còn nợ 800.000 VNĐ & trạng thái 'Thanh toán một phần'
    await page.goto('/invoices');
    const rowSelector = '[data-testid="invoice-row-i-test-pay-1"]';
    await expect(page.locator(rowSelector)).toContainText('Thanh toán một phần');
    await expect(page.locator(rowSelector)).toContainText('800.000');
  });

  test('2. THANH TOÁN ĐỦ: Thanh toán phần còn lại và chuyển hóa đơn thành Đã thanh toán', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const room = { id: 'P902', name: 'Phòng 902', floor: 'Tầng 9', type: 'standard', price: 2000000, area: 25, status: 'rented', maxTenants: 3 };
      const tenant = { id: 't-test-902', fullName: 'Phạm Thị L', phone: '0902223334', status: 'active' };
      const contract = { id: 'c-test-902', roomId: 'P902', tenantId: 't-test-902', startDate: '2026-07-01', endDate: '2027-07-01', roomPrice: 2000000, deposit: 2000000, status: 'active' };
      const invoice = {
        id: 'i-test-pay-2',
        roomId: 'P902',
        contractId: 'c-test-902',
        month: 7,
        year: 2026,
        totalAmount: 2000000,
        paidAmount: 1200000,
        remainingDebt: 800000,
        status: 'partial',
        dueDate: '2026-08-10'
      };

      const initialPayment = {
        id: 'p-init-902',
        invoiceId: 'i-test-pay-2',
        amount: 1200000,
        method: 'transfer',
        date: '2026-07-15'
      };

      localStorage.setItem('rooms', JSON.stringify([room]));
      localStorage.setItem('tenants', JSON.stringify([tenant]));
      localStorage.setItem('contracts', JSON.stringify([contract]));
      localStorage.setItem('invoices', JSON.stringify([invoice]));
      localStorage.setItem('payments', JSON.stringify([initialPayment]));
    });

    // Mở trang Thanh toán và trả nốt 800.000 VNĐ
    await page.goto('/payments');
    await page.locator('[data-testid="btn-add-payment"]').click();
    await expect(page.locator('[data-testid="payment-form-modal"]')).toBeVisible();

    await page.locator('[data-testid="select-invoice"]').selectOption('i-test-pay-2');
    await expect(page.locator('[data-testid="input-amount"]')).toHaveValue('800000');
    await page.locator('[data-testid="select-method"]').selectOption('cash');

    await page.locator('[data-testid="btn-payment-save"]').click();
    await expect(page.locator('[data-testid="payment-form-modal"]')).toBeHidden();

    // Kiểm tra hóa đơn chuyển thành 'Đã thanh toán' & nợ = 0
    await page.goto('/invoices');
    const rowSelector = '[data-testid="invoice-row-i-test-pay-2"]';
    await expect(page.locator(rowSelector)).toContainText('Đã thanh toán');
    await expect(page.locator(rowSelector)).toContainText('0');
  });

  test('3. LỊCH SỬ THANH TOÁN: Danh sách phiếu thu hiển thị đúng thông tin thanh toán', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const room = { id: 'P903', name: 'Phòng 903', floor: 'Tầng 9', type: 'standard', price: 3000000, area: 25, status: 'rented', maxTenants: 3 };
      const invoice = { id: 'i-test-pay-3', roomId: 'P903', month: 7, year: 2026, totalAmount: 3000000, paidAmount: 3000000, remainingDebt: 0, status: 'paid' };
      const payment = {
        id: 'pay-3',
        invoiceId: 'i-test-pay-3',
        amount: 3000000,
        method: 'transfer',
        paymentDate: '2026-07-25',
        note: 'Thanh toán tiền nhà tháng 7'
      };

      localStorage.setItem('rooms', JSON.stringify([room]));
      localStorage.setItem('invoices', JSON.stringify([invoice]));
      localStorage.setItem('payments', JSON.stringify([payment]));
    });

    await page.goto('/payments');
    const tableBody = page.locator('[data-testid="payments-table-body"]');
    await expect(tableBody).toContainText('3.000.000');
    await expect(tableBody).toContainText('Chuyển khoản');
  });

  test('4. CẬP NHẬT DOANH THU DASHBOARD: Dashboard tự động cập nhật doanh thu và công nợ', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const room = { id: 'P904', name: 'Phòng 904', floor: 'Tầng 9', type: 'standard', price: 2000000, area: 25, status: 'rented', maxTenants: 3 };
      const invoice = { id: 'i-test-pay-4', roomId: 'P904', month: 7, year: 2026, totalAmount: 2000000, paidAmount: 2000000, remainingDebt: 0, status: 'paid' };

      localStorage.setItem('rooms', JSON.stringify([room]));
      localStorage.setItem('invoices', JSON.stringify([invoice]));
    });

    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="stat-monthly-revenue-value"]')).toContainText('2.000.000');
    await expect(page.locator('[data-testid="stat-total-debt-value"]')).toContainText('0');
  });
});
