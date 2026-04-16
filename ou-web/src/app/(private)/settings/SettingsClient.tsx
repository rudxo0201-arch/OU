'use client';

import { useState, useRef } from 'react';
import {
  User, CreditCard, Bell, ShieldCheck, Database,
  Trash, ArrowRight, SignOut, Export, Upload, Warning,
} from '@phosphor-icons/react';
import { ApiKeySection } from './ApiKeySection';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { RankBadge } from '@/components/ui/RankBadge';

interface SettingsClientProps {
  profile: {
    display_name?: string;
    email?: string;
    avatar_url?: string;
    bio?: string;
    handle?: string;
  } | null;
  subscription: { plan?: string; token_limit?: number } | null;
  nodeCount: number;
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  team: 'Team',
};

const PLAN_LIMITS: Record<string, number> = {
  free: 100,
  pro: 1000,
  team: 5000,
};

/* ── Shared styles ── */
const sectionStyle: React.CSSProperties = {
  background: 'transparent',
  border: '0.5px solid var(--ou-border-subtle)',
  borderRadius: 'var(--ou-radius-card)',
  padding: 24,
  boxShadow: 'var(--ou-glow-sm)',
  transition: 'var(--ou-transition)',
};

const dividerStyle: React.CSSProperties = {
  height: '0.5px',
  background: 'var(--ou-border-faint)',
  border: 'none',
  margin: '4px 0',
};

const labelStyle: React.CSSProperties = {
  color: 'var(--ou-text-dimmed)',
  fontSize: 11,
  fontWeight: 500,
};

const nativeInputStyle: React.CSSProperties = {
  width: '100%',
  background: 'transparent',
  border: '0.5px solid var(--ou-border-subtle)',
  borderRadius: 'var(--ou-radius-pill)',
  color: 'var(--ou-text-bright)',
  fontSize: 13,
  transition: 'var(--ou-transition)',
  fontFamily: 'inherit',
  outline: 'none',
  padding: '8px 14px',
  boxSizing: 'border-box' as const,
};

const nativeTextareaStyle: React.CSSProperties = {
  width: '100%',
  background: 'transparent',
  border: '0.5px solid var(--ou-border-subtle)',
  borderRadius: 'var(--ou-radius-card)',
  color: 'var(--ou-text-bright)',
  fontSize: 13,
  transition: 'var(--ou-transition)',
  fontFamily: 'inherit',
  outline: 'none',
  padding: '8px 14px',
  boxSizing: 'border-box' as const,
  resize: 'vertical' as const,
  minHeight: 60,
};

const pillBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '0.5px solid var(--ou-border-subtle)',
  borderRadius: 'var(--ou-radius-pill)',
  color: 'var(--ou-text-body)',
  fontSize: 13,
  fontWeight: 500,
  fontFamily: 'inherit',
  cursor: 'pointer',
  transition: 'var(--ou-transition)',
  boxShadow: 'var(--ou-glow-xs)',
  padding: '8px 20px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
};

const filledBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.9)',
  color: '#111',
  border: 'none',
  borderRadius: 'var(--ou-radius-pill)',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
  transition: 'var(--ou-transition)',
  padding: '10px 24px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  width: '100%',
};

