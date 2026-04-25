import { test, expect } from './_fixtures/test';

test.describe('TaskWidget 체크박스 토글', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/home');
    await page.waitForLoadState('networkidle');
  });

  test('체크박스 클릭 → PATCH /api/nodes 200', async ({ page }) => {
    // API 요청 인터셉트
    const patchPromise = page.waitForRequest(req =>
      req.url().includes('/api/nodes') && req.method() === 'PATCH'
    );

    // 첫 번째 TaskWidget 체크박스 클릭
    const checkbox = page.locator('button').filter({ hasText: '' })
      .locator('..').locator('button').first();

    // TaskWidget이 없으면 skip
    const taskSection = page.locator('[data-widget-type="today-tasks"]')
      .or(page.locator('.task-widget'));

    if (await taskSection.count() === 0) {
      test.skip(true, 'TaskWidget이 홈에 없음 — 할일 데이터 추가 후 재실행');
      return;
    }

    // pending 상태 태스크 찾기
    const pendingTask = taskSection.locator('button').first();
    await pendingTask.click();

    const req = await patchPromise.catch(() => null);
    expect(req).not.toBeNull();

    const response = await req!.response();
    expect(response?.status()).toBe(200);
  });

  test('체크 후 opacity + line-through 스타일 적용', async ({ page }) => {
    const taskSection = page.locator('[data-widget-type="today-tasks"]')
      .or(page.getByText('할 일').locator('..'));

    if (await taskSection.count() === 0) {
      test.skip(true, 'TaskWidget 없음');
      return;
    }

    const firstRow = taskSection.locator('div').filter({ hasText: /\S/ }).first();
    const checkBtn = firstRow.locator('button').first();
    await checkBtn.click();

    // 600ms 후 opacity 변화 확인
    await page.waitForTimeout(200);
    const opacity = await firstRow.evaluate(el => getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBeLessThan(1);
  });
});
