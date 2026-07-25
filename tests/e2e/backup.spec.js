// tests/e2e/backup.spec.js
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('RoomMate Backup, Import & Export E2E', () => {

  test.beforeEach(async ({ page }) => {
    // Dọn LocalStorage trước mỗi test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('1. EXPORT DỮ LIỆU: Xuất dữ liệu hệ thống ra file JSON', async ({ page }) => {
    // Tạo phòng P905 trong LocalStorage
    await page.goto('/');
    await page.evaluate(() => {
      const room = {
        id: 'P905',
        name: 'Phòng 905',
        floor: 'Tầng 9',
        type: 'standard',
        price: 2500000,
        area: 25,
        status: 'available',
        maxTenants: 3
      };
      localStorage.setItem('rooms', JSON.stringify([room]));
    });

    await page.goto('/backup');
    await expect(page.locator('[data-testid="settings-page"]')).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('[data-testid="btn-export-data"]').click()
    ]);

    const downloadPath = path.resolve('tests/e2e/test_export_backup.json');
    await download.saveAs(downloadPath);
    expect(fs.existsSync(downloadPath)).toBe(true);

    // Clean up file
    if (fs.existsSync(downloadPath)) {
      fs.unlinkSync(downloadPath);
    }
  });

  test('2. IMPORT DỮ LIỆU: Nhập file JSON hợp lệ và khôi phục dữ liệu', async ({ page }) => {
    // 1. Chuẩn bị file backup JSON chuẩn
    const validBackupPath = path.resolve('tests/e2e/valid_test_backup.json');
    const backupContent = {
      rooms: [{ id: 'P906', name: 'Phòng 906', floor: 'Tầng 9', type: 'standard', price: 2700000, area: 25, status: 'available', maxTenants: 3 }],
      tenants: [],
      contracts: [],
      invoices: [],
      payments: [],
      meter_readings: [],
      serviceConfigs: []
    };
    fs.writeFileSync(validBackupPath, JSON.stringify(backupContent));

    await page.goto('/backup');

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('#btnSelectFile').click()
    ]);
    await fileChooser.setFiles(validBackupPath);

    // Kiểm tra dữ liệu
    await page.locator('#btnCheckData').click();
    await expect(page.locator('#importFileInfo')).toContainText('✅ File dữ liệu hợp lệ');

    // Đánh dấu biến window để phát hiện reload
    await page.evaluate(() => { window.__pendingReload = true; });

    // Thực hiện Import
    await page.locator('#btnImportSubmit').click();
    await expect(page.locator('.toast-container')).toContainText('thành công');

    // Chờ trang tự động reload xong
    await page.waitForFunction(() => window.__pendingReload === undefined, { timeout: 5000 });

    // Kiểm tra dữ liệu được khôi phục (Phòng P906)
    await page.goto('/rooms');
    await page.locator('[data-testid="view-table"]').click();
    await page.locator('[data-testid="input-search-room"]').fill('906');
    await expect(page.locator('[data-testid="room-row-P906"]')).toBeVisible();

    // Clean up file
    if (fs.existsSync(validBackupPath)) {
      fs.unlinkSync(validBackupPath);
    }
  });

  test('3. BÁO LỖI IMPORT: Báo lỗi khi chọn file JSON không đúng cấu hình', async ({ page }) => {
    const invalidPath = path.resolve('tests/e2e/invalid_test_backup.json');
    fs.writeFileSync(invalidPath, '{"rooms": "invalid_structure"}');

    await page.goto('/backup');
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('#btnSelectFile').click()
    ]);
    await fileChooser.setFiles(invalidPath);

    await page.locator('#btnCheckData').click();

    // Kiểm tra hiển thị Error State
    await expect(page.locator('[data-testid="error-state-invalid-import"]')).toBeVisible();

    // Clean up file
    if (fs.existsSync(invalidPath)) {
      fs.unlinkSync(invalidPath);
    }

    // Reset lại màn hình Import
    await page.locator('#btnErrorActionResetImport').click();
    await expect(page.locator('#importPreviewBlock')).toBeHidden();
  });

  test('4. CẢNH BÁO GHI ĐÈ & HỦY BỎ: Cảnh báo xác nhận khi ghi đè dữ liệu và cho phép hủy', async ({ page }) => {
    const validBackupPath = path.resolve('tests/e2e/overwrite_test_backup.json');
    fs.writeFileSync(validBackupPath, JSON.stringify({
      rooms: [{ id: 'P907', name: 'Phòng 907', floor: 'Tầng 9', type: 'standard', price: 2000000, area: 20, status: 'available', maxTenants: 2 }],
      tenants: [], contracts: [], meterReadings: [], serviceConfigs: [], invoices: [], payments: []
    }));

    await page.goto('/backup');

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('#btnSelectFile').click()
    ]);
    await fileChooser.setFiles(validBackupPath);

    await page.locator('#btnCheckData').click();

    // Chọn phương thức Ghi đè (Overwrite)
    await page.locator('#modeOverwrite').check();
    await page.locator('#btnImportSubmit').click();

    // Kiểm tra hiển thị Modal cảnh báo nguy hiểm
    const dangerModal = page.locator('[data-testid="danger-confirm-modal"]');
    await expect(dangerModal).toBeVisible();

    // Hủy bỏ thao tác ghi đè
    await dangerModal.locator('button:has-text("Hủy bỏ")').click();
    await expect(dangerModal).toBeHidden();

    // Clean up file
    if (fs.existsSync(validBackupPath)) {
      fs.unlinkSync(validBackupPath);
    }
  });
});
