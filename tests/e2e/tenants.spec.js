// tests/e2e/tenants.spec.js
import { test, expect } from '@playwright/test';

test.describe('RoomMate Tenants Management E2E', () => {

  test.beforeEach(async ({ page }) => {
    // Dọn LocalStorage trước mỗi test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('1. THÊM KHÁCH THUÊ: Thêm khách thuê mới thành công và kiểm tra lưu trữ dữ liệu sau reload', async ({ page }) => {
    await page.goto('/tenants');
    await expect(page.locator('[data-testid="header-title"]')).toHaveText('Người thuê');

    // Mở modal thêm khách thuê
    await page.locator('[data-testid="btn-add-tenant"]').click();
    await expect(page.locator('[data-testid="tenant-form-modal"]')).toBeVisible();

    // Điền thông tin khách thuê
    await page.locator('[data-testid="input-tenant-name"]').fill('Phạm Thị Khánh Vân');
    await page.locator('[data-testid="input-tenant-phone"]').fill('0989999001');
    await page.locator('[data-testid="input-tenant-idcard"]').fill('099200009001');
    await page.locator('[data-testid="input-tenant-email"]').fill('khanhvan.pt@gmail.com');

    // Lưu khách thuê
    await page.locator('[data-testid="btn-tenant-save"]').click();
    await expect(page.locator('[data-testid="tenant-form-modal"]')).toBeHidden();

    // Kiểm tra hiển thị trong bảng
    const tableBody = page.locator('[data-testid="tenants-table-body"]');
    await expect(tableBody).toContainText('Phạm Thị Khánh Vân');
    await expect(tableBody).toContainText('0989999001');
    await expect(tableBody).toContainText('099200009001');

    // Reload trang kiểm tra duy trì dữ liệu (persistence)
    await page.reload();
    await expect(page.locator('[data-testid="tenants-table-body"]')).toContainText('Phạm Thị Khánh Vân');
  });

  test('2. SỬA KHÁCH THUÊ: Chỉnh sửa thông tin khách thuê (Số điện thoại & Email)', async ({ page }) => {
    await page.goto('/tenants');

    // Tạo khách thuê mẫu
    await page.locator('[data-testid="btn-add-tenant"]').click();
    await page.locator('[data-testid="input-tenant-name"]').fill('Lê Văn Hoàng');
    await page.locator('[data-testid="input-tenant-phone"]').fill('0989999002');
    await page.locator('[data-testid="input-tenant-idcard"]').fill('099200009002');
    await page.locator('[data-testid="btn-tenant-save"]').click();
    await expect(page.locator('[data-testid="tenants-table-body"]')).toContainText('Lê Văn Hoàng');

    // Mở menu thao tác của dòng Lê Văn Hoàng và chọn Sửa
    const row = page.locator('tr').filter({ hasText: 'Lê Văn Hoàng' });
    await row.locator('[data-bs-toggle="dropdown"]').click();
    await row.locator('.btn-action-tenant[data-action="edit"]').click();

    await expect(page.locator('[data-testid="tenant-form-modal"]')).toBeVisible();

    // Cập nhật SĐT và Email mới
    await page.locator('[data-testid="input-tenant-phone"]').fill('0977111222');
    await page.locator('[data-testid="input-tenant-email"]').fill('hoang.le@gmail.com');
    await page.locator('[data-testid="btn-tenant-save"]').click();
    await expect(page.locator('[data-testid="tenant-form-modal"]')).toBeHidden();

    // Kiểm tra SĐT mới cập nhật trên bảng
    await expect(page.locator('[data-testid="tenants-table-body"]')).toContainText('0977111222');
  });

  test('3. TÌM KIẾM & LỌC: Tìm kiếm theo tên/SĐT và lọc theo trạng thái khách thuê', async ({ page }) => {
    await page.goto('/tenants');

    // Thêm khách A
    await page.locator('[data-testid="btn-add-tenant"]').click();
    await page.locator('[data-testid="input-tenant-name"]').fill('Nguyễn Đức Thắng');
    await page.locator('[data-testid="input-tenant-phone"]').fill('0989999003');
    await page.locator('[data-testid="input-tenant-idcard"]').fill('099200009003');
    await page.locator('[data-testid="btn-tenant-save"]').click();

    // Thêm khách B
    await page.locator('[data-testid="btn-add-tenant"]').click();
    await page.locator('[data-testid="input-tenant-name"]').fill('Vũ Minh Hiếu');
    await page.locator('[data-testid="input-tenant-phone"]').fill('0989999004');
    await page.locator('[data-testid="input-tenant-idcard"]').fill('099200009004');
    await page.locator('[data-testid="btn-tenant-save"]').click();

    const tableBody = page.locator('[data-testid="tenants-table-body"]');
    await expect(tableBody).toContainText('Nguyễn Đức Thắng');
    await expect(tableBody).toContainText('Vũ Minh Hiếu');

    // 1. Tìm kiếm theo tên 'Đức Thắng'
    await page.locator('[data-testid="input-search-tenant"]').fill('Đức Thắng');
    await expect(tableBody).toContainText('Nguyễn Đức Thắng');
    await expect(tableBody).not.toContainText('Vũ Minh Hiếu');

    // Clear từ khóa
    await page.locator('[data-testid="input-search-tenant"]').fill('');
    await expect(tableBody).toContainText('Vũ Minh Hiếu');

    // 2. Lọc theo trạng thái
    await page.locator('[data-testid="filter-status"]').selectOption('inactive');
    await page.locator('[data-testid="filter-status"]').selectOption('');
    await expect(tableBody).toContainText('Nguyễn Đức Thắng');
  });

  test('4. LƯU TRỮ KHÁCH THUÊ: Chuyển hồ sơ khách thuê vào danh sách lưu trữ', async ({ page }) => {
    await page.goto('/tenants');

    // Thêm khách để lưu trữ
    await page.locator('[data-testid="btn-add-tenant"]').click();
    await page.locator('[data-testid="input-tenant-name"]').fill('Bùi Tuyết Nhi');
    await page.locator('[data-testid="input-tenant-phone"]').fill('0989999005');
    await page.locator('[data-testid="input-tenant-idcard"]').fill('099200009005');
    await page.locator('[data-testid="btn-tenant-save"]').click();
    await expect(page.locator('[data-testid="tenants-table-body"]')).toContainText('Bùi Tuyết Nhi');

    // Mở menu thao tác và chọn Lưu trữ
    const row = page.locator('tr').filter({ hasText: 'Bùi Tuyết Nhi' });
    await row.locator('[data-bs-toggle="dropdown"]').click();
    await row.locator('.btn-action-tenant[data-action="archive"]').click();

    // Xác nhận Modal
    await expect(page.locator('[data-testid="confirm-modal"]')).toBeVisible();
    await page.locator('[data-testid="btn-confirm-ok"]').click();
    await expect(page.locator('[data-testid="confirm-modal"]')).toBeHidden();

    // Lọc trạng thái "Đã rời đi (Lưu trữ)" để kiểm tra hồ sơ vẫn lưu trữ
    await page.locator('[data-testid="filter-status"]').selectOption('inactive');
    await expect(page.locator('[data-testid="tenants-table-body"]')).toContainText('Bùi Tuyết Nhi');
  });

  test('5. XEM CHI TIẾT & LỊCH SỬ: Xem hồ sơ khách thuê và modal lịch sử thuê phòng', async ({ page }) => {
    await page.goto('/tenants');

    // Thêm khách mẫu
    await page.locator('[data-testid="btn-add-tenant"]').click();
    await page.locator('[data-testid="input-tenant-name"]').fill('Hoàng Anh Tuấn');
    await page.locator('[data-testid="input-tenant-phone"]').fill('0989999006');
    await page.locator('[data-testid="input-tenant-idcard"]').fill('099200009006');
    await page.locator('[data-testid="btn-tenant-save"]').click();

    // Mở menu thao tác và xem Lịch sử
    const row = page.locator('tr').filter({ hasText: 'Hoàng Anh Tuấn' });
    await row.locator('[data-bs-toggle="dropdown"]').click();
    await row.locator('.btn-action-tenant[data-action="history"]').click();

    // Xác nhận Modal Lịch sử xuất hiện
    await expect(page.locator('[data-testid="tenant-history-modal"]')).toBeVisible();
    await page.locator('[data-testid="btn-history-close"]').click();
    await expect(page.locator('[data-testid="tenant-history-modal"]')).toBeHidden();
  });

  test('6. LUỒNG E2E TỔNG HỢP: Thực thi luồng quản lý người thuê qua tất cả các bước', async ({ page }) => {
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
    await expect(page.locator('[data-testid="tenant-form-modal"]')).toBeHidden();

    // 4. Kiểm tra xuất hiện trên bảng
    await expect(page.locator('[data-testid="tenants-table-body"]')).toContainText('Trần Thị K');
    await expect(page.locator('[data-testid="tenants-table-body"]')).toContainText('0912345678');

    // 5. Tìm kiếm theo tên
    await page.locator('[data-testid="input-search-tenant"]').fill('Trần Thị K');
    await expect(page.locator('[data-testid="tenants-table-body"]')).toContainText('Trần Thị K');

    // 6. Mở dropdown thao tác & Chọn Sửa
    const row = page.locator('tr').filter({ hasText: 'Trần Thị K' });
    await row.locator('[data-bs-toggle="dropdown"]').click();
    await row.locator('.btn-action-tenant[data-action="edit"]').click();
    await expect(page.locator('[data-testid="tenant-form-modal"]')).toBeVisible();

    // Sửa SĐT mới
    await page.locator('[data-testid="input-tenant-phone"]').fill('0988777666');
    await page.locator('[data-testid="btn-tenant-save"]').click();

    // Kiểm tra SĐT mới cập nhật
    await expect(page.locator('[data-testid="tenants-table-body"]')).toContainText('0988777666');

    // 7. Lưu trữ khách thuê
    await row.locator('[data-bs-toggle="dropdown"]').click();
    await row.locator('.btn-action-tenant[data-action="archive"]').click();

    // Xác nhận modal
    await expect(page.locator('[data-testid="confirm-modal"]')).toBeVisible();
    await page.locator('[data-testid="btn-confirm-ok"]').click();

    // Lọc trạng thái "Đã rời đi (Lưu trữ)" để kiểm tra
    await page.locator('[data-testid="filter-status"]').selectOption('inactive');
    await expect(page.locator('[data-testid="tenants-table-body"]')).toContainText('Trần Thị K');
  });
});
