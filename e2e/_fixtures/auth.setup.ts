import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../.auth/user.json');

setup('authenticate', async ({ page }) => {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;

  if (!email || !password) {
    console.warn('⚠ TEST_EMAIL/TEST_PASSWORD 미설정 — 인증 필요 spec은 skip됩니다.');
    // 빈 storageState 저장 (인증 spec은 각자 guard로 skip)
    await page.context().storageState({ path: authFile });
    return;
  }

  await page.goto('/login');
  await page.getByLabel(/이메일|email/i).fill(email);
  await page.getByLabel(/비밀번호|password/i).fill(password);
  await page.getByRole('button', { name: /로그인|log in|sign in/i }).click();
  await page.waitForURL('**/home', { timeout: 15000 });
  await expect(page).toHaveURL(/.*\/home/);

  await page.context().storageState({ path: authFile });
});
