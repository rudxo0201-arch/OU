'use client';

import { useEffect, useState } from 'react';
import { Stack, Title, SimpleGrid, Paper, Text, Button, List, Badge, Group, Box, Loader } from '@mantine/core';
import { Check, Star, UsersThree, Rocket, ArrowRight } from '@phosphor-icons/react';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '0',
    priceLabel: '무료',
    icon: <Star size={24} weight="light" />,
    description: '기본 기능으로 시작하세요',
    features: [
      '50회/일 대화',
      '기본 보기 방식',
      '광고 포함',
    ],
    cta: '현재 플랜',
    highlighted: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '9,900',
    priceLabel: '월',
    icon: <Rocket size={24} weight="light" />,
    description: '제한 없이 자유롭게',
    features: [
      '500회/일 대화',
      '광고 제거',
      'AI 보기 생성',
      '파일 업로드 무제한',
      '우선 지원',
    ],
    cta: '업그레이드',
    highlighted: true,
  },
  {
    id: 'team',
    name: 'Team',
    price: '29,900',
    priceLabel: '월/명',
    icon: <UsersThree size={24} weight="light" />,
    description: '팀과 함께 성장하세요',
    features: [
      'Pro 기능 전부 포함',
      '그룹 기능',
      '멤버 관리',
      '공동 작업',
      '팀 분석',
    ],
    cta: '팀으로 시작',
    highlighted: false,
  },
];

interface SubscriptionInfo {
  plan: string;
  status: string;
  periodEnd: string | null;
  cancelledAt: string | null;
}

export default function UpgradePage() {
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    fetch('/api/billing/subscription')
      .then(r => r.json())
      .then(data => setSub(data))
      .catch(() => setSub({ plan: 'free', status: 'active', periodEnd: null, cancelledAt: null }))
      .finally(() => setLoading(false));
  }, []);

  const currentPlan = sub?.plan || 'free';

  const handleUpgrade = async (planId: string) => {
    if (planId === currentPlan || planId === 'free') return;

    setLoadingPlan(planId);
    try {
      const res = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: planId }),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error === 'Stripe not configured') {
        // Stripe 미설정 → 무시
      }
    } catch { /* ignore */ }
    setLoadingPlan(null);
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch { /* ignore */ }
    setPortalLoading(false);
  };

  const handleCancel = async () => {
    if (!confirm('정말 해지하시겠어요? 현재 결제 기간이 끝날 때까지는 계속 사용할 수 있어요.')) return;

    try {
      const res = await fetch('/api/billing/subscription', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSub(prev => prev ? { ...prev, cancelledAt: new Date().toISOString(), status: 'cancelled' } : prev);
      }
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <Stack align="center" justify="center" mih={400}>
        <Loader size="sm" />
      </Stack>
    );
  }

  return (
    <Stack gap="xl" p="xl" maw={960} mx="auto">
      <div>
        <Title order={2}>플랜 선택</Title>
        <Text c="dimmed" fz="sm" mt={4}>나에게 맞는 플랜을 골라보세요</Text>
      </div>

      {/* 현재 구독 상태 */}
      {currentPlan !== 'free' && (
        <Paper p="md" style={{ border: '0.5px solid var(--mantine-color-default-border)' }}>
          <Group justify="space-between" wrap="nowrap">
            <div>
              <Group gap="xs">
                <Text fw={600}>{currentPlan.toUpperCase()} 플랜</Text>
                <Badge
                  size="sm"
                  variant="light"
                  color={sub?.cancelledAt ? 'yellow' : sub?.status === 'past_due' ? 'red' : 'green'}
                >
                  {sub?.cancelledAt ? '해지 예정' : sub?.status === 'past_due' ? '결제 실패' : '활성'}
                </Badge>
              </Group>
              {sub?.periodEnd && (
                <Text fz="xs" c="dimmed" mt={2}>
                  {sub.cancelledAt
                    ? `${new Date(sub.periodEnd).toLocaleDateString('ko-KR')}에 만료됩니다`
                    : `다음 결제일: ${new Date(sub.periodEnd).toLocaleDateString('ko-KR')}`}
                </Text>
              )}
            </div>
            <Group gap="xs">
              <Button size="xs" variant="subtle" onClick={handlePortal} loading={portalLoading}>
                결제 관리
              </Button>
              {!sub?.cancelledAt && (
                <Button size="xs" variant="subtle" color="red" onClick={handleCancel}>
                  해지
                </Button>
              )}
            </Group>
          </Group>
        </Paper>
      )}

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
        {PLANS.map(plan => {
          const isCurrent = plan.id === currentPlan;

          return (
            <Paper
              key={plan.id}
              p="xl"
              style={{
                display: 'flex',
                flexDirection: 'column',
                border: plan.highlighted
                  ? '1.5px solid var(--mantine-color-gray-4)'
                  : '0.5px solid var(--mantine-color-default-border)',
                position: 'relative',
              }}
            >
              {plan.highlighted && (
                <Badge
                  variant="filled"
                  color="dark"
                  size="sm"
                  style={{
                    position: 'absolute',
                    top: -10,
                    left: '50%',
                    transform: 'translateX(-50%)',
                  }}
                >
                  추천
                </Badge>
              )}

              <Stack gap="md" flex={1}>
                <Group gap="sm">
                  <Box c="dimmed">{plan.icon}</Box>
                  <Text fw={600} fz="lg">{plan.name}</Text>
                </Group>

                <Text fz="sm" c="dimmed">{plan.description}</Text>

                <Group align="baseline" gap={4}>
                  {plan.id === 'free' ? (
                    <Text fz={28} fw={700}>{plan.priceLabel}</Text>
                  ) : (
                    <>
                      <Text fz="sm" c="dimmed" fw={500}>&#8361;</Text>
                      <Text fz={28} fw={700}>{plan.price}</Text>
                      <Text fz="sm" c="dimmed">/{plan.priceLabel}</Text>
                    </>
                  )}
                </Group>

                <List
                  spacing="xs"
                  icon={<Check size={14} weight="bold" />}
                  mt="sm"
                >
                  {plan.features.map(f => (
                    <List.Item key={f}>
                      <Text fz="sm">{f}</Text>
                    </List.Item>
                  ))}
                </List>

                <Box mt="auto" pt="md">
                  {isCurrent ? (
                    <Button fullWidth variant="light" color="gray" style={{ cursor: 'default' }}>
                      현재 플랜
                    </Button>
                  ) : plan.id === 'free' && currentPlan !== 'free' ? (
                    <Button fullWidth variant="light" color="gray" style={{ cursor: 'default' }}>
                      {sub?.cancelledAt ? '해지 후 전환됨' : '다운그레이드'}
                    </Button>
                  ) : (
                    <Button
                      fullWidth
                      variant={plan.highlighted ? 'filled' : 'light'}
                      color={plan.highlighted ? 'dark' : 'gray'}
                      loading={loadingPlan === plan.id}
                      onClick={() => handleUpgrade(plan.id)}
                      rightSection={<ArrowRight size={14} />}
                    >
                      {plan.cta}
                    </Button>
                  )}
                </Box>
              </Stack>
            </Paper>
          );
        })}
      </SimpleGrid>

      <Text fz="xs" c="dimmed" ta="center" mt="sm">
        언제든 플랜을 변경하거나 취소할 수 있어요. 해지해도 결제 기간이 끝날 때까지 사용 가능합니다.
      </Text>
    </Stack>
  );
}
