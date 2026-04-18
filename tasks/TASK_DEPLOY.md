# 작업 지시서 — 배포: GitHub → Vercel → ouuniverse.com

> 실행 시점: TASK_PHASE0_SETUP.md 완료 직후 (Phase 1 시작 전)
> 완료 기준: https://ouuniverse.com 접속 시 OU 랜딩페이지 표시

---

## 전체 순서

```
① GitHub 저장소 생성 + 코드 푸시
② Vercel 프로젝트 연결
③ 환경변수 Vercel에 입력
④ ouuniverse.com 도메인 연결
⑤ 자동 배포 확인
```

---

## Step 1. GitHub 저장소 생성

### 터미널에서 실행

```bash
# 프로젝트 루트 (ou-web/)에서
git init
git add .
git commit -m "chore: Phase 0 초기 셋업"

# GitHub에서 저장소 생성 후 (ou-web 이름 권장)
git remote add origin https://github.com/<your-username>/ou-web.git
git branch -M main
git push -u origin main
```

### GitHub 저장소 설정 (github.com에서)

```
Settings → Branches → Branch protection rules:
  main 브랜치 보호:
  ✅ Require pull request reviews
  ✅ Require status checks to pass

Settings → Secrets and variables → Actions:
  (Vercel이 자동으로 처리하므로 별도 설정 불필요)
```

---

## Step 2. Vercel 프로젝트 연결

### vercel.com에서

```
1. vercel.com 로그인 (GitHub 계정으로)
2. "Add New Project" 클릭
3. GitHub 저장소 선택: ou-web
4. Framework Preset: Next.js (자동 감지)
5. Root Directory: ./ (기본값)
6. "Deploy" 클릭 (환경변수는 다음 Step에서)
```

### vercel.json 생성 (루트에)

```json
{
  "crons": [
    {
      "path": "/api/cron/verify",
      "schedule": "0 17 * * 1"
    }
  ],
  "functions": {
    "src/app/api/chat/route.ts": {
      "maxDuration": 60
    },
    "src/app/api/upload/route.ts": {
      "maxDuration": 60
    },
    "src/app/api/views/generate/route.ts": {
      "maxDuration": 60
    }
  }
}
```

> `maxDuration 60`: 스트리밍/업로드/AI 생성은 기본 10초로 타임아웃됨. 60초로 확장.

---

## Step 3. 환경변수 Vercel에 입력

### vercel.com → Project → Settings → Environment Variables

아래 변수를 **Production + Preview + Development** 전체에 입력:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL          = (Supabase 대시보드에서 복사)
NEXT_PUBLIC_SUPABASE_ANON_KEY     = (Supabase 대시보드에서 복사)
SUPABASE_SERVICE_ROLE_KEY         = (Supabase 대시보드에서 복사, 절대 공개 금지)

# LLM
ANTHROPIC_API_KEY                 = (Anthropic Console에서)
OPENAI_API_KEY                    = (OpenAI Platform에서)
GEMINI_API_KEY                    = (Google AI Studio에서)

# Cloudflare R2 (Phase 2)
CLOUDFLARE_R2_ENDPOINT            = https://<account-id>.r2.cloudflarestorage.com
CLOUDFLARE_R2_BUCKET              = ou-files
CLOUDFLARE_R2_ACCESS_KEY          = (Cloudflare 대시보드에서)
CLOUDFLARE_R2_SECRET_KEY          = (Cloudflare 대시보드에서)

# Upstash Redis (Phase 2)
UPSTASH_REDIS_URL                 = (Upstash Console에서)
UPSTASH_REDIS_TOKEN               = (Upstash Console에서)

# Stripe (Phase 2)
STRIPE_SECRET_KEY                 = (Stripe Dashboard에서)
STRIPE_PRICE_PRO                  = price_xxx
STRIPE_PRICE_TEAM                 = price_xxx
STRIPE_WEBHOOK_SECRET             = (Stripe Webhook 설정 후)

