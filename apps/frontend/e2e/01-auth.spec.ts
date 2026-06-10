import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('login as client → redirect to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'client@demo.com');
    await page.fill('[data-testid="password-input"]', 'DemoPass123!');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/\/client\/dashboard/, { timeout: 15000 });
  });

  test('wrong password → stays on login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'client@demo.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL('/login');
  });

  test('protected route redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/client/dashboard');
    await expect(page).toHaveURL('/login', { timeout: 5000 });
  });

  test('wrong role redirects to unauthorized', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'master@demo.com');
    await page.fill('[data-testid="password-input"]', 'DemoPass123!');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/\/master\/dashboard/, { timeout: 15000 });

    await page.goto('/client/dashboard');
    await expect(page).toHaveURL('/unauthorized', { timeout: 5000 });
  });
});
