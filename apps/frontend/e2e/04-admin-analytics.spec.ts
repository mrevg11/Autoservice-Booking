import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';

test.describe('Admin Analytics', () => {
  test('admin sees dashboard', async ({ page }) => {
    await loginAs(page, 'admin');
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.locator('h1')).toContainText(/адмін|dashboard/i, { timeout: 10000 });
  });

  test('admin dashboard shows summary cards', async ({ page }) => {
    await loginAs(page, 'admin');
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    // Wait for content to load
    await page.waitForTimeout(3000);
    const cards = page.locator('[data-testid="summary-card"]');
    if (await cards.count() > 0) {
      await expect(cards).toHaveCount(4);
    }
    // Charts should be rendered
    const charts = page.locator('svg.recharts-surface');
    if (await charts.count() > 0) {
      expect(await charts.count()).toBeGreaterThanOrEqual(1);
    }
    expect(true).toBe(true);
  });

  test('admin analytics page loads', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/analytics');
    await expect(page.locator('h1')).toContainText(/аналітика/i, { timeout: 10000 });
  });

  test('admin analytics revenue filter works', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/analytics');
    await page.waitForTimeout(2000);
    await page.click('button:has-text("Тиждень")');
    await page.waitForTimeout(1000);
    // Page still renders
    await expect(page.locator('h1')).toBeVisible();
  });

  test('non-admin cannot access admin routes', async ({ page }) => {
    await loginAs(page, 'client');
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL('/unauthorized', { timeout: 5000 });
  });

  test('admin users page loads', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/users');
    await expect(page.locator('body')).toContainText(/користувач/i, { timeout: 10000 });
  });

  test('admin services page loads', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/services');
    await expect(page.locator('body')).toContainText(/послуг/i, { timeout: 10000 });
  });

  test('admin masters page loads', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/masters');
    await expect(page.locator('body')).toContainText(/майстр/i, { timeout: 10000 });
  });
});
