# OU E2E 검증 에이전트

Playwright 기반. 기능 동선 + 디자인 deterministic 영역(CSS + 스크린샷) 자동 검증.

## 빠른 시작

```bash
# 1. 테스트 계정 설정 (.env.local)
TEST_EMAIL=test@ouuniverse.com
TEST_PASSWORD=your-test-password

# 2. 전체 검증 (빌드 + E2E)
pnpm verify

# 3. E2E만
pnpm test:e2e

# 4. 스크린샷 baseline 첫 생성 / 갱신 (의도적 디자인 변경 후)
pnpm test:e2e:update

# 5. 결과 HTML 리포트
pnpm test:e2e:report

# 6. 인터랙티브 UI 모드
pnpm test:e2e:ui
```

## 사용자 개입 시점

| 시점 | 할 일 |
|---|---|
| 최초 셋업 | `pnpm test:e2e:update` → PNG 확인 → git commit |
| 의도적 디자인 변경 후 | `pnpm test:e2e:update` → 새 PNG 확인 → git commit |
| 스크린샷 diff fail | 에이전트가 "의도된 변경인가요?" 질문 → OK면 update |
| 새 기능 추가 | 아래 "새 검증 단위 추가" 프로세스 따르기 |

## 새 검증 단위 추가 방법 (버그 발견 → 회귀 방지)

```
1. 사용자가 시각 확인 중 버그 발견 ("X 클릭하면 Y가 안 나옴")
2. _catalog.md에 단위 추가 (입력/기대/실패증상). 상태 🔴
3. 해당 영역 spec 파일에 test() 블록 추가
4. pnpm test:e2e 로 실패 확인 (실제로 버그 잡는지)
5. Claude가 코드 수정
6. pnpm test:e2e 통과 확인. catalog 상태 🟢로 변경
7. git commit "test: catch <버그 증상>"
```

이 7단계가 매 버그마다 회귀 테스트로 누적된다.

## 파일 구조

```
e2e/
├── _fixtures/
│   ├── auth.setup.ts     — 인증 storageState 생성 (setup 프로젝트)
│   └── test.ts           — 인증 필요 spec용 base fixture
├── __screenshots__/      — 스크린샷 baseline PNG (git 포함)
├── .auth/                — storageState JSON (git 제외)
├── .results/             — 테스트 결과물 (git 제외)
├── .report/              — HTML 리포트 (git 제외)
├── _catalog.md           — 검증 단위 카탈로그 (Knowledge base)
├── landing.spec.ts       — 랜딩 기능 + 디자인
├── auth.spec.ts          — 인증/라우팅 가드
├── home-default.spec.ts  — 홈 레이아웃
├── orb-routes.spec.ts    — Orb 라우트 6개
├── widget-task-toggle.spec.ts — TaskWidget 토글
├── qsbar-create.spec.ts  — QSBar 입력
├── graph-view.spec.ts    — 그래프뷰
├── theme.spec.ts         — 테마 일관성
├── api-health.spec.ts    — API shape 검증
└── design-tokens.spec.ts — DS 토큰 + 글로벌 스크린샷
```
