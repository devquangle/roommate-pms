// tests/e2e/rooms.spec.js
import { test, expect } from '@playwright/test';

test.describe('RoomMate Rooms Management E2E', () => {

  test.beforeEach(async ({ page }) => {
    // Dọn LocalStorage trước mỗi test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should execute room management E2E flow across all 10 scenarios', async ({ page }) => {
    // 1. Mở trang phòng
    await page.goto('/rooms');
    await expect(page.locator('[data-testid="header-title"]')).toHaveText('Quản lý phòng');

    // Chuyển sang chế độ xem bảng để dễ kiểm tra các dòng phòng
    await page.locator('[data-testid="view-table"]').click();

    // 2. Thêm phòng mới (Phòng 999 - P999)
    await page.locator('[data-testid="btn-add-room"]').click();
    await expect(page.locator('[data-testid="room-form-modal"]')).toBeVisible();

    await page.locator('[data-testid="input-room-code"]').fill('P999');
    await page.locator('[data-testid="input-room-name"]').fill('Phòng 999');
    await page.locator('[data-testid="input-room-floor"]').fill('Tầng 9');
    await page.locator('[data-testid="select-room-type"]').selectOption('standard');
    await page.locator('[data-testid="input-room-area"]').fill('30');
    await page.locator('[data-testid="input-room-price"]').fill('3000000');
    await page.locator('[data-testid="input-room-max-tenants"]').fill('4');
    await page.locator('[data-testid="select-room-status"]').selectOption('available');
    await page.locator('[data-testid="input-room-desc"]').fill('Mô tả phòng 999');

    await page.locator('[data-testid="btn-room-save"]').click();
    await expect(page.locator('[data-testid="room-form-modal"]')).toBeHidden();

    // 3. Kiểm tra phòng xuất hiện trong bảng
    await expect(page.locator('[data-testid="room-row-P999"]')).toBeVisible();
    await expect(page.locator('[data-testid="room-row-P999"]')).toContainText('Phòng 999');
    await expect(page.locator('[data-testid="room-row-P999"]')).toContainText('3.000.000');

    // Thêm phòng thứ 2 (P888 - Bảo trì) để kiểm tra tìm kiếm và lọc độc lập
    await page.locator('[data-testid="btn-add-room"]').click();
    await page.locator('[data-testid="input-room-code"]').fill('P888');
    await page.locator('[data-testid="input-room-name"]').fill('Phòng 888');
    await page.locator('[data-testid="input-room-floor"]').fill('Tầng 8');
    await page.locator('[data-testid="select-room-type"]').selectOption('standard');
    await page.locator('[data-testid="input-room-area"]').fill('25');
    await page.locator('[data-testid="input-room-price"]').fill('2000000');
    await page.locator('[data-testid="input-room-max-tenants"]').fill('2');
    await page.locator('[data-testid="select-room-status"]').selectOption('maintenance');
    await page.locator('[data-testid="btn-room-save"]').click();
    await expect(page.locator('[data-testid="room-row-P888"]')).toBeVisible();

    // 4. Tải lại trang
    await page.reload();

    // 5. Kiểm tra dữ liệu vẫn tồn tại
    await expect(page.locator('[data-testid="room-row-P999"]')).toBeVisible();
    await expect(page.locator('[data-testid="room-row-P888"]')).toBeVisible();

    // 6. Sửa giá phòng (Sửa giá P999 từ 3.000.000 thành 3.500.000)
    await page.locator('[data-testid="btn-edit-room-P999"]').click();
    await expect(page.locator('[data-testid="room-form-modal"]')).toBeVisible();
    await page.locator('[data-testid="input-room-price"]').fill('3500000');
    await page.locator('[data-testid="btn-room-save"]').click();
    await expect(page.locator('[data-testid="room-form-modal"]')).toBeHidden();

    // Xác nhận giá phòng đã được cập nhật
    await expect(page.locator('[data-testid="room-row-P999"]')).toContainText('3.500.000');

    // 7. Tìm kiếm phòng (Nhập từ khóa '999')
    await page.locator('[data-testid="input-search-room"]').fill('999');
    await expect(page.locator('[data-testid="room-row-P888"]')).toBeHidden();
    await expect(page.locator('[data-testid="room-row-P999"]')).toBeVisible();

    // Xóa từ khóa tìm kiếm
    await page.locator('[data-testid="input-search-room"]').fill('');
    await expect(page.locator('[data-testid="room-row-P888"]')).toBeVisible();

    // 8. Lọc theo trạng thái (Lọc trạng thái 'maintenance')
    await page.locator('[data-testid="filter-status"]').selectOption('maintenance');
    await expect(page.locator('[data-testid="room-row-P999"]')).toBeHidden();
    await expect(page.locator('[data-testid="room-row-P888"]')).toBeVisible();

    // Reset bộ lọc về tất cả
    await page.locator('[data-testid="filter-status"]').selectOption('');
    await expect(page.locator('[data-testid="room-row-P999"]')).toBeVisible();

    // 9. Xóa phòng P999
    await page.locator('[data-testid="btn-delete-room-P999"]').click();
    await expect(page.locator('[data-testid="confirm-modal"]')).toBeVisible();
    await page.locator('[data-testid="btn-confirm-ok"]').click();
    await expect(page.locator('[data-testid="confirm-modal"]')).toBeHidden();

    // 10. Kiểm tra phòng biến mất
    await expect(page.locator('[data-testid="room-row-P999"]')).toBeHidden();
  });
});

