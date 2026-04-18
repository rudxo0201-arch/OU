# OU — DATA.md

> 데이터 파이프라인, 계층 구조, 도메인 분류

---

## 데이터 계층

```
messages → data_nodes → sections → sentences
                ↓
            triples ←── triple_sentence_sources ──→ sentences
                ↓
          node_relations (노드 간 관계)
```

---

## 3-Layer 파이프라인

### Layer 1: 메시지 저장
- 유저/어시스턴트 메시지를 `messages` 테이블에 저장
- `pair_id`로 Q&A 쌍 연결
- 파일: `src/app/api/chat/route.ts`

### Layer 2: 구조화 (동기)
- 메시지 → 도메인 분류 → DataNode 생성
- **도메인 분류**: 정규식 + 키워드 기반 (LLM 비용 없음)
- **도메인 데이터 추출**: 패턴 매칭으로 날짜, 금액, 감정 등 추출
- **업데이트 감지**: "아까 말한", "수정해줘" 등 → 기존 노드 업데이트
- **엔티티 추출**: LLM(Haiku)으로 인물, 장소, 사물 추출 → 별도 노드 생성/연결
- **미해결 엔티티**: 대명사, 빈 필드, 날짜 모호성 → `unresolved_entities` 기록
- 파일: `src/lib/pipeline/layer2.ts`, `extract-domain-data.ts`

### Layer 3: 임베딩 + 트리플 (비동기)
- `embedPendingSentences()`: 문장 벡터화 (text-embedding-3-small)
- `extractTriples()`: 트리플 추출 (subject-predicate-object)
- 파일: `src/lib/pipeline/layer3.ts`

---

## 14개 도메인

| 도메인 | 설명 | 추출 필드 |
|--------|------|-----------|
| schedule | 일정 | date, time, location, duration, title |
| task | 할 일 | title, priority, deadline |
| habit | 습관 | title, completion, duration, count |
| knowledge | 지식 | 범용 |
| idea | 아이디어 | title, description |
| relation | 인물 | name, phone, email, relationship |
| emotion | 감정 | mood, content |
| finance | 지출 | amount, category, items |
| product | 제품 | title, description |
| broadcast | 방송 | title |
| education | 교육 | title |
| media | 미디어 | video_id, title |
| location | 장소 | name, address |
| development | 개발 | files, errorType, techStack, actionType |

분류 실패 시 `unresolved`로 저장.

---

## 특수 데이터 소스

### YouTube 수집
- URL 감지 → 트랜스크립트 추출 → DataNode 생성
- 파일: `src/lib/pipeline/layer2-youtube.ts`

### 파일 업로드
- PDF, DOCX, XLSX, HWP, PPT → 텍스트 추출 → DataNode
- 이미지 → Gemini OCR → 텍스트
- 파일: `src/app/api/upload/route.ts`, `src/app/api/ocr/route.ts`

### 대화 수집
- 대화 내용 일괄 수집 → DataNode 생성
- 파일: `src/lib/pipeline/ingest-conversation.ts`

---

## 관리자 데이터

관리자(`is_admin_node: true`)가 구축하는 참조 데이터:
- **한자**: 98,682자 (Unihan DB 기반)
- **본초**: 504종 한약재
- **방제**: 200개 처방
- **서비스 소개**: OU 기능 설명 노드

관리자 노드는 `_admin_internal: true`로 일반 검색에서 제외되거나, `visibility: 'public'`으로 공개.
회원은 `user_node_refs`로 참조만 (복사 저장 금지).
