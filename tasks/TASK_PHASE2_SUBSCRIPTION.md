# 작업 지시서 — Phase 2 Step 3: Pro 구독 + 토큰 제한 + 광고

> 선행 조건: TASK_PHASE2_VIEWER.md 완료
> 완료 기준: Free/Pro 토큰 게이지 동작 + 업그레이드 모달 + 광고 노출

---

## 사전 읽기

```
BUSINESS.md    수익화 계획, 구독 구조, 단일 게이지 UX, 광고 원칙
```

---

## 구현 목록

```
[ ] Free/Pro/Team 플랜 로직
[ ] 토큰 게이지 실시간 업데이트
[ ] 한도 초과 → 업그레이드 모달 (입력 내용 보존)
[ ] 뷰 생성 전 토큰 소비 안내
[ ] 광고 컴포넌트 (Free 플랜)
[ ] 업그레이드 페이지 /settings/upgrade
[ ] 결제 연동 (Stripe)
```

---

## Step 1. 토큰 게이지 완성

### `src/components/chat/TokenGauge.tsx` (업데이트)

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Group, Text, Progress, Box, Button } from '@mantine/core';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { modals } from '@mantine/modals';

export function TokenGauge() {
  const { user } = useAuth();
  const supabase = createClient();
  const [used, setUsed] = useState(0);
  const [limit, setLimit] = useState(100);
  const [plan, setPlan] = useState<'free' | 'pro' | 'team'>('free');

  useEffect(() => {
    if (!user) return;
    fetchUsage();
  }, [user]);

  const fetchUsage = async () => {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan, token_limit, current_period_start')
      .eq('user_id', user!.id)
      .single();

    if (!sub) return;
    setPlan(sub.plan);
    setLimit(sub.token_limit);

    const { data: usage } = await supabase
      .from('token_usage')
      .select('tokens_used')
      .eq('user_id', user!.id)
      .gte('created_at', sub.current_period_start);

    const total = usage?.reduce((sum, u) => sum + u.tokens_used, 0) ?? 0;
    setUsed(total);
  };

  if (!user) return null;

  const percent = Math.min((used / limit) * 100, 100);
  const isWarning = percent >= 90;
  const isExceeded = used >= limit;

  const openUpgradeModal = () => {
    modals.open({
      title: '토큰 한도 초과',
      children: (
        <Box>
          <Text fz="sm" mb="md">
            이번 달 사용량이 초과됐어요. Pro로 업그레이드하면 계속 사용할 수 있어요.
          </Text>
          <Button
            fullWidth
            onClick={() => { window.location.href = '/settings/upgrade'; }}
          >
            Pro 업그레이드
          </Button>
        </Box>
      ),
    });
  };

  return (
    <Box px="md" py="xs" style={{ borderBottom: '0.5px solid var(--mantine-color-default-border)' }}>
      <Group justify="space-between" mb={4}>
        <Text fz="xs" c="dimmed">
          {plan.toUpperCase()} · {used}/{limit} 토큰
        </Text>
        {isExceeded && (
          <Button size="xs" variant="light" onClick={openUpgradeModal}>
            업그레이드
          </Button>
        )}
      </Group>
      <Progress
        value={percent}
        size="xs"
        color={isWarning ? 'yellow' : 'gray'}
        animated={isExceeded}
      />
    </Box>
  );
}
```

---

## Step 2. 뷰 생성 전 토큰 안내

AI 뷰 생성 시작 전 확인 모달:

```typescript
// src/lib/token/guard.ts
import { modals } from '@mantine/modals';
import { Text, Button, Group } from '@mantine/core';

// 뷰 생성 전 "N턴 분량 소비" 안내
export function confirmViewGeneration(
  estimatedTokens: number,
  onConfirm: () => void
) {
  modals.openConfirmModal({
    title: '토큰 사용 안내',
    children: (
      <Text fz="sm">
        이 작업은 채팅 약 <strong>{estimatedTokens}턴</strong> 분량을 사용해요.
      </Text>
    ),
    labels: { confirm: '생성하기', cancel: '취소' },
    onConfirm,
  });
}
```

---

## Step 3. 광고 컴포넌트 (Free 플랜)

```typescript
// src/components/ui/AdBanner.tsx
'use client';

// 원칙 (BUSINESS.md):
//   위치: 인기 노드/뷰 열람 시, SNS 피드 사이
//   광고주가 LLM 답변에 개입 불가
//   컨텍스트 기반. 개인정보 직접 판매 금지.

interface AdBannerProps {
  position: 'feed' | 'view_bottom';
  plan: 'free' | 'pro' | 'team';
}

