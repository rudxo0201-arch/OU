'use client';

import { useRouter } from 'next/navigation';
import { useChatStore } from '@/stores/chatStore';
import { Warning, X } from '@phosphor-icons/react';
import { COPY } from '@/lib/copy';

interface SaveNudgeProps {
  trigger: 'turn_limit' | 'view_created' | 'session_end';
  nodeCount?: number;
  onDismiss?: () => void;
}

const NUDGE_COPY: Record<string, string> = {
  turn_limit: COPY.nudge.save_guest,
  view_created: '가입하면 이 뷰를 저장하고 언제든 다시 볼 수 있어요.',
  session_end: '잠깐! 지금까지 나눈 대화가 사라져요.',
};

const filledBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.9)',
  color: '#111',
  border: 'none',
  borderRadius: 'var(--ou-radius-pill)',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
  transition: 'var(--ou-transition)',
  padding: '10px 24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  width: '100%',
};

const pillBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '0.5px solid var(--ou-border-subtle)',
  borderRadius: 'var(--ou-radius-pill)',
  color: 'var(--ou-text-body)',
  fontSize: 13,
  fontWeight: 500,
  fontFamily: 'inherit',
  cursor: 'pointer',
  transition: 'var(--ou-transition)',
  boxShadow: 'var(--ou-glow-xs)',
  padding: '10px 24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  width: '100%',
};

export function SaveNudge({ trigger, nodeCount, onDismiss }: SaveNudgeProps) {
  const router = useRouter();

  const handleSignup = () => {
    // 게스트 메시지를 localStorage에 백업 후 로그인 이동
    useChatStore.getState().persistGuest();
    router.push('/login?next=/chat');
  };

  // session_end: 풀스크린 모달 (dark overlay + floating-block)
  if (trigger === 'session_end') {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Dark overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
          onClick={onDismiss}
        />
        {/* Floating-block modal */}
        <div
          style={{
            position: 'relative',
            zIndex: 1001,
            maxWidth: 400,
            width: '90%',
            background: 'transparent',
            border: '0.5px solid var(--ou-border-subtle)',
            borderRadius: 'var(--ou-radius-card)',
            boxShadow: 'var(--ou-glow-lg)',
            padding: 32,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <Warning size={40} weight="light" style={{ color: 'var(--ou-text-dimmed)' }} />
            <p style={{ color: 'var(--ou-text-strong)', fontSize: 18, fontWeight: 600, textAlign: 'center', margin: 0 }}>
              {NUDGE_COPY.session_end}
            </p>
            {nodeCount != null && nodeCount > 0 && (
              <p style={{ color: 'var(--ou-text-dimmed)', fontSize: 13, textAlign: 'center', margin: 0 }}>
                지금까지 쌓인 기록 {nodeCount}개가 모두 사라져요.
              </p>
            )}
            <p style={{ color: 'var(--ou-text-dimmed)', fontSize: 13, textAlign: 'center', margin: 0 }}>
              가입하면 모든 기록이 저장돼요.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
              <button
                onClick={handleSignup}
                style={filledBtnStyle}
                onMouseEnter={e => (e.currentTarget.style.background = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.9)')}
              >
                가입하기
              </button>
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  style={pillBtnStyle}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--ou-border-hover)';
                    e.currentTarget.style.boxShadow = 'var(--ou-glow-sm)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--ou-border-subtle)';
                    e.currentTarget.style.boxShadow = 'var(--ou-glow-xs)';
                  }}
                >
                  나중에
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // turn_limit: glass-block style bar
  if (trigger === 'turn_limit') {
    return (
      <div
        style={{
          position: 'sticky' as const,
          top: 0,
          zIndex: 10,
          padding: '10px 16px',
          background: 'var(--ou-surface-faint)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '0.5px solid var(--ou-border-subtle)',
          boxShadow: 'var(--ou-glow-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span style={{ flex: 1, fontSize: 13, color: 'var(--ou-text-dimmed)' }}>
          {NUDGE_COPY[trigger]}
        </span>
        <button
          onClick={handleSignup}
          style={{
            background: 'rgba(255,255,255,0.9)',
            color: '#111',
            border: 'none',
            borderRadius: 'var(--ou-radius-pill)',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: 'pointer',
            transition: 'var(--ou-transition)',
            padding: '6px 16px',
            flexShrink: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.9)')}
        >
          가입하기
        </button>
        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--ou-text-dimmed)',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'var(--ou-transition)',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--ou-text-body)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--ou-text-dimmed)')}
          >
            <X size={16} />
          </button>
        )}
      </div>
    );
  }

  // view_created: floating-block card
  return (
    <div
      style={{
        padding: '14px 16px',
        background: 'transparent',
        border: '0.5px solid var(--ou-border-subtle)',
        borderRadius: 'var(--ou-radius-card)',
        boxShadow: 'var(--ou-glow-sm)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <span style={{ flex: 1, fontSize: 13, color: 'var(--ou-text-dimmed)' }}>
        {NUDGE_COPY[trigger]}
      </span>
      <button
        onClick={handleSignup}
        style={{
          background: 'rgba(255,255,255,0.9)',
          color: '#111',
          border: 'none',
          borderRadius: 'var(--ou-radius-pill)',
          fontSize: 12,
          fontWeight: 600,
          fontFamily: 'inherit',
          cursor: 'pointer',
          transition: 'var(--ou-transition)',
          padding: '6px 16px',
          flexShrink: 0,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#fff')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.9)')}
      >
        가입하기
      </button>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--ou-text-dimmed)',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'var(--ou-transition)',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--ou-text-body)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--ou-text-dimmed)')}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
