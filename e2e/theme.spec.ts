import { test, expect } from './_fixtures/test';

test.describe('테마/다크모드', () => {
  test('기본 테마 dark (FOUC 없음)', async ({ page }) => {
    // DOMContentLoaded 직후 이미 data-theme=dark여야 함 (head 인라인 스크립트)
    await page.goto('/home');
    const theme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(theme).toBe('dark');
  });

  test('dark 모드 CSS 변수 -- --ou-bg가 #0a0a0f 계열', async ({ page }) => {
    await page.goto('/home');
    const bg = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--ou-bg').trim()
    );
    expect(bg).toMatch(/#0a0a0f|rgb\(10,\s*10,\s*15\)/);
  });

  test('테마 라우트 간 유지 (/home → /orb/task → /home)', async ({ page }) => {
    await page.goto('/home');
    await page.goto('/orb/task');
    await page.goto('/home');
    const theme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(theme).toBe('dark');
  });

  test('새로고침 후 테마 유지', async ({ page }) => {
    await page.goto('/home');
    await page.reload();
    const theme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(theme).toBe('dark');
  });

  test('/orb/* 페이지도 dark 일관성', async ({ page }) => {
    await page.goto('/orb/task');
    const theme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(theme).toBe('dark');
  });
});
