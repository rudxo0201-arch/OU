# FRONTEND_DESIGN.md — OU 프론트엔드 설계

> Claude Code가 UI 작업 시 항상 읽는 파일.
> 기존 design-system/ 자산 위에 Phase 1 OU-Chat 기준으로 작성.

---

## 디자인 시스템 자산 위치

```
ou-web/src/design-system/          ← 스타일 토큰 (그대로 사용)
  style/
    colors.md      → 색상 (B&W 팔레트, 시맨틱 컬러)
    typography.md  → Pretendard, 타입 스케일
    spacing.md     → 8-Point Grid, 브레이크포인트
    shape.md       → Radius 5단계, 보더 0.5px
    icons.md       → Phosphor Icons, Light/Fill 규칙
  principles.md   → 7가지 원칙 (심미성 최우선)
  accessibility.md → WCAG 2.1 AA

ou-web/src/
  theme.ts        → Mantine 테마 (B&W, Pretendard)
  globals.css     → 다크모드 배경 #060810 (PixiJS 일치)
```

---

## 전역 불변 UI 규칙

```
색상:    흰~흑 계열만. 유채색 배경·테두리 금지.
예외:    별(importance) → var(--mantine-color-yellow-5)
보더:    0.5px solid var(--mantine-color-default-border)
그림자:  Paper는 shadow none + 0.5px 보더
다크모드 배경: #060810 (PixiJS 캔버스와 완전 일치)
인증 게이트: 비로그인 버튼 disabled 금지 → 클릭 시 /login
```

---

## 레이아웃 구조 (Phase 1)

```
Desktop (≥ 768px):
┌── Sidebar (60px 축소 / 220px 확장) ──┬── Main Content ──────────────┐
│  로고                                 │  PageHeader                   │
│  Chat (아이콘)                        │  Content Area                 │
│  My Universe (아이콘)                 │                               │
│  Accuracy (아이콘)                    │                               │
│  ────────────────                    │                               │
│  Admin (관리자만)                     │                               │
│  Settings                            │                               │
│  다크/라이트 토글                      │                               │
└──────────────────────────────────────┴───────────────────────────────┘

Mobile (< 768px):
┌── Main Content (100%) ──────────────────────────────┐
│  Content Area                                        │
├── Bottom Tab (56px) ─────────────────────────────────┤
│  Chat | My | Accuracy | Settings                    │
└──────────────────────────────────────────────────────┘
```

### Sidebar 아이콘 규칙
```
내 뷰:   흰 아이콘
구독 뷰: 아이콘 + @ 배지 (Phase 2)
공동 뷰: 아이콘 + 👥 배지 (Phase 2)
활성:    Fill weight
비활성:  Light weight + dimmed
```

---

## Phase 1 라우트별 UI 명세

### `/` — 랜딩페이지

```
레이아웃:
  좌: PixiJS 그래프뷰 (50vw, 데모 노드 데이터)
  우: 헤드카피 + CTA
  모바일: 세로 스택 (그래프 50vh 위, 카피 50vh 아래)
  그라데이션: 경계선을 var(--mantine-color-body) 페이드

카피:
  Display: "Just talk."
  Body: "대화하는 족족 데이터가 됩니다."

CTA:
  Primary: "무료로 시작하기" → Google OAuth
  Secondary: "먼저 체험해보기" → /chat (비로그인 5턴 허용)

관련 globals.css 클래스:
  .landing-container .landing-graph .landing-gradient .landing-content
```

### `/chat` — OU-Chat (핵심)

```
레이아웃:
  중앙 컬럼, max-width: 720px, 좌우 마진 auto

상단: TokenGauge
  ├── 단일 게이지 (채팅 + 뷰 생성 통합 표시)
  ├── Free: 제한 있음 / Pro: 넓음
  └── 비로그인: 5턴 카운터 ("N턴 남았어요")

메시지 영역:
  user bubble:      우측 정렬, 흰~회 배경
  assistant bubble: 좌측 정렬, 보더만
  스트리밍:         타이핑 인디케이터 (3-dot)
  중단 버튼:        스트리밍 중 우하단 고정

NodeCreatedBadge (응답 완료 후 bubble 하단):
  "💫 {domain} 노드가 생성됐어요"
  클릭 → /my 해당 노드로 이동
  표시 조건: data_nodes가 생성된 응답에만

ViewRecommendBadge (도메인 임계값 도달 시):
  "📅 일정이 꽤 쌓였네요. 캘린더뷰로 볼까요?"
  [네, 보여줘] [괜찮아]
  → [네] 클릭 시 뷰 인라인 렌더링 → "저장하시겠어요?"

입력 영역 (하단 고정):
  ├── 텍스트 입력 (멀티라인, 최대 6줄)
  ├── 이미지 첨부 버튼 (Gemini Vision OCR)
  └── 전송 버튼 (Enter / Ctrl+Enter 옵션)

SaveNudge (비로그인 전용):
  조건 A: 5턴 도달
    "이 대화가 곧 사라져요. 저장하고 계속 쓰기 →"
    위치: 입력창 상단 sticky
  조건 B: 의미있는 뷰 생성 직후
    "저장하시겠어요? 언제든 다시 볼 수 있어요."
  조건 C: 세션 종료(탭 닫기) 감지
    beforeunload → 모달
    "X개 노드 생성됨. 저장 안 하면 사라져요."
  CTA: [Google로 저장] → OAuth → 대화 이어짐
```

