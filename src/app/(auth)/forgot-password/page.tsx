'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { NeuAuthLayout, NeuInput, NeuButton, NeuCard } from '@/components/ds';

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

  if (sent) {
    return (
      <NeuAuthLayout>
        <NeuCard variant="pressed" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✉️</div>
          <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 16, color: 'var(--ou-text-heading)' }}>
            메일을 확인해주세요
          </p>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--ou-text-muted)' }}>
            <strong style={{ color: 'var(--ou-text-body)' }}>{email}</strong>로<br />
            비밀번호 재설정 링크를 보냈어요
          </p>
          <NeuButton variant="ghost" size="sm" onClick={() => (window.location.href = '/login')}>
            로그인으로 돌아가기
          </NeuButton>
        </NeuCard>
      </NeuAuthLayout>
    );
  }

  return (
    <NeuAuthLayout title="비밀번호 찾기">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <NeuInput
          label="이메일"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {error && (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--ou-accent)', textAlign: 'center' }}>{error}</p>
        )}
        <NeuButton type="submit" variant="default" fullWidth disabled={loading || !email}>
          {loading ? '전송 중…' : '재설정 메일 보내기'}
        </NeuButton>
        <div style={{ textAlign: 'center' }}>
          <NeuButton variant="ghost" size="sm" onClick={() => (window.location.href = '/login')}>
            로그인으로 돌아가기
          </NeuButton>
        </div>
      </form>
    </NeuAuthLayout>
  );
}
