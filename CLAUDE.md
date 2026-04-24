# OU (OWN UNIVERSE) — CLAUDE.md

> Claude Code가 항상 먼저 읽는 파일. 100줄 이내 유지.
> 상세 내용은 각 하위 문서 참조.

---

## ⚠️ 메타 원칙 (Claude Code 필독)

```
OU는 특정 도메인(한의학 등)에 종속된 서비스가 아니다.
어떤 도메인의 데이터든 수집하고, 어떤 뷰로든 꺼내 쓰는 플랫폼이다.

한의학/본초/경혈은 관리자가 구축한 첫 번째 도메인 예시일 뿐.
코드, UI, 아키텍처 어디에도 특정 도메인이 하드코딩되면 안 된다.
도메인은 data_nodes.domain 필드로 확장하는 구조.
```

---

## 한 줄 정의

**개인 데이터 우주 OS. 말하면 저장되고, 찾으면 뷰가 된다.**
메인 카피: **Just talk.**

---

## OU의 구조

```
OU OS = 공통 백엔드 (DB + 파이프라인 + 인증)
Orb   = 모듈 조합으로 만든 SaaS 앱 (OU 백엔드 공유)
모듈  = 원자적 프론트엔드 컴포넌트 (Input / Display / Logic)
```

> LLM 입력창은 Orb가 아니다. Input 모듈 중 하나일 뿐이다.
> Orb = 여러 모듈이 조합된 완전한 앱 (여러 페이지 가능).

---

## 필독 문서 맵

| 파일 | 역할 | 읽어야 할 때 |
|------|------|------------|
| `CLAUDE.md` | 이 파일. 전역 원칙 | 항상 |
| `PLANNING.md` | 인덱스 + 불변 원칙 | 항상 |
| `docs/PROTOTYPE.md` | 프로토타입 아키텍처 + 채널 설계 | 파이프라인/채널 작업 시 |
| `VISION.md` | 서비스 비전, 킬러 데모 | UX/방향 판단 시 |
| `DATA.md` | 데이터 파이프라인 | 데이터 레이어 작업 시 |
| `DATA_STANDARD.md` | 데이터 저장 표준 (불변) | 스키마 작업 시 |
| `DB_SCHEMA.sql` | 전체 DB 스키마 | DB 작업 시 |
| `FRONTEND_DESIGN.md` | 프론트엔드 설계 | UI 구현 시 |
| `docs/ORB_DEV.md` | Orb 개발 체크리스트 + Lessons Learned | **Orb 개발 시 필독** |

---

## 핵심 용어 (전역 불변)

| 용어 | 정의 | 금지 표현 |
|------|------|-----------|
| **OU OS** | 공통 백엔드 위의 개인 데이터 운영체제 | — |
| **Orb** | 모듈 조합 SaaS 앱. OU 백엔드 공유 | 앱, 채팅창 |
| **모듈** | 원자적 프론트엔드 컴포넌트 | — |
| **DataNode** | 의미 단위로 구조화된 데이터. 그래프의 노드 하나 | 항목, 카드 |
| **데이터뷰 (DataView)** | DataNode를 원하는 형식으로 렌더링한 뷰 | 사전, 목록, 페이지 |
| **그래프뷰** | 노드=별, 엣지=중력으로 시각화한 데이터뷰 | — |
| **회원** | 로그인한 사용자. 개인 DB 보유 | 유저 |
| **관리자** | OU 팀. 생태계 첫 번째 생산자. 회원 중 1번 | — |
| **트리플** | subject-predicate-object. 온톨로지 기본 단위 | — |

---

## 채널 구조 (입력/조회/심화)

```
Quick 입력창  → Write Only.  LLM이 JSONB 추출. 사용자는 카테고리 의식 안 함.
Search 창     → Read Only.   내부 DB만 쿼리. 도메인 템플릿 뷰 즉시 렌더링.
Deeptalk      → Reason.      Search 맥락 주입 + 외부 확장. 긴 대화/연구/기획.
```

