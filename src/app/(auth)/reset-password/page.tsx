'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { NeuAuthLayout, NeuInput, NeuButton } from '@/components/ds';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 해요');
      return;
    }
    if (password !== confirm) {
      setError('비밀번호가 일치하지 않아요');
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError('비밀번호 변경에 실패했어요. 다시 시도해주세요.');
    } else {
      router.push('/my');
    }
    setLoading(false);
  }

  return (
    <NeuAuthLayout title="새 비밀번호 설정">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <NeuInput
          label="새 비밀번호"
          type="password"
          placeholder="6자 이상"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        <NeuInput
          label="비밀번호 확인"
          type="password"
          placeholder="한번 더 입력"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={6}
        />
        {error && (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--ou-accent)', textAlign: 'center' }}>{error}</p>
        )}
        <NeuButton type="submit" variant="default" fullWidth disabled={loading || !password || !confirm}>
          {loading ? '변경 중…' : '비밀번호 변경'}
        </NeuButton>
      </form>
    </NeuAuthLayout>
  );
}
