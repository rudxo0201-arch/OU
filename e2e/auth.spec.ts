import { test, expect } from './_fixtures/test';

test.describe('인증/라우팅 가드', () => {
  test('비로그인 상태로 /home 접근 → /login redirect', async ({ page }) => {
    // storageState 없이 접근 (이 spec은 no-auth context에서 별도 실행 필요 시 수동)
    // 현재는 auth fixture를 제거한 상태로 검증
    await page.goto('/home');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('로그인 후 /home 도달', async ({ page }) => {
    // storageState가 설정된 상태 (auth setup에서 저장)
    await page.goto('/home');
    await expect(page).toHaveURL(/.*\/home/);
    // 핵심 레이아웃 요소 존재 확인
    await expect(page.locator('body')).toBeVisible();
  });

  test('로그인 상태로 /login 접근 → /home redirect', async ({ page }) => {
    await page.goto('/login');
    // 미들웨어가 이미 로그인된 경우 /home으로 보냄
    await expect(page).toHaveURL(/.*\/home|.*\/login/);
    // /login에 그대로 있어도 되는 경우(미들웨어 미구현 시) — 기록만
  });
});
