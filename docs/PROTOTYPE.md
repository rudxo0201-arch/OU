# OU 프로토타입 설계 문서

> 원본: docs/PROTOTYPE (2026-04-23 초안)
> 발전: Gemini 대화 디벨롭 (2026-04-24)
> 이 문서가 PROTOTYPE 원본을 대체한다.

---

## CONCEPT CHANGE LOG

> 컨셉이 바뀔 때마다 여기에 한 줄 diff를 기록한다.
> 기록 없는 컨셉 변경 → 코드 충돌 누적 → 기술 부채.

| 날짜 | 변경 전 | 변경 후 | 영향 파일 (레거시 마킹 대상) |
|------|---------|---------|--------------------------|
| 2026-04-24 | 입력창 위젯 → Deeptalk 이동 → 인라인 뷰 추출 → 바탕화면 저장 결정 | QSBar(Q/S 탭) → Quick 즉시 저장 / Search 즉시 조회. 별도 Deeptalk 이동 없음 | `/my/page.tsx` (LEGACY), `WidgetGrid`, `widgetStore` (Phase 2에서 `/home`으로 통합 예정) |
| 2026-04-24 | 라우트 `/my` = 홈 (로그인) | 라우트 `/home` = 홈 (로그인/비로그인 통합). `/my` 폐기 결정 | `src/app/(private)/my/` 전체, `middleware.ts` 리다이렉트 |

### 컨셉 변경 시 영향 반경 체크리스트

컨셉이 바뀔 때마다 아래 7개 지점을 순서대로 확인한다:

1. **라우트 네이밍** — `CLAUDE.md` 라우트 표와 `middleware.ts` 일치 여부
2. **홈 페이지** — `/home/page.tsx` 레이아웃·훅·위젯 목록
3. **위젯 시스템** — `WidgetGrid`, `widgetStore`, `widgetRegistry` (현재 `/my`에 있음, 레거시)
4. **뷰 레지스트리** — `src/components/views/registry.ts` (`VIEW_META`, `VIEW_REGISTRY`)
5. **Orb 레지스트리** — `src/components/orb/registry.ts` (`ORB_REGISTRY`)
6. **API 라우트** — `/api/quick`, `/api/nodes`, `/api/search`
7. **DB 스키마** — `view_presets.category`, `data_nodes.domain` 컬럼 정합

### 레거시 마킹 규칙

지금 당장 삭제 못 하는 이전 컨셉 코드는 파일 상단에 아래 주석을 추가한다:

```ts
// LEGACY(YYYY-MM-DD): <이전 컨셉명> 구조. <대체 경로/Phase>에서 제거 예정.
```

---

## 0. OU의 정체성

**OU = OS (Operating System)**

OU는 앱이 아니다. 개인 데이터 우주의 운영체제다.
이 OS 위에서 작동하는 SaaS 앱들을 **Orb**라 한다.

| 레이어 | 정의 |
|--------|------|
| **OU OS** | 공통 백엔드 (DB, 인증, 파이프라인, DataNode 표준) |
| **Orb** | 모듈 조합으로 만든 SaaS 앱. OU 백엔드를 공유함 |
| **모듈** | 원자적 프론트엔드 컴포넌트 (Input / Display / Logic) |

**핵심 차별점:** 다른 SaaS는 백엔드를 각자 보유한다. OU의 Orb들은 단 하나의 백엔드를 공유하기 때문에, 모듈만 조합하면 새로운 SaaS를 즉시 런칭할 수 있다.

> LLM 입력창은 Orb가 아니다. 하나의 Input 모듈일 뿐이다.

---

## 1. 데이터 파이프라인 (3-Layer)

모든 데이터는 "원본 불변 + 점진적 구조화" 원칙으로 흐른다.

```
사용자 입력
    ↓
Layer 1: 즉시 raw 저장 (messages + data_nodes.raw)
    ↓ (sync, 빠름)
Layer 2: LLM 도메인 분류 + JSONB 추출
    ↓ (async, 나중에)
Layer 3: 트리플 추출 + 벡터 임베딩
```

