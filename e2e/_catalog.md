# e2e Spec 카탈로그

ou-verifier가 git diff → spec 매핑에 사용하는 파일.
새 기능 추가 시 이 파일과 해당 spec 파일에 함께 등록.

## 매핑 테이블

| 변경 파일 패턴 | 검증 항목 | spec 파일 | 상태 |
|---|---|---|---|
| `(public)/page.tsx` | 랜딩 렌더링, 버튼 클릭 → /login, 버튼 크기/색 | `landing.spec.ts` | 🟢 |
| `GraphCanvas.tsx` | 구(sphere) 캔버스 존재, 렌더링 | `landing.spec.ts` | 🟢 |
| `OuLogo*` | 로고 SVG 렌더링, 색상 | `landing.spec.ts`, `design-tokens.spec.ts` | 🟢 |
| `(private)/layout.tsx` | 홈 레이아웃 요소, StarField, 사이드바 | `home-default.spec.ts` | 🟢 |
| `LeftIconBar*`, `RightOrbBar*`, `TopNavBar*` | 사이드바 아이콘 클릭, 네비게이션 | `home-default.spec.ts` | 🟢 |
| `(apps)/layout.tsx` | Orb 라우트 인증 gate | `orb-routes.spec.ts` | 🟢 |
| `(apps)/orb/[slug]/page.tsx` | Orb 슬러그 렌더링, 인증 redirect | `orb-routes.spec.ts` | 🟢 |
| `(apps)/orb/[slug]/OrbPageClient.tsx` | Orb 콘텐츠 렌더링 | `orb-routes.spec.ts` | 🟢 |
| `(apps)/orb/loading.tsx` | Orb 스켈레톤 순간 표시 | `orb-routes.spec.ts` | 🔴 spec 없음 |
| `OrbView.tsx` | 데이터 렌더링, realtime 구독 | `orb-routes.spec.ts` | 🟡 인증 필요 |
| `OrbShell.tsx` | 헤더(뒤로가기/닫기) 버튼, 타이틀 | `orb-routes.spec.ts` | 🟢 |
| `orb/registry.ts` | 각 슬러그 등록 확인 | `orb-routes.spec.ts` | 🟢 |
| `views/registry.ts` | 뷰 컴포넌트 렌더링 (ssr 포함) | `orb-routes.spec.ts` | 🟡 인증 필요 |
| `TodayScheduleWidget*` | 위젯 클릭 → /orb/schedule, prefetch | `home-default.spec.ts` | 🟡 인증 필요 |
| `TaskWidget*` | 위젯 클릭 → /orb/task, prefetch | `widget-task-toggle.spec.ts` | 🟢 |
| `HabitWidget*`, `NoteWidget*`, `IdeaWidget*` | 위젯 클릭 → 해당 Orb | `home-default.spec.ts` | 🟡 인증 필요 |
| `OuViewWidget*` | 입력 → /orb/deep-talk | `home-default.spec.ts` | 🟡 인증 필요 |
| `QSBar*`, `OrbInputBar*` | 메시지 입력, 전송, 응답 | `qsbar-create.spec.ts` | 🟡 인증 필요 |
| `api/nodes/route.ts` | GET /api/nodes 200, 인증 없으면 401 | `api-health.spec.ts` | 🟢 |
| `api/quick/route.ts` | POST /api/quick 응답 | `api-health.spec.ts` | 🟢 |
| `api/graph/route.ts` | GET /api/graph 응답 | `api-health.spec.ts`, `graph-view.spec.ts` | 🟢 |
| `middleware.ts` | /orb/* → /login (비인증), /home (인증) | `auth.spec.ts` | 🟢 |
| `globals.css` | CSS 토큰 적용, 테마 변수 | `design-tokens.spec.ts`, `theme.spec.ts` | 🟢 |
| `OuButton*`, `OuCard*`, `OuInput*`, `OuToggle*` | DS 컴포넌트 스타일 단언 | `design-tokens.spec.ts` | 🟢 |
| `themeStore*` | 다크/라이트 토글, CSS 변수 | `theme.spec.ts` | 🟢 |
| `KnowledgeGraph*`, `GraphCanvas*` | 그래프 노드 렌더링 | `graph-view.spec.ts` | 🟡 인증 필요 |

## 상태 범례

- 🟢 spec 있음, 자동 검증 가능
- 🟡 spec 있으나 인증(`TEST_EMAIL`) 필요 — `.env.local`에 설정 시 활성화
- 🔴 spec 없음 — 사용자 시각 확인 + 다음 세션에 spec 추가 권장

## spec 추가 가이드

1. 이 파일에 행 추가 (상태 🔴로 시작)
2. 해당 `e2e/*.spec.ts`에 `test()` 블록 추가
3. `pnpm exec playwright test e2e/<spec>.spec.ts` 실행해 fail 먼저 확인
4. 코드 수정 후 통과 확인
5. 이 파일 상태를 🟢로 변경
