# 작업 지시서 — Phase 0: 프로젝트 초기화

> Claude Code 실행용. 이 파일을 읽고 순서대로 실행한다.
> 완료 기준: `pnpm build` 타입 에러 없이 통과.

---

## 사전 읽기 (필수)

```
CLAUDE.md        → 전역 원칙, 프로젝트 구조, 불변 제약
TECH.md          → 기술 스택 확정본
FRONTEND_DESIGN.md → 디자인 시스템, 레이아웃, 불변 UI 규칙
```

---

## 컨텍스트

완전히 새로운 프로젝트다. 기존 코드 없음. 아래 순서로 처음부터 구축한다.

---

## Step 1. Next.js 프로젝트 생성

```bash
pnpm create next-app@14 ou-web \
  --typescript \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-tailwind \
  --no-eslint

cd ou-web
```

> `--no-tailwind`: Mantine을 쓴다. Tailwind 불필요.
> `--no-eslint`: 나중에 직접 설정.

생성 후 기본 파일 정리:
```bash
# 기본 생성된 불필요 파일 삭제
rm -rf app/page.tsx app/globals.css public/vercel.svg public/next.svg
```

---

## Step 2. 의존성 설치

### 핵심 UI
```bash
pnpm add @mantine/core @mantine/hooks @mantine/dates \
  @mantine/notifications @mantine/modals \
  @phosphor-icons/react \
  @tabler/icons-react
```

### 상태 관리
```bash
pnpm add zustand immer
```

### 인증 + DB
```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

### LLM + AI
```bash
pnpm add ai @anthropic-ai/sdk openai @google/generative-ai
```

### 그래프 (PixiJS + d3-force)
```bash
pnpm add pixi.js @pixi/react d3-force
pnpm add -D @types/d3-force
```

### 유틸
```bash
pnpm add dayjs clsx lodash-es
pnpm add -D @types/lodash-es
```

### Mantine PostCSS 설정
```bash
pnpm add -D postcss postcss-preset-mantine postcss-simple-vars
```

---

## Step 3. 폴더 구조 + 문서 배치

CLAUDE.md의 프로젝트 구조를 그대로 생성한다.

```bash
# 기획 문서 — docs/ 에 아래 파일 전부 복사 (누락 금지)
mkdir -p docs
# 복사 대상 (전부 필수):
#   VISION.md            서비스 비전, 킬러 데모, 온보딩
#   DATA.md              데이터 파이프라인, 트리플 아키텍처
#   DATA_STANDARD.md     데이터 저장 표준 (불변)
#   PLATFORM.md          플랫폼 레이어
#   VIEWS.md             데이터뷰 시스템
#   BUSINESS.md          수익화 + 교육 시장
#   TECH.md              기술 스택 + 보안 + 비용
#   ROADMAP.md           개발 Phase + AI 에이전트 + KPI
#   IDEAS.md             아이디어 로그
#   FRONTEND_DESIGN.md   ← UI 구현 시 반드시 읽어야 할 파일
#                           디자인 시스템 토큰, 레이아웃, 컴포넌트 명세,
#                           UX 플로우, 컴포넌트 재사용 전략 포함

# 디자인 시스템 원본 자산 — ou-design-system/ 을 프로젝트 루트에 복사
# 구조:
#   ou-design-system/
#     design-system/     colors, typography, spacing, shape, icons, principles
#     css-modules/       Sidebar, MobileNav, AppShell, WorkspaceLayout CSS
#     ui-components/     Sidebar, AppShell, MobileNav 등 기존 컴포넌트 원본
#     constants/         brand.ts, meridianColors.ts
#     assets/            TaegeukIcon.tsx, ux-flow.svg
#
# ⚠️ 기존 컴포넌트(ui-components/)는 참조용이지 그대로 복사하는 파일이 아님
#    FRONTEND_DESIGN.md "컴포넌트 재사용 전략" 섹션을 먼저 읽고 판단

# Supabase 스키마
mkdir -p supabase
# 복사 대상:
#   DB_SCHEMA.sql              메인 스키마 (전체 테이블)
#   DB_SCHEMA_additions.sql    subscriptions + token_usage 추가분

