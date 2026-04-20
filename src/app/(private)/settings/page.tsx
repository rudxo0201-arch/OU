'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { useWidgetStore } from '@/stores/widgetStore';
import { NeuButton, NeuInput, NeuSelect, NeuTable, type NeuTableColumn } from '@/components/ds';
import { GRID_PRESETS, type GridPreset } from '@/components/widgets/types';
type Tab = 'general' | 'display' | 'admin';

export default function SettingsPage() {
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoading) return;
    const t = setTimeout(() => setTimedOut(true), 3000);
    return () => clearTimeout(t);
  }, [isLoading]);

  useEffect(() => {
    if (timedOut && isLoading) router.push('/login');
  }, [timedOut, isLoading, router]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'var(--ou-bg)' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ou-text-disabled)', animation: 'blink 1s ease-in-out infinite' }} />
        {timedOut && <span style={{ fontSize: 12, color: 'var(--ou-text-muted)' }}>로그인 페이지로 이동 중...</span>}
      </div>
    );
  }

  if (!user) { router.push('/login'); return null; }

  const TAB_ICONS: Record<Tab, React.ReactNode> = {
    general: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 10v6M4.22 4.22l4.24 4.24m7.08 7.08l4.24 4.24M1 12h6m10 0h6M4.22 19.78l4.24-4.24m7.08-7.08l4.24-4.24"/></svg>,
    display: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"/></svg>,
    admin: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 2l8 4v6c0 5-4 9-8 10-4-1-8-5-8-10V6l8-4z"/></svg>,
  };

  const tabs: { key: Tab; label: string; adminOnly?: boolean }[] = [
    { key: 'general', label: '일반' },
    { key: 'display', label: '디스플레이' },
    { key: 'admin', label: '관리자', adminOnly: true },
  ];
  const visibleTabs = tabs.filter(t => !t.adminOnly || isAdmin);

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', background: 'var(--ou-bg)', padding: '0 116px' }}>
      {/* Sidebar */}
      <aside style={{
        width: 260, minHeight: '100dvh', flexShrink: 0,
        padding: '40px 20px',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, padding: '0 6px' }}>
          <button
            onClick={() => router.back()}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'transparent', border: '1px solid var(--ou-border-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--ou-text-secondary)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--ou-text-bright)', letterSpacing: '-0.01em' }}>설정</span>
        </div>

        {visibleTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '14px 18px',
              fontSize: 15, fontWeight: activeTab === tab.key ? 600 : 500,
              borderRadius: 12, cursor: 'pointer', textAlign: 'left',
              fontFamily: 'inherit',
              background: activeTab === tab.key ? 'var(--ou-surface-faint)' : 'transparent',
              border: activeTab === tab.key ? '1px solid var(--ou-border-subtle)' : '1px solid transparent',
              color: activeTab === tab.key ? 'var(--ou-text-bright)' : 'var(--ou-text-secondary)',
              display: 'flex', alignItems: 'center', gap: 12,
              ...(tab.adminOnly ? { marginTop: 'auto', fontSize: 13, color: activeTab === tab.key ? 'var(--ou-text-bright)' : 'var(--ou-text-dimmed)' } : {}),
            }}
          >
            <span style={{ opacity: 0.7, display: 'flex', alignItems: 'center' }}>{TAB_ICONS[tab.key]}</span>
            {tab.label}
          </button>
        ))}
      </aside>

      {/* Content */}
      <main style={{ flex: 1, padding: '40px 60px 80px', maxWidth: 880, overflow: 'auto' }}>
        {activeTab === 'general' && <GeneralTab user={user} />}
        {activeTab === 'display' && <DisplayTab />}
        {activeTab === 'admin' && isAdmin && <AdminTab />}
      </main>
    </div>
  );
}

