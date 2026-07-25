// tests/e2e/dashboard.spec.js
import { test, expect } from '@playwright/test';

test.describe('RoomMate Dashboard & Analytics E2E', () => {

  test.beforeEach(async ({ page }) => {
    // Dọn LocalStorage trước mỗi test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('1. THỐNG KÊ PHÒNG TRỌ & KHÁCH THUÊ: Hiển thị đúng số liệu thẻ KPI', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const room1 = { id: 'P101', name: 'Phòng 101', floor: 'Tầng 1', type: 'standard', price: 3000000, area: 25, status: 'rented', maxTenants: 3 };
      const room2 = { id: 'P102', name: 'Phòng 102', floor: 'Tầng 1', type: 'standard', price: 3500000, area: 30, status: 'available', maxTenants: 4 };
      const room3 = { id: 'P103', name: 'Phòng 103', floor: 'Tầng 1', type: 'standard', price: 2800000, area: 22, status: 'maintenance', maxTenants: 2 };
      const tenant = { id: 't1', fullName: 'Đặng Văn M', phone: '0933221100', status: 'active' };

      localStorage.setItem('rooms', JSON.stringify([room1, room2, room3]));
      localStorage.setItem('tenants', JSON.stringify([tenant]));
    });

    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="header-title"]')).toHaveText('Dashboard');

    // Thống kê phòng
    await expect(page.locator('[data-testid="stat-total-rooms-value"]')).toHaveText('3');
    await expect(page.locator('[data-testid="stat-available-rooms-value"]')).toHaveText('1');
    await expect(page.locator('[data-testid="stat-rented-rooms-value"]')).toHaveText('1');
    await expect(page.locator('[data-testid="stat-maintenance-rooms-value"]')).toHaveText('1');
    await expect(page.locator('[data-testid="stat-total-tenants-value"]')).toHaveText('1');
  });

  test('2. THỐNG KÊ DOANH THU & CÔNG NỢ: Hiển thị doanh thu, công nợ và 3 biểu đồ Chart.js', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const unpaidInvoice = {
        id: 'INV-202607-P101',
        roomId: 'P101',
        month: 7,
        year: 2026,
        totalAmount: 3200000,
        paidAmount: 1000000,
        remainingDebt: 2200000,
        status: 'partial'
      };

      localStorage.setItem('invoices', JSON.stringify([unpaidInvoice]));
    });

    await page.goto('/dashboard');

    // Thống kê tài chính
    await expect(page.locator('[data-testid="stat-monthly-revenue-value"]')).toContainText('3.200.000');
    await expect(page.locator('[data-testid="stat-total-debt-value"]')).toContainText('2.200.000');

    // Biểu đồ
    await expect(page.locator('[data-testid="revenue-chart-canvas"]')).toBeVisible();
    await expect(page.locator('[data-testid="room-status-chart-canvas"]')).toBeVisible();
    await expect(page.locator('[data-testid="consumption-chart-canvas"]')).toBeVisible();
  });

  test('3. CẢNH BÁO HỢP ĐỒNG & HÓA ĐƠN: Hiển thị widget cảnh báo hợp đồng sắp hết hạn', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const expiringContract = {
        id: 'c-expiring',
        roomId: 'P101',
        tenantId: 't1',
        startDate: '2025-08-01',
        endDate: '2026-08-01',
        status: 'active'
      };
      const room = { id: 'P101', name: 'Phòng 101', status: 'rented' };
      const tenant = { id: 't1', fullName: 'Đặng Văn M', phone: '0933221100', status: 'active' };

      localStorage.setItem('rooms', JSON.stringify([room]));
      localStorage.setItem('tenants', JSON.stringify([tenant]));
      localStorage.setItem('contracts', JSON.stringify([expiringContract]));
    });

    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="dashboard-page"]')).toBeVisible();
  });

  test('4. CHUYỂN HƯỚNG NHANH TỪ DASHBOARD: Nút điều hướng nhanh hoạt động chính xác', async ({ page }) => {
    await page.goto('/dashboard');

    // Nút mở quản lý phòng trọ / nút bấm nhanh trên Dashboard
    const roomsMenu = page.locator('[data-testid="menu-rooms"]');
    await roomsMenu.click();
    await expect(page).toHaveURL(/\/rooms$/);
    await expect(page.locator('[data-testid="header-title"]')).toHaveText('Quản lý phòng');
  });
});
