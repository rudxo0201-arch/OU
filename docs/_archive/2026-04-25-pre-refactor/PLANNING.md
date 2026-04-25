# OU — PLANNING.md

> 문서 인덱스 + 불변 원칙. CLAUDE.md와 함께 항상 읽는다.

---

## 문서 인덱스

| 문서 | 위치 | 역할 |
|------|------|------|
| CLAUDE.md | `/CLAUDE.md` | 전역 원칙, 용어, 제약 |
| PLANNING.md | `/PLANNING.md` | 이 파일. 인덱스 + 불변 원칙 |
| VISION.md | `/docs/VISION.md` | 서비스 비전, 킬러 데모 |
| DATA.md | `/docs/DATA.md` | 데이터 파이프라인 |
| DATA_STANDARD.md | `/docs/DATA_STANDARD.md` | 데이터 저장 표준 |
| PLATFORM.md | `/docs/PLATFORM.md` | 플랫폼 레이어 |
| VIEWS.md | `/docs/VIEWS.md` | 데이터뷰 시스템 |
| BUSINESS.md | `/docs/BUSINESS.md` | 수익화 |
| TECH.md | `/docs/TECH.md` | 기술 스택 |
| ROADMAP.md | `/docs/ROADMAP.md` | 로드맵 |
| FRONTEND_DESIGN.md | `/docs/FRONTEND_DESIGN.md` | 프론트엔드 설계 |
| IDEAS.md | `/docs/IDEAS.md` | 아이디어 로그 |
| SCENARIOS.md | `/docs/SCENARIOS.md` | UX 시나리오 |

---

## 불변 원칙 (Invariants)

아래 원칙은 어떤 상황에서도 위반하지 않는다.

### 1. 도메인 중립
- OU는 특정 도메인에 종속되지 않는다
- 한의학, 한자 등은 관리자가 구축한 도메인 예시일 뿐
- 새 기능은 반드시 도메인 중립으로 설계

### 2. 데이터 아키텍처
```
messages → data_nodes → sections → sentences
                ↓
            triples ←── triple_sentence_sources ──→ sentences
```
- triples는 sentences의 자식이 아니다 (N:M 관계)
- 세션 없음: 대화는 연속 스트림
- 데이터 불삭제: 모든 변경은 이벤트로 기록
- 원본 보존 최우선

### 3. 표준 서술어 (절대 추가/변경 금지)
```
is_a / part_of / causes / derived_from / related_to /
opposite_of / requires / example_of / involves / located_at / occurs_at
```

### 4. UI/디자인
- 색상: 흰~흑 계열만. 유채색 배경/테두리 금지
- 예외: importance → `var(--mantine-color-yellow-5)`
- 인증 게이트: disabled 금지 → 클릭 시 `/login`

### 5. 아키텍처
- 뷰 레지스트리: 새 뷰 = 등록만. 기존 코드 수정 금지
- API 키: 서버사이드 only
- 그래프뷰: 60fps 필수
