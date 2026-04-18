# OU — VIEWS.md

> 데이터뷰 시스템, 추천, 커스텀, AI 뷰 생성

---

## 핵심 개념

**DataView = DataNode를 원하는 형식으로 렌더링한 뷰**

같은 데이터를 캘린더, 테이블, 그래프, 사전 등 다양한 형태로 볼 수 있다.
뷰는 데이터를 복사하지 않고, filter_config + layout_config로 렌더링만 바꾼다.

---

## 뷰 레지스트리

파일: `src/components/views/registry.ts`

새 뷰 추가 = 레지스트리에 등록만. 기존 코드 수정 금지.

```typescript
export const VIEW_REGISTRY: Record<string, ComponentType<ViewProps>> = {
  calendar: dynamic(() => import('./CalendarView')),
  knowledge_graph: dynamic(() => import('./KnowledgeGraphView')),
  dictionary: dynamic(() => import('./DictionaryView')),
  // ...
};
```

### ViewProps 인터페이스
```typescript
interface ViewProps {
  nodes: any[];
  filters?: Record<string, any>;
  onSave?: () => void;
  layoutConfig?: LayoutConfig;
  inline?: boolean;
}
```

---

## 뷰 타입 목록 (21종)

| 타입 | 아이콘 | 설명 | 최적 도메인 |
|------|--------|------|-------------|
| calendar | CalendarBlank | 일정 시각화 | schedule |
| task | Kanban | 칸반 보드 | task |
| knowledge_graph | Graph | 지식 그래프 | knowledge |
| dictionary | BookBookmark | 사전 형태 | knowledge |
| chart | ChartLine | 차트/그래프 | finance |
| mindmap | TreeStructure | 마인드맵 | idea |
| heatmap | SquaresFour | 히트맵 | habit |
| journal | Notebook | 일기 형태 | emotion |
| timeline | Timeline | 타임라인 | schedule |
| flashcard | Cards | 플래시카드 | education |
| document | FileText | 문서 형태 | knowledge |
| table | Table | 테이블 | 범용 |
| gallery | Images | 갤러리 | media |
| kanban | Kanban | 칸반 | task |
| flowchart | FlowArrow | 흐름도 | knowledge |
| treemap | TreeStructure | 트리맵 | finance |
| gantt | ChartBar | 간트 차트 | schedule |
| map | MapPin | 지도 | location |
| profile | User | 프로필 | relation |
| health | Heartbeat | 건강 | habit |
| code | Code | 코드 에디터 | development |

---

## 뷰 추천 엔진

파일: `src/lib/views/schema-hints.ts`

`recommendViewTypes(nodes)` — DataNode 배열을 분석하여 최적 뷰 추천.

**스코어링 방식:**
1. 각 뷰의 `requiredFields`와 노드 데이터 필드 매칭
2. `bestDomains`와 노드 도메인 매칭
3. 필드 커버리지 비율로 점수 산출
4. 상위 N개 추천

---

## 기본 뷰 (17개)

파일: `src/lib/views/default-views.ts`

회원 가입 시 자동 생성되는 뷰:
- 내 캘린더, 할 일 보드, 습관 트래커, 지식 그래프
- 아이디어 맵, 감정 일기, 지출 차트, 인물 관계도
- 학습 카드, 사전, 건강 기록, 타임라인 등

---

## LayoutConfig

파일: `src/types/layout-config.ts`

```typescript
interface LayoutConfig {
  card?: { backgroundColor, borderColor, borderWidth, borderRadius, padding };
  textStyles?: {
    primary?: { fontSize, fontWeight, color, lineHeight };
    secondary?: { ... };
    tertiary?: { ... };
  };
  grid?: {
    columns?: number | { base, xs, sm, md, lg };
    gap?: number;
  };
  fields?: { [fieldName]: { visible?: boolean } };
}
```

---

## saved_views 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| user_id | uuid | 소유자 |
| group_id | uuid | 그룹 뷰 (nullable) |
| name | text | 뷰 이름 |
| view_type | text | 레지스트리 키 |
| filter_config | jsonb | 필터 설정 |
| layout_config | jsonb | 레이아웃 설정 |
| schema_map | jsonb | 필드 매핑 |
| custom_code | text | AI 생성 커스텀 코드 |
| visibility | enum | private/link/public |
| is_default | boolean | 기본 뷰 여부 |
| sort_order | integer | 정렬 순서 |

---

## 뷰 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| /api/views | GET | 회원 뷰 목록 |
| /api/views | POST | 뷰 생성 |
| /api/views | PATCH | 뷰 수정 |
| /api/views | DELETE | 뷰 삭제 |
| /api/views/defaults | POST | 기본 뷰 생성 |
| /api/views/generate | POST | AI 뷰 생성 |
| /api/views/publish | POST | 뷰 공개 |
| /api/views/subscribe | POST | 뷰 구독 |
