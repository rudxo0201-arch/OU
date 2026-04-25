'use client';

import { useState } from 'react';
import { OuButton, OuCard } from '@/components/ds';
import { ProfileQuestionUI } from '@/components/chat/ProfileQuestionUI';

interface Props {
  onClose: () => void;
}

type Step = 'celebrate' | 'profile' | 'done';

export function TutorialComplete({ onClose }: Props) {
  const [step, setStep] = useState<Step>('celebrate');
  const [rewarded, setRewarded] = useState(false);

  const handleProfileSubmit = async (answers: { job: string; interests: string[]; purposes: string[] }) => {
    // 프로필 저장
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({
          profile_meta: answers,
        }).eq('id', user.id);
      }
    } catch { /* ignore */ }

    // 1000 UNI 지급
    try {
      await fetch('/api/uni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'profile_complete', memo: '프로필 입력 보상' }),
      });
      setRewarded(true);
      window.dispatchEvent(new CustomEvent('uni-updated'));
    } catch { /* ignore */ }

    setStep('done');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.18)',
        backdropFilter: 'blur(6px)',
        animation: 'ou-fade-in 0.3s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: '100%', maxWidth: 420, padding: '0 20px' }}>

        {step === 'celebrate' && (
          <OuCard variant="raised" size="md" style={{ textAlign: 'center', animation: 'ou-fade-in 0.4s ease' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'var(--ou-bg)',
              boxShadow: 'var(--ou-neu-raised-lg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: 28,
            }}>
              ✦
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ou-text-heading)', margin: '0 0 8px' }}>
              완료했어요!
            </h2>
            <p style={{ fontSize: 14, color: 'var(--ou-text-secondary)', lineHeight: 1.6, margin: '0 0 24px' }}>
              이제 뭐든 말하면 OU가 알아서 정리해요.<br />
              프로필을 입력하면 <strong style={{ color: 'var(--ou-text-body)' }}>1,000 UNI</strong>를 드려요.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <OuButton
                variant="accent"
                size="md"
                onClick={() => setStep('profile')}
                style={{ width: '100%' }}
              >
                프로필 입력하고 1,000 UNI 받기
              </OuButton>
              <OuButton
                variant="ghost"
                size="sm"
                onClick={onClose}
                style={{ width: '100%', fontSize: 12, color: 'var(--ou-text-muted)' }}
              >
                나중에
              </OuButton>
            </div>
          </OuCard>
        )}

        {step === 'profile' && (
          <div style={{ maxHeight: '80vh', overflowY: 'auto' }}>
            <ProfileQuestionUI
              onSubmit={handleProfileSubmit}
              onSkip={onClose}
            />
          </div>
        )}

        {step === 'done' && (
          <OuCard variant="raised" size="md" style={{ textAlign: 'center', animation: 'ou-fade-in 0.4s ease' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'var(--ou-bg)',
              boxShadow: 'var(--ou-neu-raised-lg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: 28,
            }}>
              ✦
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ou-text-heading)', margin: '0 0 8px' }}>
              {rewarded ? '1,000 UNI가 쌓였어요!' : '저장됐어요!'}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--ou-text-secondary)', lineHeight: 1.6, margin: '0 0 24px' }}>
              이제 본격적으로 시작해볼까요?
            </p>
            <OuButton variant="default" size="md" onClick={onClose} style={{ width: '100%' }}>
              시작하기
            </OuButton>
          </OuCard>
        )}

      </div>
    </div>
  );
}
