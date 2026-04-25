import { test, expect } from './_fixtures/test';

const PHASE1_ORBS = [
  { slug: 'schedule', label: '일정', expectUrl: /\/orb\/schedule/ },
  { slug: 'task',     label: '할 일', expectUrl: /\/orb\/task/ },
  { slug: 'habit',    label: '습관', expectUrl: /\/orb\/habit/ },
  { slug: 'journal',  label: '일기', expectUrl: /\/orb\/journal/ },
  { slug: 'settings', label: '설정', expectUrl: /\/settings/ }, // STANDALONE → /settings
] as const;

test.describe('Orb 라우트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/home');
  });

  for (const orb of PHASE1_ORBS) {
    test(`/orb/${orb.slug} → 의도한 화면 도달`, async ({ page }) => {
      // RightOrbBar 링크 클릭
      await page.locator(`a[href="/orb/${orb.slug}"]`).click();
      await expect(page).toHaveURL(orb.expectUrl, { timeout: 8000 });
    });
  }

  test('/orb/foobar (registry miss) → /home redirect', async ({ page }) => {
    await page.goto('/orb/foobar');
    await expect(page).toHaveURL(/.*\/home/, { timeout: 5000 });
  });

  test('active Orb 아이콘 — 현재 경로에 border 표시', async ({ page }) => {
    await page.goto('/orb/task');
    await page.waitForURL(/\/orb\/task/);
    // RightOrbBar의 task 링크 div가 border 갖는지
    const taskLink = page.locator('a[href="/orb/task"] div').first();
    const border = await taskLink.evaluate(el =>
      getComputedStyle(el).border || getComputedStyle(el).borderWidth
    );
    expect(border).not.toBe('0px');
  });

  // ── 디자인 Tier 2 — 스크린샷 ─────────────────────────────
  test('/orb/schedule 스크린샷 baseline', async ({ page }) => {
    await page.goto('/orb/schedule');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('orb-schedule.png', {
      maxDiffPixelRatio: 0.03,
    });
  });
});
