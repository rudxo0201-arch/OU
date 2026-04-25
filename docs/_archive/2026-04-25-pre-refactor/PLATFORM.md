# OU — PLATFORM.md

> 그룹, 구독, 소셜, 채팅 등 플랫폼 기능

---

## 그룹

### 테이블
- `groups`: id, name, description, owner_id, visibility (private/link/public)
- `group_members`: group_id, user_id, role, joined_at
- `group_invites`: id, group_id, token, created_by, expires_at, used_at

### 기능
- 그룹 내 데이터 공유 (data_nodes.group_id)
- 그룹 전용 메시지 (messages.group_id)
- 초대 링크 (토큰 기반, 만료 설정 가능)
- 역할: owner, admin, member

---

## 구독

### 테이블
- `subscriptions`: user_id, plan, token_limit, period_start/end

### 플랜
| 플랜 | LLM 모델 | 토큰 한도 |
|------|----------|-----------|
| free | Haiku | 제한적 |
| pro | Sonnet 4.5 | 넉넉함 |
| team | Sonnet 4.5 | 팀 공유 |

### BYOK (Bring Your Own Key)
- 회원이 자기 API 키 등록 → 직접 모델 선택
- 지원: Claude Opus, GPT-4o, Gemini 등
- 키 저장: `user_llm_keys` (암호화)

---

## 페르소나

### 테이블
- `personas`: user_id, handle, display_name, bio, is_default, visibility
- `persona_node_visibility`: persona_id, node_id, is_visible
- `persona_follows`: follower_persona_id, following_persona_id

### 개념
- 한 회원이 여러 페르소나 보유 가능
- 페르소나별 공개 노드 범위 설정
- 팔로우/팔로잉은 페르소나 단위

---

## 채팅 (OU 채팅)

### 테이블
- `chat_rooms`: id, created_at
- `chat_room_members`: room_id, user_id
- `chat_messages`: id, room_id, sender_id, content, node_id

### 특징
- DataNode 공유 가능 (node_id 첨부)
- Supabase Realtime 기반 (→ 성장 시 Pusher)

---

## 마켓

### 테이블
- `market_items`: seller_id, view_id, name, description, price_krw, thumbnail_url, purchase_count
- `market_purchases`: item_id, buyer_id, price_paid

### 개념
- 뷰 = 상품. 회원이 만든 뷰를 판매
- saved_views와 연결 (view_id)
