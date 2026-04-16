'use client';

import { useEffect, useState, useCallback } from 'react';
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
        <div
          style={{
            padding: '4px 8px',
            borderRadius: 8,
            border: '0.5px solid var(--ou-border-subtle)',
            background: 'var(--ou-surface-faint)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed)', textAlign: 'center' }}>
              체험이 끝났어요. 로그인하면 계속 사용할 수 있어요.
            </span>
            <button
              onClick={() => router.push('/login')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 12px',
                borderRadius: 6,
                border: '0.5px solid var(--ou-border-subtle)',
                background: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                color: 'var(--ou-text-dimmed)',
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 500 }}>
                시작하기
              </span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        style={{ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'center', minHeight: 24 }}
      >
        <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed)', whiteSpace: 'nowrap' }}>
          체험 {turnCount}/{GUEST_TURN_LIMIT}
        </span>
        <div
          style={{
            flex: 1,
            minWidth: 40,
            height: 4,
            borderRadius: 9999,
            background: 'rgba(255,255,255,0.1)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              borderRadius: 9999,
              background: pct >= 80 ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)',
              transition: 'width 300ms ease',
            }}
          />
        </div>
        {remaining <= 3 && (
          <button
            onClick={() => router.push('/login')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed)', textDecoration: 'underline', whiteSpace: 'nowrap' }}>
              로그인
            </span>
          </button>
        )}
      </div>
    );
  }

  const percent = Math.min((used / limit) * 100, 100);
  const limitReached = used >= limit;
  const isWarning = percent >= 80;

  // 한도 도달: 업그레이드 유도
  if (limitReached) {
    return (
      <div
        style={{
          padding: '4px 8px',
          borderRadius: 8,
          border: '0.5px solid var(--ou-border-subtle)',
          background: 'var(--ou-surface-faint)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed)', textAlign: 'center' }}>
            {plan === 'free'
              ? '오늘 사용량을 다 썼어요. 더 많이 쓰려면 업그레이드하세요.'
              : plan === 'pro'
                ? '오늘 사용량을 다 썼어요. 내일 다시 사용할 수 있어요.'
                : '이번 달 사용량을 다 썼어요.'}
          </span>
          {plan === 'free' && (
            <button
              onClick={() => router.push('/settings/upgrade')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 12px',
                borderRadius: 6,
                border: '0.5px solid var(--ou-border-subtle)',
                background: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                color: 'var(--ou-text-dimmed)',
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 500 }}>
                업그레이드
              </span>
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // team 플랜은 게이지 표시 불필요
  if (plan === 'team') return null;

  return (
    <div
      style={{ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'center', minHeight: 24 }}
    >
      <span
        style={{
          fontSize: 10,
          color: isWarning ? 'rgba(255,255,255,0.4)' : 'var(--ou-text-dimmed)',
          fontWeight: isWarning ? 600 : 400,
          whiteSpace: 'nowrap',
        }}
      >
        {plan.toUpperCase()} {used}/{limit}
      </span>
      <div
        style={{
          flex: 1,
          minWidth: 40,
          height: 4,
          borderRadius: 9999,
          background: 'rgba(255,255,255,0.1)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            borderRadius: 9999,
            background: isWarning ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)',
            transition: 'width 300ms ease',
          }}
        />
      </div>
      {plan === 'free' && isWarning && (
        <button
          onClick={() => router.push('/settings/upgrade')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            fontFamily: 'inherit',
          }}
        >
          <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed)', whiteSpace: 'nowrap' }}>
            업그레이드
          </span>
          <ArrowRight size={10} style={{ color: 'var(--ou-text-dimmed)' }} />
        </button>
      )}
    </div>
  );
}
