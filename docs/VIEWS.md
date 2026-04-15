# VIEWS.md — 데이터뷰 시스템 + 추천 + 커스텀

---

## 핵심 재정의: DataView = 프론트엔드

```
컴퓨터 과학의 본질:
  백엔드 (DB)     = 데이터
  프론트엔드 (UI) = 데이터를 보여주는 것
  = DataNode + DataView (완전히 동일)

OU의 차별점:
  기존: 프론트엔드가 서비스에 종속 (인스타 UI = 인스타 데이터만)
  OU:   DataView가 데이터에서 분리
        같은 DataNode → 어떤 DataView로든 렌더링
        DataView를 사고팔 수 있음
        사용자가 직접 만들 수 있음

재정의:
  OU = 개인 DB + 그 DB의 프론트엔드를 무한으로 생성하는 플랫폼
```

---

## 핵심 개념: DataView = 필터 × 템플릿

```
"어제 AI와 데이터 온톨로지 대화했지?" → 필터 → DataNode 추출 → 렌더링
"뷰 저장하기" → 사이드바 아이콘 → 항상 최신 데이터로 렌더링

저장된 뷰 = 살아있는 뷰 (필터 조건 유지 + 새 데이터 자동 반영)
```

## 필터 원칙

```
필터는 존재하는 데이터 기반으로만 생성.
사용자는 빈 결과를 볼 수 없다.
빈 테이블은 시스템만 안다.

→ 선택하면 반드시 데이터가 있음 (빈 결과 자체가 불가능)
```

---

## 뷰 타입 (프론트엔드 관점 재분류)

### 정적 뷰 — 데이터를 보여주기만 함
```
표, 리스트, 보드(칸반), 캘린더, 피드, 갤러리
```

### 시각화 뷰 — 데이터를 시각적으로 표현
```
그래프뷰(우주), 차트, 마인드맵, 관계 그래프, 시나리오뷰

시나리오뷰 (플로우차트):
  사고의 흐름, 알고리즘, 의사결정 트리를 방향성 있는 플로우차트로 시각화
  마인드맵(방사형, "뭐가 있지?") vs 시나리오뷰(위→아래, "어떻게 하지?")

  노드 타입:
    시작/끝 (알약형) | 단계 (사각형) | 분기 (다이아몬드) | 주석 (점선)

  사용 사례:
    수학 문제 풀이 알고리즘 | 진단 흐름도 | 비즈니스 프로세스 | 의사결정 트리

  기술: @xyflow/react + dagre 자동 레이아웃
  데이터: domain_data.steps 배열 (id, type, label, next, branches)
  선행 조건: 도메인별 데이터 축적 필요 (대화 → 구조화 → 렌더링 → 편집 루프)
```

### 출력 뷰 — 데이터를 다른 포맷으로 변환
```
문서:   Docs, HWP, MD, TXT
슬라이드: PPT
인쇄물: PDF
이미지: PNG, JPG, SVG
영상

전자책뷰 (.epub):
  knowledge DataNode들 → 챕터 구조 레이아웃
  페이지 넘김 인터랙션 / 폰트·여백·색상 커스텀
  → .epub 익스포트

출판책뷰 (인쇄용 PDF):
  동일한 DataNode → 인쇄 레이아웃 (A5, B5 등)
  페이지 번호 / 목차 / 헤더·푸터 자동 생성
  → PDF 익스포트 → 실제 인쇄 가능
  → POD (Print on Demand) 연결 가능
```

### 인터랙티브 뷰 — 데이터와 상호작용
```
퀴즈뷰, 플래시카드뷰
```

### 대화형 뷰 (챗봇뷰) — 데이터를 대화로 탐색
```
내 DataNode를 RAG로 학습한 AI와 대화
= 나를 학습한 챗봇 = 대화형 DataView

기술:
  질문 → 관련 DataNode 벡터 검색 (RAG)
  → LLM이 내 DataNode 컨텍스트로 답변

사용 사례:
  내 지식 DataNode → 챗봇뷰
    "나한테 뭐든 물어봐" → 내가 아는 것들로 답변

  강의 DataNode → 챗봇뷰
    수강생: "3강 내용 다시 설명해줘"
    → 강사 DataNode 기반 답변 (강사가 24시간 답변하는 효과)

  책 DataNode → 챗봇뷰
    "저자가 경제에 대해 뭐라고 했어?" → 책 DataNode 기반 답변

  기업 제품 DataNode → 챗봇뷰
    고객: "환불 정책이 뭐야?" → 고객 서비스 챗봇 대체

  의사 진료 DataNode → 챗봇뷰
    환자: "내 지난 처방 기억해?" → 진료 기록 기반 답변

구독/판매:
  유명 한의사 → 한의학 DataNode + 챗봇뷰 유료 구독
  → 수강생이 "한의사에게 직접 질문"하는 경험
  저자 → 책 DataNode + 챗봇뷰
  → "저자에게 직접 물어보기" 경험
  = 크리에이터 이코노미 새로운 형태
```

