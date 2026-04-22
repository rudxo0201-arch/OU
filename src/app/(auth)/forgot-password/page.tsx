'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?next=/reset-password`,
    });
    if (error) {
      setError('요청에 실패했어요. 다시 시도해주세요.');
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  const wrapStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: '100dvh',
    background: 'var(--ou-bg)', padding: '0 20px',
  };
  const cardStyle: React.CSSProperties = {
    width: '100%', maxWidth: 380, padding: 32,
    background: 'var(--ou-surface)', border: '1px solid var(--ou-border-subtle)',
    borderRadius: 'var(--ou-radius-md)', boxShadow: 'var(--ou-shadow-sm)',
  };

  if (sent) {
    return (
      <div style={wrapStyle}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✉️</div>
          <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 16, color: 'var(--ou-text-heading)' }}>
            메일을 확인해주세요
          </p>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--ou-text-muted)' }}>
            <strong style={{ color: 'var(--ou-text-body)' }}>{email}</strong>로<br />
            비밀번호 재설정 링크를 보냈어요
          </p>
          <button onClick={() => (window.location.href = '/login')}
            style={{ fontSize: 13, color: 'var(--ou-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
            로그인으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={wrapStyle}>
      <div style={cardStyle}>
        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: 'var(--ou-text-heading)' }}>
          비밀번호 찾기
        </h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--ou-text-muted)', marginBottom: 6 }}>이메일</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%', padding: '9px 12px', fontSize: 14,
                background: 'var(--ou-glass)', border: '1px solid var(--ou-border-subtle)',
                borderRadius: 'var(--ou-radius-sm)', color: 'var(--ou-text-body)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          {error && <p style={{ margin: 0, fontSize: 12, color: '#e03131', textAlign: 'center' }}>{error}</p>}
          <button
            type="submit"
            disabled={loading || !email}
            style={{
              padding: '10px 0', fontSize: 14, fontWeight: 600,
              background: 'var(--ou-text-body)', color: 'var(--ou-bg)',
              border: 'none', borderRadius: 'var(--ou-radius-sm)', cursor: 'pointer',
              opacity: loading || !email ? 0.5 : 1,
            }}
          >
            {loading ? '전송 중…' : '재설정 메일 보내기'}
          </button>
          <div style={{ textAlign: 'center' }}>
            <button type="button" onClick={() => (window.location.href = '/login')}
              style={{ fontSize: 13, color: 'var(--ou-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
              로그인으로 돌아가기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
