import { test as base, expect } from '@playwright/test';

export { expect };

// 인증 필요 spec에서 TEST_EMAIL 미설정 시 자동 skip하는 fixture
export const test = base.extend({
  page: async ({ page }, use) => {
    if (!process.env.TEST_EMAIL) {
      test.skip(true, 'TEST_EMAIL 미설정 — .env.local에 TEST_EMAIL/TEST_PASSWORD 추가 후 실행');
    }
    await use(page);
  },
});
