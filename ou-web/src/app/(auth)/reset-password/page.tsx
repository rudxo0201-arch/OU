'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      alert('비밀번호는 6자 이상이어야 해요');
      return;
    }
    if (password !== confirm) {
      alert('비밀번호가 일치하지 않아요');
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      alert('비밀번호 변경에 실패했어요. 다시 시도해주세요.');
    } else {
      alert('비밀번호가 변경되었어요');
      router.push('/my');
    }
    setLoading(false);
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
      <div style={{ width: 380, padding: 24, borderRadius: 12 }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <h2 style={{ margin: 0, fontWeight: 700 }}>새 비밀번호 설정</h2>
              <span style={{ color: 'var(--color-dimmed)', fontSize: 14 }}>새로운 비밀번호를 입력해주세요</span>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>새 비밀번호</label>
              <input
                type="password"
                placeholder="6자 이상"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>비밀번호 확인</label>
              <input
                type="password"
                placeholder="한번 더 입력"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                minLength={6}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !password || !confirm}
              style={{
                width: '100%', padding: '8px 16px', borderRadius: 6, border: 'none',
                background: '#1a1a1a', color: '#fff', cursor: loading || !password || !confirm ? 'default' : 'pointer',
                fontSize: 14, opacity: loading || !password || !confirm ? 0.5 : 1,
              }}
            >
              {loading ? '...' : '비밀번호 변경'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