### 웹 뷰 — 데이터를 웹사이트로 표현
```
HTML/CSS/JS 프론트엔드
AI 뷰 생성기(Claude Code)로 자동 생성

"내 포트폴리오 웹사이트 만들어줘" → DataNode 기반 포트폴리오
"우리 팀 소개 페이지 만들어줘"   → DataNode 기반 팀 소개
"내 강의 랜딩페이지 만들어줘"    → DataNode 기반 랜딩페이지
```

### 가이드뷰 (서비스 이용 설명서)
```
서비스 기능 DataNode → 가이드뷰
사용자 수준(userLevel)에 따라 다른 렌더링:
  beginner: 쉬운 말 + 스크린샷 + 인터랙티브 튜토리얼
  expert:   간결한 텍스트 + 단축키

가이드 자체가 DataView:
  시스템이 자신의 기능을 DataNode로 저장
  → 가이드뷰로 렌더링
  → 사용자 수준별 다른 뷰 적용
```

### 도메인 특화 뷰
```
본초뷰, 경혈뷰, 방제뷰, 한자뷰 (첫 번째 도메인 예시)
→ 어떤 도메인이든 같은 패턴으로 뷰 추가 가능
→ 뷰 레지스트리에 등록만 하면 됨
```

```
같은 DataNode 하나로:
  전자책(.epub) / 출판책(PDF) / 웹 강의
  문제집 / 챗봇 / 웹사이트 / 앱
  = 같은 데이터, 다른 프론트엔드
```

---

## 뷰 등록 프로토콜 (불변)

### 새 뷰 추가 = 3단계

```
1. 컴포넌트 생성
   components/views/NewView.tsx
   → ViewProps 인터페이스 구현 (아래 참조)

2. 레지스트리 등록 (registry.ts에 한 줄 추가)
   VIEW_REGISTRY: 컴포넌트 등록 (dynamic import)
   VIEW_META: previewOnClick 설정
   DOMAIN_VIEW_MAP: 도메인 자동 매핑 (해당 시)

3. 기본 뷰 등록 (선택, default-views.ts)
   DefaultViewDef 추가 → 사용자에게 기본 뷰로 제공

→ 기존 코드 수정 없음. 등록만.
```

### ViewProps 인터페이스

```typescript
// components/views/registry.ts
interface ViewProps {
  nodes: DataNode[];                    // 필터된 노드 목록
  filters?: Record<string, any>;       // 현재 적용된 필터
  onSave?: () => void;                 // 저장 콜백
  layoutConfig?: LayoutConfig;         // 뷰별 스타일 설정
}

// 확장이 필요한 경우 (검색, 내보내기 등)
interface ExtendedViewProps extends ViewProps {
  onSearch?: (params: any) => void;    // 서버사이드 검색
  loading?: boolean;
  total?: number;
}
```

### 레지스트리 3종

```
VIEW_REGISTRY: Record<string, ComponentType<ViewProps>>
  → 뷰 타입 키 → 컴포넌트 매핑
  → dynamic import (lazy loading, SSR 비활성화)

VIEW_META: Record<string, ViewMeta>
  → 뷰별 동작 속성 (previewOnClick 등)

DOMAIN_VIEW_MAP: Record<string, string>
  → 도메인 → 기본 뷰 타입 자동 매핑
  → schedule → calendar, task → task, finance → chart ...
```

### ViewRenderer 라우팅

```
ViewRenderer가 viewType을 받아서 VIEW_REGISTRY에서 컴포넌트 조회
→ nodes.length === 0 이면 null (빈 뷰 표시 금지)
→ 등록 안 된 viewType이면 null
→ 일치하면 렌더링
```

### FilterConfig 구조

```
FilterConfig = {
  domain?: string         // 단일 도메인 ('schedule', 'task', ...)
  source_type?: string    // 소스 타입 ('chat', 'upload', 'pdf', 'dev_tool', ...)
  dateRange?: { start: string, end: string }
  confidence?: string[]   // 신뢰도 필터
  search?: string         // 텍스트 검색
  tags?: string[]         // 시스템 태그
}

→ saved_views 테이블의 filter_config (JSONB) 필드에 저장
→ 빈 결과가 나오는 필터는 UI에 표시하지 않는다 (불변 원칙)
```

---

## 데이터뷰 추천 시스템

데이터가 쌓이면 OU가 먼저 제안한다. 사용자는 뷰를 몰라도 된다.

### 추천 트리거

```
일정 DataNode 5개 이상    → "캘린더뷰로 보면 어떨까요?"
같은 책 DataNode 여러 개  → "독서 기록 책장뷰 만들어드릴까요?"
지출 DataNode 10개 이상  → "이번 달 지출 차트뷰 보여드릴까요?"
인물 DataNode 반복 등장   → "인물 관계도뷰 어떠세요?"
학습 DataNode 축적        → "퀴즈뷰로 복습해볼까요?"
오답 DataNode 누적        → "오답노트 PDF로 뽑아드릴까요?"
노드 간 예상치 못한 연결  → "흥미로운 연결이 생겼어요! 그래프로 볼까요?"
원본 파일 업로드 직후     → "이 PDF의 핵심 내용을 카드뷰로 볼까요?"
```

