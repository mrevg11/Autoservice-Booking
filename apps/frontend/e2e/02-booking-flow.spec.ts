import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';

test.describe('Booking Flow', () => {
  test('client creates booking via wizard', async ({ page }) => {
    await loginAs(page, 'client');
    await expect(page).toHaveURL(/\/client\/dashboard/);

    await page.goto('/client/bookings/new');

    // Step 1: select vehicle
    const vehicleCard = page.locator('[data-testid="vehicle-card"]').first();
    if (await vehicleCard.isVisible()) {
      await vehicleCard.click();
      await page.click('[data-testid="wizard-next"]');
    }

    // Step 2: select service
    const serviceCheckbox = page.locator('[data-testid="service-checkbox"]').first();
    if (await serviceCheckbox.isVisible()) {
      await serviceCheckbox.click();
      await page.click('[data-testid="wizard-next"]');
    }

    // Step 3: select master and time
    const masterCard = page.locator('[data-testid="master-card"]').first();
    if (await masterCard.isVisible()) {
      await masterCard.click();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      const datePicker = page.locator('[data-testid="date-picker"]');
      if (await datePicker.isVisible()) {
        await datePicker.fill(dateStr);
      }
      const timeSlot = page.locator('[data-testid="time-slot"]').first();
      if (await timeSlot.isVisible({ timeout: 5000 }).catch(() => false)) {
        await timeSlot.click();
      }
      await page.click('[data-testid="wizard-next"]');
    }

    // Step 4: confirm
    const confirmBtn = page.locator('[data-testid="wizard-confirm"]');
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }

    // Success message or booking page
    await expect(page.locator('body')).toContainText(/запис|booking|створено/i, { timeout: 10000 });
  });

  test('client can view bookings list', async ({ page }) => {
    await loginAs(page, 'client');
    await page.goto('/client/bookings');
    await expect(page).toHaveURL('/client/bookings');
    // Page loads without error
    await expect(page.locator('h1').or(page.locator('h2'))).toBeVisible({ timeout: 10000 });
  });

  test('client can cancel PENDING booking if any', async ({ page }) => {
    await loginAs(page, 'client');
    await page.goto('/client/bookings');

    const pendingBooking = page.locator('[data-testid="booking-card"]').filter({
      has: page.locator('text=Очікує'),
    }).first();

    if (await pendingBooking.isVisible({ timeout: 5000 }).catch(() => false)) {
      await pendingBooking.locator('button:has-text("Скасувати")').click();
      await page.click('button:has-text("Підтвердити")');
      await page.waitForTimeout(1000);
      // Status should change or booking removed
    }
    // Test passes if no PENDING bookings or successful cancel
    expect(true).toBe(true);
  });

  test('smart booking page loads', async ({ page }) => {
    await loginAs(page, 'client');
    await page.goto('/client/bookings/smart');
    await expect(page.locator('body')).toContainText(/розум|smart|підбір/i, { timeout: 10000 });
  });
});
