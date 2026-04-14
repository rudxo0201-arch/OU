# DATA.md — 데이터 파이프라인 + 저장 표준

---

## 데이터화 처리 레이어

```
Layer 1: 즉시 (응답 생성과 동시)
  LLM이 트리플화 염두에 둔 답변 스트리밍
  사용자 체감 지연 없음

Layer 2: 응답 완료 직후 (~0.5초, 비동기)
  도메인 분류 / 신뢰도 산정 / UNRESOLVED 감지
  view_hint 결정 / messages + data_nodes 저장

Layer 3: 백그라운드 (비동기 큐)
  sections / sentences 파싱 저장
  triples 생성 저장
  벡터 임베딩 (text-embedding-3-small)
  node_relations 업데이트 (그래프 엣지)
  기존 DB와 중복/연결 탐지
```

---

## 데이터 계층 구조

```
messages → data_nodes → sections → sentences
                ↓
            triples ←── triple_sentence_sources ──→ sentences
            (node에 속함)   (출처 연결, 선택적, N:M)
```

### 왜 triples는 sentences의 자식이 아닌가

```
잘못된 구조 (1:1 가정):
  sentences → triples

문제:
  "황기는 보기 효능이 있으며 면역력을 강화하고 기허를 치료한다"
  → triple 1: (황기, causes, 보기)
  → triple 2: (황기, causes, 면역력 강화)
  → triple 3: (황기, requires, 기허)
  한 문장에서 트리플 3개 (1:N)

  문장 A + 문장 B → 트리플 하나 (추론형, N:M)
  섹션/노드 전체에서 추론된 트리플 (출처 문장 없음)

올바른 구조:
  triples는 data_nodes에 속함
  sentences는 triples의 출처 중 하나일 뿐 (선택적)
  triple_sentence_sources 중간 테이블로 N:M 연결
```

### 트리플 출처 주소 체계

```
triple.section_id          → 어느 문단에서 나왔는지 (직접 참조)
triple_sentence_sources    → 어느 문장(들)에서 나왔는지 (N:M)

조회 예시:
  "이 트리플이 어디서 나왔어?"
  → triple.section_id → sections.heading (문단 제목 바로 파악)
  → triple_sentence_sources → sentences.text (정확한 문장들 확인)
  → 원본 파일 data_nodes.source_location {page, paragraph}

source_level별 동작:
  'sentence': section_id + triple_sentence_sources 모두 채움
  'section':  section_id만 채움 (특정 문장 없음)
  'node':     section_id = NULL (노드 전체에서 추론)
```

DATA_STANDARD.md 참조 — 상세 스키마 불변 문서.

---

## 표준 서술어 (온톨로지 해자, 불변)

```
is_a / part_of / causes / derived_from /
related_to / opposite_of / requires /
example_of / involves / located_at / occurs_at

→ 사용자 임의 서술어 금지
→ LLM도 이 목록 안에서만 생성
→ 서술어가 일정하기 때문에 온톨로지가 정갈해짐
→ 이것이 경쟁사가 따라할 수 없는 온톨로지 해자
```

---

## 신뢰도 (confidence)

```
'high'   관리자 검증 완료 or LLM + 기본 DB 일치
'medium' LLM 추론 (hallucination 가능)
'low'    검증 실패 or 의심 데이터
```

---

## 원본 파일 보존 원칙

**가장 중요한 원칙: 파싱 실패해도 원본은 항상 R2에 보존된다.**

```
PDF A 업로드
  → 파싱 → sections → sentences → triples
  → 각 DataNode에 source_file_url 연결 (Cloudflare R2)
  → source_location: {page, paragraph} 위치 정보 저장

DataNode 열람 시:
  "원본 보기" 버튼 → OU 내장 뷰어로 원본 렌더링
  → 해당 페이지/섹션으로 자동 스크롤

파싱 실패 시:
  원본만 R2에 보존 → DataNode 생성 재시도
  원본 손실은 복구 불가 → 원본 보존이 최우선
```

## OU 내장 뷰어 (모든 파일 형식이 OU 안에서 렌더링되어야 함)