### Layer 1 — 즉각 수집
- 모든 입력을 raw 필드와 함께 `data_nodes`에 **즉시** 저장
- 파싱 실패해도 원본은 반드시 보존 (R2 백업)
- 이 단계에서 실패는 없다

### Layer 2 — LLM 기반 도메인 분류 (MVP 핵심)
- **정규식/키워드 기반 아님**: Claude Haiku로 의미 기반 분류
- **역할**: 14개 도메인 중 하나를 선택 + domain_data JSONB 추출
- **금지**: 뷰 힌트(view_hint) 추출 — 뷰는 프론트엔드 레지스트리가 결정
- **금지**: 트리플 추출 — Layer 3 몫
- 결과물은 스키마 검증 후 DB insert (LLM이 직접 쓰지 않음)

```typescript
// Layer 2 출력 예시 — 일정 "내일 오후 3시 치과"
{
  "domain": "schedule",
  "action": "insert",
  "confidence": "high",
  "domain_data": {
    "title": "치과",
    "date": "2026-04-25",
    "time": "15:00",
    "location": null
  }
}

// Layer 2 출력 예시 — 수정 "아까 치과 4시로 바꿔줘"
{
  "domain": "schedule",
  "action": "update",
  "target_hint": "치과",
  "domain_data": {
    "time": "16:00"
  }
}
```

### Layer 3 — 비동기 심화 (MVP 후순위이나 핵심 기술)

Layer 3는 단순 부가기능이 아니다. **Search의 Track B(의미 검색)를 가능하게 하는 기반 인프라**다.
"프론트엔드 공부 모아줘"처럼 category 없이도 의미 기반으로 데이터를 꺼낼 수 있는 건 이 레이어가 쌓인 덕분이다.

**임베딩 (Search Track B의 연료):**
- 각 DataNode의 `raw` + `domain_data` 텍스트를 임베딩 벡터로 변환
- pgvector에 저장 (`data_nodes.embedding` 컬럼)
- 모델: `text-embedding-3-small` (OpenAI)
- 임베딩 대상: title, raw, tags, category 등 텍스트 필드 조합

**임베딩 품질 원칙:**
- 임베딩 입력 텍스트는 정보가 풍부할수록 좋다
  - 나쁨: `"React 공부"` 만 임베딩
  - 좋음: `"[knowledge/coding] React 공부 - 컴포넌트 구조, props, useState 정리"` 임베딩
- Layer 2에서 추출한 category, tags를 임베딩 입력에 포함시켜 품질을 높인다

**트리플(S-P-O) 추출 — 그래프 완결성이 핵심:**
- 노드가 일정량 쌓인 후 백그라운드에서 수행
- 노드 간 관계망 구축 → Deeptalk의 맥락 주입에 활용
- Search 결과의 "연관 노드 리스트" 기능 기반

**트리플 추출 품질 원칙 — 중간 계층을 빠뜨리지 않는다:**

그래프 탐색은 모든 중간 관계가 명시되어야 작동한다.
하나라도 빠지면 그래프가 단절되어 쿼리가 끊긴다.

```
❌ 불완전 (그래프 단절):
콜라겐 ──part_of──→ 세포외기질
콜라겐 ──part_of──→ 섬유질요소
↑ 섬유질요소가 허공에 떠있음. "세포외기질에 뭐가 있어?" 쿼리 시 콜라겐 못 찾음

✅ 완전 (그래프 연결):
콜라겐    ──part_of──→ 섬유질요소
탄력소    ──part_of──→ 섬유질요소
섬유질요소 ──part_of──→ 세포외기질     ← 이 중간 연결이 반드시 있어야 함
세포외기질 ──part_of──→ 결합조직
섬유질요소 ──determines──→ 결합조직_형태분류
```

- 트리플 추출 LLM 프롬프트에 "중간 계층 관계를 빠뜨리지 말 것" 명시 필요
- 추출 후 그래프 연결성 검증 로직 필요 (고아 노드 감지)
- 같은 엔티티가 여러 축에 동시에 속할 수 있음 → 정상, 의도된 설계

