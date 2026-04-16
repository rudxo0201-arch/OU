'use client';

import { useEffect, useState } from 'react';
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <span style={{ fontSize: 14, color: 'var(--color-dimmed)' }}>불러오는 중...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <div>
        <h2 style={{ margin: 0 }}>플랜 선택</h2>
        <span style={{ color: 'var(--color-dimmed)', fontSize: 14, marginTop: 4, display: 'block' }}>나에게 맞는 플랜을 골라보세요</span>
      </div>

      {/* 현재 구독 상태 */}
      {currentPlan !== 'free' && (
        <div style={{ padding: 16, border: '0.5px solid var(--color-default-border)', borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'nowrap', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 600 }}>{currentPlan.toUpperCase()} 플랜</span>
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: sub?.cancelledAt ? '#fef3c7' : sub?.status === 'past_due' ? '#fee2e2' : '#dcfce7',
                    color: sub?.cancelledAt ? '#92400e' : sub?.status === 'past_due' ? '#991b1b' : '#166534',
                  }}
                >
                  {sub?.cancelledAt ? '해지 예정' : sub?.status === 'past_due' ? '결제 실패' : '활성'}
                </span>
              </div>
              {sub?.periodEnd && (
                <span style={{ fontSize: 12, color: 'var(--color-dimmed)', marginTop: 2, display: 'block' }}>
                  {sub.cancelledAt
                    ? `${new Date(sub.periodEnd).toLocaleDateString('ko-KR')}에 만료됩니다`
                    : `다음 결제일: ${new Date(sub.periodEnd).toLocaleDateString('ko-KR')}`}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handlePortal}
                disabled={portalLoading}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--color-text)' }}
              >
                {portalLoading ? '...' : '결제 관리'}
              </button>
              {!sub?.cancelledAt && (
                <button
                  onClick={handleCancel}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#dc2626' }}
                >
                  해지
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        {PLANS.map(plan => {
          const isCurrent = plan.id === currentPlan;

          return (
            <div
              key={plan.id}
              style={{
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                border: plan.highlighted
                  ? '1.5px solid #9ca3af'
                  : '0.5px solid var(--color-default-border)',
                borderRadius: 8,
                position: 'relative',
              }}
            >
              {plan.highlighted && (
                <span
                  style={{
                    position: 'absolute',
                    top: -10,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: 11,
                    padding: '2px 10px',
                    borderRadius: 12,
                    background: '#1a1a1a',
                    color: '#fff',
                  }}
                >
                  추천
                </span>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--color-dimmed)' }}>{plan.icon}</span>
                  <span style={{ fontWeight: 600, fontSize: 18 }}>{plan.name}</span>
                </div>

                <span style={{ fontSize: 14, color: 'var(--color-dimmed)' }}>{plan.description}</span>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  {plan.id === 'free' ? (
                    <span style={{ fontSize: 28, fontWeight: 700 }}>{plan.priceLabel}</span>
                  ) : (
                    <>
                      <span style={{ fontSize: 14, color: 'var(--color-dimmed)', fontWeight: 500 }}>&#8361;</span>
                      <span style={{ fontSize: 28, fontWeight: 700 }}>{plan.price}</span>
                      <span style={{ fontSize: 14, color: 'var(--color-dimmed)' }}>/{plan.priceLabel}</span>
                    </>
                  )}
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                      <Check size={14} weight="bold" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div style={{ marginTop: 'auto', paddingTop: 16 }}>
                  {isCurrent ? (
                    <button
                      disabled
                      style={{ width: '100%', padding: '8px 16px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#f3f4f6', color: '#6b7280', cursor: 'default', fontSize: 14 }}
                    >
                      현재 플랜
                    </button>
                  ) : plan.id === 'free' && currentPlan !== 'free' ? (
                    <button
                      disabled
                      style={{ width: '100%', padding: '8px 16px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#f3f4f6', color: '#6b7280', cursor: 'default', fontSize: 14 }}
                    >
                      {sub?.cancelledAt ? '해지 후 전환됨' : '다운그레이드'}
                    </button>
                  ) : (
                    <button
                      disabled={loadingPlan === plan.id}
                      onClick={() => handleUpgrade(plan.id)}
                      style={{
                        width: '100%',
                        padding: '8px 16px',
                        borderRadius: 6,
                        border: plan.highlighted ? 'none' : '1px solid #e5e7eb',
                        background: plan.highlighted ? '#1a1a1a' : '#f3f4f6',
                        color: plan.highlighted ? '#fff' : '#1a1a1a',
                        cursor: 'pointer',
                        fontSize: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      {loadingPlan === plan.id ? '...' : plan.cta}
                      {loadingPlan !== plan.id && <ArrowRight size={14} />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <span style={{ fontSize: 12, color: 'var(--color-dimmed)', textAlign: 'center', marginTop: 8, display: 'block' }}>
        언제든 플랜을 변경하거나 취소할 수 있어요. 해지해도 결제 기간이 끝날 때까지 사용 가능합니다.
      </span>
    </div>
  );
}
