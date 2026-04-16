'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TermsAgreePage() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
      <div style={{ width: 480, padding: 24, borderRadius: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ margin: 0 }}>이용약관</h2>
          <span style={{ color: 'var(--color-dimmed)', fontSize: 14 }}>
            OU 서비스를 이용해 주셔서 감사합니다. 본 서비스는 사용자의 대화 데이터를 구조화하여
            개인화된 지식 그래프를 생성합니다. 수집된 데이터는 서비스 개선 목적으로만 사용됩니다.
          </span>
          <span style={{ color: 'var(--color-dimmed)', fontSize: 14 }}>
            개인정보는 암호화하여 안전하게 저장되며, 사용자의 동의 없이 제3자에게 제공되지 않습니다.
          </span>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            위 약관에 동의합니다
          </label>

          <button
            disabled={!agreed}
            onClick={() => router.push('/login')}
            style={{
              width: '100%', padding: '8px 16px', borderRadius: 6, border: 'none',
              background: '#1a1a1a', color: '#fff', cursor: !agreed ? 'default' : 'pointer',
              fontSize: 14, opacity: !agreed ? 0.5 : 1,
            }}
          >
            동의하고 계속하기
          </button>
        </div>
      </div>
    </div>
  );
}
