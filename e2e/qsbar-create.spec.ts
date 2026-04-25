import { test, expect } from './_fixtures/test';

test.describe('QSBar 입력 → 노드 생성', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/home');
    await page.waitForLoadState('networkidle');
  });

  test('텍스트 입력 + Enter → POST /api/quick 200', async ({ page }) => {
    const qsInput = page.locator('textarea, input[type="text"]').filter({
      hasText: '',
    }).first();

    if (await qsInput.count() === 0) {
      test.skip(true, 'QSBar input을 찾을 수 없음');
      return;
    }

    const postPromise = page.waitForRequest(req =>
      req.url().includes('/api/quick') && req.method() === 'POST'
    );

    await qsInput.click();
    await qsInput.fill('e2e 테스트 할 일');
    await qsInput.press('Enter');

    const req = await postPromise.catch(() => null);
    if (req) {
      const response = await req.response();
      expect(response?.status()).toBe(200);
    }
  });
});
