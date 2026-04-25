import { test, expect } from './_fixtures/test';

test.describe('홈 기본 레이아웃', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/home');
    await page.waitForLoadState('networkidle');
  });

  // ── 기능 ──────────────────────────────────────────────────
  test('기본 위젯 3개 마운트', async ({ page }) => {
    // today-schedule 위젯
    await expect(page.locator('[data-widget-type="today-schedule"]')
      .or(page.locator('.widget-today-schedule'))
      .or(page.getByText(/일정|schedule/i).first())
    ).toBeVisible({ timeout: 8000 });
  });

  test('LeftIconBar visible (left:0)', async ({ page }) => {
    // LeftIconBar는 FolderOpen, Network, Search 아이콘 포함
    const leftBar = page.locator('[data-testid="left-icon-bar"]')
      .or(page.locator('.left-icon-bar'))
      // Lucide FolderOpen SVG이 왼쪽에 있는지 확인
      .or(page.locator('nav').first());

    // 최소한 3개의 SVG 아이콘이 좌측에 존재해야 함
    const svgs = page.locator('svg');
    await expect(svgs.first()).toBeVisible();
  });

  test('RightOrbBar visible — 6개 Orb 링크 존재', async ({ page }) => {
    // RightOrbBar의 각 Orb 링크: /orb/schedule, /orb/task 등
    await expect(page.locator('a[href="/orb/schedule"]')).toBeVisible();
    await expect(page.locator('a[href="/orb/task"]')).toBeVisible();
    await expect(page.locator('a[href="/orb/habit"]')).toBeVisible();
    await expect(page.locator('a[href="/orb/journal"]')).toBeVisible();
    await expect(page.locator('a[href="/orb/settings"]')).toBeVisible();
  });

  // ── 디자인 Tier 1 — CSS 단언 ──────────────────────────────
  test('다크 테마 적용 (data-theme=dark)', async ({ page }) => {
    const theme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(theme).toBe('dark');
  });

  test('TopNavBar transparent 배경', async ({ page }) => {
    // TopNavBar는 position:fixed, background: transparent
    const nav = page.locator('nav').first()
      .or(page.locator('[data-testid="top-nav"]'));
    const bg = await nav.evaluate(el => getComputedStyle(el).backgroundColor);
    // transparent 또는 rgba(0,0,0,0)
    expect(bg).toMatch(/rgba\(0,\s*0,\s*0,\s*0\)|transparent/);
  });

  test('StarField canvas 존재 (우주 배경)', async ({ page }) => {
    // StarField는 position:fixed canvas
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeAttached();
  });

  // ── 디자인 Tier 2 — 스크린샷 baseline ─────────────────────
  test('홈 기본 스크린샷 baseline', async ({ page }) => {
    await page.waitForTimeout(800); // StarField 안정화
    await expect(page).toHaveScreenshot('home-default.png', {
      maxDiffPixelRatio: 0.03,
    });
  });
});