채널별 프롬프트는 반드시 분리한다 (PromptRegistry).
Search에 질문이 들어와도 내부 DB만 본다. 외부 검색은 Deeptalk.

---

## 데이터 파이프라인 원칙

```
Layer 1: 즉시 raw 저장 (실패 없음)
Layer 2: LLM 도메인 분류 + JSONB 추출 (sync, 빠름)
Layer 3: 트리플 추출 + 임베딩 (async, MVP 후순위)
```

**Layer 2 금지 사항:**
- 뷰 힌트(view_hint) 추출 금지 → 뷰는 프론트엔드 레지스트리가 결정
- 트리플 추출 금지 → Layer 3 몫
- 정규식/키워드 분류 금지 → LLM 의미 분류만

**트리플은 MVP에서 급하지 않다.** JSONB만 정확히 들어가면 모든 뷰를 구현할 수 있다.

---

## 전역 불변 제약

### 표준 서술어 (절대 추가/변경 금지)
```
is_a / part_of / causes / derived_from / related_to /
opposite_of / requires / example_of / involves / located_at / occurs_at
```

### 데이터 원칙
- **세션 없음**: 대화는 연속 스트림으로 쌓인다
- **데이터 불삭제**: 모든 변경은 이벤트로 기록
- **원본 보존 최우선**: 파싱 실패해도 원본은 R2에 반드시 저장
- **참조 공유**: 관리자 DataNode는 복사 저장 금지 → user_node_refs로만
- **필터 원칙**: 빈 결과가 나오는 필터는 표시하지 않는다
- **감정 스텔스**: emotion 도메인은 조용히 기록. 사용자 명시 요청 전까지 노출 금지

### UI / 디자인
- **색상**: 흰~흑 계열만. 유채색 배경·테두리 금지
- **예외**: 별(importance) → `var(--ou-accent-primary)`
- **인증 게이트**: 비로그인 버튼 `disabled` 금지 → 클릭 시 `/login`

### 데스크톱 퍼스트 (Desktop-First)
```
금지:
  → maxWidth: N px 으로 좁히는 모바일 패턴
  → 단일 컬럼 전용 레이아웃
  → CSS 미디어 쿼리 없는 반응형 부재

최소 요건:
  1. 정보 밀도: 대시보드/그리드/멀티컬럼
  2. 반응형: @media breakpoint 768px / 1024px / 1440px
  3. 인터랙션: hover 상태, 넓은 클릭 영역, 키보드 접근성

반응형 패턴:
  → CSS Modules (.module.css)에 미디어 쿼리 작성
  → 인라인 스타일은 정적 값만, 반응형은 CSS 클래스로
```

### 아키텍처
- **뷰 레지스트리**: 새 뷰 추가 = 등록만. 기존 코드 수정 금지
- **API 키**: 서버사이드 only. 클라이언트 노출 절대 금지
- **그래프뷰**: 60fps 필수. 심미성 > 성능 타협 금지

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Framework | Next.js 14 (App Router) + TypeScript |
| UI | 순수 CSS 토큰 시스템 + Phosphor Icons |
| State | Zustand |
| 그래프 | PixiJS (WebGL) + d3-force Web Worker |
| 인증 | Supabase Auth |
| SQL DB | Supabase PostgreSQL → Neon (성장 시) |
| 벡터 DB | pgvector → Pinecone (100만 벡터 시) |
| LLM 채팅 | Claude Sonnet (스트리밍) |
| LLM 배치 | Claude Haiku (구조화/추출) |
| LLM Fallback | OpenAI |
| 임베딩 | text-embedding-3-small |
| OCR | Gemini Vision |
| 파일 스토리지 | Cloudflare R2 |
| 캐싱 | Upstash Redis |
| 실시간 | Supabase Realtime → Pusher (성장 시) |
| 배포 | Vercel / ouuniverse.com |

---

## 프로젝트 구조

