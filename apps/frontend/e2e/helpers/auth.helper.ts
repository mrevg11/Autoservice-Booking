import { Page } from '@playwright/test';

export async function loginAs(page: Page, role: 'client' | 'master' | 'admin') {
  const credentials = {
    client: { email: 'client@demo.com', password: 'DemoPass123!' },
    master: { email: 'master@demo.com', password: 'DemoPass123!' },
    admin:  { email: 'admin@demo.com',  password: 'DemoPass123!' },
  };
  const { email, password } = credentials[role];

  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL(/\/(client|master|admin)\/dashboard/, { timeout: 15000 });
}
