import { test, expect } from '@playwright/test';

test.describe('RoomMate Routing & Navigation E2E', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should redirect root / to /dashboard and render dashboard page', async ({ page }) => {
    await page.goto('/');
    
    // Check URL redirection
    await expect(page).toHaveURL(/\/dashboard$/);
    
    // Check Header Title
    const headerTitle = page.locator('[data-testid="header-title"]');
    await expect(headerTitle).toHaveText('Dashboard');
    
    // Check Page Content
    const pageContent = page.locator('[data-testid="dashboard-page"]');
    await expect(pageContent).toBeVisible();
    await expect(pageContent.locator('h4').first()).toHaveText(/Tổng quan hệ thống/);
  });

  test('should navigate to rooms page when clicking rooms menu item', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Click Rooms menu
    await page.locator('[data-testid="menu-rooms"]').click();
    
    // Check URL
    await expect(page).toHaveURL(/\/rooms$/);
    
    // Check Header Title
    await expect(page.locator('[data-testid="header-title"]')).toHaveText('Quản lý phòng');
    
    // Check Page Content
    const roomsPage = page.locator('[data-testid="rooms-page"]');
    await expect(roomsPage).toBeVisible();
    await expect(roomsPage.locator('h4').first()).toHaveText('Quản lý phòng trọ');
  });

  test('should navigate to tenants page when clicking tenants menu item', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Click Tenants menu
    await page.locator('[data-testid="menu-tenants"]').click();
    
    // Check URL
    await expect(page).toHaveURL(/\/tenants$/);
    
    // Check Header Title
    await expect(page.locator('[data-testid="header-title"]')).toHaveText('Người thuê');
  });

  test('should render 404 page for unknown routes and redirect to dashboard', async ({ page }) => {
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