### `/my` — 홈 (로그인)

```
레이아웃:
  상단: 저장된 뷰 목록 (사이드바와 별개로 카드 그리드)
  메인: 개인 그래프뷰 (PixiJS)

그래프뷰:
  노드 = 별 (importance에 따라 크기/밝기)
  엣지 = 중력선 (흰색, opacity 0.2~0.6)
  배경 = #060810 (우주)
  60fps 필수 → d3-force Web Worker

뷰 추천 카드 (그래프 상단):
  "이런 뷰는 어때요?" 슬라이더
  → ViewRecommendBadge 동일 UX

저장된 뷰 그리드:
  카드: 뷰 이름 + 아이콘 + 최근 업데이트
  badge: @ (구독), 👥 (공동편집) (Phase 2)
  클릭 → 뷰 상세 페이지 또는 인라인 렌더링
```

### `/accuracy` — 정확도 높이기

```
패턴: 받은 편지함 모델

목록:
  UNRESOLVED 항목 리스트
  각 항목:
    ├── raw_text ("걔")
    ├── context_snippet (주변 문장)
    └── 객관식 선택지 (표준 노드 목록)
      ex: [민준] [지수] [직접 입력] [건너뜀]

처리 후: 항목 자동 삭제 (체크 애니메이션)
전부 처리: 빈 상태 + "완벽해요! 우주가 더 정교해졌어요 🌟"
```

### `/admin` — 관리자 패널

```
탭 구조:
  [대시보드] [DataNode 관리] [신뢰도 큐] [비용 모니터링]

대시보드:
  카드: DAU / DataNode 수 / UNRESOLVED 비율 / API 비용 (오늘)

DataNode 관리:
  테이블 + 필터 (domain / confidence / resolution)
  항목 클릭 → Edit 모달

신뢰도 큐:
  verification_requests 목록
  투표 현황 (승인/거부/불확실 수)
  [에스컬레이트] 버튼

비용 모니터링:
  api_cost_log 시계열 차트
  operation별 breakdown
```

---

## 핵심 컴포넌트 명세

### TokenGauge
```tsx
// 채팅 + 뷰 생성 단일 게이지
interface TokenGaugeProps {
  used: number;       // 사용된 토큰
  total: number;      // 플랜별 총 토큰
  plan: 'free' | 'pro' | 'team';
  isGuest?: boolean;  // 비로그인: 5턴 카운터
}

// 동작:
// - 비로그인: "N턴 남았어요" 텍스트 + 가는 프로그레스바
// - Free: 퍼센트 + 프로그레스바
// - 한도 90%: 주의 색상 (yellow-5)
// - 한도 초과: 업그레이드 모달 (입력 내용 보존)
// - 뷰 생성 전: "이 작업은 채팅 약 N턴 분량을 사용해요" 확인
```

### NodeCreatedBadge
```tsx
interface NodeCreatedBadgeProps {
  domain: DataNodeDomain;  // 'schedule' | 'task' | ...
  nodeId: string;
  onClick: () => void;     // /my 해당 노드로 이동
}

// 스타일: 작은 pill 형태, 보더만, 이모지 + 텍스트
// 위치: assistant bubble 하단, 우측 정렬
// 자동 소멸: 10초 후 fade out
```

### SaveNudge
```tsx
interface SaveNudgeProps {
  trigger: 'turn_limit' | 'view_created' | 'session_end';
  nodeCount: number;
  onSave: () => void;   // Google OAuth 시작
  onDismiss: () => void;
}

// turn_limit: 입력창 위 sticky 배너
// view_created: 인라인 토스트
// session_end: 풀스크린 모달 (beforeunload)
```

### ViewRenderer
```tsx
// 뷰 타입별 인라인 렌더러 (채팅 중 + /my)
// 뷰 레지스트리 패턴: 새 뷰 추가 = 등록만, 기존 코드 수정 금지

const VIEW_REGISTRY: Record<string, React.ComponentType<ViewRendererProps>> = {
  calendar:       CalendarView,
  kanban:         KanbanView,
  knowledge_graph: KnowledgeGraphView,
  // ... 등록만 하면 됨
};
```

### GraphView (PixiJS)
```tsx
// 파일: src/components/graph/GraphView.tsx
// 물리 엔진: src/lib/workers/graph-physics.worker.ts

// 성능 필수 조건:
// - 메인스레드: PixiJS 렌더링만
// - Web Worker: d3-force 물리 연산
// - 60fps 필수 (타협 금지)
// - LOD: 노드 수 > 500 시 원거리 노드 단순화
// - 컬링: 뷰포트 밖 노드 렌더링 제외
```