```
ou-web/
├── CLAUDE.md              # 이 파일
├── PLANNING.md            # 문서 인덱스
├── docs/                  # 기획 문서
│   ├── PROTOTYPE.md       # 프로토타입 아키텍처 (최신)
│   ├── VISION.md
│   ├── DATA.md
│   ├── DATA_STANDARD.md
│   ├── PLATFORM.md
│   ├── VIEWS.md
│   ├── BUSINESS.md
│   ├── TECH.md
│   ├── ROADMAP.md
│   ├── IDEAS.md
│   └── FRONTEND_DESIGN.md
├── supabase/
│   └── DB_SCHEMA.sql
└── src/
    ├── app/               # 라우트
    │   ├── (auth)/        # login, terms-agree
    │   ├── (public)/      # / (랜딩)
    │   └── (private)/     # /home, /orb, /accuracy, /feed,
    │                      # /messages, /admin, /settings
    ├── components/
    │   ├── graph/         # PixiJS 그래프뷰
    │   ├── views/         # 데이터뷰 컴포넌트 (registry.ts 기반)
    │   └── ui/            # 공통 UI
    ├── lib/
    │   ├── pipeline/      # DataNode 생성 파이프라인 (Layer 1/2/3)
    │   ├── llm/           # LLM Provider 추상화 + PromptRegistry
    │   ├── workers/       # Web Workers (graph-physics)
    │   └── utils/
    ├── stores/            # Zustand 스토어
    └── types/             # TypeScript 타입 정의
```

---

## 라우트 네이밍 (전역 불변)

| 라우트 | 공식 이름 |
|--------|-----------|
| `/` | 랜딩페이지 |
| `/home` | 홈 (로그인/비로그인 통합) |
| `/orb` | Orb 전체창 |
| `/accuracy` | 정확도 높이기 |
| `/feed` | SNS 채널 |
| `/messages` | OU 채팅 |
| `/admin` | 관리자 패널 |

---

## 개발 워크플로우

```
1. 관련 문서 읽기 (위 파일 맵 참조)
2. 체크리스트 생성
3. 구현
4. pnpm build 확인 (타입 에러 없음)
5. 검증 루프
6. git commit + git push origin <branch>
```

### 개발 규칙 (절대 준수)

```
- 코드 수정 후 반드시 사용자에게 확인 요청 전 pnpm build 통과 확인
- dev 서버(pnpm dev) 실행 중 pnpm build / rm -rf .next 절대 금지
- 1개 파일 동시에 수정 금지
- 에러 원인 모르면 추측 수정 금지 → 로그/콘솔 에러 메시지 확인 우선
- 사용자에게 rm -rf .next && pnpm dev 반복 요청 금지
```

---

## 대화 자동 기록 (OU 연동)

```
- 작업 시작 전, MCP 툴 mcp__ou__search_universe 또는 mcp__ou__get_context로 관련 기존 데이터를 검색한다
- 검색 결과가 있으면 기존 결정사항/맥락을 반영하여 응답한다
- 모든 응답 완료 후, MCP 툴 mcp__ou__record_message를 호출하여 대화를 기록한다
- 파라미터:
  - user_message: 사용자의 마지막 메시지
  - assistant_message: Claude의 응답 요약 (핵심 내용만, 200자 이내)
  - source: "claude_code"
- 예외: 단순 인사, 확인 응답 등 데이터 가치가 없는 대화는 기록하지 않는다
- MCP 서버 연결 실패 시 무시하고 계속 진행한다 (대화 흐름 차단 금지)
```

---

## 명령어 & 환경변수

```bash
pnpm dev      # 개발 서버 → http://localhost:3000
pnpm build    # 빌드 확인 (구현 완료 후 필수)
pnpm lint     # 린트
```

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=
CLOUDFLARE_R2_BUCKET=
CLOUDFLARE_R2_ACCESS_KEY=
CLOUDFLARE_R2_SECRET_KEY=
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=
```
