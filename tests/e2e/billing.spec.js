// tests/e2e/billing.spec.js
import { test, expect } from '@playwright/test';

test.describe('RoomMate Billing & Invoice Generation E2E', () => {

  test.beforeEach(async ({ page }) => {
    // Dọn LocalStorage trước mỗi test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('1. LẬP HÓA ĐƠN TỰ ĐỘNG: Lập hóa đơn từ phòng, hợp đồng và số điện nước', async ({ page }) => {
    const month = 7;
    const year = 2026;

    await page.goto('/');
    await page.evaluate(({ month, year }) => {
      const room = { id: 'P801', name: 'Phòng 801', floor: 'Tầng 8', type: 'standard', price: 3000000, area: 25, status: 'rented', maxTenants: 3 };
      const tenant = { id: 't-test-801', fullName: 'Lê Hoàng G', phone: '0907777666', status: 'active' };
      const contract = { id: 'c-test-801', roomId: 'P801', tenantId: 't-test-801', startDate: '2026-07-01', endDate: '2027-07-01', roomPrice: 3000000, deposit: 3000000, status: 'active', vehicles: 0 };
      const serviceConfigs = [
        { id: 'svc-dien', code: 'DIEN', name: 'Điện tiêu thụ', calcMethod: 'usage', unitPrice: 3000, unit: 'kWh', status: 'active', type: 'electricity' },
        { id: 'svc-nuoc', code: 'NUOC', name: 'Nước tiêu thụ', calcMethod: 'usage', unitPrice: 15000, unit: 'm3', status: 'active', type: 'water' }
      ];

      localStorage.setItem('rooms', JSON.stringify([room]));
      localStorage.setItem('tenants', JSON.stringify([tenant]));
      localStorage.setItem('contracts', JSON.stringify([contract]));
      localStorage.setItem('serviceConfigs', JSON.stringify(serviceConfigs));
    }, { month, year });

    // Ghi chỉ số điện nước
    await page.goto('/meters');
    await page.locator('[data-testid="filter-month"]').selectOption(String(month));
    await page.locator('[data-testid="filter-year"]').selectOption(String(year));

    await page.locator('[data-testid="input-elec-new-P801"]').fill('150');
    await page.locator('[data-testid="input-water-new-P801"]').fill('12');
    await page.locator('[data-testid="btn-save-all"]').click();
    await expect(page.locator('[data-testid="meter-row-P801"] .cell-save-status .bi-check-lg')).toBeVisible();

    // Mở trang Hóa đơn & Tạo hóa đơn mới
    await page.goto('/invoices');
    await page.locator('[data-testid="btn-add-invoice"]').click();
    await expect(page.locator('#invoiceFormModal')).toBeVisible();

    // Chọn phòng P801
    await page.locator('#icm-roomId + .dropdown button.dropdown-toggle').click();
    await page.locator('#icm-roomId + .dropdown button.dropdown-item[data-value="P801"]').click();

    await page.locator('select#icm-month').selectOption(String(month));
    await page.locator('input#icm-year').fill(String(year));

    // Chốt hóa đơn
    await page.locator('#icm-btn-finalize').click();
    await expect(page.locator('#invoiceFormModal')).toBeHidden();

    // Kiểm tra xuất hiện trên bảng danh sách
    const firstRow = page.locator('[data-testid="invoices-table-body"] tr').first();
    await expect(firstRow).toContainText('Phòng 801');
    await expect(firstRow).toContainText('Chưa thanh toán');
  });

  test('2. TÍNH TOÁN CÁC KHOẢN PHÍ: Kiểm tra tính toán chuẩn xác tổng tiền hóa đơn', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const room = { id: 'P802', name: 'Phòng 802', floor: 'Tầng 8', type: 'standard', price: 4000000, area: 30, status: 'rented', maxTenants: 3 };
      const tenant = { id: 't-test-802', fullName: 'Trần Thị K', phone: '0908888777', status: 'active' };
      const contract = { id: 'c-test-802', roomId: 'P802', tenantId: 't-test-802', startDate: '2026-07-01', endDate: '2027-07-01', roomPrice: 4000000, deposit: 4000000, status: 'active' };
      const invoice = {
        id: 'i-test-802',
        roomId: 'P802',
        contractId: 'c-test-802',
        month: 7,
        year: 2026,
        roomFee: 4000000,
        electricityFee: 300000,
        waterFee: 100000,
        otherServicesFee: 50000,
        discount: 0,
        totalAmount: 4450000,
        paidAmount: 0,
        remainingDebt: 4450000,
        status: 'unpaid',
        dueDate: '2026-08-10'
      };

      localStorage.setItem('rooms', JSON.stringify([room]));
      localStorage.setItem('tenants', JSON.stringify([tenant]));
      localStorage.setItem('contracts', JSON.stringify([contract]));
      localStorage.setItem('invoices', JSON.stringify([invoice]));
    });

    await page.goto('/invoices');
    const tableBody = page.locator('[data-testid="invoices-table-body"]');
    await expect(tableBody).toContainText('Phòng 802');
    await expect(tableBody).toContainText('4.450.000');
  });

  test('3. TÌM KIẾM & LỌC HÓA ĐƠN: Lọc hóa đơn theo từ khóa, tháng/năm và trạng thái thanh toán', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const room1 = { id: 'P803', name: 'Phòng 803', floor: 'Tầng 8', type: 'standard', price: 3000000, area: 25, status: 'rented', maxTenants: 3 };
      const room2 = { id: 'P804', name: 'Phòng 804', floor: 'Tầng 8', type: 'standard', price: 3500000, area: 28, status: 'rented', maxTenants: 3 };
      const inv1 = { id: 'i-test-803', roomId: 'P803', month: 7, year: 2026, totalAmount: 3000000, paidAmount: 3000000, remainingDebt: 0, status: 'paid' };
      const inv2 = { id: 'i-test-804', roomId: 'P804', month: 7, year: 2026, totalAmount: 3500000, paidAmount: 0, remainingDebt: 3500000, status: 'unpaid' };

      localStorage.setItem('rooms', JSON.stringify([room1, room2]));
      localStorage.setItem('invoices', JSON.stringify([inv1, inv2]));
    });

    await page.goto('/invoices');
    const tableBody = page.locator('[data-testid="invoices-table-body"]');
    await expect(tableBody).toContainText('Phòng 803');
    await expect(tableBody).toContainText('Phòng 804');

    // Tìm kiếm từ khóa '803'
    await page.locator('[data-testid="input-search-invoice"]').fill('803');
    await expect(tableBody).toContainText('Phòng 803');
    await expect(tableBody).not.toContainText('Phòng 804');

    // Clear từ khóa
    await page.locator('[data-testid="input-search-invoice"]').fill('');
    await expect(tableBody).toContainText('Phòng 804');

    // Lọc theo trạng thái 'unpaid'
    await page.locator('[data-testid="filter-status"]').selectOption('unpaid');
    await expect(tableBody).not.toContainText('Phòng 803');
    await expect(tableBody).toContainText('Phòng 804');
  });

  test('4. XEM CHI TIẾT & HỦY HÓA ĐƠN: Mở modal xem chi tiết và hủy hóa đơn', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const room = { id: 'P805', name: 'Phòng 805', floor: 'Tầng 8', type: 'standard', price: 3000000, area: 25, status: 'rented', maxTenants: 3 };
      const invoice = { id: 'i-test-805', roomId: 'P805', month: 7, year: 2026, totalAmount: 3000000, paidAmount: 0, remainingDebt: 3000000, status: 'unpaid' };

      localStorage.setItem('rooms', JSON.stringify([room]));
      localStorage.setItem('invoices', JSON.stringify([invoice]));
    });

    await page.goto('/invoices');
    const row = page.locator('tr').filter({ hasText: 'Phòng 805' });
    await expect(row).toBeVisible();

    // Mở dropdown thao tác và chọn Hủy hóa đơn
    await row.locator('[data-bs-toggle="dropdown"]').click();
    await page.locator('.btn-action-cancel-invoice').first().click();

    // Xác nhận Modal
    await expect(page.locator('[data-testid="confirm-modal"]')).toBeVisible();
    await page.locator('[data-testid="btn-confirm-ok"]').click();
    await expect(page.locator('[data-testid="confirm-modal"]')).toBeHidden();

    // Kiểm tra trạng thái chuyển thành Đã hủy
    await expect(row).toContainText('Đã hủy');
  });
});