/* ── 소셜 계정 연결 버튼 ── */
function SocialLinkButton({ provider, label, icon }: { provider: string; label: string; icon: React.ReactNode }) {
  const [linking, setLinking] = useState(false);
  const [linked, setLinked] = useState(false);

  // 현재 연결 상태 확인
  useState(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.app_metadata?.providers?.includes(provider)) {
        setLinked(true);
      }
      // identities에서도 확인
      if (user?.identities?.some((id: any) => id.provider === provider)) {
        setLinked(true);
      }
    });
  });

  const handleLink = async () => {
    if (linked) return;
    setLinking(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.linkIdentity({
        provider: provider as any,
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/settings` },
      });
      if (error) {
        alert(`${label} 연결에 실패했어요.`);
      }
    } catch {
      alert(`${label} 연결에 실패했어요.`);
    } finally {
      setLinking(false);
    }
  };

  return (
    <button
      onClick={handleLink}
      disabled={linked || linking}
      style={{
        ...pillBtnStyle,
        width: '100%',
        justifyContent: 'flex-start',
        opacity: linked ? 0.5 : linking ? 0.7 : 1,
        cursor: linked ? 'default' : linking ? 'wait' : 'pointer',
      }}
      onMouseEnter={e => {
        if (!linked && !linking) {
          e.currentTarget.style.borderColor = 'var(--ou-border-hover)';
          e.currentTarget.style.boxShadow = 'var(--ou-glow-sm)';
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--ou-border-subtle)';
        e.currentTarget.style.boxShadow = 'var(--ou-glow-xs)';
      }}
    >
      {icon}
      <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
      {linked && (
        <span style={{
          fontSize: 10,
          color: 'var(--ou-text-dimmed)',
          padding: '2px 10px',
          borderRadius: 'var(--ou-radius-pill)',
          border: '0.5px solid var(--ou-border-subtle)',
        }}>
          연결됨
        </span>
      )}
    </button>
  );
}

export function SettingsClient({ profile, subscription, nodeCount }: SettingsClientProps) {
  const { signOut } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [handle, setHandle] = useState(profile?.handle ?? '');
  const [saving, setSaving] = useState(false);

  const [emailNotify, setEmailNotify] = useState(true);
  const [pushNotify, setPushNotify] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const planId = subscription?.plan ?? 'free';
  const tokenLimit = subscription?.token_limit ?? PLAN_LIMITS[planId] ?? 100;

  // ── 프로필 저장 ──
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({
            display_name: displayName.trim(),
            bio: bio.trim(),
            handle: handle.trim(),
          })
          .eq('id', user.id);
        alert('저장했어요.');
      }
    } catch {
      alert('저장에 실패했어요.');
    } finally {
      setSaving(false);
    }
  };

  const profileChanged =
    displayName.trim() !== (profile?.display_name ?? '') ||
    bio.trim() !== (profile?.bio ?? '') ||
    handle.trim() !== (profile?.handle ?? '');

  // ── 아바타 업로드 ──
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const ext = file.name.split('.').pop();
    const path = `avatars/${user.id}.${ext}`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });

    if (error) {
      alert('업로드에 실패했어요.');
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    await supabase
      .from('profiles')
      .update({ avatar_url: urlData.publicUrl })
      .eq('id', user.id);

    alert('프로필 사진을 변경했어요.');
    router.refresh();
  };

  // ── 데이터 내보내기 (.ou) ──
  const handleExport = async () => {
    setExporting(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: nodes } = await supabase
        .from('data_nodes')
        .select('id')
        .eq('user_id', user.id);

      const { data: views } = await supabase
        .from('saved_views')
        .select('id')
        .eq('user_id', user.id);

      const res = await fetch('/api/export/ou', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeIds: (nodes ?? []).map(n => n.id),
          viewIds: (views ?? []).map(v => v.id),
        }),
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ou-export-${new Date().toISOString().slice(0, 10)}.ou`;
      a.click();
      URL.revokeObjectURL(url);

      alert('내보내기를 완료했어요.');
    } catch {
      alert('내보내기에 실패했어요.');
    } finally {
      setExporting(false);
    }
  };

  // ── 데이터 가져오기 (.ou) ──
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const ouFile = JSON.parse(text);

      const res = await fetch('/api/import/ou', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ouFile),
      });

      if (!res.ok) throw new Error('Import failed');

      const result = await res.json();
      alert(`가져오기 완료: ${result.imported?.nodes ?? 0}개 항목`);
      router.refresh();
    } catch {
      alert('.ou 파일 형식이 올바르지 않아요.');
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  // ── 계정 삭제 ──
  const handleDeleteAccount = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const SectionHeader = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
    <>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ color: 'var(--ou-text-dimmed)' }}>{icon}</span>
        <span style={{ color: 'var(--ou-text-strong)', fontSize: 13, fontWeight: 600 }}>{title}</span>
      </div>
      <div style={dividerStyle} />
    </>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, padding: 24, maxWidth: 560, margin: '0 auto', paddingBottom: 80 }}>
      <span style={{ color: 'var(--ou-text-strong)', fontSize: 22, fontWeight: 600 }}>설정</span>

      {/* ─── 1. 프로필 ─── */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionHeader icon={<User size={18} weight="light" />} title="프로필" />

          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
            <label style={{ cursor: 'pointer' }} title="사진 변경">
              <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  border: '0.5px solid var(--ou-border-muted)',
                  boxShadow: 'var(--ou-glow-sm)',
                  overflow: 'hidden',
                  background: 'var(--ou-surface-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  color: 'var(--ou-text-dimmed)',
                }}
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  (profile?.display_name ?? '?')[0]
                )}
              </div>
            </label>
          </div>

          {/* 등급 */}
          <div style={{
            padding: 12,
            borderRadius: 'var(--ou-radius-md)',
            border: '0.5px solid var(--ou-border-faint)',
            background: 'var(--ou-surface-faint)',
          }}>
            <RankBadge nodeCount={nodeCount} variant="full" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>이름</span>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="표시 이름"
              style={nativeInputStyle}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>핸들</span>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--ou-text-dimmed)' }}>@</span>
              <input
                value={handle}
                onChange={e => setHandle(e.target.value)}
                placeholder="handle"
                style={{ ...nativeInputStyle, paddingLeft: 28 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>소개</span>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="한 줄 소개를 적어주세요"
              rows={3}
              style={nativeTextareaStyle}
            />
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={!profileChanged || saving}
            style={{
              ...filledBtnStyle,
              opacity: !profileChanged || saving ? 0.3 : 1,
              cursor: !profileChanged || saving ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={e => {
              if (profileChanged && !saving) e.currentTarget.style.background = '#fff';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.9)';
            }}
          >
            {saving ? '...' : '저장'}
          </button>
        </div>
      </div>

      {/* ─── 2. 계정 ─── */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionHeader icon={<ShieldCheck size={18} weight="light" />} title="계정" />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>이메일</span>
            <span style={{ color: 'var(--ou-text-body)', fontSize: 13 }}>{profile?.email ?? '-'}</span>
          </div>

          <button
            onClick={() => router.push('/reset-password')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--ou-text-dimmed)',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'inherit',
              padding: 0,
              textAlign: 'left',
              transition: 'var(--ou-transition)',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--ou-text-body)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--ou-text-dimmed)')}
          >
            비밀번호 변경
          </button>

          {/* 소셜 계정 연결 */}
          <div style={dividerStyle} />
          <span style={labelStyle}>계정 연결</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SocialLinkButton
              provider="google"
              label="Google"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09A6.97 6.97 0 0 1 5.48 12c0-.72.13-1.43.36-2.09V7.07H2.18A11.96 11.96 0 0 0 0 12c0 1.94.46 3.77 1.28 5.4l3.56-2.77-.01-.54z" fill="#FBBC05"/>
                  <path d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.7 0 3.99 2.47 2.18 6.07l3.66 2.84c.87-2.6 3.3-4.16 6.16-4.16z" fill="#EA4335"/>
                </svg>
              }
            />
            <SocialLinkButton
              provider="kakao"
              label="Kakao"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3C6.48 3 2 6.58 2 10.94c0 2.8 1.86 5.27 4.66 6.67-.15.53-.96 3.4-.99 3.62 0 0-.02.17.09.23.11.07.24.02.24.02.32-.04 3.7-2.44 4.28-2.85.56.08 1.14.12 1.72.12 5.52 0 10-3.58 10-7.81C22 6.58 17.52 3 12 3z" fill="#3C1E1E"/>
                </svg>
              }
            />
          </div>
        </div>
      </div>

      {/* ─── 3. 구독 ─── */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ color: 'var(--ou-text-dimmed)' }}><CreditCard size={18} weight="light" /></span>
              <span style={{ color: 'var(--ou-text-strong)', fontSize: 13, fontWeight: 600 }}>구독</span>
            </div>
            <span style={{
              fontSize: 10,
              color: 'var(--ou-text-dimmed)',
              padding: '3px 12px',
              borderRadius: 'var(--ou-radius-pill)',
              border: '0.5px solid var(--ou-border-subtle)',
              boxShadow: 'var(--ou-glow-xs)',
            }}>
              {PLAN_LABELS[planId] ?? planId}
            </span>
          </div>
          <div style={dividerStyle} />

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ ...labelStyle, fontSize: 13 }}>현재 플랜</span>
            <span style={{ color: 'var(--ou-text-body)', fontSize: 13, fontWeight: 500 }}>{PLAN_LABELS[planId] ?? planId}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={labelStyle}>사용량</span>
              <span style={labelStyle}>{nodeCount} / {tokenLimit}턴</span>
            </div>
            {/* Progress bar */}
            <div style={{ width: '100%', height: 4, background: 'var(--ou-surface-muted)', borderRadius: 'var(--ou-radius-pill)' }}>
              <div style={{
                width: `${Math.min((nodeCount / tokenLimit) * 100, 100)}%`,
                height: '100%',
                background: 'var(--ou-text-dimmed)',
                borderRadius: 'var(--ou-radius-pill)',
                transition: 'width 0.3s',
              }} />
            </div>
          </div>

          {planId === 'free' && (
            <button
              onClick={() => router.push('/settings/upgrade')}
              style={pillBtnStyle}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--ou-border-hover)';
                e.currentTarget.style.boxShadow = 'var(--ou-glow-sm)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--ou-border-subtle)';
                e.currentTarget.style.boxShadow = 'var(--ou-glow-xs)';
              }}
            >
              업그레이드 <ArrowRight size={14} />
            </button>
          )}
          {planId !== 'free' && (
            <button
              onClick={() => router.push('/settings/upgrade')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--ou-text-dimmed)',
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: 'inherit',
                padding: 0,
                textAlign: 'left',
                transition: 'var(--ou-transition)',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--ou-text-body)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--ou-text-dimmed)')}
            >
              플랜 변경
            </button>
          )}
        </div>
      </div>

      {/* ─── 4. 알림 ─── */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionHeader icon={<Bell size={18} weight="light" />} title="알림" />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ color: 'var(--ou-text-body)', fontSize: 13 }}>이메일 알림</span>
              <span style={labelStyle}>새 소식이나 업데이트를 이메일로 받아요</span>
            </div>
            <input
              type="checkbox"
              checked={emailNotify}
              onChange={e => setEmailNotify(e.target.checked)}
              style={{ accentColor: 'gray' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ color: 'var(--ou-text-body)', fontSize: 13 }}>푸시 알림</span>
              <span style={labelStyle}>곧 지원할 예정이에요</span>
            </div>
            <input
              type="checkbox"
              checked={pushNotify}
              onChange={e => setPushNotify(e.target.checked)}
              disabled
              style={{ accentColor: 'gray' }}
            />
          </div>
        </div>
      </div>

      {/* ─── 5. AI 연결 (API Keys) ─── */}
      <ApiKeySection />

      {/* ─── 6. 보안 ─── */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionHeader icon={<ShieldCheck size={18} weight="light" />} title="보안" />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ color: 'var(--ou-text-body)', fontSize: 13 }}>활성 세션</span>
            <span style={labelStyle}>현재 세션 1개 활성 중</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ color: 'var(--ou-text-body)', fontSize: 13 }}>2단계 인증</span>
              <span style={labelStyle}>곧 지원할 예정이에요</span>
            </div>
            <input type="checkbox" checked={false} disabled style={{ accentColor: 'gray' }} />
          </div>
        </div>
      </div>

      {/* ─── 6. 데이터 ─── */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionHeader icon={<Database size={18} weight="light" />} title="데이터" />

          <span style={labelStyle}>
            현재 {nodeCount}개의 데이터가 저장되어 있어요
          </span>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              onClick={handleExport}
              disabled={exporting}
              style={{
                ...pillBtnStyle,
                justifyContent: 'center',
                opacity: exporting ? 0.5 : 1,
              }}
              onMouseEnter={e => {
                if (!exporting) {
                  e.currentTarget.style.borderColor = 'var(--ou-border-hover)';
                  e.currentTarget.style.boxShadow = 'var(--ou-glow-sm)';
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--ou-border-subtle)';
                e.currentTarget.style.boxShadow = 'var(--ou-glow-xs)';
              }}
            >
              <Export size={16} />
              {exporting ? '...' : '내보내기 (.ou)'}
            </button>

            <label style={{ display: 'contents' }}>
              <input
                type="file"
                accept=".ou,application/json"
                ref={importInputRef}
                onChange={handleImport}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => importInputRef.current?.click()}
                disabled={importing}
                style={{
                  ...pillBtnStyle,
                  justifyContent: 'center',
                  opacity: importing ? 0.5 : 1,
                }}
                onMouseEnter={e => {
                  if (!importing) {
                    e.currentTarget.style.borderColor = 'var(--ou-border-hover)';
                    e.currentTarget.style.boxShadow = 'var(--ou-glow-sm)';
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--ou-border-subtle)';
                  e.currentTarget.style.boxShadow = 'var(--ou-glow-xs)';
                }}
              >
                <Upload size={16} />
                {importing ? '...' : '가져오기 (.ou)'}
              </button>
            </label>
          </div>
        </div>
      </div>

      {/* ─── 7. 위험 구역 ─── */}
      <div style={{
        ...sectionStyle,
        borderColor: 'var(--ou-border-muted)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ color: 'var(--ou-text-dimmed)' }}><Warning size={18} weight="light" /></span>
            <span style={{ color: 'var(--ou-text-dimmed)', fontSize: 13, fontWeight: 600 }}>위험 구역</span>
          </div>
          <div style={dividerStyle} />

          <span style={{ color: 'var(--ou-text-dimmed)', fontSize: 13 }}>
            계정을 삭제하면 모든 대화 기록과 저장된 내용이 사라져요. 되돌릴 수 없어요.
          </span>

          <button
            onClick={signOut}
            style={{
              ...pillBtnStyle,
              width: '100%',
              justifyContent: 'center',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--ou-border-hover)';
              e.currentTarget.style.boxShadow = 'var(--ou-glow-sm)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--ou-border-subtle)';
              e.currentTarget.style.boxShadow = 'var(--ou-glow-xs)';
            }}
          >
            <SignOut size={18} />
            로그아웃
          </button>

          <button
            onClick={() => setDeleteModalOpen(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--ou-text-dimmed)',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'inherit',
              padding: '8px 0',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'var(--ou-transition)',
              width: '100%',
              justifyContent: 'center',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--ou-text-body)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--ou-text-dimmed)')}
          >
            <Trash size={16} />
            계정 삭제
          </button>
        </div>
      </div>

      {/* ─── 삭제 확인 모달 ─── */}
      {deleteModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={e => {
            if (e.target === e.currentTarget) {
              setDeleteModalOpen(false);
              setDeleteConfirmText('');
            }
          }}
        >
          <div
            style={{
              width: '90%',
              maxWidth: 440,
              background: 'var(--ou-space)',
              border: '0.5px solid var(--ou-border-subtle)',
              borderRadius: 'var(--ou-radius-card)',
              boxShadow: 'var(--ou-glow-lg)',
              padding: 24,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ color: 'var(--ou-text-strong)', fontWeight: 600 }}>정말 계정을 삭제하시겠어요?</span>
              <button onClick={() => { setDeleteModalOpen(false); setDeleteConfirmText(''); }} style={{ background: 'none', border: 'none', color: 'var(--ou-text-dimmed)', cursor: 'pointer', fontSize: 18, fontFamily: 'inherit' }}>&times;</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <span style={{ color: 'var(--ou-text-dimmed)', fontSize: 13 }}>
                삭제하면 모든 대화 기록과 저장된 내용이 사라져요. 이 작업은 되돌릴 수 없어요.
              </span>
              <span style={{ color: 'var(--ou-text-body)', fontSize: 13 }}>
                계속하려면 아래에 <strong>&quot;삭제&quot;</strong>를 입력해주세요.
              </span>
              <input
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="삭제"
                style={nativeInputStyle}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setDeleteConfirmText('');
                  }}
                  style={pillBtnStyle}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--ou-border-hover)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--ou-border-subtle)';
                  }}
                >
                  취소
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== '삭제'}
                  style={{
                    ...filledBtnStyle,
                    width: 'auto',
                    opacity: deleteConfirmText !== '삭제' ? 0.3 : 1,
                    cursor: deleteConfirmText !== '삭제' ? 'not-allowed' : 'pointer',
                  }}
                >
                  삭제하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
