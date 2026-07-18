// tests/e2e/contracts.spec.js
import { test, expect } from '@playwright/test';

test.describe('RoomMate Contracts Management E2E', () => {

  test.beforeEach(async ({ page }) => {
    // Dọn LocalStorage trước mỗi test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should support contract flow: create contract -> activate -> check room status', async ({ page }) => {
    // 1. Tạo phòng mới và 2. Tạo người thuê (tự chuẩn bị dữ liệu trong LocalStorage để test chạy nhanh & độc lập)
    await page.goto('/');
    await page.evaluate(() => {
      const room = {
        id: 'P701',
        name: 'Phòng 701',
        floor: 'Tầng 7',
        type: 'standard',
        price: 3000000,
        area: 25,
        status: 'available',
        maxTenants: 3,
        description: 'Phòng test E2E'
      };
      const tenant = {
        id: 't-test-1',
        fullName: 'Nguyễn Văn E',
        phone: '0909999888',
        idCard: '123456789012',
        email: 'vane@gmail.com',
        status: 'active'
      };
      localStorage.setItem('rooms', JSON.stringify([room]));
      localStorage.setItem('tenants', JSON.stringify([tenant]));
    });

    // 3. Tạo hợp đồng & 4. Kích hoạt hợp đồng (bấm Tạo & Kích hoạt)
    await page.goto('/contracts');
    await page.locator('[data-testid="btn-add-contract"]').click();
    await expect(page.locator('#contractFormModal')).toBeVisible();

    // Chọn phòng P701 qua searchable-select
    await page.locator('#contractRoom + .dropdown button.dropdown-toggle').click();
    await page.locator('#contractRoom + .dropdown button.dropdown-item[data-value="P701"]').click();

    // Chọn người đại diện qua searchable-select
    await page.locator('#contractTenant + .dropdown button.dropdown-toggle').click();
    await page.locator('#contractTenant + .dropdown button.dropdown-item:has-text("Nguyễn Văn E")').click();

    // Nhập ngày bắt đầu & ngày kết thúc
    await page.locator('input#contractStartDate').fill('2026-08-01');
    await page.locator('input#contractEndDate').fill('2027-08-01');

    // Điền giá thuê & tiền cọc
    await page.locator('input#contractRoomPrice').fill('3000000');
    await page.locator('input#contractDeposit').fill('3000000');

    // Click Tạo & Kích hoạt
    await page.locator('#btnSaveActive').click();
    await expect(page.locator('#contractFormModal')).toBeHidden();

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
    // Tự chuẩn bị dữ liệu: tạo phòng, người thuê và một hợp đồng đang active sẵn
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

    // Chọn phòng P702
    await page.locator('#contractRoom + .dropdown button.dropdown-toggle').click();
    await page.locator('#contractRoom + .dropdown button.dropdown-item[data-value="P702"]').click();

    // Chọn người đại diện 2
    await page.locator('#contractTenant + .dropdown button.dropdown-toggle').click();
    await page.locator('#contractTenant + .dropdown button.dropdown-item:has-text("Người thuê 2")').click();

    // Nhập thời gian trùng lặp (trùng khoảng thời gian)
    await page.locator('input#contractStartDate').fill('2026-10-01');
    await page.locator('input#contractEndDate').fill('2027-02-01');

    await page.locator('input#contractRoomPrice').fill('3000000');
    await page.locator('input#contractDeposit').fill('3000000');

    // Click Tạo & Kích hoạt
    await page.locator('#btnSaveActive').click();

    // Kiểm tra hiển thị đúng thông báo lỗi
    const errorAlert = page.locator('#contractFormError');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText('trùng thời gian');
  });
});
