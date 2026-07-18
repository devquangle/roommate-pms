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

  test('should support import/export lifecycle: export -> delete -> import merge -> error state -> overwrite cancel', async ({ page }) => {
    // 1. Tạo một số dữ liệu ban đầu
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

    // 2. Export file JSON & 3. Kiểm tra có download
    await page.goto('/settings');
    await expect(page.locator('[data-testid="settings-page"]')).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('[data-testid="btn-export-data"]').click()
    ]);

    const downloadPath = path.resolve('tests/e2e/test_backup.json');
    await download.saveAs(downloadPath);

    // 4. Xóa dữ liệu (Clear LocalStorage)
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Kiểm tra dữ liệu đã bị xóa (phòng P905 không còn hiển thị)
    await page.goto('/rooms');
    await page.locator('[data-testid="view-table"]').click();
    await expect(page.locator('[data-testid="room-row-P905"]')).toBeHidden();

    // 5. Import lại file JSON
    await page.goto('/settings');
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('#btnSelectFile').click()
    ]);
    await fileChooser.setFiles(downloadPath);

    // Kiểm tra dữ liệu
    await page.locator('#btnCheckData').click();
    const fileInfo = page.locator('#importFileInfo');
    await expect(fileInfo).toContainText('✅ File dữ liệu hợp lệ');

    // Đánh dấu biến trên window để phát hiện reload
    await page.evaluate(() => { window.__pendingReload = true; });

    // Bắt đầu Import
    await page.locator('#btnImportSubmit').click();

    // Chờ cho thông báo toast thành công xuất hiện (đảm bảo importData đã chạy xong)
    await expect(page.locator('.toast-container')).toContainText('thành công');

    // Chờ trang tự động reload xong (biến __pendingReload biến mất)
    await page.waitForFunction(() => window.__pendingReload === undefined, { timeout: 5000 });

    // 6. Kiểm tra dữ liệu được khôi phục
    await page.goto('/rooms');
    await page.locator('[data-testid="view-table"]').click();
    await page.locator('[data-testid="input-search-room"]').fill('905');
    await expect(page.locator('[data-testid="room-row-P905"]')).toBeVisible();

    // 7. Import file sai định dạng
    const tempInvalidPath = path.resolve('tests/e2e/temp_invalid_backup.json');
    fs.writeFileSync(tempInvalidPath, '{"rooms": "invalid_structure"}');

    await page.goto('/settings');
    const [fileChooser2] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('#btnSelectFile').click()
    ]);
    await fileChooser2.setFiles(tempInvalidPath);

    // Bấm kiểm tra
    await page.locator('#btnCheckData').click();

    // 8. Kiểm tra hiển thị lỗi
    await expect(page.locator('[data-testid="error-state-invalid-import"]')).toBeVisible();

    // Dọn dẹp file tạm
    if (fs.existsSync(tempInvalidPath)) {
      fs.unlinkSync(tempInvalidPath);
    }

    // Nút "Chọn file khác" xuất hiện trong Error State
    await page.locator('#btnErrorActionResetImport').click();

    // 9. Hủy thao tác ghi đè
    // Chọn lại file backup hợp lệ ban đầu
    const [fileChooser3] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('#btnSelectFile').click()
    ]);
    await fileChooser3.setFiles(downloadPath);

    // Bấm kiểm tra
    await page.locator('#btnCheckData').click();
    await expect(fileInfo).toContainText('✅ File dữ liệu hợp lệ');

    // Chọn phương thức ghi đè
    await page.locator('#modeOverwrite').check();
    await page.locator('#btnImportSubmit').click();

    // Kiểm tra hiển thị danger confirm modal
    const dangerModal = page.locator('[data-testid="danger-confirm-modal"]');
    await expect(dangerModal).toBeVisible();

    // Hủy bỏ thao tác
    await dangerModal.locator('button:has-text("Hủy bỏ")').click();
    await expect(dangerModal).toBeHidden();

    // 10. Kiểm tra dữ liệu hiện tại không bị mất
    await page.goto('/rooms');
    await page.locator('[data-testid="view-table"]').click();
    await page.locator('[data-testid="input-search-room"]').fill('905');
    await expect(page.locator('[data-testid="room-row-P905"]')).toBeVisible();

    // Dọn dẹp file backup đã tải về
    if (fs.existsSync(downloadPath)) {
      fs.unlinkSync(downloadPath);
    }
  });
});