```
PDF       → PDF.js
이미지     → 기본 렌더링
영상       → YouTube 임베드 or 내장 플레이어
PPT       → 슬라이드 렌더링
MD        → 마크다운 렌더링
CSV       → 표 렌더링
.ou       → OU 네이티브 뷰어

→ 외부 앱 의존도를 점차 0으로 줄이는 것이 목표
→ .ou 시대의 전제 조건
```

---

## 파일 형식별 데이터화 로직

```
LLM 채팅:
  트리플화 염두에 둔 답변 생성 (OU 고유 해자)
  출처 A: source_type='generated', confidence='high'

이미지:
  Gemini Vision OCR → 텍스트 추출 → sentences
  출처 B: source_type='extracted', confidence='medium'

PDF:
  텍스트 추출 → sections/sentences
  이미지 포함 시 → OCR, 표 포함 시 → 표 DataNode 별도

PPT:
  슬라이드별 → section, 제목 → heading, 본문 → sentences

YouTube URL:
  트랜스크립트 → sections → sentences → triples
  영상 임베드 URL 보존 + 타임스탬프 → source_location

CSV/XLSX:
  행별 → DataNode, 컬럼 → domain_data 필드 매핑

붙여넣기 (텍스트):
  부고문자 → schedule + relation DataNode 자동 생성
  청첩장   → schedule DataNode (날짜/장소/인물)
  배송문자 → task DataNode
```

---

## 관리자 기본 DB

```
목적 1: LLM 정확도 향상
  기본 DB 없을 때: LLM 추론 → confidence: 'medium' (틀릴 수 있음)
  기본 DB 있을 때: 검증된 앵커로 LLM이 정확하게 채움 → confidence: 'high'

  예시: "나 이번에 사피엔스 읽을까 해"
    기본 DB 없음: "사피엔스" 단순 텍스트 저장, 빈약한 뷰
    기본 DB 있음: 저자/장르/핵심 개념/관련 도서 자동 매핑

목적 2: 입력 장벽 낮춤
  사용자가 짧게 말해도 → 시스템이 채워줌
  "사피엔스 읽을까 해" → 저자/장르/핵심 개념 자동 매핑

공유 원칙 (비용 최적화):
  관리자 DataNode 복사 저장 금지 → 참조(reference)로만
  user_node_refs: {user_id, node_id, added_at}
  1개 저장 = N명 공유

구축 우선순위:
  1순위: 도서/인물/개념/장소/대중콘텐츠 (범용)
  2순위: 한의학/의학 등 도메인 특화
  3순위: UNRESOLVED 엔티티 자동 추가 큐

검증 시스템 (자동 + 집단지성 + 관리자):
  1단계: 자동 에이전트 (주간 배치)
    외부 소스 대조 + LLM 재검증 + 트리플 일관성 검사
    정확 → last_verified_at 업데이트 (끝)
    의심/오류 → 집단지성 검토 큐 등록

  2단계: 집단지성 검토 (핵심)
    대상: 해당 DataNode 관련 DataNode를 가진 회원
          = 이 데이터에 관심 있을 가능성 높은 사람
    방식: 객관식 투표 (맞아요 / 틀려요 / 모르겠어요)
    효과: N명 "맞아요" → confidence = 'high' 자동 복원
          N명 "틀려요" → 관리자 최종 검토 큐
    부가효과:
      전문가(한의사, 의사 등)가 자신의 분야 검토
      → 관리자보다 정확한 검토 가능
      → 커뮤니티 소속감 + 기여도 → 미래 인센티브 연결

  3단계: 관리자 최종 검토 (최소화)
    집단지성으로 해소 안 된 것만 관리자에게
    관리자 대시보드: confidence 비율 + 집단지성 현황 + 미해소 목록
```

---

## 데이터 편집 원칙

```
케이스 1: 시스템 오류 → [오류 신고] → 경고 없이 수정
케이스 2: 사용자 실수 → [잘못 입력] → 경고 없이 수정
케이스 3: 의도적 변경
  일반 필드 수정: 경고 없음
  태그/속성 수정: "뷰 필터에 영향을 줄 수 있어요" 경고
  트리플/관계 수정: "학습된 지식 구조가 영향받아요. 연결 노드 N개 영향" 강력 경고

데이터는 삭제되지 않는다:
  모든 삭제/수정 → message_events 테이블에 이력 기록
  원본은 항상 보존
```