**타이밍:**
- 앱 사용 외 시간 (서버 부하 적을 때) 배치 처리
- 또는 Deeptalk 진입 시 해당 노드 온디맨드 강화

> **MVP에서 트리플은 급하지 않다. 임베딩은 데이터가 쌓이는 즉시 붙여야 한다.**
> Track B 없이는 "프론트엔드 공부 모아줘" 같은 쿼리가 불가능하다.

---

## 2. 채널 분리 (Input / Search / Deeptalk)

입력과 조회를 같은 창에 섞으면 병목이 생긴다. 채널을 분리한다.

### Quick 입력창 — Write Only

사용자가 카테고리를 의식하지 않는다. 그냥 던지면 시스템이 분류한다.

**3대 입력 유형 (내부 분류, 사용자에게 보이지 않음):**

| 유형 | 예시 | 핵심 추출 필드 |
|------|------|--------------|
| **Actionable** (미래 구속) | "내일 3시 치과", "보고서 제출 금요일까지" | date, time, title |
| **Capturing** (생각 보존) | "이런 앱 만들면 좋겠다", "나중에 볼 링크" | title, raw |
| **Logging** (현재 상태) | "커피 5000원", "강남역 맛집 좋았음" | amount/title, category |

**수집 도메인 (Layer 2가 뒤에서 분류):**

도메인은 1차 분류. 그 안에서 `category` 필드로 2차 분류한다.
`category`는 enum 금지 — LLM이 자유 문자열로 추출. 필터 UI용 권장값만 문서화.

| 도메인 | 권장 category 예시 |
|--------|-------------------|
| schedule | personal, school, family, ceremony, work, travel |
| task | study, project, errand, health |
| knowledge | math, psychology, business, coding, design, medicine, language |
| finance | food, transport, shopping, subscription, medical |
| habit | exercise, reading, diet, sleep |
| idea | product, business, creative, research |
| relation | friend, family, colleague, acquaintance |
| media | lecture, documentary, entertainment, tutorial |

```json
// domain_data 구조 예시
{
  "title": "피부과 수업",
  "date": "2026-04-30",
  "category": "school",
  "tags": ["피부과", "실습"]
}
```

- `tags`: 추가 레이블 배열 (선택적, 검색 강화용)
- 필터 원칙: 데이터가 없는 category는 필터 UI에 표시하지 않음

**설계 원칙:**
- 질문 기능 없음 → 질문은 Search로
- 되묻기: 필수 필드 누락 시만 (일정이면 날짜/시간)
- "등록되었습니다" 대신 즉시 결과 뷰를 미리보기로 노출

### Search 창 — Read Only (Internal)

**역할:** "내 유니버스 안에서 찾기"

- 내부 DB(`data_nodes`)만 쿼리 — 외부 검색 없음
- 결과를 도메인별 템플릿 뷰로 즉시 렌더링
- **날짜 쿼리**: 날짜가 주인공 → 아래에 해당 일정 리스트
- **Deeptalk 포털**: 결과 뷰 하단에 [Deeptalk에서 더 보기] 버튼

**검색 엔진 — 2-Track 방식 (OU 핵심 기술):**

category 필터와 벡터 검색을 병행한다. 이 둘의 조합이 OU 데이터 활용의 핵심이다.

```
사용자 쿼리
    ↓
Track A: Exact/Filter 검색       Track B: Vector(의미) 검색
─────────────────────────────    ─────────────────────────────
category = "school" 같은         "프론트엔드 관련 공부 모아줘"
명시적 필터 조건이 있을 때        → "프론트엔드" 의미를 임베딩
                                 → React, Next.js, CSS 등
domain_data 컬럼 직접 쿼리        유사도 높은 노드 전부 반환
(빠름, 정확)                      (category가 없어도 됨)
    ↓                                ↓
         결과 병합 → 중복 제거 → 템플릿 렌더링
```

**Track A — Exact/Filter 검색:**
- 언제: 날짜, 도메인, category가 명확한 쿼리
- 예: "내일 일정", "이번달 식비", "school 일정만"
- 방식: `WHERE domain = 'schedule' AND domain_data->>'date' = '2026-04-25'`
- 특징: 빠름. 정확히 일치하는 것만 반환

