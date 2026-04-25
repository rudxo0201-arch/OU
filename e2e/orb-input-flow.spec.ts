/**
 * Phase 1 도메인 4개 — 입력→저장→뷰 표시 generic spec
 *
 * ORB_REGISTRY를 순회하므로 신규 도메인 추가 시 spec 수정 불필요.
 * DOMAIN_SEEDS에 도메인명: 시드 텍스트만 1줄 추가하면 자동 커버됨.
 */

import { test, expect } from './_fixtures/test';
import { ORB_REGISTRY } from '../src/components/orb/registry';

// 도메인 분류기가 정확히 잡힐 만한 자연어 시드 — 신규 도메인 추가 시 이 맵에 1줄 추가
const DOMAIN_SEEDS: Record<string, string> = {
  schedule: '내일 오후 3시 회의',
  task:     '리포트 작성 마감 금요일',
  habit:    '아침 7시 스트레칭',
  journal:  '오늘 컨디션 좋았다',
};

const DOMAIN_ORBS = Object.values(ORB_REGISTRY).filter(
  (o): o is typeof o & { domain: string } =>
    !!o.domain && o.slug in DOMAIN_SEEDS,
);

test.describe('Orb 도메인별 입력→저장→뷰 표시', () => {
  for (const orb of DOMAIN_ORBS) {
    const seed = DOMAIN_SEEDS[orb.slug];

    test(`/orb/${orb.slug} — 입력 → /api/quick 200 → 뷰 표시`, async ({ page }) => {
      await page.goto(`/orb/${orb.slug}`);
      await page.waitForLoadState('networkidle');

      // placeholder로 OrbInputBar input을 정확히 특정
      const input = orb.placeholder
        ? page.getByPlaceholder(orb.placeholder)
        : page.locator('input').first();

      await expect(input).toBeVisible({ timeout: 5000 });

      // /api/quick POST 응답 가로채기
      const postPromise = page.waitForResponse(res =>
        res.url().includes('/api/quick') && res.request().method() === 'POST',
      );

      await input.click();
      await input.fill(seed);
      await input.press('Enter');

      // 1단계: API 저장 확인
      const res = await postPromise;
      expect(res.status()).toBe(200);

      const body = await res.json().catch(() => ({}));
      expect(body.ok).toBe(true);

      // 2단계: 뷰에 새 항목 표시 확인 — ou-node-created 이벤트 → fetchNodes 재실행 → 렌더
      await expect(page.getByText(seed, { exact: false })).toBeVisible({
        timeout: 10000,
      });
    });
  }
});
