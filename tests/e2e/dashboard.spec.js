// tests/e2e/dashboard.spec.js
import { test, expect } from '@playwright/test';

test.describe('RoomMate Dashboard & Analytics E2E', () => {

  test.beforeEach(async ({ page }) => {
    // Dọn LocalStorage trước mỗi test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should render stat cards, alert widgets, and 3 charts correctly when seeded with data', async ({ page }) => {
    // 1. Khởi tạo dữ liệu mẫu cho Dashboard (Phòng, Hợp đồng, Hóa đơn)
    await page.goto('/');
    await page.evaluate(() => {
      const room1 = { id: 'P101', name: 'Phòng 101', floor: 'Tầng 1', type: 'standard', price: 3000000, area: 25, status: 'rented', maxTenants: 3 };
      const room2 = { id: 'P102', name: 'Phòng 102', floor: 'Tầng 1', type: 'standard', price: 3500000, area: 30, status: 'available', maxTenants: 4 };
      const room3 = { id: 'P103', name: 'Phòng 103', floor: 'Tầng 1', type: 'standard', price: 2800000, area: 22, status: 'maintenance', maxTenants: 2 };
      
      const tenant = { id: 't1', fullName: 'Đặng Văn M', phone: '0933221100', status: 'active' };

      const activeContract = {
        id: 'c1',
        roomId: 'P101',
        tenantId: 't1',
        startDate: '2026-01-01',
        endDate: '2027-01-01',
        roomPrice: 3000000,
        deposit: 3000000,
        status: 'active'
      };

      const unpaidInvoice = {
        id: 'INV-202607-P101',
        roomId: 'P101',
        tenantId: 't1',
        month: 7,
        year: 2026,
        totalAmount: 3200000,
        paidAmount: 1000000,
        remainingDebt: 2200000,
        status: 'partial',
        dueDate: '2026-07-15'
      };

      const meterReading = {
        id: 'm-P101-2026-07',
        roomId: 'P101',
        month: 7,
        year: 2026,
        electricityOld: 100,
        electricityNew: 180,
        electricityUsage: 80,
        waterOld: 20,
        waterNew: 28,
        waterUsage: 8
      };

      localStorage.setItem('rooms', JSON.stringify([room1, room2, room3]));
      localStorage.setItem('tenants', JSON.stringify([tenant]));
      localStorage.setItem('contracts', JSON.stringify([activeContract]));
      localStorage.setItem('invoices', JSON.stringify([unpaidInvoice]));
      localStorage.setItem('meter_readings', JSON.stringify([meterReading]));
    });

    // 2. Tải trang Dashboard
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="header-title"]')).toHaveText('Dashboard');

    // 3. Kiểm tra các thẻ thống kê KPI
    await expect(page.locator('[data-testid="stat-total-rooms-value"]')).toHaveText('3');
    await expect(page.locator('[data-testid="stat-available-rooms-value"]')).toHaveText('1');
    await expect(page.locator('[data-testid="stat-rented-rooms-value"]')).toHaveText('1');
    await expect(page.locator('[data-testid="stat-maintenance-rooms-value"]')).toHaveText('1');
    await expect(page.locator('[data-testid="stat-total-tenants-value"]')).toHaveText('1');

    // 4. Kiểm tra 3 canvas biểu đồ
    await expect(page.locator('[data-testid="revenue-chart-canvas"]')).toBeVisible();
    await expect(page.locator('[data-testid="room-status-chart-canvas"]')).toBeVisible();
    await expect(page.locator('[data-testid="consumption-chart-canvas"]')).toBeVisible();
  });
});