**Track B — Vector(의미) 검색:**
- 언제: category가 없거나, 의미 기반으로 묶어야 할 때
- 예: "프론트엔드 관련 공부 모아줘", "희민이 관련된 것들"
- 방식: 쿼리를 임베딩 → pgvector로 코사인 유사도 검색
- 특징: "프론트엔드"라는 category가 없어도, React/CSS/Next.js 노드를 찾아냄
- 의존: Layer 3에서 쌓인 임베딩 벡터가 있어야 작동

**두 Track의 관계:**
- category 필터 = 정확한 필터링. 빠름. 데이터가 명확할 때
- vector 검색 = 의미 기반 확장. category가 없어도 동작
- MVP에서는 Track A만 구현. Track B는 임베딩이 쌓이면 붙임
- 장기적으로는 두 결과를 **Re-ranking**해서 가장 관련성 높은 순으로 정렬

**쿼리 파이프라인:**
```
1. LLM이 쿼리를 분석
   → 날짜/도메인/category 명시 여부 판단
2. Track A 실행 (항상)
   → 명시적 조건으로 DB 직접 쿼리
3. Track B 실행 (임베딩 있을 때)
   → 쿼리 임베딩 → 유사도 Top-K 노드 반환
4. 결과 병합 + 중복 제거
5. 도메인 템플릿 뷰에 주입해서 렌더링
```

**결과 노출 우선순위:**
1. 도메인 템플릿 뷰 (일정 카드, 가계부 등) — 즉시
2. 연관 노드 리스트 (triples 기반) — 있을 때만
3. LLM 요약 — 복합 쿼리일 때만

**개발 우선순위:**
- Phase 1 (MVP): Track A만 — category/date/domain 필터
- Phase 2: Layer 3 임베딩 구축 → Track B 활성화
- Phase 3: Re-ranking + 개인화 (사용자별 검색 패턴 반영)

**Quick 입력창에 질문이 들어오면:** Search로 포커스 이동. 답변 시도 안 함.

### Deeptalk — Reason & Expand

**역할:** "새로운 우주 탐험 및 구축"

- Search에서 맥락을 받아 시작 (Context Injection)
- 외부 데이터 (웹 서치, 업로드 문서, YouTube 분석) 결합 가능
- 긴 대화, 연구, 기획, 회고, 학습 등에 최적화
- 결과물 → Quick으로 다시 기록 (derived_from 서술어로 연결)

**Search → Deeptalk 맥락 전송:**
```
버튼 클릭
  → origin_node_id + domain_data + 연결 triples
  → Deeptalk 시스템 프롬프트에 주입
  → "이 일정에 대해 뭐든 물어보세요" 상태로 시작
```

---

## 3. 채널별 프롬프트 전략 (PromptRegistry)

각 입력 소스마다 전용 프롬프트가 필요하다.

| 소스 | 프롬프트 전략 | DB I/O |
|------|-------------|--------|
| Quick (텍스트) | 도메인 분류 + 핵심 필드만 추출 | Atomic Insert/Update |
| OCR (이미지/영수증) | 비정형 텍스트에서 엔티티 매핑 | Batch Insert |
| YouTube URL | 트랜스크립트 요약 + 내부 일정/할일 분리 추출 | Knowledge Ingestion |
| 파일 업로드 (PDF) | 문단 단위 청크 → 도메인 분류 | Batch Insert |
| Search 쿼리 | RAG 기반 내부 DB 검색 | Select Only |
| Deeptalk | 맥락 주입 + 외부 확장 + 장기 추론 | Select + 결과 Insert |

---

## 4. DB 노드 구조

### 기본 단위
사용자 인식: "파일 하나", "메모 하나" (익숙한 형태)
내부 저장: `data_nodes` → `sections` → `sentences` (관계형 DB)

### domain_data JSONB 스키마 (도메인별)

