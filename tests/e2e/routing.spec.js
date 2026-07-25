// tests/e2e/routing.spec.js
import { test, expect } from '@playwright/test';

test.describe('RoomMate Routing & Navigation E2E', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('1. ROOT REDIRECT: Điều hướng từ / tự động chuyển về /dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator('[data-testid="header-title"]')).toHaveText('Dashboard');
    await expect(page.locator('[data-testid="dashboard-page"]')).toBeVisible();
  });

  test('2. MENU NAVIGATIONS: Kiểm tra điều hướng đến tất cả 12 trang từ Sidebar menu', async ({ page }) => {
    await page.goto('/dashboard');

    const menuItems = [
      { menuId: 'menu-dashboard', url: /\/dashboard$/, title: 'Dashboard' },
      { menuId: 'menu-rooms', url: /\/rooms$/, title: 'Quản lý phòng' },
      { menuId: 'menu-tenants', url: /\/tenants$/, title: 'Người thuê' },
      { menuId: 'menu-contracts', url: /\/contracts$/, title: 'Hợp đồng' },
      { menuId: 'menu-meters', url: /\/meters$/, title: 'Chỉ số điện nước' },
      { menuId: 'menu-meters-history', url: /\/meters-history$/, title: 'Lịch sử điện nước' },
      { menuId: 'menu-services', url: /\/services$/, title: 'Cấu hình dịch vụ' },
      { menuId: 'menu-invoices', url: /\/invoices$/, title: 'Lập hóa đơn' },
      { menuId: 'menu-payments', url: /\/payments$/, title: 'Thanh toán' },
      { menuId: 'menu-debts', url: /\/debts$/, title: 'Công nợ' },
      { menuId: 'menu-reports', url: /\/reports$/, title: 'Báo cáo' },
      { menuId: 'menu-backup', url: /\/backup$/, title: 'Sao lưu dữ liệu' },
    ];

    for (const item of menuItems) {
      await page.locator(`[data-testid="${item.menuId}"]`).click();
      await expect(page).toHaveURL(item.url);
      await expect(page.locator('[data-testid="header-title"]')).toHaveText(item.title);
    }
  });

  test('3. DIRECT URL ACCESS: Truy cập trực tiếp qua đường dẫn URL', async ({ page }) => {
    // 1. Quản lý phòng
    await page.goto('/rooms');
    await expect(page.locator('[data-testid="header-title"]')).toHaveText('Quản lý phòng');

    // 2. Khách thuê
    await page.goto('/tenants');
    await expect(page.locator('[data-testid="header-title"]')).toHaveText('Người thuê');

    // 3. Hợp đồng
    await page.goto('/contracts');
    await expect(page.locator('[data-testid="header-title"]')).toHaveText('Hợp đồng');

    // 4. Điện nước
    await page.goto('/meters');
    await expect(page.locator('[data-testid="header-title"]')).toHaveText('Chỉ số điện nước');

    // 5. Hóa đơn
    await page.goto('/invoices');
    await expect(page.locator('[data-testid="header-title"]')).toHaveText('Lập hóa đơn');
  });

  test('4. 404 NOT FOUND: Hiển thị trang lỗi 404 cho đường dẫn không hợp lệ và nút quay về Dashboard', async ({ page }) => {
    await page.goto('/unknown-page-route');
    
    // Check Header Title
    await expect(page.locator('[data-testid="header-title"]')).toHaveText('Không tìm thấy');
    
    // Check 404 block
    const notFound = page.locator('[data-testid="error-state-page-not-found"]');
    await expect(notFound).toBeVisible();
    await expect(notFound.locator('h4')).toHaveText('Không tìm thấy trang yêu cầu');
    
    // Click back to dashboard button
    await page.locator('#btnErrorActionGoHome').click();
    
    // Check URL
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator('[data-testid="header-title"]')).toHaveText('Dashboard');
  });
});
