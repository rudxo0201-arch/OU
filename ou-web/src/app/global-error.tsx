'use client';

import * as Sentry from '@sentry/nextjs';
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
    <html lang="ko">
      <body>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontFamily: 'system-ui, sans-serif',
          color: '#888',
        }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontWeight: 600, fontSize: 18 }}>문제가 발생했어요</h2>
            <p style={{ fontSize: 14 }}>일시적인 오류일 수 있어요.</p>
            <button
              onClick={reset}
              style={{
                marginTop: 16,
                padding: '8px 20px',
                border: '1px solid #333',
                borderRadius: 6,
                background: 'transparent',
                color: '#aaa',
                cursor: 'pointer',
              }}
            >
              다시 시도
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
