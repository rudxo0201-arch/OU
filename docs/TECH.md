# OU — TECH.md

> 기술 스택, LLM 라우팅, 보안, 비용 관리

---

## 기술 스택

| 영역 | 기술 | 비고 |
|------|------|------|
| Framework | Next.js 14 (App Router) + TypeScript | |
| UI | Mantine v7 + Phosphor Icons | |
| State | Zustand | |
| 그래프 | PixiJS (WebGL) + d3-force Web Worker | 60fps 필수 |
| 인증 | Supabase Auth | OAuth + 이메일 |
| SQL DB | Supabase PostgreSQL | → Neon (성장 시) |
| 벡터 DB | pgvector | → Pinecone (100만 벡터 시) |
| LLM 채팅 | Claude Sonnet 4.5 (스트리밍) | |
| LLM 배치 | Claude Haiku (구조화/추출) | |
| LLM Fallback | OpenAI gpt-4o-mini | |
| 임베딩 | text-embedding-3-small | OpenAI |
| OCR | Gemini Vision | |
| 파일 스토리지 | Cloudflare R2 | |
| 캐싱 | Upstash Redis | |
| 실시간 | Supabase Realtime | → Pusher (성장 시) |
| 결제 | Stripe | |
| 에러 추적 | Sentry | |
| 배포 | Vercel | ouuniverse.com |

---

## LLM 라우팅

파일: `src/lib/llm/router.ts`, `src/lib/llm/models.ts`

### chatWithFallback()
1. 플랜별 모델 선택: free → Haiku, pro → Sonnet 4.5
2. BYOK 있으면 유저 키로 직접 호출
3. 실패 시 OpenAI gpt-4o-mini로 폴백
4. 모든 호출 `logLLMCall()`로 기록

### completeWithFallback()
- 배치 작업 (도메인 분류, enrichment 등)
- 항상 Haiku (비용 최적화)

### 비용 테이블 (1M 토큰당)

| 모델 | 입력 | 출력 |
|------|------|------|
| claude-haiku-4-5 | $0.25 | $1.25 |
| claude-sonnet-4-5 | $3 | $15 |
| claude-opus-4-6 | $15 | $75 |
| gpt-4o | $2.5 | $10 |
| gpt-4o-mini | $0.15 | $0.6 |
| gemini-2.0-flash | $0.10 | $0.40 |
| gemini-2.5-pro | $1.25 | $10 |

---

## Supabase 클라이언트

| 클라이언트 | 파일 | 키 | 용도 |
|-----------|------|-----|------|
| Browser | `src/lib/supabase/client.ts` | Anon | 클라이언트 사이드 |
| Server | `src/lib/supabase/server.ts` | Anon (SSR) | 서버 컴포넌트 (RLS 적용) |
| Admin | `src/lib/supabase/admin.ts` | Service Role | API 라우트 (RLS 우회) |

---

## 인증/권한

파일: `src/lib/auth/roles.ts`

### 관리자 판별
- `ADMIN_EMAILS` 환경변수 (쉼표 구분)
- 또는 `ADMIN_EMAIL_DOMAIN` (기본: ouuniverse.com)

### 관리자 세션
- 30분 타임아웃 (개발: 24시간)
- 쿠키 기반 활동 추적 (`admin_last_activity`)

### 권한
- admin.access, admin.users.manage, admin.data.manage
- admin.views.manage, admin.roles.manage
- admin.db.read, admin.db.write
- chat.use, data.create, data.view_own, data.view_public
- views.create, views.share

---

## 보안

- API 키: 서버사이드 only. 클라이언트 노출 절대 금지
- RLS: Supabase Row Level Security로 데이터 격리
- BYOK 키 암호화 저장 (`user_llm_keys`)
- Admin 라우트 미들웨어 보호

---

## 비용 모니터링

### 테이블
- `api_cost_log`: operation, model, tokens, cost_usd, user_id, node_id
- `token_usage`: user_id, operation, tokens_used, llm_tokens_actual
- `llm_call_log`: 전체 LLM 호출 기록

### 관리자 대시보드
- `/api/admin/tables/api_cost_log` → 비용 조회
- 모델별/유저별/기간별 비용 분석
