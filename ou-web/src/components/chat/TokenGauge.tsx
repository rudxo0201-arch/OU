'use client';

import { useEffect, useState, useCallback } from 'react';
import { Text, Progress, Group, UnstyledButton, Box, Stack } from '@mantine/core';
import { ArrowRight } from '@phosphor-icons/react';
import { useAuth } from '@/hooks/useAuth';
import { useChatStore } from '@/stores/chatStore';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const GUEST_TURN_LIMIT = 10;

const PLAN_LIMITS: Record<string, number> = {
  free: 50,
  pro: 500,
  team: 999999,
};

export function TokenGauge() {
  const { user } = useAuth();
  const { turnCount, messages } = useChatStore();
  const router = useRouter();
  const supabase = createClient();

  const [used, setUsed] = useState(0);
  const [limit, setLimit] = useState(50);
  const [plan, setPlan] = useState<'free' | 'pro' | 'team'>('free');

  const fetchUsage = useCallback(async () => {
    if (!user) return;

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .single();

    if (!sub) return;
    const currentPlan = (sub.plan as 'free' | 'pro' | 'team') || 'free';
    setPlan(currentPlan);
    setLimit(PLAN_LIMITS[currentPlan] ?? 50);

    // 일일 사용량 조회
    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase
      .from('token_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', `${today}T00:00:00`);

    setUsed(count || 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // 초기 로드 시 사용량 조회
  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  // 메시지가 추가될 때마다 사용량 갱신 (assistant 응답 완료 후)
  useEffect(() => {
    if (!user || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role === 'assistant' && !lastMsg.streaming) {
      // 약간의 딜레이: DB 기록 후 조회
      const timer = setTimeout(fetchUsage, 1000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, user]);

  // 비로그인: 게스트 턴 게이지
  if (!user) {
    const remaining = Math.max(0, GUEST_TURN_LIMIT - turnCount);
    const pct = (turnCount / GUEST_TURN_LIMIT) * 100;
    const limitReached = turnCount >= GUEST_TURN_LIMIT;

    if (limitReached) {
      return (
        <Box
          p="xs"
          style={{
            borderRadius: 8,
            border: '0.5px solid var(--mantine-color-default-border)',
            background: 'var(--mantine-color-dark-7)',
          }}
        >
          <Stack gap={4} align="center">
            <Text fz={11} c="dimmed" ta="center">
              체험이 끝났어요. 로그인하면 계속 사용할 수 있어요.
            </Text>
            <UnstyledButton
              onClick={() => router.push('/login')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 12px',
                borderRadius: 6,
                border: '0.5px solid var(--mantine-color-gray-6)',
              }}
            >
              <Text fz={11} c="gray.3" fw={500}>
                시작하기
              </Text>
              <ArrowRight size={12} color="var(--mantine-color-gray-3)" />
            </UnstyledButton>
          </Stack>
        </Box>
      );
    }

    return (
      <Group
        gap={8}
        align="center"
        style={{ minHeight: 24 }}
      >
        <Text fz={10} c="dimmed" style={{ whiteSpace: 'nowrap' }}>
          체험 {turnCount}/{GUEST_TURN_LIMIT}
        </Text>
        <Progress
          value={pct}
          size={4}
          color={pct >= 80 ? 'gray.4' : 'gray.6'}
          radius="xl"
          style={{ flex: 1, minWidth: 40 }}
        />
        {remaining <= 3 && (
          <UnstyledButton onClick={() => router.push('/login')}>
            <Text fz={10} c="dimmed" td="underline" style={{ whiteSpace: 'nowrap' }}>
              로그인
            </Text>
          </UnstyledButton>
        )}
      </Group>
    );
  }

  const percent = Math.min((used / limit) * 100, 100);
  const limitReached = used >= limit;
  const isWarning = percent >= 80;

  // 한도 도달: 업그레이드 유도
  if (limitReached) {
    return (
      <Box
        p="xs"
        style={{
          borderRadius: 8,
          border: '0.5px solid var(--mantine-color-default-border)',
          background: 'var(--mantine-color-dark-7)',
        }}
      >
        <Stack gap={4} align="center">
          <Text fz={11} c="dimmed" ta="center">
            {plan === 'free'
              ? '오늘 사용량을 다 썼어요. 더 많이 쓰려면 업그레이드하세요.'
              : plan === 'pro'
                ? '오늘 사용량을 다 썼어요. 내일 다시 사용할 수 있어요.'
                : '이번 달 사용량을 다 썼어요.'}
          </Text>
          {plan === 'free' && (
            <UnstyledButton
              onClick={() => router.push('/settings/upgrade')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 12px',
                borderRadius: 6,
                border: '0.5px solid var(--mantine-color-gray-6)',
              }}
            >
              <Text fz={11} c="gray.3" fw={500}>
                업그레이드
              </Text>
              <ArrowRight size={12} color="var(--mantine-color-gray-3)" />
            </UnstyledButton>
          )}
        </Stack>
      </Box>
    );
  }

  // team 플랜은 게이지 표시 불필요
  if (plan === 'team') return null;

  return (
    <Group
      gap={8}
      align="center"
      style={{ minHeight: 24 }}
    >
      <Text
        fz={10}
        c={isWarning ? 'gray.4' : 'dimmed'}
        fw={isWarning ? 600 : 400}
        style={{ whiteSpace: 'nowrap' }}
      >
        {plan.toUpperCase()} {used}/{limit}
      </Text>
      <Progress
        value={percent}
        size={4}
        color={isWarning ? 'gray.4' : 'gray.6'}
        radius="xl"
        style={{ flex: 1, minWidth: 40 }}
      />
      {plan === 'free' && isWarning && (
        <UnstyledButton
          onClick={() => router.push('/settings/upgrade')}
          style={{ display: 'flex', alignItems: 'center', gap: 2 }}
        >
          <Text fz={10} c="dimmed" style={{ whiteSpace: 'nowrap' }}>
            업그레이드
          </Text>
          <ArrowRight size={10} color="var(--mantine-color-dimmed)" />
        </UnstyledButton>
      )}
    </Group>
  );
}
