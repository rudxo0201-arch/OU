# OU — FRONTEND_DESIGN.md

> 프론트엔드 설계, 컴포넌트 구조, 디자인 원칙

---

## 디자인 원칙

1. **색상**: 흰~흑 계열만. 유채색 배경/테두리 금지
2. **예외**: importance 별 → `var(--mantine-color-yellow-5)`
3. **타이포**: 시스템 폰트 + Orbitron (OU 로고)
4. **간격**: 일관된 spacing (8px 단위)
5. **애니메이션**: `ou-fade-in 0.3s ease` 기본

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
