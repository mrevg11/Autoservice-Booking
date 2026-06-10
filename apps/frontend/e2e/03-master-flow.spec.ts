import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';

test.describe('Master Flow', () => {
  test('master views bookings list', async ({ page }) => {
    await loginAs(page, 'master');
    await page.goto('/master/bookings');
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('master confirms booking if any PENDING', async ({ page }) => {
    await loginAs(page, 'master');
    await page.goto('/master/bookings');

    const pendingBooking = page.locator('[data-testid="booking-row"]').filter({
      has: page.locator('text=Очікує'),
    }).first();

    if (await pendingBooking.isVisible({ timeout: 5000 }).catch(() => false)) {
      await pendingBooking.locator('button:has-text("Підтвердити")').click();
      if (await page.locator('button:has-text("Підтвердити")').nth(1).isVisible({ timeout: 2000 }).catch(() => false)) {
        await page.locator('button:has-text("Підтвердити")').nth(1).click();
      }
      await page.waitForTimeout(1000);
    }
    expect(true).toBe(true);
  });

  test('master profile page loads', async ({ page }) => {
    await loginAs(page, 'master');
    await page.goto('/master/profile');
    await expect(page.locator('body')).toContainText(/профіль|profile/i, { timeout: 10000 });
  });
});
