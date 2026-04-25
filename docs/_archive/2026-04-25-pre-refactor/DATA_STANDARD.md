# OU — DATA_STANDARD.md (불변)

> 이 문서의 내용은 변경 금지. 데이터 저장의 절대 표준.

---

## 핵심 테이블 구조

### data_nodes
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| user_id | uuid | FK → profiles |
| group_id | uuid | FK → groups (nullable) |
| message_id | uuid | FK → messages (nullable) |
| is_admin_node | boolean | 관리자 노드 여부 |
| domain | enum | 14개 도메인 중 하나 |
| source_type | text | chat, manual, extracted, youtube, dev_tool |
| confidence | enum | high, medium, low |
| resolution | text | resolved, opaque |
| visibility | enum | private, link, public |
| view_hint | text | 추천 뷰 타입 |
| domain_data | jsonb | 도메인별 구조화 데이터 |
| system_tags | text[] | 태그 배열 |
| raw | text | 원본 텍스트 |
| storage_tier | enum | hot, warm, cold |
| importance | integer | 중요도 (1-5) |
| created_at | timestamp | 생성일 |
| updated_at | timestamp | 수정일 |
| deleted_at | timestamp | 소프트 삭제 |

### sections
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| node_id | uuid | FK → data_nodes |
| heading | text | 섹션 제목 |
| order_idx | integer | 순서 |

### sentences
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| section_id | uuid | FK → sections |
| node_id | uuid | FK → data_nodes |
| text | text | 문장 텍스트 |
| order_idx | integer | 순서 |
| embed_status | text | pending, done, failed |

### triples
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| node_id | uuid | FK → data_nodes |
| section_id | uuid | FK → sections (nullable) |
| subject | text | 주어 (필수) |
| predicate | enum | 11개 표준 서술어 (필수) |
| object | text | 목적어 (필수) |
| source_level | text | 출처 계층 |
| source_type | text | 출처 타입 |
| confidence | enum | high, medium, low |

---

## 표준 서술어 (11개, 절대 추가/변경 금지)

| 서술어 | 의미 | 예시 |
|--------|------|------|
| is_a | ~이다 | 마황 is_a 발산풍한약 |
| part_of | ~에 속한다 | 마황 part_of 해표약 |
| causes | ~를 유발한다 | 풍한 causes 두통 |
| derived_from | ~에서 유래한다 | 마황탕 derived_from 상한론 |
| related_to | ~와 관련 있다 | 마황 related_to 에페드린 |
| opposite_of | ~의 반대이다 | 한 opposite_of 열 |
| requires | ~를 필요로 한다 | 마황탕 requires 마황 |
| example_of | ~의 예시이다 | 감기 example_of 외감병 |
| involves | ~에 관여한다 | 폐경 involves 마황 |
| located_at | ~에 위치한다 | 회의 located_at 강남역 |
| occurs_at | ~에 발생한다 | 출근 occurs_at 09:00 |

---

## 관계 테이블

### node_relations
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| source_node_id | uuid | FK → data_nodes |
| target_node_id | uuid | FK → data_nodes |
| relation_type | text | 관계 타입 |
| weight | float | 가중치 (0-1) |
| source | text | 출처 |
| metadata | jsonb | 도메인별 추가 정보 (예: 방제의 경우 `{"role":"군","dosage":"9g"}`) |

### triple_sentence_sources
| 컬럼 | 타입 | 설명 |
|------|------|------|
| triple_id | uuid | FK → triples |
| sentence_id | uuid | FK → sentences |

트리플과 문장은 N:M 관계. 한 문장에서 여러 트리플, 여러 문장에서 하나의 트리플 추론 가능.

---

## 도메인 데이터 (domain_data) 표준 필드

모든 도메인 데이터는 `data_nodes.domain_data` JSONB에 저장.

### 관리자 내부 마커
```json
{
  "_admin_internal": true,
  "_visibility_locked": true
}
```
- `_admin_internal: true` → 공개 검색에서 제외
- `_visibility_locked: true` → 비공개 고정

### 도메인별 필수 필드
- **schedule**: date, time, title
- **finance**: amount, category
- **emotion**: mood
- **relation**: name
- **habit**: title
- **knowledge**: (범용, 필수 필드 없음)
- **hanja**: type="hanja", char, unicode, radical_number, stroke_count, readings

---

## 불변 규칙

1. **원본 보존**: 파싱 실패해도 `raw` 필드에 원본 반드시 저장
2. **소프트 삭제**: `deleted_at` 타임스탬프 사용. 물리 삭제 금지
3. **참조 공유**: 관리자 노드는 복사 금지 → `user_node_refs`로만 참조
4. **필터 원칙**: 빈 결과가 나오는 필터는 표시하지 않는다
