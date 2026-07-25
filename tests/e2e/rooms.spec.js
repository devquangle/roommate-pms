// tests/e2e/rooms.spec.js
import { test, expect } from '@playwright/test';

test.describe('RoomMate Rooms Management E2E', () => {

  test.beforeEach(async ({ page }) => {
    // Dọn LocalStorage trước mỗi test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('1. THÊM PHÒNG: Thêm phòng mới thành công và kiểm tra lưu trữ dữ liệu sau reload', async ({ page }) => {
    await page.goto('/rooms');
    await expect(page.locator('[data-testid="header-title"]')).toHaveText('Quản lý phòng');

    // Chuyển sang chế độ xem bảng
    await page.locator('[data-testid="view-table"]').click();

    // Mở modal thêm phòng
    await page.locator('[data-testid="btn-add-room"]').click();
    await expect(page.locator('[data-testid="room-form-modal"]')).toBeVisible();

    // Điền thông tin phòng P901
    await page.locator('[data-testid="input-room-code"]').fill('P901');
    await page.locator('[data-testid="input-room-name"]').fill('Phòng 901');
    await page.locator('[data-testid="input-room-floor"]').fill('Tầng 9');
    await page.locator('[data-testid="select-room-type"]').selectOption('deluxe');
    await page.locator('[data-testid="input-room-area"]').fill('35');
    await page.locator('[data-testid="input-room-price"]').fill('4000000');
    await page.locator('[data-testid="input-room-max-tenants"]').fill('3');
    await page.locator('[data-testid="select-room-status"]').selectOption('available');
    await page.locator('[data-testid="input-room-desc"]').fill('Phòng đẹp ban rộng thoáng mát');

    // Lưu phòng
    await page.locator('[data-testid="btn-room-save"]').click();
    await expect(page.locator('[data-testid="room-form-modal"]')).toBeHidden();

    // Kiểm tra thông tin hiển thị trên bảng
    const row = page.locator('[data-testid="room-row-P901"]');
    await expect(row).toBeVisible();
    await expect(row).toContainText('Phòng 901');
    await expect(row).toContainText('4.000.000');
    await expect(row).toContainText('Tầng 9');

    // Reload trang kiểm tra tính kiên định dữ liệu (persistence)
    await page.reload();
    await expect(page.locator('[data-testid="room-row-P901"]')).toBeVisible();
  });

  test('2. SỬA PHÒNG: Chỉnh sửa thông tin phòng (Tên, giá thuê, sức chứa, trạng thái)', async ({ page }) => {
    await page.goto('/rooms');
    await page.locator('[data-testid="view-table"]').click();

    // Thêm 1 phòng mẫu P902
    await page.locator('[data-testid="btn-add-room"]').click();
    await page.locator('[data-testid="input-room-code"]').fill('P902');
    await page.locator('[data-testid="input-room-name"]').fill('Phòng 902 ban đầu');
    await page.locator('[data-testid="input-room-floor"]').fill('Tầng 9');
    await page.locator('[data-testid="select-room-type"]').selectOption('standard');
    await page.locator('[data-testid="input-room-area"]').fill('20');
    await page.locator('[data-testid="input-room-price"]').fill('2500000');
    await page.locator('[data-testid="input-room-max-tenants"]').fill('2');
    await page.locator('[data-testid="select-room-status"]').selectOption('available');
    await page.locator('[data-testid="btn-room-save"]').click();
    await expect(page.locator('[data-testid="room-row-P902"]')).toBeVisible();

    // Thực hiện chỉnh sửa P902
    await page.locator('[data-testid="btn-edit-room-P902"]').click();
    await expect(page.locator('[data-testid="room-form-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="input-room-code"]')).toBeDisabled(); // Mã phòng không cho sửa

    await page.locator('[data-testid="input-room-name"]').fill('Phòng 902 VIP');
    await page.locator('[data-testid="input-room-price"]').fill('3200000');
    await page.locator('[data-testid="input-room-max-tenants"]').fill('4');
    await page.locator('[data-testid="select-room-status"]').selectOption('maintenance');

    await page.locator('[data-testid="btn-room-save"]').click();
    await expect(page.locator('[data-testid="room-form-modal"]')).toBeHidden();

    // Kiểm tra thông tin đã cập nhật
    const row = page.locator('[data-testid="room-row-P902"]');
    await expect(row).toContainText('Phòng 902 VIP');
    await expect(row).toContainText('3.200.000');
    await expect(row).toContainText('Bảo trì');
  });

  test('3. TÌM KIẾM & LỌC: Tìm kiếm theo từ khóa, lọc theo trạng thái, loại phòng & sắp xếp giá', async ({ page }) => {
    await page.goto('/rooms');
    await page.locator('[data-testid="view-table"]').click();

    // Thêm phòng A: P903 - Standard - Available - 2tr
    await page.locator('[data-testid="btn-add-room"]').click();
    await page.locator('[data-testid="input-room-code"]').fill('P903');
    await page.locator('[data-testid="input-room-name"]').fill('Phòng 903 Standard');
    await page.locator('[data-testid="input-room-floor"]').fill('Tầng 9');
    await page.locator('[data-testid="select-room-type"]').selectOption('standard');
    await page.locator('[data-testid="input-room-area"]').fill('20');
    await page.locator('[data-testid="input-room-price"]').fill('2000000');
    await page.locator('[data-testid="input-room-max-tenants"]').fill('2');
    await page.locator('[data-testid="select-room-status"]').selectOption('available');
    await page.locator('[data-testid="btn-room-save"]').click();

    // Thêm phòng B: P904 - Deluxe - Maintenance - 5tr
    await page.locator('[data-testid="btn-add-room"]').click();
    await page.locator('[data-testid="input-room-code"]').fill('P904');
    await page.locator('[data-testid="input-room-name"]').fill('Phòng 904 Deluxe');
    await page.locator('[data-testid="input-room-floor"]').fill('Tầng 9');
    await page.locator('[data-testid="select-room-type"]').selectOption('deluxe');
    await page.locator('[data-testid="input-room-area"]').fill('40');
    await page.locator('[data-testid="input-room-price"]').fill('5000000');
    await page.locator('[data-testid="input-room-max-tenants"]').fill('4');
    await page.locator('[data-testid="select-room-status"]').selectOption('maintenance');
    await page.locator('[data-testid="btn-room-save"]').click();

    await expect(page.locator('[data-testid="room-row-P903"]')).toBeVisible();
    await expect(page.locator('[data-testid="room-row-P904"]')).toBeVisible();

    // 1. Tìm kiếm theo từ khóa '903'
    await page.locator('[data-testid="input-search-room"]').fill('903');
    await expect(page.locator('[data-testid="room-row-P903"]')).toBeVisible();
    await expect(page.locator('[data-testid="room-row-P904"]')).toBeHidden();

    // Xóa từ khóa
    await page.locator('[data-testid="input-search-room"]').fill('');
    await expect(page.locator('[data-testid="room-row-P904"]')).toBeVisible();

    // 2. Lọc theo trạng thái 'maintenance'
    await page.locator('[data-testid="filter-status"]').selectOption('maintenance');
    await expect(page.locator('[data-testid="room-row-P903"]')).toBeHidden();
    await expect(page.locator('[data-testid="room-row-P904"]')).toBeVisible();

    // Reset lọc trạng thái
    await page.locator('[data-testid="filter-status"]').selectOption('');
    await expect(page.locator('[data-testid="room-row-P903"]')).toBeVisible();

    // 3. Lọc theo loại phòng 'deluxe'
    await page.locator('[data-testid="filter-type"]').selectOption('deluxe');
    await expect(page.locator('[data-testid="room-row-P903"]')).toBeHidden();
    await expect(page.locator('[data-testid="room-row-P904"]')).toBeVisible();

    // Reset lọc loại phòng
    await page.locator('[data-testid="filter-type"]').selectOption('');
    await expect(page.locator('[data-testid="room-row-P903"]')).toBeVisible();

    // 4. Sắp xếp giá tăng dần
    await page.locator('[data-testid="sort-rooms"]').selectOption('price_asc');
    const rows = page.locator('[data-testid="rooms-table-body"] tr');
    await expect(rows.first()).toContainText('P903'); // 2tr lên đầu
  });

  test('4. XÓA PHÒNG: Xóa phòng trọ thành công qua modal xác nhận', async ({ page }) => {
    await page.goto('/rooms');
    await page.locator('[data-testid="view-table"]').click();

    // Thêm phòng P905 để xóa
    await page.locator('[data-testid="btn-add-room"]').click();
    await page.locator('[data-testid="input-room-code"]').fill('P905');
    await page.locator('[data-testid="input-room-name"]').fill('Phòng 905 sắp xóa');
    await page.locator('[data-testid="input-room-floor"]').fill('Tầng 9');
    await page.locator('[data-testid="select-room-type"]').selectOption('standard');
    await page.locator('[data-testid="input-room-area"]').fill('20');
    await page.locator('[data-testid="input-room-price"]').fill('2000000');
    await page.locator('[data-testid="input-room-max-tenants"]').fill('2');
    await page.locator('[data-testid="select-room-status"]').selectOption('available');
    await page.locator('[data-testid="btn-room-save"]').click();
    await expect(page.locator('[data-testid="room-row-P905"]')).toBeVisible();

    // Click nút Xóa phòng P905
    await page.locator('[data-testid="btn-delete-room-P905"]').click();

    // Xác nhận Modal xuất hiện
    await expect(page.locator('[data-testid="confirm-modal"]')).toBeVisible();

    // Đồng ý xóa
    await page.locator('[data-testid="btn-confirm-ok"]').click();
    await expect(page.locator('[data-testid="confirm-modal"]')).toBeHidden();

    // Kiểm tra dòng phòng P905 không còn tồn tại
    await expect(page.locator('[data-testid="room-row-P905"]')).toBeHidden();
  });

  test('5. CHẾ ĐỘ XEM & CHI TIẾT: Chuyển dạng bảng/thẻ và xem chi tiết phòng', async ({ page }) => {
    await page.goto('/rooms');

    // Thêm phòng P906
    await page.locator('[data-testid="btn-add-room"]').click();
    await page.locator('[data-testid="input-room-code"]').fill('P906');
    await page.locator('[data-testid="input-room-name"]').fill('Phòng 906 Studio');
    await page.locator('[data-testid="input-room-floor"]').fill('Tầng 9');
    await page.locator('[data-testid="select-room-type"]').selectOption('studio');
    await page.locator('[data-testid="input-room-area"]').fill('28');
    await page.locator('[data-testid="input-room-price"]').fill('3500000');
    await page.locator('[data-testid="input-room-max-tenants"]').fill('2');
    await page.locator('[data-testid="select-room-status"]').selectOption('available');
    await page.locator('[data-testid="btn-room-save"]').click();

    // Chuyển sang Dạng thẻ (Card View)
    await page.locator('[data-testid="view-card"]').click();
    await expect(page.locator('[data-testid="rooms-card-container"]')).toBeVisible();
    await expect(page.locator('[data-testid="room-card-P906"]')).toBeVisible();

    // Chuyển lại Dạng bảng (Table View)
    await page.locator('[data-testid="view-table"]').click();
    await expect(page.locator('[data-testid="rooms-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="room-row-P906"]')).toBeVisible();

    // Mở modal Xem chi tiết phòng
    await page.locator('[data-testid="btn-view-room-P906"]').click();
    await expect(page.locator('[data-testid="room-detail-modal"]')).toBeVisible();
  });

  test('6. LUỒNG E2E TỔNG HỢP: Thực thi luồng quản lý phòng qua tất cả 10 kịch bản', async ({ page }) => {
    // 1. Mở trang phòng
    await page.goto('/rooms');
    await expect(page.locator('[data-testid="header-title"]')).toHaveText('Quản lý phòng');

    // Chuyển sang chế độ xem bảng
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
    await expect(page.locator('[data-testid="room-form-modal"]')).toBeHidden();
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
