// tests/e2e/tenants.spec.js
import { test, expect } from '@playwright/test';

test.describe('RoomMate Tenants Management E2E', () => {

  test.beforeEach(async ({ page }) => {
    // Dọn LocalStorage trước mỗi test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should support creating, searching, editing, and archiving a tenant', async ({ page }) => {
    // 1. Điều hướng đến trang Khách thuê
    await page.goto('/tenants');
    await expect(page.locator('[data-testid="header-title"]')).toHaveText('Người thuê');

    // 2. Mở modal thêm khách thuê mới
    await page.locator('[data-testid="btn-add-tenant"]').click();
    await expect(page.locator('[data-testid="tenant-form-modal"]')).toBeVisible();

    // 3. Điền thông tin người thuê (Trần Thị K)
    await page.locator('[data-testid="input-tenant-name"]').fill('Trần Thị K');
    await page.locator('[data-testid="input-tenant-phone"]').fill('0912345678');
    await page.locator('[data-testid="input-tenant-idcard"]').fill('001199887766');
    await page.locator('[data-testid="btn-tenant-save"]').click();

    // 4. Kiểm tra xuất hiện trên bảng
    await expect(page.locator('[data-testid="tenants-table-body"]')).toContainText('Trần Thị K');
    await expect(page.locator('[data-testid="tenants-table-body"]')).toContainText('0912345678');

    // 5. Tìm kiếm theo tên
    await page.locator('[data-testid="input-search-tenant"]').fill('Trần Thị K');
    await expect(page.locator('[data-testid="tenants-table-body"]')).toContainText('Trần Thị K');

    // 6. Mở dropdown thao tác & Chọn Sửa
    await page.locator('[data-testid="tenants-table-body"] [data-bs-toggle="dropdown"]').first().click();
    await page.locator('.btn-action-tenant[data-action="edit"]').first().click();
    await expect(page.locator('[data-testid="tenant-form-modal"]')).toBeVisible();

    // Sửa SĐT mới
    await page.locator('[data-testid="input-tenant-phone"]').fill('0988777666');
    await page.locator('[data-testid="btn-tenant-save"]').click();

    // Kiểm tra SĐT mới cập nhật
    await expect(page.locator('[data-testid="tenants-table-body"]')).toContainText('0988777666');

    // 7. Lưu trữ khách thuê
    await page.locator('[data-testid="tenants-table-body"] [data-bs-toggle="dropdown"]').first().click();
    await page.locator('.btn-action-tenant[data-action="archive"]').first().click();

    // Xác nhận modal
    await expect(page.locator('[data-testid="confirm-modal"]')).toBeVisible();
    await page.locator('[data-testid="btn-confirm-ok"]').click();

    // Lọc trạng thái "Đã rời đi (Lưu trữ)" để kiểm tra
    await page.locator('[data-testid="filter-status"]').selectOption('inactive');
    await expect(page.locator('[data-testid="tenants-table-body"]')).toContainText('Trần Thị K');
  });
});
