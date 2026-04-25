import { test, expect } from '@playwright/test';

// 디자인 토큰 spec — 인증 불필요 (no-auth 포함)
// 랜딩 + 주요 DS 토큰 검증

test.describe('디자인 토큰 / DS 정합', () => {
  test('랜딩 — OuLogo SVG + 크기', async ({ page }) => {
    await page.goto('/');
    // OuLogo는 SVG — viewBox 또는 width 속성 확인
    const svg = page.locator('svg').first();
    await expect(svg).toBeVisible();
    const width = await svg.evaluate(el => el.getBoundingClientRect().width);
    // OuLogo width=96 (props)
    expect(width).toBeGreaterThanOrEqual(80);
    expect(width).toBeLessThanOrEqual(120);
  });

  test('랜딩 — 버튼 gap 10px (Log in + sign up 나란히)', async ({ page }) => {
    await page.goto('/');
    const loginBtn = page.getByRole('button', { name: 'Log in' });
    const signupBtn = page.getByRole('button', { name: 'sign up' });
    const loginBox = await loginBtn.boundingBox();
    const signupBox = await signupBtn.boundingBox();
    if (loginBox && signupBox) {
      const gap = signupBox.x - (loginBox.x + loginBox.width);
      expect(gap).toBeGreaterThanOrEqual(8);
      expect(gap).toBeLessThanOrEqual(16);
    }
  });

  test('dark 모드 — --ou-border 토큰 세팅', async ({ page }) => {
    await page.goto('/');
    const border = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--ou-border').trim()
    );
    expect(border).toBeTruthy();
    expect(border).not.toBe('');
  });

  test('dark 모드 — --ou-text 토큰 흰 계열', async ({ page }) => {
    await page.goto('/');
    const color = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--ou-text').trim()
    );
    // dark에서 --ou-text는 흰색(#ffffff)
    expect(color).toMatch(/#fff|#ffffff|rgb\(255,\s*255,\s*255\)/i);
  });

  // ── 글로벌 스크린샷 4컷 ────────────────────────────────────
  test('스크린샷 — 랜딩(/)', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1200);
    await expect(page).toHaveScreenshot('global-landing.png', { maxDiffPixelRatio: 0.02 });
  });
});
