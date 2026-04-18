'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?next=/reset-password`,
    });
    if (error) {
      alert('요청에 실패했어요. 다시 시도해주세요.');
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  if (sent) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, maxWidth: 360, padding: 24 }}>
          <h3 style={{ margin: 0 }}>메일을 확인해주세요</h3>
          <span style={{ color: 'var(--color-dimmed)', textAlign: 'center', fontSize: 14 }}>
            <strong>{email}</strong>로 비밀번호 재설정 링크를 보냈어요.
          </span>
          <a href="/login" style={{ fontSize: 14 }}>로그인으로 돌아가기</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
      <div style={{ width: 380, padding: 24, borderRadius: 12 }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <h2 style={{ margin: 0, fontWeight: 700 }}>비밀번호 찾기</h2>
              <span style={{ color: 'var(--color-dimmed)', fontSize: 14 }}>가입한 이메일을 입력해주세요</span>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>이메일</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email}
              style={{
                width: '100%', padding: '8px 16px', borderRadius: 6, border: 'none',
                background: '#1a1a1a', color: '#fff', cursor: loading || !email ? 'default' : 'pointer',
                fontSize: 14, opacity: loading || !email ? 0.5 : 1,
              }}
            >
              {loading ? '...' : '재설정 메일 보내기'}
            </button>
            <span style={{ fontSize: 12, textAlign: 'center' }}>
              <a href="/login" style={{ fontSize: 12 }}>로그인으로 돌아가기</a>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
