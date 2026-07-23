// tests/e2e/billing.spec.js
import { test, expect } from '@playwright/test';

test.describe('RoomMate Billing & Invoice Generation E2E', () => {

  test.beforeEach(async ({ page }) => {
    // Dọn LocalStorage trước mỗi test để đảm bảo môi trường sạch & độc lập
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should support full billing flow: setup room, tenant & contract -> record meter -> create invoice -> verify line items, total & unpaid status', async ({ page }) => {
    // Thiết lập dữ liệu đầu vào cố định cho tháng 7/2026
    const month = 7;
    const year = 2026;

    // 1. Tạo phòng (P801: 3.000.000 VND), 2. Tạo người thuê (Lê Hoàng G), 3. Tạo & kích hoạt hợp đồng
    await page.goto('/');
    await page.evaluate(({ month, year }) => {
      const room = {
        id: 'P801',
        name: 'Phòng 801',
        floor: 'Tầng 8',
        type: 'standard',
        price: 3000000,
        area: 25,
        status: 'available',
        maxTenants: 3
      };
      
      const tenant = {
        id: 't-test-801',
        fullName: 'Lê Hoàng G',
        phone: '0907777666',
        status: 'active'
      };

      const contract = {
        id: 'c-test-801',
        roomId: 'P801',
        tenantId: 't-test-801',
        startDate: '2026-07-01',
        endDate: '2027-07-01',
        roomPrice: 3000000,
        deposit: 3000000,
        status: 'active',
        vehicles: 0
      };

      const serviceConfigs = [
        {
          id: 'svc-dien',
          code: 'DIEN',
          name: 'Điện tiêu thụ',
          calcMethod: 'usage',
          unitPrice: 3000,
          unit: 'kWh',
          status: 'active',
          type: 'electricity'
        },
        {
          id: 'svc-nuoc',
          code: 'NUOC',
          name: 'Nước tiêu thụ',
          calcMethod: 'usage',
          unitPrice: 15000,
          unit: 'm3',
          status: 'active',
          type: 'water'
        }
      ];

      localStorage.setItem('rooms', JSON.stringify([room]));
      localStorage.setItem('tenants', JSON.stringify([tenant]));
      localStorage.setItem('contracts', JSON.stringify([contract]));
      localStorage.setItem('serviceConfigs', JSON.stringify(serviceConfigs));
    }, { month, year });

    // 4. Ghi chỉ số điện nước tháng 7/2026
    await page.goto('/meters');
    await expect(page.locator('[data-testid="meters-page"]')).toBeVisible();

    await page.locator('[data-testid="filter-month"]').selectOption(String(month));
    await page.locator('[data-testid="filter-year"]').selectOption(String(year));

    // Điền chỉ số: Điện mới 150 (tiêu thụ 150 kWh), Nước mới 12 (tiêu thụ 12 m3)
    const inputElec = page.locator('[data-testid="input-elec-new-P801"]');
    const inputWater = page.locator('[data-testid="input-water-new-P801"]');
    
    await expect(inputElec).toBeVisible();
    await inputElec.fill('150');
    await inputWater.fill('12');

    // Lưu lại chỉ số điện nước
    await page.locator('[data-testid="btn-save-all"]').click();
    await expect(page.locator('[data-testid="meter-row-P801"] .cell-save-status .bi-check-lg')).toBeVisible({ timeout: 10000 });

    // 5. Tạo hóa đơn cho phòng P801
    await page.goto('/invoices');
    await expect(page.locator('[data-testid="invoices-page"]')).toBeVisible();

    await page.locator('[data-testid="btn-add-invoice"]').click();
    await expect(page.locator('#invoiceFormModal')).toBeVisible();

    // Chọn phòng P801
    await page.locator('#icm-roomId + .dropdown button.dropdown-toggle').click();
    await page.locator('#icm-roomId + .dropdown button.dropdown-item[data-value="P801"]').click();

    await page.locator('select#icm-month').selectOption(String(month));
    await page.locator('input#icm-year').fill(String(year));

    // Kiểm tra từng khoản phí chính trong hóa đơn:
    // - Tiền thuê phòng: 3.000.000 VNĐ
    // - Tiền điện: 150 kWh * 3.000 VNĐ = 450.000 VNĐ
    // - Tiền nước: 12 m3 * 15.000 VNĐ = 180.000 VNĐ
    const formBody = page.locator('#icm-body');
    await expect(page.locator('.icm-item-name').nth(0)).toHaveValue('Tiền thuê phòng');
    await expect(formBody).toContainText('3.000.000');

    await expect(page.locator('.icm-item-name').nth(1)).toHaveValue('Điện tiêu thụ');
    await expect(formBody).toContainText('450.000');

    await expect(page.locator('.icm-item-name').nth(2)).toHaveValue('Nước tiêu thụ');
    await expect(formBody).toContainText('180.000');

    // Nhấn Chốt hóa đơn
    await page.locator('#icm-btn-finalize').click();
    await expect(page.locator('#invoiceFormModal')).toBeHidden();

    // 6. Kiểm tra tổng tiền & 7. Kiểm tra trạng thái chưa thanh toán trong danh sách
    const firstRow = page.locator('[data-testid="invoices-table-body"] tr').first();
    await expect(firstRow).toBeVisible();

    // Kiểm tra tổng tiền = 3.000.000 + 450.000 + 180.000 = 3.630.000 VNĐ
    await expect(firstRow).toContainText('Phòng 801');
    await expect(firstRow).toContainText('3.630.000');

    // Kiểm tra trạng thái chưa thanh toán (Unpaid)
    await expect(firstRow).toContainText('Chưa thanh toán');
  });
});

