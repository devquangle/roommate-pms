// tests/e2e/services.spec.js
import { test, expect } from '@playwright/test';

test.describe('RoomMate Service Configurations E2E', () => {

  test.beforeEach(async ({ page }) => {
    // Dọn LocalStorage trước mỗi test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should support creating, searching, editing unit price, and deactivating a service config', async ({ page }) => {
    // 1. Điều hướng đến trang Dịch vụ
    await page.goto('/services');
    await expect(page.locator('[data-testid="header-title"]')).toHaveText('Cấu hình dịch vụ');

    // 2. Mở modal thêm dịch vụ mới
    await page.locator('[data-testid="btn-add-service"]').click();
    await expect(page.locator('[data-testid="service-config-form-modal"]')).toBeVisible();

    // 3. Điền thông tin dịch vụ (Dịch vụ Giặt đồ - GIAT)
    await page.locator('[data-testid="input-service-code"]').fill('GIAT');
    await page.locator('[data-testid="input-service-name"]').fill('Tiền giặt đồ');
    await page.locator('[data-testid="select-calc-method"]').selectOption('perPerson');
    await page.locator('[data-testid="input-unit"]').fill('người');
    await page.locator('[data-testid="input-unit-price"]').fill('50000');
    await page.locator('[data-testid="input-start-date"]').fill('2026-01-01');
    await page.locator('[data-testid="btn-service-save"]').click();

    // 4. Kiểm tra xuất hiện trên bảng
    await expect(page.locator('[data-testid="services-table-body"]')).toContainText('GIAT');
    await expect(page.locator('[data-testid="services-table-body"]')).toContainText('Tiền giặt đồ');

    // 5. Tìm kiếm dịch vụ theo mã
    await page.locator('[data-testid="input-search-service"]').fill('GIAT');
    await expect(page.locator('[data-testid="services-table-body"]')).toContainText('GIAT');

    // 6. Sửa đơn giá dịch vụ
    await page.locator('[data-testid="services-table-body"] .btn-edit-service').first().click();
    await expect(page.locator('[data-testid="service-config-form-modal"]')).toBeVisible();

    await page.locator('[data-testid="input-unit-price"]').fill('60000');
    await page.locator('[data-testid="btn-service-save"]').click();

    // Kiểm tra đơn giá mới cập nhật (60.000 ₫)
    await expect(page.locator('[data-testid="services-table-body"]')).toContainText('60.000');

    // 7. Ngưng áp dụng dịch vụ
    await page.locator('[data-testid="services-table-body"] .btn-deactivate-service').first().click();

    // Xác nhận modal
    await expect(page.locator('[data-testid="confirm-modal"]')).toBeVisible();
    await page.locator('[data-testid="btn-confirm-ok"]').click();

    // Kiểm tra trạng thái đổi sang Ngưng áp dụng
    await expect(page.locator('[data-testid="services-table-body"]')).toContainText('Ngưng áp dụng');
  });
});
