# DATA_STANDARD.md — 데이터 저장 표준

> 이 파일은 불변이다. 변경 시 전체 파이프라인에 영향.
> 추가(optional 필드)만 허용. 기존 구조 변경 금지.

---

## 데이터 계층 구조

```
messages              ← 대화 스트림 (세션 없음, 연속)
  └── data_nodes      ← 구조화된 의미 단위 (그래프 노드)
        ├── sections  ← heading + 문단 묶음
        │     └── sentences ← 문장 단위 (SQL + 벡터 임베딩)
        └── triples   ← 온톨로지 (node에 직접 소속)
              ↑
    triple_sentence_sources (N:M 중간 테이블)
              ↑
          sentences

※ triples는 sentences의 자식이 아니다.
   한 문장 → 트리플 여러 개 (1:N)
   여러 문장 → 트리플 하나 추론 (N:M)
   triples.section_id로 어느 문단인지 직접 추적 가능
```

---

## 표준 서술어 11개 (절대 불변)

```
is_a          X는 Y의 일종이다
part_of       X는 Y의 일부이다
causes        X는 Y를 유발한다
derived_from  X는 Y에서 파생됐다
related_to    X와 Y는 관련 있다
opposite_of   X는 Y의 반대이다
requires      X는 Y를 필요로 한다
example_of    X는 Y의 예시이다
involves      X는 Y를 수반한다
located_at    X는 Y에 위치한다
occurs_at     X는 Y 시점에 발생한다
```

임의 서술어 추가 금지. LLM도 이 목록 안에서만 생성.

---

## messages

```sql
id         UUID PK
user_id    UUID → profiles
group_id   UUID → groups (NULL = 개인)
role       TEXT  'user' | 'assistant'
raw        TEXT  원문 불변
type       TEXT  'chat' | 'question' | 'answer'
pair_id    UUID → messages (question ↔ answer)
created_at TIMESTAMPTZ
```

---

## data_nodes

```sql
id               UUID PK
user_id          UUID → profiles
group_id         UUID → groups (NULL = 개인)
message_id       UUID → messages
is_admin_node    BOOLEAN  관리자 기본 DB 여부

domain           TEXT  도메인 분류 (아래 참조)
source_type      TEXT  'chat'|'upload'|'youtube'|'crawl'|'manual'

source_file_url  TEXT  Cloudflare R2 경로 (원본 파일)
source_location  JSONB {page, paragraph, timestamp}
source_file_type TEXT  'pdf'|'ppt'|'hwp'|'image'|'youtube'

confidence       TEXT  'high'|'medium'|'low'
resolution       TEXT  'resolved'|'fuzzy'|'opaque'
precision_level  INT   0~3

visibility       TEXT  'private'|'link'|'public'
view_hint        TEXT  자동 뷰 추천용 힌트
domain_data      JSONB 도메인별 구조화 데이터
system_tags      TEXT[]

storage_tier     TEXT  'hot'|'warm'|'cold'
last_accessed_at TIMESTAMPTZ
last_verified_at TIMESTAMPTZ

created_at       TIMESTAMPTZ
updated_at       TIMESTAMPTZ
```

### 도메인 목록

```
schedule    일정, 이벤트, 약속     → 캘린더뷰
task        할 일, 과제, 미션      → 칸반뷰
habit       습관, 루틴             → 히트맵뷰
knowledge   개념, 인사이트, 학습   → 지식그래프뷰
idea        아이디어, 기획         → 마인드맵뷰
relation    사람, 관계             → 관계그래프뷰
emotion     감정, 회고, 일기       → 저널뷰
finance     지출, 수입             → 차트뷰
product     상품, 구매             → 쇼핑뷰 (미래)
broadcast   영상, 방송             → 방송뷰 (미래)
education   강의, 문제, 오답       → 교육뷰
media       음악, 책, 영화         → 미디어뷰
location    장소, 위치             → 지도뷰 (미래)
unresolved  UNRESOLVED 엔티티      → 정확도 높이기
```

---

## sections

```sql
id          UUID PK
node_id     UUID → data_nodes
heading     TEXT  NULL 가능 (heading 없는 문단)
order_idx   INTEGER
created_at  TIMESTAMPTZ
```

---

## sentences

```sql
id           UUID PK
section_id   UUID → sections
node_id      UUID → data_nodes
text         TEXT
order_idx    INTEGER
embedding    vector(1536)  text-embedding-3-small
embed_status TEXT  'pending'|'processing'|'done'|'failed'
embed_tier   TEXT  'hot'|'warm'|'cold'
created_at   TIMESTAMPTZ
```

---

## triples ← 핵심 설계

```sql
id           UUID PK
node_id      UUID → data_nodes  (소속 노드)
section_id   UUID → sections    (어느 문단? 직접 참조, nullable)

subject      TEXT
predicate    TEXT  표준 서술어 11개만 허용
object       TEXT

source_level TEXT  'sentence'|'section'|'node'
source_type  TEXT  'generated'|'extracted'|'inferred'
confidence   TEXT  'high'|'medium'|'low'
created_at   TIMESTAMPTZ
```

### source_level별 동작

```
'sentence' → section_id 채움 + triple_sentence_sources 채움
'section'  → section_id만 채움 (특정 문장 없음)
'node'     → section_id = NULL (노드 전체에서 추론)
```

### 출처: generated vs extracted vs inferred

```
generated  OU LLM이 처음부터 트리플화 염두에 두고 생성
           → confidence: 'high' 가능
           → 온톨로지 해자의 핵심

extracted  기존 텍스트(PDF, YouTube 등)에서 사후 추출
           → confidence: 'medium'

inferred   여러 문장/섹션을 조합해서 추론
           → confidence: 'medium'~'low'
```

---

## triple_sentence_sources (N:M 중간 테이블)

```sql
triple_id    UUID → triples
sentence_id  UUID → sentences
PRIMARY KEY (triple_id, sentence_id)
```

트리플 ↔ 문장 출처 연결.
한 트리플이 여러 문장에서 나올 수 있음.
한 문장에서 여러 트리플이 나올 수 있음.

---

## confidence 정의

```
'high'    관리자 검증 완료 or LLM generated (OU LLM 생성)
'medium'  LLM extracted (사후 추출), hallucination 가능
'low'     검증 실패, 의심 데이터
```

---

## source_type (data_nodes 기준)

```
출처 A (OU LLM 생성):
  source_type = 'generated'
  triples.source_type = 'generated'
  confidence = 'high'
  → 트리플화 염두에 두고 생성 → 정갈한 온톨로지

출처 B (외부 입력):
  source_type = 'upload' | 'youtube' | 'crawl' | 'manual'
  triples.source_type = 'extracted' | 'inferred'
  confidence = 'medium' | 'low'
  → 사후 추출 → 검증 에이전트 대상
```

---

## 원본 파일 보존 원칙

```
파싱 실패해도 원본은 R2에 반드시 저장.
원본 손실 = 복구 불가.
원본 저장 → DataNode 생성 (순서 보장).

data_nodes.source_file_url  → R2 경로
data_nodes.source_location  → {page, paragraph, timestamp}
→ DataNode에서 "원본 보기" 버튼으로 원본 위치 직접 이동
```

---

## 비용 최적화: 임베딩 티어

```
hot:   최근 7일 이내 / 자주 조회 → 실시간 벡터 검색
warm:  7일 이상 / 조회 낮음    → 야간 배치 처리
cold:  장기 미사용             → SQL 검색만 / 온디맨드
```