# 기타
NEXT_PUBLIC_SITE_URL              = https://ouuniverse.com
ADMIN_EMAIL_DOMAIN                = ouuniverse.com
CRON_SECRET                       = (랜덤 문자열 생성: openssl rand -hex 32)
```

> Phase 2 이전에는 R2, Redis, Stripe 없어도 됨.
> 나중에 추가하면 자동 재배포됨.

---

## Step 4. ouuniverse.com 도메인 연결

### Vercel에서 도메인 추가

```
vercel.com → Project → Settings → Domains
"Add Domain" → ouuniverse.com 입력 → Add
```

Vercel이 DNS 레코드를 보여줌:

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 도메인 등록업체에서 DNS 설정

도메인 구매처(가비아, 후이즈, Cloudflare 등) → DNS 관리:

```
A 레코드:
  호스트: @
  값: 76.76.21.21
  TTL: 300 (또는 Auto)

CNAME 레코드:
  호스트: www
  값: cname.vercel-dns.com
  TTL: 300
```

> Cloudflare를 DNS로 쓴다면:
> Cloudflare → 도메인 선택 → DNS → Records 추가
> Proxy status: DNS only (회색 구름) ← Vercel과 충돌 방지

### 연결 확인

```
Vercel 대시보드 → Domains:
  ✅ ouuniverse.com    Valid Configuration
  ✅ www.ouuniverse.com Valid Configuration

브라우저에서:
  https://ouuniverse.com → OU 랜딩페이지 표시
```

> DNS 전파에 최대 48시간 소요. 보통 5~30분.

---

## Step 5. Supabase Auth Redirect URL 추가

Supabase 대시보드 → Authentication → URL Configuration:

```
Site URL:
  https://ouuniverse.com

Redirect URLs (전부 추가):
  https://ouuniverse.com/auth/callback
  https://ouuniverse.com/**
  http://localhost:3000/auth/callback    ← 개발용
  http://localhost:3001/auth/callback   ← 포트 다를 때
```

---

## Step 6. 자동 배포 확인

```bash
# 코드 변경 후 푸시하면 자동 배포
git add .
git commit -m "feat: 기능 추가"
git push origin main
```

```
Vercel 대시보드에서 확인:
  Deployments → 최신 배포 → Status: Ready ✅
  약 1~2분 소요
```

---

## Step 7. Stripe Webhook 설정 (Phase 2 시)

```
Stripe Dashboard → Developers → Webhooks → Add endpoint

Endpoint URL: https://ouuniverse.com/api/billing/webhook
Events to send:
  ✅ checkout.session.completed
  ✅ customer.subscription.updated
  ✅ customer.subscription.deleted

Webhook Secret 복사 → Vercel 환경변수 STRIPE_WEBHOOK_SECRET에 입력
```

---

## Step 8. Vercel Cron 확인 (Phase 2 시)

```
vercel.json의 cron 설정이 있으면 자동 활성화됨.

Vercel 대시보드 → Project → Cron Jobs:
  /api/cron/verify    매주 월요일 02:00 KST (17:00 UTC)
  Status: Active ✅
```

---

## 완료 체크리스트

```
[ ] GitHub 저장소 생성 + main 브랜치 push
[ ] Vercel 프로젝트 연결 (GitHub 연동)
[ ] vercel.json 생성 (maxDuration 60, cron)
[ ] Vercel 환경변수 전부 입력
[ ] ouuniverse.com A 레코드 설정
[ ] www.ouuniverse.com CNAME 설정
[ ] Vercel Domains → Valid Configuration 확인
[ ] https://ouuniverse.com 접속 → 랜딩페이지 표시
[ ] Supabase Redirect URL 추가 (ouuniverse.com)
[ ] Google OAuth redirect URI 추가 (ouuniverse.com/auth/callback)
[ ] pnpm build 로컬에서 타입 에러 없이 통과 확인
```

---

## 브랜치 전략 (추천)

```
main      → 프로덕션 (ouuniverse.com)
dev       → 개발 (dev.ouuniverse.com 또는 Vercel Preview URL)

작업 흐름:
  feature/xxx 브랜치 → dev PR → main PR → 자동 배포
```

```bash
# dev 브랜치 생성
git checkout -b dev
git push -u origin dev

# Vercel에서 dev 브랜치도 자동 Preview 배포됨
```