// ============================================================
// 일반 탭
// ============================================================
function GeneralTab({ user }: { user: { id: string; email?: string; created_at?: string } }) {
  const supabase = createClient();
  const [profile, setProfile] = useState({ display_name: '', handle: '', bio: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [llmKeys, setLlmKeys] = useState<Record<string, boolean>>({});
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [keySaving, setKeySaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user?.id) return;
    supabase.from('profiles').select('display_name, handle, bio').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) setProfile({ display_name: data.display_name || '', handle: data.handle || '', bio: data.bio || '' });
      });
  }, [user?.id]);

  useEffect(() => {
    fetch('/api/settings/llm-keys').then(r => r.json()).then(data => {
      const map: Record<string, boolean> = {};
      (data.keys || []).forEach((k: { provider: string }) => { map[k.provider] = true; });
      setLlmKeys(map);
    }).catch(() => {});
  }, []);

  const saveProfile = async () => {
    if (!user?.id) return;
    setSaving(true);
    await supabase.from('profiles').update(profile).eq('id', user.id);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const saveLlmKey = async (provider: string) => {
    const key = keyInputs[provider]?.trim();
    if (!key) return;
    setKeySaving(p => ({ ...p, [provider]: true }));
    const res = await fetch('/api/settings/llm-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey: key }),
    });
    if (res.ok) { setLlmKeys(p => ({ ...p, [provider]: true })); setKeyInputs(p => ({ ...p, [provider]: '' })); }
    setKeySaving(p => ({ ...p, [provider]: false }));
  };

  const deleteLlmKey = async (provider: string) => {
    await fetch('/api/settings/llm-keys', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider }) });
    setLlmKeys(p => ({ ...p, [provider]: false }));
  };

  const PROVIDER_META: Record<string, { label: string; dot: string; placeholder: string }> = {
    anthropic: { label: 'Anthropic', dot: '#cc785c', placeholder: 'sk-ant-...' },
    openai:    { label: 'OpenAI',    dot: '#10a37f', placeholder: 'sk-...' },
    google:    { label: 'Google',    dot: '#4285f4', placeholder: 'AIza...' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <Section title="프로필" sub="· 어시스턴트가 당신을 부를 이름">
        <Field label="이름">
          <NeuInput value={profile.display_name} onChange={e => setProfile(p => ({ ...p, display_name: e.target.value }))} />
        </Field>
        <Field label="핸들">
          <NeuInput value={profile.handle} onChange={e => setProfile(p => ({ ...p, handle: e.target.value }))} placeholder="@handle" />
        </Field>
        <Field label="소개">
          <textarea
            value={profile.bio}
            onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
            placeholder="나에 대한 짧은 설명..."
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 12,
              background: 'var(--ou-surface-faint)', border: '1px solid var(--ou-border-subtle)',
              fontSize: 14, color: 'var(--ou-text-strong)', outline: 'none',
              resize: 'vertical', minHeight: 72, fontFamily: 'inherit', lineHeight: 1.6,
            }}
          />
        </Field>
        <NeuButton variant="default" onClick={saveProfile} style={{ marginTop: 4 }}>
          {saving ? '저장 중...' : saved ? '저장됨' : '프로필 저장'}
        </NeuButton>
      </Section>

      <Section title="계정">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid var(--ou-border-subtle)', gap: 16 }}>
          <span style={{ fontSize: 14, color: 'var(--ou-text-secondary)' }}>이메일</span>
          <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed)', fontFamily: 'var(--ou-font-mono, monospace)' }}>{user?.email || '-'}</span>
        </div>
        <Row label="가입일" value={user?.created_at ? new Date(user.created_at).toLocaleDateString('ko-KR') : '-'} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid var(--ou-border-subtle)', gap: 16 }}>
          <span style={{ fontSize: 14, color: 'var(--ou-text-secondary)' }}>구독 플랜</span>
          <span style={{ fontSize: 14, color: 'var(--ou-text-strong)', fontWeight: 500 }}>
            Free · <a href="#" style={{ color: 'var(--ou-accent)', textDecoration: 'none', fontWeight: 600 }}>업그레이드</a>
          </span>
        </div>
      </Section>

      <Section title="내 API 키" sub="· BYOK — 내 키로 고급 모델 사용">
        <div style={{
          padding: '12px 16px', borderRadius: 12,
          background: 'var(--ou-surface-faint)', border: '1px solid var(--ou-border-faint)',
          fontSize: 12, lineHeight: 1.7, color: 'var(--ou-text-dimmed)',
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--ou-accent)', marginTop: 7, flexShrink: 0 }} />
          <div>자신의 API 키를 등록하면 Claude Opus, GPT-5 등 상위 모델을 직접 사용할 수 있어요. 키는 AES-256으로 암호화되어 서버에 저장돼요.</div>
        </div>
        <div>
          {(['anthropic', 'openai', 'google'] as const).map(provider => {
            const meta = PROVIDER_META[provider];
            return (
              <div key={provider} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: '0.5px solid var(--ou-border-subtle)' }}>
                <div style={{ width: 120, fontSize: 14, color: 'var(--ou-text-strong)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.dot, flexShrink: 0, display: 'inline-block' }} />
                  {meta.label}
                </div>
                {llmKeys[provider] ? (
                  <>
                    <span style={{ flex: 1, fontSize: 12, color: '#3a8b63' }}>● 등록됨</span>
                    <NeuButton variant="ghost" size="sm" onClick={() => deleteLlmKey(provider)} style={{ color: 'var(--ou-accent)' }}>삭제</NeuButton>
                  </>
                ) : (
                  <>
                    <NeuInput
                      type="password"
                      placeholder={meta.placeholder}
                      value={keyInputs[provider] || ''}
                      onChange={e => setKeyInputs(p => ({ ...p, [provider]: e.target.value }))}
                      style={{ flex: 1, fontSize: 12, padding: '8px 14px' }}
                    />
                    <NeuButton variant="default" size="sm" onClick={() => saveLlmKey(provider)}>
                      {keySaving[provider] ? '...' : '등록'}
                    </NeuButton>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <ApiKeySection />

      <TutorialSection />

      <Section title="내 데이터">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid var(--ou-border-subtle)', gap: 16 }}>
          <span style={{ fontSize: 14, color: 'var(--ou-text-secondary)' }}>데이터 내보내기</span>
          <NeuButton variant="default" size="sm">JSON으로 받기</NeuButton>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid var(--ou-border-subtle)', gap: 16 }}>
          <span style={{ fontSize: 14, color: 'var(--ou-text-secondary)' }}>모든 기억 초기화</span>
          <NeuButton variant="ghost" size="sm" style={{ color: 'var(--ou-accent)' }}>초기화</NeuButton>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', gap: 16 }}>
          <span style={{ fontSize: 14, color: 'var(--ou-text-secondary)' }}>계정 삭제</span>
          <NeuButton variant="ghost" size="sm" style={{ color: 'var(--ou-accent)' }}>계정 영구 삭제</NeuButton>
        </div>
      </Section>
    </div>
  );
}

// ============================================================
// API Key 관리
// ============================================================
function ApiKeySection() {
  const [keys, setKeys] = useState<{ id: string; name: string; key_prefix: string; last_used_at?: string }[]>([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newPlainKey, setNewPlainKey] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/settings/api-keys').then(r => r.json()).then(data => { setKeys(data.keys || []); }).catch(() => {});
  }, []);

  const createKey = async () => {
    const name = newName.trim() || 'default';
    setCreating(true);
    try {
      const res = await fetch('/api/settings/api-keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      const data = await res.json();
      if (!res.ok) return;
      if (data.plainKey) {
        setNewPlainKey(data.plainKey);
        setKeys(prev => [{ id: data.id, key_prefix: data.key_prefix, name: data.name, created_at: data.created_at }, ...prev]);
        setNewName('');
      }
    } finally { setCreating(false); }
  };

  const revokeKey = async (keyId: string) => {
    if (!window.confirm('이 API 키를 삭제하시겠습니까?')) return;
    await fetch('/api/settings/api-keys', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keyId }) });
    setKeys(prev => prev.filter(k => k.id !== keyId));
  };

  const copyKey = () => { navigator.clipboard.writeText(newPlainKey); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <Section title="OU API Key">
      <p style={{ fontSize: 13, color: 'var(--ou-text-muted)', lineHeight: 1.8, marginBottom: 8 }}>
        Claude Code, MCP 등 외부 도구에서 OU 데이터에 접근할 때 사용합니다.
      </p>
      {newPlainKey && (
        <div style={{ padding: 12, marginBottom: 12, borderRadius: 10, border: '1px solid var(--ou-border-subtle)', background: 'var(--ou-surface-faint)' }}>
          <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', marginBottom: 6 }}>키가 생성되었습니다. 이 키는 다시 표시되지 않습니다.</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <code style={{ flex: 1, fontSize: 11, padding: '6px 8px', borderRadius: 4, background: 'transparent', border: '1px solid var(--ou-border-faint)', color: 'var(--ou-text-body)', wordBreak: 'break-all' }}>
              {newPlainKey}
            </code>
            <NeuButton variant="default" size="sm" onClick={copyKey}>{copied ? '복사됨' : '복사'}</NeuButton>
          </div>
        </div>
      )}
      {keys.map(k => (
        <div key={k.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--ou-border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--ou-text-body)' }}>{k.name}</span>
            <code style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>{k.key_prefix}</code>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {k.last_used_at && <span style={{ fontSize: 10, color: 'var(--ou-text-disabled)' }}>최근: {new Date(k.last_used_at).toLocaleDateString('ko-KR')}</span>}
            <NeuButton variant="ghost" size="sm" onClick={() => revokeKey(k.id)} style={{ color: 'var(--ou-accent)' }}>삭제</NeuButton>
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <NeuInput
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="키 이름 (예: claude-code)"
          onKeyDown={e => e.key === 'Enter' && createKey()}
          style={{ flex: 1, fontSize: 12 }}
        />
        <NeuButton variant="default" size="sm" onClick={createKey}>{creating ? '...' : '생성'}</NeuButton>
      </div>
    </Section>
  );
}

// ============================================================
// 디스플레이 탭
// ============================================================
const PALETTES = [
  { key: 'sunrise', label: 'Sunrise', gradient: 'linear-gradient(135deg, #f4b896, #f9d49a)' },
  { key: 'arctic', label: 'Arctic', gradient: 'linear-gradient(135deg, #a4c2ec, #a8d6e0)' },
  { key: 'blossom', label: 'Blossom', gradient: 'linear-gradient(135deg, #e8b8c4, #f0cdd8)' },
  { key: 'forest', label: 'Forest', gradient: 'linear-gradient(135deg, #a8d8b8, #c4dec8)' },
  { key: 'dusk', label: 'Dusk', gradient: 'linear-gradient(135deg, #b8afd8, #d0c8f0)' },
  { key: 'stone', label: 'Stone', gradient: 'linear-gradient(135deg, #c4c4c4, #d8d8d8)' },
];

function DisplayTab() {
  const store = useWidgetStore();
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof document !== 'undefined') return (document.documentElement.getAttribute('data-theme') as 'dark' | 'light') || 'light';
    return 'light';
  });
  const [palette, setPalette] = useState(() => {
    if (typeof document !== 'undefined') return document.documentElement.getAttribute('data-palette') || 'sunrise';
    return 'sunrise';
  });

  const applyTheme = (t: 'dark' | 'light') => {
    setTheme(t);
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('ou-theme', t);
  };

  const applyPalette = (p: string) => {
    setPalette(p);
    document.documentElement.setAttribute('data-palette', p);
    localStorage.setItem('ou-palette', p);
  };

  const THEMES = [
    { key: 'light' as const, label: '라이트', sub: '부드러운 뉴모피즘', previewBg: '#e8ecf1' },
    { key: 'dark' as const, label: '다크', sub: '그라파이트 우주', previewBg: '#2a2d3e' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <Section title="테마">
        <div style={{ display: 'flex', gap: 14 }}>
          {THEMES.map(t => (
            <button
              key={t.key}
              onClick={() => applyTheme(t.key)}
              style={{
                flex: 1, padding: '14px 18px', borderRadius: 14, cursor: 'pointer',
                background: theme === t.key ? 'var(--ou-surface-faint)' : 'transparent',
                border: theme === t.key ? '1.5px solid var(--ou-border-medium)' : '1px solid var(--ou-border-subtle)',
                textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 12,
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                background: t.previewBg,
                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)',
              }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <b style={{ fontSize: 13, color: 'var(--ou-text-bright)', fontWeight: 600 }}>{t.label}</b>
                <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed)' }}>{t.sub}</span>
              </div>
            </button>
          ))}
        </div>
      </Section>

      <Section title="컬러 팔레트" sub="· 어시스턴트 강조색">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14 }}>
          {PALETTES.map(p => (
            <button
              key={p.key}
              onClick={() => applyPalette(p.key)}
              style={{
                padding: '16px 10px 14px', borderRadius: 14, cursor: 'pointer',
                background: palette === p.key ? 'var(--ou-surface-faint)' : 'transparent',
                border: palette === p.key ? '1.5px solid var(--ou-border-medium)' : '1px solid var(--ou-border-subtle)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: p.gradient,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1), inset 0 -4px 6px rgba(0,0,0,0.05)',
              }} />
              <span style={{
                fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.8px',
                color: palette === p.key ? 'var(--ou-text-bright)' : 'var(--ou-text-secondary)',
                fontWeight: palette === p.key ? 600 : 400,
              }}>
                {p.label}
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="홈 화면 그리드">
        <p style={{ fontSize: 13, color: 'var(--ou-text-muted)', lineHeight: 1.8, marginBottom: 12 }}>위젯 배치 그리드의 크기를 조절합니다.</p>
        <div style={{ display: 'flex', gap: 14 }}>
          {(Object.entries(GRID_PRESETS) as [GridPreset, typeof GRID_PRESETS[GridPreset]][]).map(([key, preset]) => {
            const isActive = store.gridCols === preset.cols && store.gridRows === preset.rows;
            return (
              <button
                key={key}
                onClick={() => store.setGridSize(preset.cols, preset.rows)}
                style={{
                  flex: 1, padding: '14px 18px', borderRadius: 14, cursor: 'pointer',
                  background: isActive ? 'var(--ou-surface-faint)' : 'transparent',
                  border: isActive ? '1.5px solid var(--ou-border-medium)' : '1px solid var(--ou-border-subtle)',
                  textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 12,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                  display: 'grid',
                  gridTemplateColumns: `repeat(${preset.cols}, 1fr)`,
                  gridTemplateRows: `repeat(${preset.rows}, 1fr)`,
                  gap: 1, padding: 4,
                  background: 'var(--ou-bg)',
                  boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)',
                }}>
                  {Array.from({ length: preset.cols * preset.rows }).map((_, i) => (
                    <div key={i} style={{ borderRadius: 1, background: 'var(--ou-text-disabled)', opacity: 0.3 }} />
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <b style={{ fontSize: 13, color: 'var(--ou-text-bright)', fontWeight: 600 }}>{preset.label}</b>
                  <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed)' }}>{preset.sub}</span>
                </div>
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 12, padding: 16, borderRadius: 12, border: '1px solid var(--ou-border-subtle)' }}>
          <div style={{ fontSize: 11, color: 'var(--ou-text-disabled)', marginBottom: 8 }}>미리보기</div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${store.gridCols}, 1fr)`, gridTemplateRows: `repeat(${store.gridRows}, 1fr)`, gap: 3, aspectRatio: '16/10' }}>
            {Array.from({ length: store.gridCols * store.gridRows }).map((_, i) => (
              <div key={i} style={{ borderRadius: 3, background: 'var(--ou-border-faint)', border: '1px solid var(--ou-border-faint)' }} />
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}

// ============================================================
// 관리자 탭
// ============================================================
function AdminTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
      <DbViewer />
      <Section title="데이터 시딩">
        <SeedButton type="boncho" label="본초 시딩 (91종)" />
        <SeedButton type="boncho-all" label="본초 전체 (504종)" />
        <SeedButton type="bangje" label="방제 시딩" />
        <SeedButton type="hanja-radicals" label="한자 부수 (214자)" />
        <SeedButton type="hanja" label="한자 급수 (~1,400자)" />
        <SeedButton type="hanja-all" label="한자 전체 (~98,000자)" />
        <SeedButton type="shanghanlun" label="상한론 (60조문)" />
      </Section>
    </div>
  );
}

function DbViewer() {
  const tables = [
    'profiles', 'data_nodes', 'messages', 'sections', 'sentences', 'triples',
    'node_relations', 'groups', 'group_members', 'saved_views', 'subscriptions',
    'token_usage', 'api_cost_log', 'chat_rooms', 'chat_messages',
    'market_items', 'market_purchases', 'unresolved_entities',
    'verification_requests', 'personas',
  ];
  const [selectedTable, setSelectedTable] = useState('');
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (tbl: string, pg: number, q: string) => {
    if (!tbl) return;
    setLoading(true);
    const params = new URLSearchParams({ page: String(pg), pageSize: '20', search: q });
    const res = await fetch(`/api/admin/tables/${tbl}?${params}`);
    const data = await res.json();
    setRows(data.data || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, []);

  useEffect(() => { if (selectedTable) fetchData(selectedTable, page, search); }, [selectedTable, page, fetchData]);

  const doSearch = () => { setPage(1); fetchData(selectedTable, 1, search); };
  const totalPages = Math.ceil(total / 20);
  const columns: NeuTableColumn[] = rows.length > 0
    ? Object.keys(rows[0]).filter(k => k !== 'domain_data').map(k => ({
        key: k,
        label: k,
        render: (value) => {
          const str = typeof value === 'object' ? JSON.stringify(value)?.slice(0, 50) : String(value ?? '');
          return <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{str}</span>;
        },
      }))
    : [];

  return (
    <Section title="DB 뷰어">
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <NeuSelect
          value={selectedTable}
          onChange={v => { setSelectedTable(v); setPage(1); setSearch(''); }}
          options={[{ value: '', label: '테이블 선택...' }, ...tables.map(t => ({ value: t, label: t }))]}
          style={{ flex: 1 }}
        />
      </div>
      {selectedTable && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <NeuInput value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} placeholder="검색..." style={{ flex: 1 }} />
            <NeuButton variant="default" size="sm" onClick={doSearch}>검색</NeuButton>
          </div>
          {loading ? (
            <p style={{ fontSize: 12, color: 'var(--ou-text-muted)' }}>로딩 중...</p>
          ) : (
            <NeuTable columns={columns} rows={rows} />
          )}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 }}>
              <NeuButton variant="default" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))}>이전</NeuButton>
              <span style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>{page} / {totalPages} ({total}건)</span>
              <NeuButton variant="default" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))}>다음</NeuButton>
            </div>
          )}
        </>
      )}
    </Section>
  );
}

function SeedButton({ type, label }: { type: string; label: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState('');

  const run = async () => {
    setStatus('loading');
    try {
      const res = await fetch(`/api/admin/seed?type=${type}`, { method: 'POST' });
      const data = await res.json();
      setStatus(data.success ? 'done' : 'error');
      setResult(data.message || data.error || '');
    } catch { setStatus('error'); setResult('네트워크 오류'); }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--ou-border-subtle)' }}>
      <span style={{ fontSize: 14, color: 'var(--ou-text-body)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {result && <span style={{ fontSize: 11, color: status === 'error' ? 'var(--ou-accent)' : 'var(--ou-text-muted)' }}>{result}</span>}
        <NeuButton variant="default" size="sm" onClick={run}>{status === 'loading' ? '...' : '실행'}</NeuButton>
      </div>
    </div>
  );
}

// ============================================================
// 튜토리얼 섹션
// ============================================================
function TutorialSection() {
  const router = useRouter();

  const handleRestart = () => {
    router.push('/my?tutorial=replay');
  };

  return (
    <Section title="튜토리얼">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', gap: 16 }}>
        <span style={{ fontSize: 14, color: 'var(--ou-text-secondary)' }}>튜토리얼 다시 보기</span>
        <NeuButton variant="default" size="sm" onClick={handleRestart}>다시 시작</NeuButton>
      </div>
    </Section>
  );
}

// ============================================================
// 공통 컴포넌트
// ============================================================
function Section({ title, children, sub }: { title: string; children: React.ReactNode; sub?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--ou-text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          {title}
        </h2>
        {sub && <span style={{ fontSize: 11, color: 'var(--ou-text-disabled)', fontWeight: 400 }}>{sub}</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid var(--ou-border-subtle)', gap: 16 }}>
      <span style={{ fontSize: 14, color: 'var(--ou-text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 14, color: 'var(--ou-text-strong)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--ou-text-secondary)', letterSpacing: '0.2px' }}>{label}</label>
      {children}
    </div>
  );
}

function SliderField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
      <span style={{ fontSize: 13, color: 'var(--ou-text-body)', width: 110, flexShrink: 0 }}>{label}</span>
      <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} style={{ flex: 1, accentColor: 'var(--ou-accent)' }} />
      <span style={{ fontSize: 12, color: 'var(--ou-text-muted)', width: 28, textAlign: 'right' }}>{value}</span>
    </div>
  );
}