# 소스 디렉토리
mkdir -p src/app/\(auth\)/login
mkdir -p src/app/\(auth\)/terms-agree
mkdir -p src/app/\(public\)
mkdir -p src/app/\(private\)/my
mkdir -p src/app/\(private\)/chat
mkdir -p src/app/\(private\)/accuracy
mkdir -p src/app/\(private\)/admin
mkdir -p src/app/\(private\)/settings
mkdir -p src/components/graph
mkdir -p src/components/chat
mkdir -p src/components/views
mkdir -p src/components/ui
mkdir -p src/lib/pipeline
mkdir -p src/lib/llm
mkdir -p src/lib/workers
mkdir -p src/lib/utils
mkdir -p src/stores
mkdir -p src/types
```

---

## Step 4. 디자인 시스템 파일 설정

### 4-1. `src/theme.ts`

FRONTEND_DESIGN.md의 B&W 팔레트 기반. 아래 내용 그대로 작성:

```typescript
'use client';
import { createTheme, MantineColorsTuple } from '@mantine/core';

const brand: MantineColorsTuple = [
  '#f5f5f5', '#e8e8e8', '#d1d1d1', '#a3a3a3', '#737373',
  '#525252', '#1a1a1a', '#141414', '#0a0a0a', '#000000',
];

export const theme = createTheme({
  fontFamily: '"Pretendard Variable", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  primaryColor: 'brand',
  defaultRadius: 'md',
  colors: {
    brand,
    dark: [
      '#C9C9C9', '#b8b8b8', '#828282', '#696969', '#424242',
      '#3b3b3b', '#2e2e2e', '#242424', '#1f1f1f', '#141414',
    ],
  },
  headings: { fontWeight: '600' },
  components: {
    ActionIcon: {
      defaultProps: { variant: 'subtle', color: 'gray' },
    },
    Paper: {
      defaultProps: { shadow: 'none' },
      styles: {
        root: { border: '0.5px solid var(--mantine-color-default-border)' },
      },
    },
  },
});
```

### 4-2. `src/app/globals.css`

```css
/* Pretendard 웹폰트 */
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');

/* Mantine 핵심 스타일 */
@layer mantine;

/* 다크모드 배경 — PixiJS 캔버스 #060810과 완전 일치 */
[data-mantine-color-scheme="dark"] {
  --mantine-color-body: #060810;
}
[data-mantine-color-scheme="dark"] body {
  background: #060810;
}

/* 반응형 유틸 */
@media (max-width: 768px) {
  .mobile-no-margin-right { margin-right: 0 !important; }
  .landing-container { flex-direction: column !important; }
  .landing-graph { height: 50vh !important; flex: none !important; }
  .landing-content { width: 100% !important; height: 50vh !important; flex: none !important; padding: 0 24px; }
}
```

### 4-3. `postcss.config.js`

```js
module.exports = {
  plugins: {
    'postcss-preset-mantine': {},
    'postcss-simple-vars': {
      variables: {
        'mantine-breakpoint-xs': '36em',
        'mantine-breakpoint-sm': '48em',
        'mantine-breakpoint-md': '62em',
        'mantine-breakpoint-lg': '75em',
        'mantine-breakpoint-xl': '88em',
      },
    },
  },
};
```

---

## Step 5. 앱 레이아웃 설정

### `src/app/layout.tsx`

```typescript
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';
import './globals.css';

import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { theme } from '@/theme';

export const metadata = {
  title: 'OU — Just talk.',
  description: '대화하는 족족 데이터가 됩니다.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
      </head>
      <body>
        <MantineProvider theme={theme} defaultColorScheme="dark">
          <ModalsProvider>
            <Notifications position="top-right" />
            {children}
          </ModalsProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
```

---

## Step 6. 환경변수 파일 생성

### `.env.local.example`

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# LLM APIs (서버사이드 only — 절대 NEXT_PUBLIC_ 붙이지 말 것)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=

# Cloudflare R2
CLOUDFLARE_R2_BUCKET=
CLOUDFLARE_R2_ACCESS_KEY=
CLOUDFLARE_R2_SECRET_KEY=
CLOUDFLARE_R2_ENDPOINT=

# Upstash Redis
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=

# Admin
ADMIN_EMAIL_DOMAIN=ouuniverse.com
```

```bash
cp .env.local.example .env.local
# 실제 값은 직접 채울 것
```

---

## Step 7. Supabase 연결 유틸

### `src/lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### `src/lib/supabase/server.ts`

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}
```

---

## Step 8. 기본 타입 정의

### `src/types/index.ts`

DATA_STANDARD.md 기반. 핵심 타입만:

```typescript
// 도메인 타입 (DATA_STANDARD.md 불변)
export type DataNodeDomain =
  | 'schedule' | 'task' | 'habit' | 'knowledge'
  | 'idea' | 'relation' | 'emotion' | 'finance'
  | 'product' | 'broadcast' | 'education'
  | 'media' | 'location' | 'unresolved';