```typescript
// schedule
{ title, date, time?, location?, participants?: string[] }

// task
{ title, deadline?, priority?: 'high'|'mid'|'low', status: 'todo'|'done' }

// finance
{ amount, category, description?, merchant? }

// idea
{ title, body?, tags?: string[] }

// habit
{ title, frequency: 'daily'|'weekly', status: 'done'|'skipped', count? }

// media (YouTube/링크)
{ url, source: 'youtube'|'web', title, summary?, video_id? }

// development (코드도 데이터)
{ files?: string[], techStack?: string[], actionType: 'feat'|'fix'|'refactor', snippet? }

// relation (인물)
{ name, memo?, interests?: string[], last_met? }
```

### 업데이트 원칙
- 수정 요청 → 기존 노드 ID 참조해서 `updated_at` 갱신
- 삭제 금지 → `status: 'cancelled'` 또는 이벤트 기록
- 수정 이력은 raw 필드에 append

---

## 5. MVP 범위 — 일정 등록만

### 첫 번째 Orb: 일정 관리

**입력 → 저장 → 조회** 루프 완성이 목표.

**입력 지원:**
- 텍스트 자연어 ("내일 3시 치과")
- 문자/카카오 복사 붙여넣기
- 사진 OCR (Layer 2에서 처리)

**Layer 2 프롬프트 (일정 전용):**
```
입력에서 일정 정보를 추출하세요.
추출 필드: title(필수), date(필수), time(선택), location(선택)
date는 ISO 8601, "내일"은 {오늘날짜+1}로 계산.
없는 필드는 null. JSON만 반환.
```

**조회 뷰 — 날짜가 주인공:**
```
┌─────────────────────────────────┐
│  2026년 4월 25일 토요일 (내일)   │  ← 날짜 헤더
├─────────────────────────────────┤
│  ○ 15:00  치과               ›  │  ← 클릭 → 상세
│  ○ 19:00  희민이랑 저녁      ›  │
└─────────────────────────────────┘
```

**상세 뷰 (클릭 후):**
- 전체 필드 + raw 원본
- [수정] [삭제] 버튼
- [Deeptalk: 이 일정 준비하기] 포털 버튼

---

## 6. 온보딩 — 게임 해금 방식

사용자가 기능 목록을 보지 않는다. 단계별로 자연스럽게 익힌다.

| 레벨 | 트리거 | 해금 |
|------|--------|------|
| **Lv.1** | 첫 로그인 | Quick 입력창 + 일정 조회 뷰 |
| **Lv.2** | 일정 3개 등록 | 사진/텍스트 복사 붙여넣기 (OCR) |
| **Lv.3** | 일정 10개 등록 | 할 일(Task) 도메인 활성화 |
| **Lv.4** | 일정 + 할 일 사용 | Search 창 활성화 |
| **Lv.5** | Search 첫 사용 | Deeptalk 포털 버튼 표시 |
| **Lv.6** | Deeptalk 첫 사용 | 아이디어/가계부 등 전체 도메인 해금 |

---

## 7. 데이터 품질 — 되묻기 원칙

**최소 개입 원칙:** 입력 흐름을 최대한 막지 않는다.

되묻기 조건 (일정 기준):
- date가 null → "언제인가요? (오늘/내일/날짜)"
- title이 애매함 → 저장하고 나중에 물어봄

되묻기 금지 조건:
- location이 없어도 되묻지 않음
- 분류가 애매해도 일단 가장 유력한 도메인으로 저장
- "도메인이 뭔가요?"는 절대 묻지 않음

---

## 8. 감정/민감 데이터 처리 — 스텔스 원칙

감정 데이터는 "안 하는 척" 수집한다.

- 입력 시 → 분류 성공해도 UI 반응 없음 (묵묵히 저장)
- Search 결과 → emotion 도메인 기본 제외
- 통계/대시보드 → 사용자 명시 요청 전까지 노출 금지
- 부정적 기억 → Deeptalk 포털 버튼 생략
- 소환 조건 → "그날 기분이 어땠는지 보고 싶어" 같은 명시적 요청만

---

## 9. Orb/모듈 아키텍처 (장기 비전)