### 추천 UX

```
방식 1: 채팅 중 인라인 (가장 자연스러움)
  "일정이 꽤 쌓였네요 📅 캘린더뷰로 볼까요?"
  [네, 보여줘] [괜찮아]

방식 2: 홈 추천 카드 (/my 상단)

방식 3: 주간 다이제스트 알림

[네, 보여줘] → 자동 필터 + 렌더링 → "저장해두시겠어요?" → 사이드바 등록
[AI로 더 예쁘게] (Pro) → Claude Code 생성 → 토큰 소비
```

### 추천 로직

```
Phase 1: 규칙 기반 (domain별 DataNode 수 임계값)
Phase 2: 패턴 기반 (클러스터 감지, 연결 많은 노드 추천)
Phase 3: AI 개인화 (사용자 행동 학습, 수락/거절 이력 반영)
```

---

## 데이터뷰 커스텀 시스템

```
초반: 선택지만 준다 (진입장벽 최소)
중반: 조합을 준다
후반: 직접 만든다 (완전 자유)
```

### 레이어 1: 스타일 (Phase 1, Free)

```
테마: 우주(기본) / 미니멀 / 페이퍼 / 다크 글로우
폰트: Pretendard(기본) / Noto Serif / 고딕 / 손글씨
악센트: 흰~흑 기반 유지. 악센트 컬러 1가지.
노드 스킨: 별형 / 원형 / 육각형 (그래프뷰)
엣지: 실선 / 점선 / 곡선 / 빛 번짐
배경: 우주(기본) / 단색 / 그라데이션
```

### 레이어 2: 레이아웃 (Phase 2, Free)

```
뷰 타입 전환: 캘린더/칸반/리스트 즉시 전환 (데이터 유지)
카드 크기: S / M / L
정보 밀도: 컴팩트 / 기본 / 여유
칸반 컬럼: 이름 변경, 추가/삭제
차트: 막대/선/파이 전환, 축 선택
```

### 레이어 3: 데이터 매핑 (Phase 2~3, Free)

```
필드 표시/숨김: DataNode 어떤 필드를 보여줄지 선택
필드 순서: 드래그로 변경
필드 이름: 표시명 변경 (원본 불변)
조건부 표시: 특정 값이면 색상 강조 (마감 3일 이내 → 빨간 테두리)
필터 프리셋: 자주 쓰는 필터 조합 저장
```

### 레이어 4: AI 뷰 생성기 (Phase 2~3, Pro)

OU가 LLM 서비스이기 때문에 Claude Code를 활용한다.

```
방식:
  자연어 → Claude Code → HTML/CSS/JS 생성
  → DataNode 변수 자동 매핑
  → 샌드박스 렌더링 (iframe + sandbox)
  → 반복 수정 가능 → 토큰 소비
  → [저장] or [마켓 판매]

예시:
  "내 독서 기록을 책장 스타일로 보여줘.
   읽은 책은 세워서, 안 읽은 건 눕혀서."
  → Claude Code 생성 → knowledge DataNode 자동 주입 → 렌더링
  → "더 미니멀하게" → 수정 → 추가 토큰 소비

DataNode 주입 방식:
  const OU = {
    nodes: [...],   // 사용자의 DataNode
    filters: {...}  // 현재 필터 조건
  }

토큰 과금:
  뷰 생성 = 채팅보다 높은 토큰 소비
  단일 게이지로 표시 (채팅 + 뷰 통합)
  → "아 뷰 만드니까 빨리 줄어드네" 자연스럽게 인식
  뷰 생성 전: "이 작업은 채팅 약 N턴 분량을 사용해요" 안내

보안:
  외부 네트워크 fetch 절대 금지
  타인 DataNode 접근 금지
  iframe sandbox 속성으로 격리

뷰 배포:
  만든 뷰 → 마켓 판매 → 구매자 DataNode 자동 매핑 → 수익
```

### 커스텀 바운더리 (불변)

```
허용: 스타일/레이아웃/필드 선택/순서/이름/조건부 표시
금지: DataNode 원본 스키마 직접 수정
     system_tags 수정
     triples predicate 임의 추가
     타인 비공개 DataNode 접근
     유채색 배경 (브랜드 원칙)
```

### 단계별 제공

| 레이어 | 내용 | Phase | 플랜 |
|--------|------|-------|------|
| 1 스타일 | 테마, 폰트, 스킨 | Phase 1 | Free |
| 2 레이아웃 | 뷰 전환, 카드 크기 | Phase 2 | Free |
| 3 데이터 매핑 | 필드 선택, 조건부 표시 | Phase 2~3 | Free |
| 4 AI 뷰 생성 | Claude Code + 자연어 | Phase 2~3 | Pro |
| 마켓 판매 | 만든 뷰 배포/판매 | Phase 3 | Pro |
