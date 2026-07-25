// tests/e2e/services.spec.js
import { test, expect } from '@playwright/test';

test.describe('RoomMate Service Configurations E2E', () => {

  test.beforeEach(async ({ page }) => {
    // Dọn LocalStorage trước mỗi test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('1. THÊM DỊCH VỤ MỚI: Thêm dịch vụ thành công và kiểm tra duy trì dữ liệu sau reload', async ({ page }) => {
    await page.goto('/services');
    await expect(page.locator('[data-testid="header-title"]')).toHaveText('Cấu hình dịch vụ');

    // Mở modal thêm dịch vụ
    await page.locator('[data-testid="btn-add-service"]').click();
    await expect(page.locator('[data-testid="service-config-form-modal"]')).toBeVisible();

    // Điền thông tin dịch vụ (Dịch vụ Giặt đồ - GIAT1)
    await page.locator('[data-testid="input-service-code"]').fill('GIAT1');
    await page.locator('[data-testid="input-service-name"]').fill('Tiền giặt đồ');
    await page.locator('[data-testid="select-calc-method"]').selectOption('perPerson');
    await page.locator('[data-testid="input-unit"]').fill('người');
    await page.locator('[data-testid="input-unit-price"]').fill('50000');
    await page.locator('[data-testid="input-start-date"]').fill('2026-01-01');
    await page.locator('[data-testid="btn-service-save"]').click();

    await expect(page.locator('[data-testid="service-config-form-modal"]')).toBeHidden();

    // Kiểm tra hiển thị trên bảng
    const tableBody = page.locator('[data-testid="services-table-body"]');
    await expect(tableBody).toContainText('GIAT1');
    await expect(tableBody).toContainText('Tiền giặt đồ');
    await expect(tableBody).toContainText('50.000');

    // Reload trang kiểm tra duy trì dữ liệu (persistence)
    await page.reload();
    await expect(page.locator('[data-testid="services-table-body"]')).toContainText('GIAT1');
  });

  test('2. SỬA DỊCH VỤ: Chỉnh sửa đơn giá dịch vụ', async ({ page }) => {
    await page.goto('/services');

    // Thêm 1 dịch vụ mẫu SAN1
    await page.locator('[data-testid="btn-add-service"]').click();
    await page.locator('[data-testid="input-service-code"]').fill('SAN1');
    await page.locator('[data-testid="input-service-name"]').fill('Tiền sấy đồ');
    await page.locator('[data-testid="select-calc-method"]').selectOption('fixed');
    await page.locator('[data-testid="input-unit"]').fill('lần');
    await page.locator('[data-testid="input-unit-price"]').fill('30000');
    await page.locator('[data-testid="btn-service-save"]').click();

    const tableBody = page.locator('[data-testid="services-table-body"]');
    await expect(tableBody).toContainText('SAN1');

    // Click nút Sửa dịch vụ SAN1
    const row = page.locator('tr').filter({ hasText: 'SAN1' });
    await row.locator('.btn-edit-service').click();
    await expect(page.locator('[data-testid="service-config-form-modal"]')).toBeVisible();

    // Sửa đơn giá mới thành 45.000
    await page.locator('[data-testid="input-unit-price"]').fill('45000');
    await page.locator('[data-testid="btn-service-save"]').click();
    await expect(page.locator('[data-testid="service-config-form-modal"]')).toBeHidden();

    // Kiểm tra đơn giá mới được cập nhật trên bảng
    await expect(row).toContainText('45.000');
  });

  test('3. TẠM NGƯNG & KÍCH HOẠT LẠI: Chuyển dịch vụ sang Ngưng áp dụng và kích hoạt lại', async ({ page }) => {
    await page.goto('/services');

    // Thêm dịch vụ HOI1
    await page.locator('[data-testid="btn-add-service"]').click();
    await page.locator('[data-testid="input-service-code"]').fill('HOI1');
    await page.locator('[data-testid="input-service-name"]').fill('Tiền phòng họp');
    await page.locator('[data-testid="select-calc-method"]').selectOption('fixed');
    await page.locator('[data-testid="input-unit"]').fill('giờ');
    await page.locator('[data-testid="input-unit-price"]').fill('100000');
    await page.locator('[data-testid="btn-service-save"]').click();

    const row = page.locator('tr').filter({ hasText: 'HOI1' });
    await expect(row).toContainText('Đang áp dụng');

    // Click Ngưng áp dụng
    await row.locator('.btn-deactivate-service').click();
    await expect(page.locator('[data-testid="confirm-modal"]')).toBeVisible();
    await page.locator('[data-testid="btn-confirm-ok"]').click();
    await expect(page.locator('[data-testid="confirm-modal"]')).toBeHidden();

    // Kiểm tra trạng thái đổi sang Ngưng áp dụng
    await expect(row).toContainText('Ngưng áp dụng');

    // Click Kích hoạt lại
    await row.locator('.btn-activate-service').click();
    await expect(page.locator('[data-testid="confirm-modal"]')).toBeVisible();
    await page.locator('[data-testid="btn-confirm-ok"]').click();
    await expect(page.locator('[data-testid="confirm-modal"]')).toBeHidden();

    // Kiểm tra trạng thái quay về Đang áp dụng
    await expect(row).toContainText('Đang áp dụng');
  });

  test('4. XÓA DỊCH VỤ: Xóa dịch vụ thành công qua modal xác nhận', async ({ page }) => {
    await page.goto('/services');

    // Thêm dịch vụ XOA1 để xóa
    await page.locator('[data-testid="btn-add-service"]').click();
    await page.locator('[data-testid="input-service-code"]').fill('XOA1');
    await page.locator('[data-testid="input-service-name"]').fill('Dịch vụ rác phụ');
    await page.locator('[data-testid="select-calc-method"]').selectOption('fixed');
    await page.locator('[data-testid="input-unit"]').fill('tháng');
    await page.locator('[data-testid="input-unit-price"]').fill('20000');
    await page.locator('[data-testid="btn-service-save"]').click();

    const tableBody = page.locator('[data-testid="services-table-body"]');
    await expect(tableBody).toContainText('XOA1');

    // Click nút Xóa dòng XOA1
    const row = page.locator('tr').filter({ hasText: 'XOA1' });
    await row.locator('.btn-delete-service').click();

    // Xác nhận Modal
    await expect(page.locator('[data-testid="confirm-modal"]')).toBeVisible();
    await page.locator('[data-testid="btn-confirm-ok"]').click();
    await expect(page.locator('[data-testid="confirm-modal"]')).toBeHidden();

    // Kiểm tra dòng XOA1 bị xóa khỏi bảng
    await expect(tableBody).not.toContainText('XOA1');
  });

  test('5. TÌM KIẾM & LỌC: Tìm theo mã/tên dịch vụ và lọc theo trạng thái', async ({ page }) => {
    await page.goto('/services');

    // Thêm dịch vụ TIM1
    await page.locator('[data-testid="btn-add-service"]').click();
    await page.locator('[data-testid="input-service-code"]').fill('TIM1');
    await page.locator('[data-testid="input-service-name"]').fill('Phí vệ sinh');
    await page.locator('[data-testid="select-calc-method"]').selectOption('fixed');
    await page.locator('[data-testid="input-unit"]').fill('tháng');
    await page.locator('[data-testid="input-unit-price"]').fill('30000');
    await page.locator('[data-testid="btn-service-save"]').click();

    // Thêm dịch vụ TIM2
    await page.locator('[data-testid="btn-add-service"]').click();
    await page.locator('[data-testid="input-service-code"]').fill('TIM2');
    await page.locator('[data-testid="input-service-name"]').fill('Phí thang máy');
    await page.locator('[data-testid="select-calc-method"]').selectOption('fixed');
    await page.locator('[data-testid="input-unit"]').fill('tháng');
    await page.locator('[data-testid="input-unit-price"]').fill('50000');
    await page.locator('[data-testid="btn-service-save"]').click();

    const tableBody = page.locator('[data-testid="services-table-body"]');
    await expect(tableBody).toContainText('TIM1');
    await expect(tableBody).toContainText('TIM2');

    // 1. Tìm kiếm theo từ khóa 'TIM1'
    await page.locator('[data-testid="input-search-service"]').fill('TIM1');
    await expect(tableBody).toContainText('TIM1');
    await expect(tableBody).not.toContainText('TIM2');

    // Clear từ khóa
    await page.locator('[data-testid="input-search-service"]').fill('');
    await expect(tableBody).toContainText('TIM2');

    // 2. Lọc theo trạng thái
    await page.locator('[data-testid="filter-service-status"]').selectOption('inactive');
    await page.locator('[data-testid="filter-service-status"]').selectOption('');
    await expect(tableBody).toContainText('TIM1');
  });

  test('6. LUỒNG E2E TỔNG HỢP: Thực thi luồng cấu hình dịch vụ qua tất cả 7 bước', async ({ page }) => {
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
    const tableBody = page.locator('[data-testid="services-table-body"]');
    await expect(tableBody).toContainText('GIAT');
    await expect(tableBody).toContainText('Tiền giặt đồ');

    // 5. Tìm kiếm dịch vụ theo mã
    await page.locator('[data-testid="input-search-service"]').fill('GIAT');
    await expect(tableBody).toContainText('GIAT');

    // 6. Sửa đơn giá dịch vụ
    const row = page.locator('tr').filter({ hasText: 'GIAT' });
    await row.locator('.btn-edit-service').click();
    await expect(page.locator('[data-testid="service-config-form-modal"]')).toBeVisible();

    await page.locator('[data-testid="input-unit-price"]').fill('60000');
    await page.locator('[data-testid="btn-service-save"]').click();

    // Kiểm tra đơn giá mới cập nhật (60.000 ₫)
    await expect(tableBody).toContainText('60.000');

    // 7. Ngưng áp dụng dịch vụ
    await row.locator('.btn-deactivate-service').click();

    // Xác nhận modal
    await expect(page.locator('[data-testid="confirm-modal"]')).toBeVisible();
    await page.locator('[data-testid="btn-confirm-ok"]').click();

    // Kiểm tra trạng thái đổi sang Ngưng áp dụng
    await expect(tableBody).toContainText('Ngưng áp dụng');
  });
});
