'use client';
import { useEffect, useState } from 'react';
import { NeuAuthLayout, NeuButton } from '@/components/ds';

export default function VerifiedPage() {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = '/my';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <NeuAuthLayout>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
        {/* 체크 원형 */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'var(--ou-bg)',
            boxShadow: 'var(--ou-neu-raised-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 4,
          }}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path
              d="M7 16L13 22L25 10"
              stroke="var(--ou-accent)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h3 style={{ margin: 0, fontWeight: 700, fontSize: 18, color: 'var(--ou-text-heading)' }}>
          인증이 완료되었어요
        </h3>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ou-text-muted)', lineHeight: 1.6 }}>
          이메일 인증이 성공적으로 완료되었어요.
          <br />잠시 후 자동으로 이동합니다.
        </p>

        {countdown > 0 ? (
          <span style={{ fontSize: 13, color: 'var(--ou-text-dimmed)' }}>
            {countdown}초 후 이동…
          </span>
        ) : (
          <NeuButton variant="ghost" size="sm" onClick={() => { window.location.href = '/my'; }}>
            지금 이동하기
          </NeuButton>
        )}
      </div>
    </NeuAuthLayout>
  );
}
