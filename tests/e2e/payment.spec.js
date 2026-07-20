// tests/e2e/payment.spec.js
import { test, expect } from '@playwright/test';

test.describe('RoomMate Payments & Dashboard Updates E2E', () => {

  test.beforeEach(async ({ page }) => {
    // Dọn LocalStorage trước mỗi test để đảm bảo môi trường sạch & độc lập
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should support full payment flow: unpaid invoice -> partial payment -> verify debt -> full payment -> check paid status -> check dashboard stats & verify after reload', async ({ page }) => {
    // 1. Chuẩn bị một hóa đơn chưa thanh toán (Hóa đơn 2.000.000 VNĐ - Dữ liệu test riêng biệt)
    await page.goto('/');
    await page.evaluate(() => {
      const room = {
        id: 'P901',
        name: 'Phòng 901',
        floor: 'Tầng 9',
        type: 'standard',
        price: 2000000,
        area: 25,
        status: 'rented',
        maxTenants: 3
      };
      const tenant = {
        id: 't-test-901',
        fullName: 'Nguyễn Văn H',
        phone: '0901234567',
        status: 'active'
      };
      const contract = {
        id: 'c-test-901',
        roomId: 'P901',
        tenantId: 't-test-901',
        startDate: '2026-07-01',
        endDate: '2027-07-01',
        roomPrice: 2000000,
        deposit: 2000000,
        status: 'active'
      };
      
      const invoice = {
        id: 'i-test-pay-1',
        roomId: 'P901',
        contractId: 'c-test-901',
        month: 7,
        year: 2026,
        roomFee: 2000000,
        electricityFee: 0,
        waterFee: 0,
        otherServicesFee: 0,
        discount: 0,
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

    // Xác nhận hóa đơn chưa thanh toán ban đầu hiển thị đúng
    await page.goto('/invoices');
    await expect(page.locator('[data-testid="invoices-page"]')).toBeVisible();
    
    const rowSelector = '[data-testid="invoice-row-i-test-pay-1"]';
    await expect(page.locator(rowSelector)).toBeVisible();
    await expect(page.locator(rowSelector)).toContainText('Chưa thanh toán');
    await expect(page.locator(rowSelector)).toContainText('2.000.000');

    // 2. Thanh toán một phần (Trả 1.200.000 VNĐ)
    await page.goto('/payments');
    await expect(page.locator('[data-testid="payments-page"]')).toBeVisible();

    await page.locator('[data-testid="btn-add-payment"]').click();
    await expect(page.locator('[data-testid="payment-form-modal"]')).toBeVisible();

    await page.locator('[data-testid="select-invoice"]').selectOption('i-test-pay-1');
    await page.locator('[data-testid="input-amount"]').fill('1200000');
    await page.locator('[data-testid="select-method"]').selectOption('transfer');

    await page.locator('[data-testid="btn-payment-save"]').click();
    await expect(page.locator('[data-testid="payment-form-modal"]')).toBeHidden();

    // 3. Kiểm tra còn nợ (Còn nợ 800.000 VNĐ, trạng thái 'Thanh toán một phần')
    await page.goto('/invoices');
    await expect(page.locator(rowSelector)).toContainText('Thanh toán một phần');
    await expect(page.locator(rowSelector)).toContainText('800.000');

    // 4. Thanh toán phần còn lại (Trả nốt 800.000 VNĐ)
    await page.goto('/payments');
    await page.locator('[data-testid="btn-add-payment"]').click();
    await expect(page.locator('[data-testid="payment-form-modal"]')).toBeVisible();

    await page.locator('[data-testid="select-invoice"]').selectOption('i-test-pay-1');
    await expect(page.locator('[data-testid="input-amount"]')).toHaveValue('800000');
    await page.locator('[data-testid="select-method"]').selectOption('cash');
    
    await page.locator('[data-testid="btn-payment-save"]').click();
    await expect(page.locator('[data-testid="payment-form-modal"]')).toBeHidden();

    // 5. Kiểm tra hóa đơn đã thanh toán (Đã trả đủ 2.000.000 VNĐ, còn nợ 0, trạng thái 'Đã thanh toán')
    await page.goto('/invoices');
    await expect(page.locator(rowSelector)).toContainText('Đã thanh toán');
    await expect(page.locator(rowSelector)).toContainText('0');

    // 6. Mở Dashboard
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="dashboard-page"]')).toBeVisible();

    // 7. Kiểm tra doanh thu / tiền thực thu được cập nhật (2.000.000 VNĐ)
    await expect(page.locator('[data-testid="stat-monthly-revenue-value"]')).toContainText('2.000.000');

    // 8. Kiểm tra công nợ giảm về 0
    await expect(page.locator('[data-testid="stat-total-debt-value"]')).toContainText('0');

    // Kiểm tra cả giao diện và dữ liệu sau khi reload trang Dashboard
    await page.reload();
    await expect(page.locator('[data-testid="stat-monthly-revenue-value"]')).toContainText('2.000.000');
    await expect(page.locator('[data-testid="stat-total-debt-value"]')).toContainText('0');
  });
});

