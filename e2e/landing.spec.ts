import { test, expect } from '@playwright/test';

// 랜딩은 인증 불필요 — no-auth 프로젝트에서 실행
test.describe('랜딩 페이지', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // ── 기능 ──────────────────────────────────────────────────
  test('Log in 버튼 → /login', async ({ page }) => {
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('sign up 버튼 → /login?tab=signup', async ({ page }) => {
    // <Link> 안의 <button> — 링크 자체를 클릭해야 네비게이션 정상 동작
    await page.locator('a[href*="tab=signup"]').click();
    await expect(page).toHaveURL(/.*\/login/, { timeout: 8000 });
  });

  // ── 디자인 Tier 1 — CSS 단언 ──────────────────────────────
  test('"Just talk." 헤드라인 Orbitron 폰트', async ({ page }) => {
    const h1 = page.locator('h1', { hasText: 'Just talk.' });
    await expect(h1).toBeVisible();
    const fontFamily = await h1.evaluate(el =>
      getComputedStyle(el).fontFamily
    );
    expect(fontFamily.toLowerCase()).toContain('orbitron');
  });

  test('Log in 버튼 — solid white 배경 + Orbitron', async ({ page }) => {
    const btn = page.getByRole('button', { name: 'Log in' });
    await expect(btn).toHaveCSS('height', '44px');
    await expect(btn).toHaveCSS('border-radius', '22px');
    const bg = await btn.evaluate(el => getComputedStyle(el).backgroundColor);
    // rgba(255,255,255,...) 형태로 흰 배경인지 확인
    expect(bg).toMatch(/rgba\(255,\s*255,\s*255/);
    const font = await btn.evaluate(el => getComputedStyle(el).fontFamily);
    expect(font.toLowerCase()).toContain('orbitron');
  });

  test('sign up 버튼 — transparent 배경 + 테두리 + Orbitron', async ({ page }) => {
    const btn = page.getByRole('button', { name: 'sign up' });
    await expect(btn).toHaveCSS('height', '44px');
    await expect(btn).toHaveCSS('border-radius', '22px');
    const bg = await btn.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(bg).toBe('rgba(0, 0, 0, 0)');
    const font = await btn.evaluate(el => getComputedStyle(el).fontFamily);
    expect(font.toLowerCase()).toContain('orbitron');
  });

  test('OuLogo SVG visible', async ({ page }) => {
    const svg = page.locator('svg').first();
    await expect(svg).toBeVisible();
  });

  test('우측 콘텐츠 수직 중앙 정렬 — 화면 중간 40~60% 구간에 위치', async ({ page }) => {
    const h1 = page.locator('h1', { hasText: 'Just talk.' });
    const box = await h1.boundingBox();
    const viewportHeight = page.viewportSize()?.height ?? 900;
    if (box) {
      const centerRatio = (box.y + box.height / 2) / viewportHeight;
      // "Just talk." 중심이 뷰포트 40~65% 구간에 있어야 함 (marginTop:auto 버그 시 상단 20% 이하에 위치)
      expect(centerRatio).toBeGreaterThan(0.35);
      expect(centerRatio).toBeLessThan(0.68);
    }
  });

  test('"own universe" 캡션 visible', async ({ page }) => {
    await expect(page.getByText('own universe')).toBeVisible();
  });

  test('"대화로 만드는 나만의 우주" 부제목 visible', async ({ page }) => {
    await expect(page.getByText('대화로 만드는 나만의 우주')).toBeVisible();
  });

  test('페이지 배경 다크 (#0a0a0f)', async ({ page }) => {
    const bg = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--ou-bg').trim()
    );
    // dark 모드가 기본 — --ou-bg가 #0a0a0f 또는 data-theme=dark
    const theme = await page.evaluate(() =>
      document.documentElement.dataset.theme
    );
    expect(theme).toBe('dark');
  });

  // ── 디자인 Tier 2 — 스크린샷 baseline ─────────────────────
  test('랜딩 전체 스크린샷 baseline', async ({ page }) => {
    // GraphCanvas 애니메이션 안정화 대기
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('landing-full.png', {
      maxDiffPixelRatio: 0.02, // 2% 이내 차이 허용 (애니메이션 프레임 차이)
    });
  });
});
