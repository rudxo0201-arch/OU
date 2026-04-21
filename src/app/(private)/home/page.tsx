'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { DockBar } from '@/components/widgets/DockBar';
import { QSDTabs } from '@/components/qsd/QSDTabs';

export default function HomeWrapper() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ou-bg)' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ou-text-disabled)', animation: 'blink 1s ease-in-out infinite' }} />
      </div>
    }>
      <HomePage />
    </Suspense>
  );
}

function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');

  // 초대 토큰 처리
  useEffect(() => {
    if (!inviteToken || !user) return;
    import('@/lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient();
      supabase
        .from('profile_shares')
        .select('id, shared_fields, sharer_id, used_at')
        .eq('token', inviteToken)
        .gt('expires_at', new Date().toISOString())
        .is('used_at', null)
        .single()
        .then(async ({ data: share }) => {
          if (!share) return;
          const fields = share.shared_fields as Record<string, string>;
          const profileUpdate: Record<string, string> = {};
          if (fields.name) profileUpdate.display_name = fields.name;
          if (Object.keys(profileUpdate).length > 0) {
            await supabase.from('profiles').update(profileUpdate).eq('id', user.id);
          }
          await supabase
            .from('profile_shares')
            .update({ used_by: user.id, used_at: new Date().toISOString() })
            .eq('id', share.id);
          if (share.sharer_id) {
            fetch('/api/profile-card/invite-reward', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sharerId: share.sharer_id, shareId: share.id }),
            }).catch(() => {});
          }
        });
    });
    router.replace('/home');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteToken, user]);

  // Orb 전체화면 이벤트
  useEffect(() => {
    const orbHandler = () => router.push('/orb');
    window.addEventListener('orb-expand', orbHandler);
    return () => window.removeEventListener('orb-expand', orbHandler);
  }, [router]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ou-bg)' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ou-text-disabled)', animation: 'blink 1s ease-in-out infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height: '100dvh', overflow: 'hidden', background: 'var(--ou-bg)' }}>
      {/* QSD — 중앙 */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 24px 120px',
      }}>
        <div style={{ width: '100%', maxWidth: 560 }}>
          <QSDTabs data-tutorial-target="ou-view-input" />
        </div>
      </div>

      {/* DockBar — 하단 */}
      <div style={{
        position: 'absolute', bottom: 40, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 10, pointerEvents: 'none',
      }}>
        <div style={{ pointerEvents: 'auto' }}>
          <DockBar />
        </div>
      </div>
    </div>
  );
}
