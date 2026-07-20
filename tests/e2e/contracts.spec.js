// tests/e2e/contracts.spec.js
import { test, expect } from '@playwright/test';

test.describe('RoomMate Contracts Management E2E', () => {

  test.beforeEach(async ({ page }) => {
    // Dọn LocalStorage trước mỗi test để đảm bảo môi trường sạch & độc lập
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should support full contract flow: create room -> create tenant -> create contract -> activate -> check room rented -> check contract listed', async ({ page }) => {
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
    
    // Chờ phòng hiển thị trên bảng
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
    
    // Chờ người thuê hiển thị trong danh sách
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

    // 6. Kiểm tra hợp đồng xuất hiện trong danh sách
    await expect(page.locator('[data-testid="contracts-table-body"] tr').first()).toContainText('Phòng 701');
    await expect(page.locator('[data-testid="contracts-table-body"] tr').first()).toContainText('Nguyễn Văn E');
    await expect(page.locator('[data-testid="contracts-table-body"] tr').first()).toContainText('Hiệu lực');

    // 5. Kiểm tra phòng chuyển sang đang thuê
    await page.goto('/rooms');
    await page.locator('[data-testid="view-table"]').click();
    await expect(page.locator('[data-testid="room-row-P701"]')).toContainText('Đang thuê');
  });

  test('should not allow creating an overlapping contract on the same room and display error message', async ({ page }) => {
    // Tự chuẩn bị dữ liệu độc lập cho kịch bản trùng thời gian
    await page.goto('/');
    await page.evaluate(() => {
      const room = {
        id: 'P702',
        name: 'Phòng 702',
        floor: 'Tầng 7',
        type: 'standard',
        price: 3000000,
        area: 25,
        status: 'rented',
        maxTenants: 3
      };
      const tenant1 = {
        id: 't-test-1',
        fullName: 'Người thuê 1',
        phone: '0901112222',
        status: 'active'
      };
      const tenant2 = {
        id: 't-test-2',
        fullName: 'Người thuê 2',
        phone: '0903334444',
        status: 'active'
      };
      const activeContract = {
        id: 'c-existing-2',
        roomId: 'P702',
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

    // Mở form thêm hợp đồng mới
    await page.goto('/contracts');
    await page.locator('[data-testid="btn-add-contract"]').click();
    await expect(page.locator('#contractFormModal')).toBeVisible();

    // Chọn cùng phòng P702
    await page.locator('#contractRoom + .dropdown button.dropdown-toggle').click();
    await page.locator('#contractRoom + .dropdown button.dropdown-item[data-value="P702"]').click();

    // Chọn người đại diện 2
    await page.locator('#contractTenant + .dropdown button.dropdown-toggle').click();
    await page.locator('#contractTenant + .dropdown button.dropdown-item:has-text("Người thuê 2")').click();

    // Nhập thời gian trùng lặp (2026-10-01 nằm trong 2026-08-01 -> 2027-08-01)
    await page.locator('input#contractStartDate').fill('2026-10-01');
    await page.locator('input#contractEndDate').fill('2027-02-01');

    await page.locator('input#contractRoomPrice').fill('3000000');
    await page.locator('input#contractDeposit').fill('3000000');

    // Bấm Tạo & Kích hoạt
    await page.locator('#btnSaveActive').click();

    // Kiểm tra hiển thị đúng thông báo lỗi
    const errorAlert = page.locator('#contractFormError');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText('trùng thời gian');
  });
});