### 모듈 레지스트리

```
Input 모듈:
  - QuickInputBox (텍스트)
  - OcrUploader (이미지/파일)
  - UrlIngestor (YouTube/웹)
  - VoiceInput (STT)

Display 모듈:
  - ScheduleCard / DailyTimelineView
  - TaskList
  - FinanceChart
  - IdeaBoard
  - GraphView (PixiJS)

Logic 모듈:
  - SearchBox (internal DB RAG)
  - DeeaptalkChat (external + context)
  - PromptRegistry (채널별 프롬프트 관리)
```

### Orb 생성 방식

```
Orb = 선택한 모듈들 + 레이아웃 설정
예: 한의학 학습 Orb = OcrUploader + IdeaBoard + DeeaptalkChat + GraphView
예: 가계부 Orb = QuickInputBox + FinanceChart + SearchBox
```

모든 Orb는 동일한 `data_nodes` DB에서 데이터를 읽고 쓴다.
새로운 SaaS를 만들어도 기존 데이터를 그대로 활용할 수 있다.

---

## 10. DataNode 다축 재정렬 — OU의 핵심 해자

### 폴더 트리의 근본 한계

전통적인 파일 시스템은 데이터를 **물리적 위치에 고정**한다.
파일은 한 폴더에만 존재할 수 있고, 정렬 기준을 바꾸려면 파일을 옮겨야 한다.
작업 단계로 정리했다가 → 프로젝트별로 보고 싶으면? 불가능하거나 엄청난 수작업.

Mac의 태그 기능도 한계가 있다: **사용자가 일일이 수동으로 붙여야 한다.**

### OU의 해결: 뷰는 쿼리다, 위치가 아니다

DataNode는 구조화된 메타데이터를 자동으로 갖는다 (Layer 2가 추출).
같은 데이터를 어떤 축으로도 즉시 재정렬할 수 있다.
데이터는 한 번만 저장되고, 뷰만 바뀐다.

### 정렬 축 (View Axes)

| 축 | 예시 쿼리 | 기반 필드 |
|----|----------|----------|
| **시간순** | "오늘 기록한 것들" | `created_at` |
| **도메인** | "일정만 보여줘" | `domain` |
| **카테고리** | "coding 관련만" | `category` |
| **의미 유사도** | "프론트엔드 관련 전부" | 벡터 검색 |
| **인물/관계** | "희민 관련된 것들" | `relation` 트리플 |
| **프로젝트/주제** | "OU 관련 전부" | `tags` + 트리플 |
| **형식** | "영상만" / "문서만" | `media_type` |
| **스트림/상태** | "확정된 것만" / "검토 중" | `stream_status` |

### 스트림/상태 축 — 특히 강력

아이디어와 기획 문서에 Git 브랜치 개념을 적용한다.
삭제 없이 보존하면서, 스트림별로 분리해서 볼 수 있다.

```
같은 주제의 DataNode들:

mainstream  ─── 확정된 방향 (메인)
branch_a    ─── 검토 중인 대안안
branch_b    ─── 또 다른 방향 후보
archived    ─── 후보였지만 탈락 (삭제 아님, 언제든 복원 가능)
draft       ─── 아직 정리 중
```

`stream_status` 필드: `draft` | `review` | `confirmed` | `branch` | `archived`

### Mac 태그와의 결정적 차이

| | Mac 태그 | OU |
|--|---------|-----|
| 태그 부착 | 사용자가 수동으로 | Layer 2 LLM이 자동 추출 |
| 정렬 기준 | 태그만 | domain/category/tags/날짜/인물/벡터/스트림 전부 |
| 데이터 이동 | 폴더 옮겨야 함 | 뷰만 바꿈, 데이터 위치 불변 |
| 다중 분류 | 태그 여러 개 필요 | 메타데이터 자동 다중 보유 |

### DataNode 보기 모드 3가지

사용자가 같은 DataNode 집합을 세 가지 방식으로 볼 수 있다:

