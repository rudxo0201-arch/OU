'use client';
import { useEffect, useState } from 'react';
import { CheckCircle } from '@phosphor-icons/react';

export default function VerifiedPage() {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, maxWidth: 360, padding: 24 }}>
        <CheckCircle size={56} weight="thin" color="var(--color-dark-6)" />
        <h3 style={{ fontWeight: 600, margin: 0 }}>인증이 완료되었어요</h3>
        <span style={{ color: 'var(--color-dimmed)', textAlign: 'center', fontSize: 14 }}>
          이메일 인증이 성공적으로 완료되었어요.
          <br />잠시 후 자동으로 이동합니다.
        </span>
        {countdown > 0 ? (
          <span style={{ fontSize: 14, color: 'var(--color-dimmed)' }}>이동 중...</span>
        ) : (
          <button
            onClick={() => { window.location.href = '/my'; }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-dark-6)', fontSize: 14 }}
          >
            지금 이동하기
          </button>
        )}
      </div>
    </div>
  );
}
