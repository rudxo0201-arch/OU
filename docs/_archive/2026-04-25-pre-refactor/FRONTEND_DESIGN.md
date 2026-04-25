# OU — FRONTEND_DESIGN.md

> 프론트엔드 설계, 컴포넌트 구조, 디자인 원칙

---

## 디자인 원칙

1. **색상**: 흰~흑 계열만. 유채색 배경/테두리 금지
2. **예외**: importance 별 → `var(--ou-accent-primary)`
3. **타이포**: 시스템 폰트 + Orbitron (OU 로고)
4. **간격**: 일관된 spacing (8px 단위)
5. **애니메이션**: `ou-fade-in 0.3s ease` 기본

### 6. 데스크톱 퍼스트 (필수)

OU는 데스크톱 웹앱. 모든 뷰는 데스크톱에서 즉시 출시 가능한 완성도를 가져야 한다.

**금지 패턴:**
```tsx
// ❌ 모바일 패턴 — 금지
<div style={{ maxWidth: 540, margin: '0 auto' }}>

// ✅ 데스크톱 패턴
<div className={styles.container}>  // CSS Module + 미디어 쿼리
```

**CSS Module 반응형 구조:**
```css
/* ViewName.module.css */
.container { width: 100%; padding: 24px 32px; }
.grid { display: grid; gap: 20px; grid-template-columns: 1fr; }

@media (min-width: 768px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 1024px) {
  .grid { grid-template-columns: repeat(3, 1fr); }
}
```

**카드 토큰:**
```tsx
// 일반 카드
{ background: 'var(--ou-glass)', border: '1px solid var(--ou-glass-border)',
  borderRadius: 'var(--ou-radius-card)', boxShadow: 'var(--ou-shadow-sm)', padding: '20px 24px' }

// 강조 카드 (다크)
{ background: 'var(--ou-card-dark)', color: 'var(--ou-card-dark-text)',
  borderRadius: 'var(--ou-radius-card)', boxShadow: 'var(--ou-shadow-md)', padding: '20px 24px' }
```

**예외 허용 (의도적 narrow):**
- `NoteView`: 720px (문서 가독성)
- `OrbChat`: 720px (채팅 가독성)

**뷰별 목표 레이아웃:**

| 뷰 | 목표 패턴 |
|----|----------|
| ChartView | 3컬럼 대시보드 (요약카드+차트+테이블) |
| CalendarView | 풀와이드 7컬럼 그리드 + 우측 이벤트 패널 |
| TodoView | 좌측 필터 사이드바 + 우측 할일 리스트 |
| HeatmapView | 히트맵 + 습관카드 2컬럼 |
| JournalView | 날짜 사이드바 + 내용 패널 (Day One) |
| TimelineView | 풀와이드 타임라인 |
| CurriculumView | 목차 사이드바 + 콘텐츠 |
| ProfileView | 프로필 카드 + 통계 대시보드 |
| FlashcardView | 중앙 카드 + 진행률 사이드 패널 |

---

## 라우트 구조

```
src/app/
├── (auth)/           # 인증 관련
│   ├── login/
│   ├── terms-agree/
│   ├── forgot-password/
│   └── reset-password/
├── (public)/         # 비로그인 접근 가능
│   └── page.tsx      # 랜딩페이지
├── (private)/        # 로그인 필수
│   ├── my/           # 홈 (위젯 그리드)
│   └── layout.tsx    # 인증 게이트
├── api/              # API 라우트
└── auth/             # OAuth 콜백
```

---

## 위젯 시스템 (/my)

파일: `src/components/widgets/`

### 구조
```
widgets/
├── WidgetGrid.tsx      # react-grid-layout 기반 그리드
├── WidgetCard.tsx       # 위젯 카드 래퍼
├── registry.ts          # 위젯 정의 + 등록
├── types.ts             # GRID_COLS, GRID_ROWS
└── views/
    ├── register.ts       # 위젯 일괄 등록
    ├── OuViewWidget.tsx  # OU 채팅 (ChatPanel 내장)
    ├── ClockWidget.tsx
    ├── TodaySummaryWidget.tsx
    ├── RecentNodesWidget.tsx
    └── QuickMemoWidget.tsx
```

### WidgetDef
```typescript
interface WidgetDef {
  type: string;
  label: string;
  component: ComponentType<{ widgetId: string }>;
  scrollable: 'none' | 'vertical' | 'horizontal' | 'both';
  minSize: [cols, rows];
  defaultSize: [cols, rows];
  removable: boolean;
  needsCard: boolean;
}
```

---

## 채팅 UI

파일: `src/components/chat/`

### ChatPanel
- 메시지 목록 렌더링 + 자동 스크롤
- MessageBubble: 유저(오른쪽) / 어시스턴트(왼쪽)
- 한자 인라인 카드: HanjaInlineCards + HanjaDetail
- 말풍선 지우기 (hover 시 × 버튼)

### ChatInput
- 텍스트 입력 + 파일 첨부
- 한자 자동 감지 → `/api/hanja/search` 비동기 조회
- 검색 모드 자동 전환 (직전 한자 검색 + 현재 한자 비율 ≥ 50%)
- SSE 스트리밍 수신

---

## 상태 관리 (Zustand)

| 스토어 | 파일 | 역할 |
|--------|------|------|
| chatStore | `src/stores/chatStore.ts` | 채팅 메시지 |
| widgetStore | `src/stores/widgetStore.ts` | 위젯 레이아웃 |

### ChatMessage 인터페이스
```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  streaming?: boolean;
  nodeCreated?: { domain, nodeId?, confidence?, domain_data? };
  imagePreview?: string;
  ocrResult?: { text, imageType };
  fileResult?: { fileType, fileName, ... };
  hanjaResults?: Array<{ char, nodeId, readings_ko, ... }>;
}
```

---

## LayoutConfig 시스템

뷰 스타일링을 JSON으로 제어:

```typescript
{
  card: { backgroundColor, borderRadius, padding },
  textStyles: {
    primary: { fontSize: 24, fontWeight: 700 },
    secondary: { fontSize: 12 },
    tertiary: { fontSize: 10 }
  },
  grid: { columns: { base: 4, md: 8, lg: 10 }, gap: 8 },
  fields: { grade: { visible: true } }
}
```

DB의 `saved_views.layout_config`에 저장.