// 표준 서술어 (절대 추가/변경 금지)
export type TriplePredicate =
  | 'is_a' | 'part_of' | 'causes' | 'derived_from'
  | 'related_to' | 'opposite_of' | 'requires'
  | 'example_of' | 'involves' | 'located_at' | 'occurs_at';

export type Confidence = 'high' | 'medium' | 'low';
export type Visibility = 'private' | 'link' | 'public';
export type StorageTier = 'hot' | 'warm' | 'cold';
export type UserLevel = 'unknown' | 'basic' | 'intermediate' | 'expert';

// 구독 플랜
export type SubscriptionPlan = 'free' | 'pro' | 'team';
```

---

## Step 9. DB 스키마 적용

```bash
# supabase/ 폴더에 아래 파일 복사
# 1. DB_SCHEMA.sql (메인 스키마)
# 2. DB_SCHEMA_additions.sql (subscriptions + token_usage)
```

Supabase 대시보드 → SQL Editor에서 순서대로 실행:
1. `DB_SCHEMA.sql` 전체 실행
2. `DB_SCHEMA_additions.sql` 전체 실행

> 또는 Supabase CLI 사용:
> ```bash
> supabase db push --db-url <your-db-url>
> ```

---

## Step 10. 라우트 플레이스홀더 생성

빌드 통과용. 내용은 다음 Phase에서 구현.

```typescript
// src/app/(public)/page.tsx
export default function LandingPage() {
  return <div>OU — Just talk. (랜딩 준비 중)</div>;
}

// src/app/(auth)/login/page.tsx
export default function LoginPage() {
  return <div>로그인 준비 중</div>;
}

// src/app/(private)/chat/page.tsx
export default function ChatPage() {
  return <div>OU-Chat 준비 중</div>;
}

// src/app/(private)/my/page.tsx
export default function MyPage() {
  return <div>내 우주 준비 중</div>;
}

// src/app/(private)/accuracy/page.tsx
export default function AccuracyPage() {
  return <div>정확도 높이기 준비 중</div>;
}

// src/app/(private)/admin/page.tsx
export default function AdminPage() {
  return <div>관리자 패널 준비 중</div>;
}
```

---

## Step 11. next.config.ts 설정

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['@mantine/core', '@mantine/hooks', '@phosphor-icons/react'],
  },
};

export default nextConfig;
```

---

## Step 12. 빌드 검증

```bash
pnpm build
```

**통과 기준:**
- 타입 에러 0개
- 빌드 에러 0개
- 경고는 허용 (추후 정리)

---

## Step 13. git 초기화 + 첫 커밋

```bash
git init
git add .
git commit -m "chore: Phase 0 프로젝트 초기화

- Next.js 14 App Router + TypeScript
- Mantine v7 + Phosphor Icons
- Supabase Auth + PostgreSQL 연결
- 디자인 시스템 (theme.ts, globals.css)
- 기본 폴더 구조 (CLAUDE.md 기준)
- 기본 타입 정의 (DataNodeDomain, TriplePredicate)
- 라우트 플레이스홀더 생성
- pnpm build 통과 확인"

git remote add origin <repository-url>
git push -u origin main
```

---

## 완료 체크리스트

```
[ ] pnpm build 타입 에러 없이 통과
[ ] src/ 폴더 구조 CLAUDE.md와 일치
[ ] theme.ts B&W 팔레트 적용
[ ] globals.css 다크모드 #060810 배경 적용
[ ] .env.local.example 작성 완료
[ ] Supabase 연결 유틸 (client.ts, server.ts)
[ ] 기본 타입 (DataNodeDomain, TriplePredicate) 정의
[ ] DB_SCHEMA.sql + DB_SCHEMA_additions.sql Supabase 적용
[ ] 라우트 플레이스홀더 6개 생성
[ ] git 첫 커밋 완료
```

---

## 다음 작업 (Phase 1 - Step 1)

이 작업 완료 후:

**TASK_PHASE1_AUTH.md** → Supabase Auth 인증 구현
- Google OAuth + 이메일 verify
- 미들웨어 (비로그인 → /login 리다이렉트)
- 관리자 역할 체크
- 온보딩 대화 흐름
