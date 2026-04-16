'use client';

import { WarningCircle } from '@phosphor-icons/react';
import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '0 24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, maxWidth: 400 }}>
        <WarningCircle size={48} weight="light" color="#9ca3af" />
        <span style={{ fontWeight: 600, fontSize: 18, textAlign: 'center' }}>
          문제가 발생했어요
        </span>
        <span style={{ fontSize: 14, color: 'var(--color-dimmed)', textAlign: 'center' }}>
          일시적인 오류일 수 있어요. 다시 시도하거나 홈으로 돌아가 주세요.
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={reset}
            style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#f3f4f6', cursor: 'pointer', fontSize: 14 }}
          >
            다시 시도
          </button>
          <Link
            href="/"
            style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, color: '#6b7280', textDecoration: 'none' }}
          >
            홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}
