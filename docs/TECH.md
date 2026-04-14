# TECH.md — 기술 스택 + 보안 + 비용 최적화

---

## 기술 스택 (확정)

| 영역 | 기술 | 비고 |
|------|------|------|
| Framework | Next.js 14 (App Router) | |
| Language | TypeScript | |
| UI | Mantine v7 + Phosphor Icons | 디자인 시스템 유지 |
| State | Zustand | |
| 그래프 렌더링 | PixiJS (WebGL) | GPU 가속 60fps |
| 물리 엔진 | d3-force in Web Worker | 메인스레드 블로킹 방지 |
| 인증 | Supabase Auth | 소셜 + 이메일 verify |
| SQL DB | Supabase PostgreSQL → Neon | 성장 시 마이그레이션 |
| 벡터 DB | pgvector → Pinecone | 100만 벡터 돌파 시 전환 |
| LLM (채팅) | Claude Sonnet | 실시간 스트리밍 |
| LLM (배치) | Claude Haiku | 구조화/추출 (20배 저렴) |
| 임베딩 | text-embedding-3-small | large 대비 5배 저렴 |
| OCR | Gemini Vision | |
| LLM Fallback | OpenAI | 장애 시 자동 전환 |
| 파일 스토리지 | Cloudflare R2 | Egress 비용 0원 |
| 캐싱 | Upstash Redis | |
| 실시간 | Supabase Realtime → Pusher | 성장 시 분리 |
| 배포 | Vercel | |
| 도메인 | ouuniverse.com | 확정 |
| 비밀번호 관리 | 1Password Team Vault | 관리자 계정 |

---

## LLM 멀티 프로바이더 전략 (필수)

```
하나에 종속 금지 (당연한 것):
  장애 시 자동 Fallback
  가격 협상력
  모델별 강점 활용
  사용자는 어떤 모델인지 모름

추상화 레이어:
  LLMProvider 인터페이스
  → AnthropicProvider (Claude) — 기본
  → OpenAIProvider (GPT) — Fallback
  → GeminiProvider (OCR/이미지)

용도별 모델:
  채팅: Claude Sonnet (품질, 스트리밍)
  배치: Claude Haiku (비용, 20배 저렴)
  임베딩: text-embedding-3-small
  OCR: Gemini Vision
```

---

## SQL vs 벡터 DB 분리

```
분리가 큰 문제가 아닌 이유:
  쿼리 패턴이 두 가지:
    A) 정확한 검색: "희민 결혼식", "4월 일정" → SQL 최적
    B) 의미 기반: "결혼 관련된 것", "비슷한 것" → 벡터 최적

  진입점 선택:
    정확한 키워드 → SQL
    의미/맥락 → 벡터
    결과 합쳐서 반환 (Hybrid Search)

  분리가 오히려 장점:
    SQL: 필터/정렬/집계 최적화
    벡터: 유사도 최적화
    각자 잘하는 것을 함

전환 시점: 벡터 100만 개 돌파 시 pgvector → Pinecone
           데이터가 빠르게 쌓일 것이므로 준비 필요
```

---

## 보안 원칙

```
회원:
  소셜/이메일 인증 필수 (귀찮아도 해야 함)
  이메일: verify 완료 후 가입 인준
  세션 타임아웃: 7일
  RLS (Row Level Security): 본인 데이터만 접근
  데이터 가시성 기본값: private (나만보기)
  개인정보 도메인(relation/emotion/finance) 공개 시 자동 경고

관리자:
  @ouuniverse.com 전용 이메일
  2FA 필수 (TOTP + 하드웨어 키)
  IP 화이트리스트
  1Password Team Vault (비밀번호 직접 열람 불가, 퇴사 시 즉시 회수)
  세션 타임아웃: 30분
  모든 액션 api_audit_log 기록

전송:
  HTTPS 전용
  API 키 서버사이드 only (클라이언트 노출 절대 금지)
```

---

## 비용 최적화 전략

### 임베딩 티어

```
Hot:   최근 7일 이내 / 자주 조회 → 실시간 벡터 검색
Warm:  7일 이상 / 조회 낮음    → 야간 배치 처리
Cold:  장기 미사용             → SQL 검색만 / 온디맨드 임베딩
```

### 스토리지 티어

```
Tier 1: PostgreSQL + 벡터 인덱스 (최근/자주)
Tier 2: PostgreSQL + 배치 임베딩 (중간 빈도)
Tier 3: Cloudflare R2 (아카이브, 원본 파일)
```

### 비용 추적

```
모든 API 호출 → api_cost_log:
  {operation, model, tokens, cost_usd, node_id, created_at}

비용 모니터링 에이전트:
  시간당 비용 임계값 초과 → 관리자 자동 알림
  비정상 사용 패턴 감지 → 즉시 알림
```

### Supabase → Neon 마이그레이션 시점

```
초기: Supabase (Auth + DB + Realtime 한 번에, 빠른 시작)
성장: Neon으로 DB만 분리 (비용 최적화, Vercel 궁합 최고)
이후: 규모에 맞게 추가 방안 탐색
이유: PostgreSQL 표준 사용으로 마이그레이션 비용 최소화
```
