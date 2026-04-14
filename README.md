# OU_Real — 처음부터 끝까지 빌드 가이드

> OU(OWN UNIVERSE) 시스템 완전 구축 패키지.
> Phase 0 ~ 4 전체 포함.

---

## 📁 구조

```
OU_Real/
├── CLAUDE.md          ← Claude Code 항상 먼저 읽기
├── PLANNING.md
│
├── docs/              ← 기획 문서 11개
│   ├── VISION.md
│   ├── DATA.md
│   ├── DATA_STANDARD.md
│   ├── PLATFORM.md
│   ├── VIEWS.md
│   ├── BUSINESS.md
│   ├── TECH.md
│   ├── ROADMAP.md
│   ├── IDEAS.md
│   ├── FRONTEND_DESIGN.md   UI/UX 설계 + 컴포넌트
│   └── UIUX_SCREENS.md      화면별 상세 명세
│
├── supabase/
│   ├── DB_SCHEMA.sql
│   └── DB_SCHEMA_additions.sql
│
├── ou-design-system/  ← 디자인 시스템 원본
│
└── tasks/             ← 작업 지시서 17개
    ├── TASK_PHASE0_SETUP.md        ① 프로젝트 초기화
    │
    ├── TASK_PHASE1_AUTH.md         ② 인증
    ├── TASK_PHASE1_APPSHELL.md     ③ AppShell + Sidebar
    ├── TASK_PHASE1_CHAT.md         ④ OU-Chat (핵심)
    ├── TASK_PHASE1_VIEWS.md        ⑤ DataView 3종
    ├── TASK_PHASE1_GRAPHVIEW.md    ⑥ PixiJS 그래프뷰
    ├── TASK_PHASE1_ACCURACY.md     ⑦ 정확도 높이기
    ├── TASK_PHASE1_ADMIN.md        ⑧ 관리자 패널
    │
    ├── TASK_PHASE2_FILE_UPLOAD.md  ⑨  파일 업로드 + R2
    ├── TASK_PHASE2_VIEWER.md       ⑩  내장 뷰어 + 구독
    ├── TASK_PHASE2_SUBSCRIPTION.md ⑪  Pro 구독 + Stripe
    ├── TASK_PHASE2_GROUP_AI.md     ⑫  그룹 + AI 뷰 생성기
    ├── TASK_PHASE2_AGENT.md        ⑬  검증 에이전트 + 임베딩
    │
    ├── TASK_PHASE3_FEED.md              ⑭ SNS 채널
    ├── TASK_PHASE3_MESSAGES_MARKET.md   ⑮ OU 채팅 + 마켓
    ├── TASK_PHASE3_B2B.md               ⑯ B2B 교육
    │
    └── TASK_PHASE4_OU_FORMAT.md         ⑰ .ou 포맷 + 게임
```

---

## 🚀 시작 순서

### 1단계: Supabase DB 설정
```
Supabase 대시보드 → SQL Editor
  ① supabase/DB_SCHEMA.sql 실행
  ② supabase/DB_SCHEMA_additions.sql 실행
```

### 2단계: VS Code에서 OU_Real 열기
```
VS Code → File → Open Folder → OU_Real/
Claude Code 확장 설치 후 사용
```

### 3단계: .env.local 환경변수 입력 (미리 다 넣기)
```env
# Supabase (필수 — Phase 0부터)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# LLM (필수 — Phase 1부터)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=

# Cloudflare R2 (Phase 2)
CLOUDFLARE_R2_ENDPOINT=https://<id>.r2.cloudflarestorage.com
CLOUDFLARE_R2_BUCKET=ou-files
CLOUDFLARE_R2_ACCESS_KEY=
CLOUDFLARE_R2_SECRET_KEY=

# Upstash Redis (Phase 2)
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=

# Stripe (Phase 2)
STRIPE_SECRET_KEY=
STRIPE_PRICE_PRO=
STRIPE_PRICE_TEAM=
STRIPE_WEBHOOK_SECRET=

# Pinecone (Phase 4, 벡터 100만+ 시)
PINECONE_API_KEY=
PINECONE_INDEX=ou-sentences

# 기타
NEXT_PUBLIC_SITE_URL=https://ouuniverse.com
ADMIN_EMAIL_DOMAIN=ouuniverse.com
CRON_SECRET=
```

### 4단계: Claude Code에게 지시
```
각 TASK 파일을 순서대로:

"CLAUDE.md와 docs/FRONTEND_DESIGN.md, docs/UIUX_SCREENS.md를
 먼저 읽고, tasks/TASK_PHASE0_SETUP.md 실행해줘.
 새 Next.js 프로젝트를 처음부터 만드는 거야."

→ 완료 체크리스트 통과 확인
→ git commit
→ 다음 TASK 파일로 이동
```

---

## ⚠️ 핵심 원칙 (위반 금지)

```
1. 특정 도메인 하드코딩 금지 (domain 필드로)
2. 빈 뷰 사용자에게 표시 금지 (null 반환)
3. 유채색 배경/테두리 금지 (흰~흑만)
4. API 키 클라이언트 노출 금지
5. 그래프뷰 60fps 필수
6. 비로그인 버튼 disabled 금지 → /login
7. 새 뷰 추가 = 레지스트리 등록만
```