**모드 1 — 대화 흐름 (Conversation Stream)**
- 단위: 메시지 턴 (`messages` 테이블)
- 느낌: 카카오톡 채팅방처럼 시간 순서대로
- 용도: "그때 어떤 맥락으로 이야기했는지" 확인

**모드 2 — 의미 단위 (Semantic DataNode)**
- 단위: DataNode (`data_nodes` 테이블)
- 느낌: 정리된 노트처럼
- 용도: "그래서 결론이 뭐였는지" 확인
- 주의: 메시지 1개 ≠ DataNode 1개. 하나의 메시지에서 여러 DataNode가 나올 수 있고, 여러 메시지가 하나의 DataNode를 구성할 수도 있다.

**모드 3 — 관계 중심 (Entity Graph)**
- 단위: 특정 엔티티(인물/개념/프로젝트) 기준으로 연결된 DataNode 전체
- 느낌: "희민과 관련된 것들 전부", "React 관련된 것들 전부"
- 용도: 주제나 인물 중심으로 흩어진 데이터를 한 번에 소환
- 기반: 트리플 관계 탐색 + 벡터 검색 병행

### 개발 방향

- 다축 재정렬은 뷰 레지스트리에 새 뷰를 등록하는 방식으로 확장
- 각 축별 정렬은 Search 채널의 쿼리 파라미터로 처리
- `stream_status` 필드를 `data_nodes` 스키마에 추가 필요
- UI: 현재 정렬 기준을 상단에 표시, 드롭다운으로 축 전환

---

## 11. 미해결 질문 (추후 논의)

- [ ] 가계부: 결제 내역 자동 수집 방법? (문자 스크래핑 vs 오픈뱅킹 API)
- [ ] Search와 Deeptalk의 요금제 차별화? (Free = Search only, Pro = Deeptalk)
- [ ] Orb 마켓: 외부 개발자가 모듈을 등록/판매하는 구조
- [ ] 코드 도메인: development 노드 활용 시나리오 구체화
- [ ] 오프라인 입력 동기화 전략


--

(사용자 기록용)
<프로토 타입에 대하여>
1. 데이터를 파싱하고 저장하는 방식에 대하여
2. 기본적으로 노드를 구성하는 단위에 대하여
    - 사람들의 인식 구조를 바로 흔들지는 말자.
    - 기본적인 "파일 같은"구조 는 필요하다
    - 되도록 관계형 DB에 넣을 수 있는 것은 넣자.
    
3. 코드도 데이터
    - 코드를 분류해서 넣어놓자
    - 스키마를 어떻게 할 것인가?

4. 처음에 필수적으로 갖춰야 할 뾰족한 기능은 무엇인가?
    1) 일정(사진이나 문자 복사 붙여넣기로도 등록 되어야 한다.)
    2) 할 일
    3) 습관 관리
    4) 가계부 -> pay 서비스 런칭 후에 하자(다른데는 어떻게 하는거야? 결제 내역을 어떻게 가져오는거지? 계좌이체 내역, 카드 결제 내역 등.)
    5) 아이디어 관리
    6) 유튜브 아카이빙

5. 사용자들은 게임 진행하듯 안내를 따라가다보면 사용감을 익히게 된다.
    - 기능도 이에 맞춰 하나씩 해금된다.
    - 기능 해금 순서를 정해야 한다.
        1) 일정을 입력해보세요
        2) 일정이 자동으로 입력하세요


6. 실사용시 초반에는 "되묻기"를 통해 데이터 품질을 높인다.
    - 초반에 입력할 정보를 제한해두었으니, 많이 되묻지 않아도 될 것을 기대
    - 들어가야 할 필수 정보를 가이드하여 되묻기 소요를 줄이고 일관된 사용자 경험을 제공한다
    - 언제(날짜 혹은 상대적 요일(오늘 내일 모레 + 가능하다면 시간), 무엇을 (자유 표현 -> 식별 가능하면 좋음. but 나중에 물어보면 됨)
    
    
7. MVP의 화면 구성
    - Home(Quick 입력창)
        - Quick 입력창에 입력된 내용이 "질문"과 유사할 경우 되묻기 가동. "혹시 질문하신건가요?"