---

## UX 플로우 — Phase 1

### Flow 1: 킬러 데모 (비로그인 → 가입)

```
1. / 랜딩 → "먼저 체험해보기" → /chat (비로그인)
2. 자동 온보딩 메시지:
   "안녕하세요! 뭐든 말씀해보세요.
    일정, 할 일, 아이디어, 뭐든요. 저장하고 싶으면 나중에 가입하면 돼요."
3. 사용자: "다음주 일요일 희민이 결혼식"
4. OU 응답 스트리밍 → 완료
5. NodeCreatedBadge: "💫 일정 노드가 생성됐어요"
6. 3턴 후 ViewRecommendBadge:
   "📅 일정이 생겼네요. 캘린더뷰로 볼까요?"
   → [네, 보여줘] → CalendarView 인라인 렌더링
7. SaveNudge 등장 (view_created trigger):
   "저장하시겠어요? 언제든 다시 볼 수 있어요."
   → [Google로 저장] → OAuth
8. 가입 완료 → "아까 하던 얘기 계속해요 😊" → /chat (데이터 복원)
```

### Flow 2: 로그인 사용자 채팅

```
1. /my → 사이드바 Chat 클릭 → /chat
2. 이전 대화 연속 스트림 (세션 없음)
3. 채팅 → NodeCreatedBadge → /my 그래프 실시간 업데이트
4. ViewRecommend 수락 → 뷰 저장 → 사이드바 등록
```

### Flow 3: 정확도 높이기

```
1. UNRESOLVED 노드 생성 시 → 조용히 누적
2. /accuracy 배지 (사이드바): UNRESOLVED 수
3. /accuracy 진입 → 항목 처리
4. 처리 완료 → confidence 업데이트 → 그래프 엣지 강화
```

### Flow 4: 뷰 저장 → 사이드바 등록

```
ViewRenderer에서 [저장하기] 클릭
→ 뷰 이름 입력 (기본: "{domain} 뷰 {날짜}")
→ saved_views 저장
→ 사이드바에 아이콘으로 즉시 등장
→ 클릭 시 항상 최신 데이터로 렌더링 (필터 재실행)
```

---

## 온보딩 대화 (신규 가입)

```
가입 직후 /chat 진입 → OU가 먼저 말 걸기

OU: "안녕하세요! 저는 OU예요. 대화하는 족족 데이터가 되는 AI예요.
     뭐라고 불러드릴까요?"
사용자: "민준이라고 해줘"
OU: "안녕하세요 민준님! 요즘 머릿속에 있는 거 뭐든 말씀해보세요.
     일정, 할 일, 아이디어, 공부... 뭐든요."
→ 일반 채팅으로 자연스럽게 전환

원칙:
  - 2~3턴 이내 일반 채팅으로 전환
  - 질문 리스트 느낌 금지 → 대화 느낌
  - 이탈 시점 추적 → A/B 테스트 (Phase 2)
```

---

## 컴포넌트 재사용 전략

```
기존 design-system 자산 → 재사용 가능:
  theme.ts          ✅ 그대로
  globals.css       ✅ 그대로 (랜딩 클래스 유지)
  style/colors.md   ✅ 참조 문서
  style/typography  ✅ 참조 문서
  style/spacing     ✅ 참조 문서
  style/shape       ✅ 참조 문서
  accessibility.md  ✅ 준수 기준

기존 컴포넌트 → 수정 후 재사용:
  Sidebar.tsx       ⚠️ 네비게이션 항목 교체 (한의대 → OU)
  AppShell.tsx      ⚠️ 경로 업데이트
  MobileNav.tsx     ⚠️ 탭 항목 교체
  css-modules/      ✅ 대부분 재사용 가능

새로 만들어야 할 것:
  ChatInterface.tsx        OU-Chat 메인
  TokenGauge.tsx           토큰 게이지
  NodeCreatedBadge.tsx     노드 생성 알림
  ViewRecommendBadge.tsx   뷰 추천
  SaveNudge.tsx            저장 유도
  ViewRenderer/            뷰 레지스트리 + 각 뷰
  GraphView.tsx            PixiJS + Web Worker
  AccuracyInbox.tsx        정확도 높이기
```

---

## 금지 패턴

```
❌ 유채색 배경, 유채색 테두리 (별 제외)
❌ 비로그인 버튼 disabled → 클릭 시 /login으로
❌ 뷰 레지스트리 외부에서 뷰 타입 if/switch 분기
❌ API 키 클라이언트 노출
❌ 빈 결과 필터 표시 (데이터 있는 것만 필터에 등장)
❌ 그래프뷰 60fps 미만 (성능 타협 금지)
❌ 특정 도메인 하드코딩 (domain 필드로 처리)
```
