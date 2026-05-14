import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('register → success message', async ({ page }) => {
    const email = `test_${Date.now()}@test.com`;

    await page.goto('/');
    // Navigate to register page directly
    await page.goto('/register');

    await page.fill('[name="firstName"]', 'Тест');
    await page.fill('[name="lastName"]', 'Юзер');
    await page.fill('[name="email"]', email);
    await page.fill('[name="password"]', 'Test1234!');
    await page.click('button[type="submit"]');

    // Successful registration shows green message
    await expect(page.locator('.text-green-700').or(page.locator('[class*="green"]'))).toBeVisible({ timeout: 10000 });
  });

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