export function AdBanner({ position, plan }: AdBannerProps) {
  // Pro/Team은 광고 없음
  if (plan !== 'free') return null;

  return (
    <Box
      p="sm"
      style={{
        border: '0.5px solid var(--mantine-color-default-border)',
        borderRadius: 8,
        opacity: 0.7,
      }}
    >
      <Text fz={10} c="dimmed" mb={4}>광고</Text>
      {/* 실제 광고 네트워크 연동 시 여기에 스크립트 */}
      <Text fz="sm" c="dimmed">광고 영역</Text>
    </Box>
  );
}
```

---

## Step 4. 업그레이드 페이지

### `src/app/(private)/settings/upgrade/page.tsx`

```typescript
'use client';

import { Stack, Title, SimpleGrid, Paper, Text, Button, Badge, List } from '@mantine/core';
import { Check } from '@phosphor-icons/react';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '₩0',
    tokens: 100,
    features: ['채팅 100턴/월', '기본 데이터뷰', '광고 있음'],
    cta: '현재 플랜',
    disabled: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₩9,900/월',
    tokens: 2000,
    features: ['채팅 2,000턴/월', 'AI 뷰 생성', '광고 없음', '파일 업로드 무제한'],
    cta: '업그레이드',
    disabled: false,
  },
  {
    id: 'team',
    name: 'Team',
    price: '₩29,900/월',
    tokens: 10000,
    features: ['채팅 10,000턴/월', 'Pro 기능 전부', '그룹 기능', '공동편집 인원 확대'],
    cta: '팀으로 시작',
    disabled: false,
  },
];

export default function UpgradePage() {
  const handleUpgrade = async (planId: string) => {
    // Stripe 결제 연동
    const res = await fetch('/api/billing/create-checkout', {
      method: 'POST',
      body: JSON.stringify({ plan: planId }),
      headers: { 'Content-Type': 'application/json' },
    });
    const { url } = await res.json();
    window.location.href = url;
  };

  return (
    <Stack gap="xl" p="xl" maw={900} mx="auto">
      <Title order={2}>플랜 업그레이드</Title>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        {PLANS.map(plan => (
          <Paper key={plan.id} p="xl">
            <Stack gap="md">
              <div>
                <Text fw={600} fz="lg">{plan.name}</Text>
                <Text fz="xl" fw={700}>{plan.price}</Text>
              </div>
              <List
                spacing="xs"
                icon={<Check size={14} color="var(--mantine-color-brand-6)" />}
              >
                {plan.features.map(f => (
                  <List.Item key={f}>
                    <Text fz="sm">{f}</Text>
                  </List.Item>
                ))}
              </List>
              <Button
                fullWidth
                variant={plan.id === 'pro' ? 'filled' : 'light'}
                disabled={plan.disabled}
                onClick={() => !plan.disabled && handleUpgrade(plan.id)}
              >
                {plan.cta}
              </Button>
            </Stack>
          </Paper>
        ))}
      </SimpleGrid>
    </Stack>
  );
}
```

### Stripe 결제 Route

```typescript
// src/app/api/billing/create-checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_IDS: Record<string, string> = {
  pro:  process.env.STRIPE_PRICE_PRO!,
  team: process.env.STRIPE_PRICE_TEAM!,
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { plan } = await req.json();
  const priceId = PRICE_IDS[plan];
  if (!priceId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings?upgraded=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings/upgrade`,
    customer_email: user.email,
    metadata: { userId: user.id, plan },
  });

  return NextResponse.json({ url: session.url });
}
```

```bash
pnpm add stripe @stripe/stripe-js
```

환경변수 추가:
```env
STRIPE_SECRET_KEY=
STRIPE_PRICE_PRO=price_xxx
STRIPE_PRICE_TEAM=price_xxx
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_SITE_URL=https://ouuniverse.com
```

---

## 완료 체크리스트

```
[ ] TokenGauge 실시간 사용량 표시
[ ] 90% 도달 → yellow 경고
[ ] 100% 초과 → 업그레이드 모달 (입력 내용 보존)
[ ] AI 뷰 생성 전 토큰 소비 안내 모달
[ ] Free 플랜 → 광고 배너 표시
[ ] Pro/Team → 광고 없음
[ ] /settings/upgrade 플랜 비교 페이지
[ ] Stripe 결제 플로우 (checkout → 성공 → 구독 업데이트)
[ ] pnpm build 통과
[ ] git commit: "feat: Pro 구독 + 토큰 게이지 + Stripe 결제 + 광고"
```

---

## 다음 작업

**TASK_PHASE2_GROUP.md** → 그룹 (공동 DB + 공동 뷰 + 알림)
