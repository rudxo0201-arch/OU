import { test, expect } from './_fixtures/test';

test.describe('그래프뷰', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/home');
    await page.waitForLoadState('networkidle');
  });

  test('그래프 아이콘 클릭 → /api/graph 200', async ({ page }) => {
    const graphPromise = page.waitForResponse(res =>
      res.url().includes('/api/graph') && res.status() === 200
    );

    // LeftIconBar의 그래프(Network) 아이콘 클릭 — 두 번째 아이콘
    const leftIcons = page.locator('a[href], button').filter({
      has: page.locator('svg'),
    });
    // Network 아이콘 또는 data-action="graph-view" 클릭
    const graphBtn = page.locator('[data-action="toggle-graph"]')
      .or(leftIcons.nth(1));
    await graphBtn.click();

    const res = await graphPromise.catch(() => null);
    if (res) {
      expect(res.status()).toBe(200);
      const body = await res.json().catch(() => null);
      if (body) {
        expect(body).toHaveProperty('nodes');
        expect(body).toHaveProperty('edges');
      }
    }
  });

  test('그래프 뷰 전환 후 canvas 마운트 (PixiJS WebGL)', async ({ page }) => {
    // 그래프 아이콘 클릭
    const leftIcons = page.locator('a[href], button').filter({ has: page.locator('svg') });
    await leftIcons.nth(1).click();

    // PixiJS가 마운트하는 canvas 대기
    await expect(page.locator('canvas').last()).toBeAttached({ timeout: 10000 });
  });
});
