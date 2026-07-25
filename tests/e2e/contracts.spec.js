// tests/e2e/contracts.spec.js
import { test, expect } from '@playwright/test';

test.describe('RoomMate Contracts Management E2E', () => {

  test.beforeEach(async ({ page }) => {
    // Dọn LocalStorage trước mỗi test để đảm bảo môi trường sạch & độc lập
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('1. TẠO HỢP ĐỒNG MỚI & KÍCH HOẠT: Tạo phòng -> tạo người thuê -> tạo & kích hoạt hợp đồng', async ({ page }) => {
    // 1. Tạo phòng mới (Phòng 701)
    await page.goto('/rooms');
    await page.locator('[data-testid="view-table"]').click();
    await page.locator('[data-testid="btn-add-room"]').click();
    await expect(page.locator('[data-testid="room-form-modal"]')).toBeVisible();

    await page.locator('[data-testid="input-room-code"]').fill('P701');
    await page.locator('[data-testid="input-room-name"]').fill('Phòng 701');
    await page.locator('[data-testid="input-room-floor"]').fill('Tầng 7');
    await page.locator('[data-testid="select-room-type"]').selectOption('standard');
    await page.locator('[data-testid="input-room-area"]').fill('25');
    await page.locator('[data-testid="input-room-price"]').fill('3000000');
    await page.locator('[data-testid="input-room-max-tenants"]').fill('3');
    await page.locator('[data-testid="select-room-status"]').selectOption('available');
    await page.locator('[data-testid="btn-room-save"]').click();
    await expect(page.locator('[data-testid="room-row-P701"]')).toBeVisible();

    // 2. Tạo người thuê mới (Nguyễn Văn E)
    await page.goto('/tenants');
    await page.locator('[data-testid="btn-add-tenant"]').click();
    await expect(page.locator('[data-testid="tenant-form-modal"]')).toBeVisible();

    await page.locator('[data-testid="input-tenant-name"]').fill('Nguyễn Văn E');
    await page.locator('[data-testid="input-tenant-phone"]').fill('0909999888');
    await page.locator('[data-testid="input-tenant-idcard"]').fill('123456789012');
    await page.locator('input#tenantEmail').fill('vane@gmail.com');
    await page.locator('[data-testid="btn-tenant-save"]').click();
    await expect(page.locator('[data-testid="tenants-table-body"]')).toContainText('Nguyễn Văn E');

    // 3. Tạo hợp đồng & 4. Kích hoạt hợp đồng
    await page.goto('/contracts');
    await page.locator('[data-testid="btn-add-contract"]').click();
    await expect(page.locator('#contractFormModal')).toBeVisible();

    // Chọn phòng P701 qua searchable select dropdown
    await page.locator('#contractRoom + .dropdown button.dropdown-toggle').click();
    await page.locator('#contractRoom + .dropdown button.dropdown-item[data-value="P701"]').click();

    // Chọn người đại diện (Nguyễn Văn E) qua searchable select dropdown
    await page.locator('#contractTenant + .dropdown button.dropdown-toggle').click();
    await page.locator('#contractTenant + .dropdown button.dropdown-item:has-text("Nguyễn Văn E")').click();

    // Nhập thời hạn hợp đồng (2026-08-01 -> 2027-08-01)
    await page.locator('input#contractStartDate').fill('2026-08-01');
    await page.locator('input#contractEndDate').fill('2027-08-01');

    // Điền giá thuê & tiền cọc
    await page.locator('input#contractRoomPrice').fill('3000000');
    await page.locator('input#contractDeposit').fill('3000000');

    // Kích hoạt hợp đồng (Bấm Tạo & Kích hoạt)
    await page.locator('#btnSaveActive').click();

    // Kiểm tra hợp đồng xuất hiện trong danh sách với trạng thái Hiệu lực
    await expect(page.locator('[data-testid="contracts-table-body"] tr').first()).toContainText('Phòng 701');
    await expect(page.locator('[data-testid="contracts-table-body"] tr').first()).toContainText('Nguyễn Văn E');
    await expect(page.locator('[data-testid="contracts-table-body"] tr').first()).toContainText('Hiệu lực');

    // Kiểm tra phòng chuyển sang đang thuê
    await page.goto('/rooms');
    await page.locator('[data-testid="view-table"]').click();
    await expect(page.locator('[data-testid="room-row-P701"]')).toContainText('Đang thuê');
  });

  test('2. XEM CHI TIẾT HỢP ĐỒNG: Mở modal xem thông tin chi tiết hợp đồng', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const room = { id: 'P702', name: 'Phòng 702', floor: 'Tầng 7', type: 'standard', price: 3500000, area: 28, status: 'rented', maxTenants: 3 };
      const tenant = { id: 't-702', fullName: 'Trần Văn H', phone: '0901234567', status: 'active' };
      const contract = {
        id: 'c-view-702',
        roomId: 'P702',
        tenantId: 't-702',
        startDate: '2026-01-01',
        endDate: '2027-01-01',
        roomPrice: 3500000,
        deposit: 3500000,
        status: 'active'
      };
      localStorage.setItem('rooms', JSON.stringify([room]));
      localStorage.setItem('tenants', JSON.stringify([tenant]));
      localStorage.setItem('contracts', JSON.stringify([contract]));
    });

    await page.goto('/contracts');
    await expect(page.locator('[data-testid="contracts-table-body"]')).toContainText('Phòng 702');

    // Nhấp vào mã hợp đồng để xem chi tiết
    await page.locator('.btn-view-contract').first().click();

    // Kiểm tra Modal chi tiết hiển thị đúng thông tin
    await expect(page.locator('[data-testid="contract-detail-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="contract-detail-modal"]')).toContainText('Phòng 702');
    await expect(page.locator('[data-testid="contract-detail-modal"]')).toContainText('Trần Văn H');
    await expect(page.locator('[data-testid="contract-detail-modal"]')).toContainText('3.500.000');
  });

  test('3. SỬA HỢP ĐỒNG: Chỉnh sửa thông tin hợp đồng đang hiệu lực', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const room = { id: 'P703', name: 'Phòng 703', floor: 'Tầng 7', type: 'standard', price: 3000000, area: 25, status: 'rented', maxTenants: 3 };
      const tenant = { id: 't-703', fullName: 'Lê Thị M', phone: '0902345678', status: 'active' };
      const contract = {
        id: 'c-edit-703',
        roomId: 'P703',
        tenantId: 't-703',
        startDate: '2026-01-01',
        endDate: '2027-01-01',
        roomPrice: 3000000,
        deposit: 3000000,
        status: 'active'
      };
      localStorage.setItem('rooms', JSON.stringify([room]));
      localStorage.setItem('tenants', JSON.stringify([tenant]));
      localStorage.setItem('contracts', JSON.stringify([contract]));
    });

    await page.goto('/contracts');
    await expect(page.locator('[data-testid="contracts-table-body"]')).toContainText('Phòng 703');

    // Mở dropdown thao tác và chọn Sửa thông tin
    await page.locator('[data-testid="contracts-table-body"] [data-bs-toggle="dropdown"]').first().click();
    await page.locator('.btn-action-edit').first().click();

    await expect(page.locator('#contractFormModal')).toBeVisible();

    // Cập nhật giá tiền cọc thành 4.000.000
    await page.locator('input#contractDeposit').fill('4000000');
    await page.locator('#btnSaveActive').click();
    await expect(page.locator('#contractFormModal')).toBeHidden();

    // Kiểm tra tiền cọc được cập nhật trên bảng
    await expect(page.locator('[data-testid="contracts-table-body"]')).toContainText('4.000.000');
  });

  test('4. GIA HẠN HỢP ĐỒNG: Cập nhật ngày kết thúc mới cho hợp đồng', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const room = { id: 'P704', name: 'Phòng 704', floor: 'Tầng 7', type: 'standard', price: 3000000, area: 25, status: 'rented', maxTenants: 3 };
      const tenant = { id: 't-704', fullName: 'Phạm Văn N', phone: '0903456789', status: 'active' };
      const contract = {
        id: 'c-extend-704',
        roomId: 'P704',
        tenantId: 't-704',
        startDate: '2026-01-01',
        endDate: '2027-01-01',
        roomPrice: 3000000,
        deposit: 3000000,
        status: 'active'
      };
      localStorage.setItem('rooms', JSON.stringify([room]));
      localStorage.setItem('tenants', JSON.stringify([tenant]));
      localStorage.setItem('contracts', JSON.stringify([contract]));
    });

    await page.goto('/contracts');
    await expect(page.locator('[data-testid="contracts-table-body"]')).toContainText('Phòng 704');

    // Mở dropdown thao tác và chọn Gia hạn hợp đồng
    await page.locator('[data-testid="contracts-table-body"] [data-bs-toggle="dropdown"]').first().click();
    await page.locator('.btn-action-extend').first().click();

    await expect(page.locator('[data-testid="extend-modal"]')).toBeVisible();

    // Điền ngày kết thúc mới (2028-01-01)
    await page.locator('[data-testid="input-new-end-date"]').fill('2028-01-01');
    await page.locator('[data-testid="btn-confirm-extend"]').click();
    await expect(page.locator('[data-testid="extend-modal"]')).toBeHidden();

    // Kiểm tra ngày kết thúc mới trên bảng
    await expect(page.locator('[data-testid="contracts-table-body"]')).toContainText('01/01/2028');
  });

  test('5. KẾT THÚC HỢP ĐỒNG: Kết thúc hợp đồng bình thường & cập nhật trạng thái phòng về Trống', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const room = { id: 'P705', name: 'Phòng 705', floor: 'Tầng 7', type: 'standard', price: 3000000, area: 25, status: 'rented', maxTenants: 3 };
      const tenant = { id: 't-705', fullName: 'Vũ Hoàng P', phone: '0904567890', status: 'active' };
      const activeContract = {
        id: 'c-end-705',
        roomId: 'P705',
        tenantId: 't-705',
        startDate: '2026-01-01',
        endDate: '2027-01-01',
        roomPrice: 3000000,
        deposit: 3000000,
        status: 'active'
      };
      localStorage.setItem('rooms', JSON.stringify([room]));
      localStorage.setItem('tenants', JSON.stringify([tenant]));
      localStorage.setItem('contracts', JSON.stringify([activeContract]));
    });

    await page.goto('/contracts');
    await expect(page.locator('[data-testid="contracts-table-body"]')).toContainText('Phòng 705');

    // Mở dropdown menu và chọn Kết thúc bình thường
    await page.locator('[data-testid="contracts-table-body"] [data-bs-toggle="dropdown"]').first().click();
    await page.locator('.btn-action-end').first().click();

    // Xác nhận trong Modal
    await expect(page.locator('[data-testid="confirm-modal"]')).toBeVisible();
    await page.locator('[data-testid="btn-confirm-ok"]').click();
    await expect(page.locator('[data-testid="confirm-modal"]')).toBeHidden();

    // Kiểm tra trạng thái hợp đồng chuyển thành Hết hạn
    await expect(page.locator('[data-testid="contracts-table-body"]')).toContainText('Hết hạn');

    // Kiểm tra trạng thái phòng về Trống
    await page.goto('/rooms');
    await page.locator('[data-testid="view-table"]').click();
    await expect(page.locator('[data-testid="room-row-P705"]')).toContainText('Trống');
  });

  test('6. HỦY / THANH LÝ HỢP ĐỒNG: Thanh lý sớm hợp đồng', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const room = { id: 'P706', name: 'Phòng 706', floor: 'Tầng 7', type: 'standard', price: 3000000, area: 25, status: 'rented', maxTenants: 3 };
      const tenant = { id: 't-706', fullName: 'Đặng Mỹ Q', phone: '0905678901', status: 'active' };
      const activeContract = {
        id: 'c-cancel-706',
        roomId: 'P706',
        tenantId: 't-706',
        startDate: '2026-01-01',
        endDate: '2027-01-01',
        roomPrice: 3000000,
        deposit: 3000000,
        status: 'active'
      };
      localStorage.setItem('rooms', JSON.stringify([room]));
      localStorage.setItem('tenants', JSON.stringify([tenant]));
      localStorage.setItem('contracts', JSON.stringify([activeContract]));
    });

    await page.goto('/contracts');
    await expect(page.locator('[data-testid="contracts-table-body"]')).toContainText('Phòng 706');

    // Mở dropdown menu và chọn Hủy / Thanh lý sớm
    await page.locator('[data-testid="contracts-table-body"] [data-bs-toggle="dropdown"]').first().click();
    await page.locator('.btn-action-cancel').first().click();

    // Xác nhận trong Modal
    await expect(page.locator('[data-testid="confirm-modal"]')).toBeVisible();
    await page.locator('[data-testid="btn-confirm-ok"]').click();
    await expect(page.locator('[data-testid="confirm-modal"]')).toBeHidden();

    // Kiểm tra trạng thái hợp đồng chuyển thành Đã thanh lý
    await expect(page.locator('[data-testid="contracts-table-body"]')).toContainText('Đã thanh lý');
  });

  test('7. TÌM KIẾM & LỌC: Tìm theo từ khóa, lọc theo trạng thái và lọc theo phòng', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const room1 = { id: 'P707', name: 'Phòng 707', floor: 'Tầng 7', type: 'standard', price: 3000000, area: 25, status: 'rented', maxTenants: 3 };
      const room2 = { id: 'P708', name: 'Phòng 708', floor: 'Tầng 7', type: 'standard', price: 4000000, area: 30, status: 'available', maxTenants: 4 };
      const tenant1 = { id: 't-707', fullName: 'Trần Đức R', phone: '0906789012', status: 'active' };
      const tenant2 = { id: 't-708', fullName: 'Nguyễn Văn S', phone: '0907890123', status: 'inactive' };
      const c1 = { id: 'c-707', roomId: 'P707', tenantId: 't-707', startDate: '2026-01-01', endDate: '2027-01-01', roomPrice: 3000000, deposit: 3000000, status: 'active' };
      const c2 = { id: 'c-708', roomId: 'P708', tenantId: 't-708', startDate: '2025-01-01', endDate: '2026-01-01', roomPrice: 4000000, deposit: 4000000, status: 'expired' };

      localStorage.setItem('rooms', JSON.stringify([room1, room2]));
      localStorage.setItem('tenants', JSON.stringify([tenant1, tenant2]));
      localStorage.setItem('contracts', JSON.stringify([c1, c2]));
    });

    await page.goto('/contracts');
    const tbody = page.locator('[data-testid="contracts-table-body"]');
    await expect(tbody).toContainText('Phòng 707');
    await expect(tbody).toContainText('Phòng 708');

    // 1. Tìm kiếm theo từ khóa '707'
    await page.locator('[data-testid="input-search-contract"]').fill('707');
    await expect(tbody).toContainText('Phòng 707');
    await expect(tbody).not.toContainText('Phòng 708');

    // Clear từ khóa
    await page.locator('[data-testid="input-search-contract"]').fill('');
    await expect(tbody).toContainText('Phòng 708');

    // 2. Lọc theo trạng thái 'expired'
    await page.locator('[data-testid="filter-status"]').selectOption('expired');
    await expect(tbody).not.toContainText('Phòng 707');
    await expect(tbody).toContainText('Phòng 708');

    // Reset lọc trạng thái
    await page.locator('[data-testid="filter-status"]').selectOption('');
    await expect(tbody).toContainText('Phòng 707');
  });

  test('8. KIỂM TRA TRÙNG LẶP HỢP ĐỒNG: Không cho phép tạo hợp đồng mới trùng thời gian trên cùng 1 phòng', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const room = { id: 'P709', name: 'Phòng 709', floor: 'Tầng 7', type: 'standard', price: 3000000, area: 25, status: 'rented', maxTenants: 3 };
      const tenant1 = { id: 't-test-1', fullName: 'Người thuê 1', phone: '0901112222', status: 'active' };
      const tenant2 = { id: 't-test-2', fullName: 'Người thuê 2', phone: '0903334444', status: 'active' };
      const activeContract = {
        id: 'c-existing-709',
        roomId: 'P709',
        tenantId: 't-test-1',
        startDate: '2026-08-01',
        endDate: '2027-08-01',
        roomPrice: 3000000,
        deposit: 3000000,
        status: 'active'
      };
      localStorage.setItem('rooms', JSON.stringify([room]));
      localStorage.setItem('tenants', JSON.stringify([tenant1, tenant2]));
      localStorage.setItem('contracts', JSON.stringify([activeContract]));
    });

    await page.goto('/contracts');
    await page.locator('[data-testid="btn-add-contract"]').click();
    await expect(page.locator('#contractFormModal')).toBeVisible();

    // Chọn cùng phòng P709
    await page.locator('#contractRoom + .dropdown button.dropdown-toggle').click();
    await page.locator('#contractRoom + .dropdown button.dropdown-item[data-value="P709"]').click();

    // Chọn người đại diện 2
    await page.locator('#contractTenant + .dropdown button.dropdown-toggle').click();
    await page.locator('#contractTenant + .dropdown button.dropdown-item:has-text("Người thuê 2")').click();

    // Nhập thời gian trùng lặp (2026-10-01 nằm trong 2026-08-01 -> 2027-08-01)
    await page.locator('input#contractStartDate').fill('2026-10-01');
    await page.locator('input#contractEndDate').fill('2027-02-01');
    await page.locator('input#contractRoomPrice').fill('3000000');
    await page.locator('input#contractDeposit').fill('3000000');

    // Bấm Kích hoạt
    await page.locator('#btnSaveActive').click();

    // Kiểm tra hiển thị đúng thông báo lỗi trùng thời gian
    const errorAlert = page.locator('#contractFormError');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText('trùng thời gian');
  });
});
