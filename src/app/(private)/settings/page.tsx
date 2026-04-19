'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { useWidgetStore } from '@/stores/widgetStore';

type Tab = 'general' | 'display' | 'views' | 'admin';

export default function SettingsPage() {
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [timedOut, setTimedOut] = useState(false);

  // 로딩 타임아웃: 3초 후에도 로딩이면 로그인 페이지로
  useEffect(() => {
    if (!isLoading) return;
    const t = setTimeout(() => setTimedOut(true), 3000);
    return () => clearTimeout(t);
  }, [isLoading]);

  useEffect(() => {
    if (timedOut && isLoading) {
      router.push('/login');
    }
  }, [timedOut, isLoading, router]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ou-text-body)', animation: 'blink 1s ease-in-out infinite' }} />
        {timedOut && <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed)' }}>로그인 페이지로 이동 중...</span>}
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  const tabs: { key: Tab; label: string; adminOnly?: boolean }[] = [
    { key: 'general', label: '일반' },
    { key: 'display', label: '디스플레이' },
    { key: 'views', label: '뷰 편집' },
    { key: 'admin', label: '관리자', adminOnly: true },
  ];

  const visibleTabs = tabs.filter(t => !t.adminOnly || isAdmin);

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* 좌측 사이드바 */}
      <aside style={{
        width: 260, minHeight: '100vh', flexShrink: 0,
        padding: '40px 24px',
        borderRight: '1px solid var(--ou-border-subtle)',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button
            onClick={() => router.push('/my')}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              border: 'none',
              background: 'var(--ou-bg)',
              boxShadow: 'var(--ou-neu-raised-xs)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="var(--ou-text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--ou-text-bright)' }}>설정</span>
        </div>

        {/* 탭 버튼 */}
        {visibleTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '16px 20px', fontSize: 16, fontWeight: 500,
              borderRadius: 12, cursor: 'pointer', textAlign: 'left',
              border: 'none',
              background: activeTab === tab.key ? 'var(--ou-bg)' : 'transparent',
              color: activeTab === tab.key ? 'var(--ou-text-bright)' : 'var(--ou-text-secondary)',
              boxShadow: activeTab === tab.key ? 'var(--ou-neu-raised-sm)' : 'none',
              transition: 'var(--ou-transition)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </aside>

      {/* 우측 콘텐츠 */}
      <main style={{ flex: 1, padding: '40px 60px', maxWidth: 900, overflow: 'auto' }}>
        {activeTab === 'general' && <GeneralTab user={user} />}
        {activeTab === 'display' && <DisplayTab />}
        {activeTab === 'views' && <ViewsTab />}
        {activeTab === 'admin' && isAdmin && <AdminTab />}
      </main>
    </div>
  );
}

// ============================================================
// 일반 탭
// ============================================================
function GeneralTab({ user }: { user: any }) {
  const supabase = createClient();
  const [profile, setProfile] = useState({ display_name: '', handle: '', bio: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [llmKeys, setLlmKeys] = useState<Record<string, boolean>>({});
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [keySaving, setKeySaving] = useState<Record<string, boolean>>({});

  // 프로필 로드
  useEffect(() => {
    if (!user?.id) return;
    supabase.from('profiles').select('display_name, handle, bio').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) setProfile({ display_name: data.display_name || '', handle: data.handle || '', bio: data.bio || '' });
      });
  }, [user?.id]);

  // LLM 키 로드
  useEffect(() => {
    fetch('/api/settings/llm-keys').then(r => r.json()).then(data => {
      const map: Record<string, boolean> = {};
      (data.keys || []).forEach((k: any) => { map[k.provider] = true; });
      setLlmKeys(map);
    }).catch(() => {});
  }, []);

  const saveProfile = async () => {
    if (!user?.id) return;
    setSaving(true);
    await supabase.from('profiles').update(profile).eq('id', user.id);
    setSaving(false);
    setSaved(true);
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
    if (res.ok) {
      setLlmKeys(p => ({ ...p, [provider]: true }));
      setKeyInputs(p => ({ ...p, [provider]: '' }));
    }
    setKeySaving(p => ({ ...p, [provider]: false }));
  };

  const deleteLlmKey = async (provider: string) => {
    await fetch('/api/settings/llm-keys', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider }),
    });
    setLlmKeys(p => ({ ...p, [provider]: false }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* 프로필 */}
      <Section title="프로필">
        <Field label="이름">
          <input
            value={profile.display_name}
            onChange={e => setProfile(p => ({ ...p, display_name: e.target.value }))}
            style={inputStyle}
          />
        </Field>
        <Field label="핸들">
          <input
            value={profile.handle}
            onChange={e => setProfile(p => ({ ...p, handle: e.target.value }))}
            placeholder="@handle"
            style={inputStyle}
          />
        </Field>
        <Field label="소개">
          <textarea
            value={profile.bio}
            onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </Field>
        <button onClick={saveProfile} disabled={saving} style={btnStyle}>
          {saving ? '저장 중...' : saved ? '저장됨' : '프로필 저장'}
        </button>
      </Section>

      {/* 계정 */}
      <Section title="계정">
        <Row label="이메일" value={user?.email || '-'} />
        <Row label="가입일" value={user?.created_at ? new Date(user.created_at).toLocaleDateString('ko-KR') : '-'} />
        <Row label="구독 플랜" value="Free" />
      </Section>

      {/* BYOK */}
      <Section title="내 API 키 (BYOK)">
        <p style={{ fontSize: 13, color: 'var(--ou-text-secondary)', lineHeight: 1.8, marginBottom: 8 }}>
          자신의 API 키를 등록하면 고급 모델을 직접 사용할 수 있습니다.
        </p>
        {(['anthropic', 'openai', 'google'] as const).map(provider => (
          <div key={provider} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--ou-border-subtle)' }}>
            <span style={{ fontSize: 15, color: 'var(--ou-text-body)', width: 110 }}>
              {provider === 'anthropic' ? 'Anthropic' : provider === 'openai' ? 'OpenAI' : 'Google'}
            </span>
            {llmKeys[provider] ? (
              <>
                <span style={{ flex: 1, fontSize: 12, color: 'var(--ou-text-dimmed)' }}>등록됨</span>
                <button onClick={() => deleteLlmKey(provider)} style={{ ...btnSmall, color: '#e55' }}>삭제</button>
              </>
            ) : (
              <>
                <input
                  type="password"
                  placeholder="API Key"
                  value={keyInputs[provider] || ''}
                  onChange={e => setKeyInputs(p => ({ ...p, [provider]: e.target.value }))}
                  style={{ ...inputStyle, flex: 1, fontSize: 12 }}
                />
                <button
                  onClick={() => saveLlmKey(provider)}
                  disabled={keySaving[provider]}
                  style={btnSmall}
                >
                  {keySaving[provider] ? '...' : '등록'}
                </button>
              </>
            )}
          </div>
        ))}
      </Section>

      {/* OU API Key */}
      <ApiKeySection />

      {/* 시스템 */}
      <Section title="시스템">
        <Row label="언어" value="한국어" />
        <Row label="알림" value="미구현" />
      </Section>
    </div>
  );
}

// ============================================================
// API Key 관리
// ============================================================
function ApiKeySection() {
  const [keys, setKeys] = useState<any[]>([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newPlainKey, setNewPlainKey] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/settings/api-keys').then(r => r.json()).then(data => {
      setKeys(data.keys || []);
    }).catch(() => {});
  }, []);

  const createKey = async () => {
    const name = newName.trim() || 'default';
    setCreating(true);
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'API 키 생성에 실패했습니다.');
        return;
      }
      if (data.plainKey) {
        setNewPlainKey(data.plainKey);
        setKeys(prev => [{ id: data.id, key_prefix: data.key_prefix, name: data.name, created_at: data.created_at }, ...prev]);
        setNewName('');
      }
    } catch {
      alert('API 키 생성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (keyId: string) => {
    if (!window.confirm('이 API 키를 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.')) return;
    await fetch('/api/settings/api-keys', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyId }),
    });
    setKeys(prev => prev.filter(k => k.id !== keyId));
  };

  const copyKey = () => {
    navigator.clipboard.writeText(newPlainKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Section title="OU API Key">
      <p style={{ fontSize: 13, color: 'var(--ou-text-secondary)', lineHeight: 1.8, marginBottom: 8 }}>
        Claude Code, MCP 등 외부 도구에서 OU 데이터에 접근할 때 사용합니다.
      </p>

      {/* 새 키 생성 후 표시 (1회만) */}
      {newPlainKey && (
        <div style={{
          padding: 12, borderRadius: 8, marginBottom: 12,
          border: 'none',
          background: 'var(--ou-bg)',
          boxShadow: 'var(--ou-neu-raised-sm)',
        }}>
          <div style={{ fontSize: 11, color: 'var(--ou-text-dimmed)', marginBottom: 6 }}>
            키가 생성되었습니다. 이 키는 다시 표시되지 않으니 지금 복사하세요.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <code style={{
              flex: 1, fontSize: 11, padding: '6px 8px', borderRadius: 4,
              background: 'var(--ou-surface-faint)', color: 'var(--ou-text-strong)',
              wordBreak: 'break-all',
            }}>
              {newPlainKey}
            </code>
            <button onClick={copyKey} style={btnSmall}>
              {copied ? '복사됨' : '복사'}
            </button>
          </div>
        </div>
      )}

      {/* 기존 키 목록 */}
      {keys.map(k => (
        <div key={k.id} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 0', borderBottom: '1px solid var(--ou-border-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--ou-text-secondary)' }}>{k.name}</span>
            <code style={{ fontSize: 11, color: 'var(--ou-text-dimmed)' }}>{k.key_prefix}</code>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {k.last_used_at && (
              <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed)' }}>
                최근 사용: {new Date(k.last_used_at).toLocaleDateString('ko-KR')}
              </span>
            )}
            <button onClick={() => revokeKey(k.id)} style={{ ...btnSmall, color: '#e55' }}>삭제</button>
          </div>
        </div>
      ))}

      {/* 새 키 생성 */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="키 이름 (예: claude-code)"
          onKeyDown={e => e.key === 'Enter' && createKey()}
          style={{ ...inputStyle, flex: 1, fontSize: 12 }}
        />
        <button onClick={createKey} disabled={creating} style={btnSmall}>
          {creating ? '...' : '생성'}
        </button>
      </div>
    </Section>
  );
}

// ============================================================
// 디스플레이 탭
// ============================================================
const PALETTES = [
  { key: 'sunrise', label: 'Sunrise', color: '#e8976b' },
  { key: 'arctic', label: 'Arctic', color: '#6b9de8' },
  { key: 'blossom', label: 'Blossom', color: '#d4849a' },
  { key: 'forest', label: 'Forest', color: '#6bc49a' },
  { key: 'dusk', label: 'Dusk', color: '#8b7ec8' },
  { key: 'stone', label: 'Stone', color: '#9a9a9a' },
];

function DisplayTab() {
  const store = useWidgetStore();
  const [gridCols, setGridCols] = useState(store.gridCols || 6);
  const [gridRows, setGridRows] = useState(store.gridRows || 4);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof document !== 'undefined') {
      return (document.documentElement.getAttribute('data-theme') as 'dark' | 'light') || 'light';
    }
    return 'light';
  });
  const [palette, setPalette] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.getAttribute('data-palette') || 'sunrise';
    }
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <Section title="홈 화면 그리드">
        <p style={{ fontSize: 13, color: 'var(--ou-text-secondary)', lineHeight: 1.8, marginBottom: 12 }}>
          위젯 배치 그리드의 크기를 조절합니다.
        </p>
        <SliderField label="가로 칸 수" value={gridCols} min={4} max={12} onChange={setGridCols} />
        <SliderField label="세로 칸 수" value={gridRows} min={3} max={8} onChange={setGridRows} />
        <div style={{
          marginTop: 12, padding: 16, borderRadius: 10,
          background: 'var(--ou-bg)',
          boxShadow: 'var(--ou-neu-pressed-sm)',
        }}>
          <div style={{ fontSize: 11, color: 'var(--ou-text-dimmed)', marginBottom: 8 }}>미리보기</div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
            gridTemplateRows: `repeat(${gridRows}, 1fr)`,
            gap: 3, aspectRatio: '16/10',
          }}>
            {Array.from({ length: gridCols * gridRows }).map((_, i) => (
              <div key={i} style={{
                borderRadius: 3,
                border: '0.5px solid var(--ou-border-faint)',
                background: 'var(--ou-surface-faint)',
              }} />
            ))}
          </div>
        </div>
        <button onClick={() => store.setGridSize(gridCols, gridRows)} style={{ ...btnStyle, marginTop: 12 }}>적용</button>
      </Section>

      <Section title="테마">
        <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
          {(['light', 'dark'] as const).map(t => (
            <button
              key={t}
              onClick={() => applyTheme(t)}
              style={{
                padding: '10px 24px', borderRadius: 10,
                border: 'none',
                background: 'var(--ou-bg)',
                boxShadow: theme === t ? 'var(--ou-neu-pressed-sm)' : 'var(--ou-neu-raised-sm)',
                color: theme === t ? 'var(--ou-accent)' : 'var(--ou-text-dimmed)',
                fontSize: 13, fontWeight: theme === t ? 600 : 400,
                cursor: 'pointer',
                transition: 'all var(--ou-transition)',
              }}
            >
              {t === 'light' ? '라이트' : '다크'}
            </button>
          ))}
        </div>
      </Section>

      <Section title="악센트 컬러">
        <p style={{ fontSize: 13, color: 'var(--ou-text-secondary)', lineHeight: 1.8, marginBottom: 16 }}>
          버튼, 글로우, 강조 등에 사용되는 테마 색상을 선택합니다.
        </p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {PALETTES.map(p => (
            <button
              key={p.key}
              onClick={() => applyPalette(p.key)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: 12, borderRadius: 12,
                border: 'none',
                background: 'var(--ou-bg)',
                boxShadow: palette === p.key ? 'var(--ou-neu-pressed-sm)' : 'var(--ou-neu-raised-sm)',
                cursor: 'pointer',
                transition: 'all var(--ou-transition)',
                minWidth: 72,
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: p.color,
                boxShadow: palette === p.key
                  ? `0 0 12px 4px ${p.color}40`
                  : 'var(--ou-neu-raised-xs)',
                transition: 'all var(--ou-transition)',
                transform: palette === p.key ? 'scale(1.1)' : 'scale(1)',
              }} />
              <span style={{
                fontSize: 11,
                color: palette === p.key ? 'var(--ou-text-strong)' : 'var(--ou-text-muted)',
                fontWeight: palette === p.key ? 600 : 400,
              }}>
                {p.label}
              </span>
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ============================================================
// 뷰 편집 탭
// ============================================================
function ViewsTab() {
  const [views, setViews] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/views').then(r => r.json()).then(data => {
      setViews(data.views || data.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: 'var(--ou-text-dimmed)', fontSize: 13 }}>뷰 목록 불러오는 중...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 뷰 목록 */}
      <Section title="내 뷰">
        {views.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--ou-text-dimmed)' }}>저장된 뷰가 없습니다.</p>
        )}
        {views.map((v: any) => (
          <button
            key={v.id}
            onClick={() => setSelected(selected?.id === v.id ? null : v)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 0', width: '100%', textAlign: 'left',
              borderBottom: '1px solid var(--ou-border-subtle)',
              background: selected?.id === v.id ? 'var(--ou-surface-faint)' : 'transparent',
              cursor: 'pointer',
            }}
          >
            <div>
              <span style={{ fontSize: 13, color: 'var(--ou-text-secondary)' }}>{v.name}</span>
              <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed)', marginLeft: 8 }}>{v.view_type}</span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed)' }}>
              {selected?.id === v.id ? '▲' : '▼'}
            </span>
          </button>
        ))}
      </Section>

      {/* 선택된 뷰 편집 */}
      {selected && <ViewEditor view={selected} onUpdate={updated => {
        setViews(vs => vs.map(v => v.id === updated.id ? { ...v, ...updated } : v));
        setSelected((s: any) => s?.id === updated.id ? { ...s, ...updated } : s);
      }} />}
    </div>
  );
}

function ViewEditor({ view, onUpdate }: { view: any; onUpdate: (v: any) => void }) {
  const [meta, setMeta] = useState({ name: view.name || '', description: view.description || '' });
  const [layout, setLayout] = useState<any>(view.layout_config || {});
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const res = await fetch('/api/views', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: view.id, name: meta.name, description: meta.description, layout_config: layout }),
    });
    if (res.ok) onUpdate({ id: view.id, name: meta.name, description: meta.description, layout_config: layout });
    setSaving(false);
  };

  return (
    <div style={{ padding: 16, borderRadius: 10, border: 'none', background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-raised-sm)' }}>
      <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--ou-text-strong)', marginBottom: 16 }}>
        {view.name} 편집
      </h4>

      {/* 메타 */}
      <Field label="이름">
        <input value={meta.name} onChange={e => setMeta(m => ({ ...m, name: e.target.value }))} style={inputStyle} />
      </Field>
      <Field label="설명">
        <input value={meta.description} onChange={e => setMeta(m => ({ ...m, description: e.target.value }))} style={inputStyle} />
      </Field>

      {/* 레이아웃 */}
      <div style={{ marginTop: 16 }}>
        <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed)', marginBottom: 8, display: 'block' }}>레이아웃</span>
        <SliderField label="카드 둥글기" value={layout.card?.borderRadius ?? 8} min={0} max={24}
          onChange={v => setLayout((l: any) => ({ ...l, card: { ...l.card, borderRadius: v } }))} />
        <SliderField label="카드 패딩" value={layout.card?.padding ?? 12} min={0} max={32}
          onChange={v => setLayout((l: any) => ({ ...l, card: { ...l.card, padding: v } }))} />
        <SliderField label="글자 크기" value={layout.textStyles?.primary?.fontSize ?? 14} min={10} max={36}
          onChange={v => setLayout((l: any) => ({ ...l, textStyles: { ...l.textStyles, primary: { ...l.textStyles?.primary, fontSize: v } } }))} />
        <SliderField label="그리드 칸 수" value={layout.grid?.columns ?? 4} min={1} max={12}
          onChange={v => setLayout((l: any) => ({ ...l, grid: { ...l.grid, columns: v } }))} />
        <SliderField label="그리드 간격" value={layout.grid?.gap ?? 8} min={0} max={24}
          onChange={v => setLayout((l: any) => ({ ...l, grid: { ...l.grid, gap: v } }))} />
      </div>

      <button onClick={save} disabled={saving} style={{ ...btnStyle, marginTop: 16 }}>
        {saving ? '저장 중...' : '저장'}
      </button>
    </div>
  );
}

// ============================================================
// 관리자 탭
// ============================================================
function AdminTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
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

// ---- DB Viewer ----
function DbViewer() {
  const [tables] = useState([
    'profiles', 'data_nodes', 'messages', 'sections', 'sentences', 'triples',
    'node_relations', 'groups', 'group_members', 'saved_views', 'subscriptions',
    'token_usage', 'api_cost_log', 'chat_rooms', 'chat_messages',
    'market_items', 'market_purchases', 'unresolved_entities',
    'verification_requests', 'personas',
  ]);
  const [selectedTable, setSelectedTable] = useState('');
  const [rows, setRows] = useState<any[]>([]);
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

  useEffect(() => {
    if (selectedTable) fetchData(selectedTable, page, search);
  }, [selectedTable, page, fetchData]);

  const doSearch = () => { setPage(1); fetchData(selectedTable, 1, search); };

  const totalPages = Math.ceil(total / 20);
  const columns = rows.length > 0 ? Object.keys(rows[0]).filter(k => k !== 'domain_data') : [];

  return (
    <Section title="DB 뷰어">
      {/* 테이블 선택 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <select
          value={selectedTable}
          onChange={e => { setSelectedTable(e.target.value); setPage(1); setSearch(''); }}
          style={{ ...inputStyle, flex: 1 }}
        >
          <option value="">테이블 선택...</option>
          {tables.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {selectedTable && (
        <>
          {/* 검색 */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              placeholder="검색..."
              style={{ ...inputStyle, flex: 1 }}
            />
            <button onClick={doSearch} style={btnSmall}>검색</button>
          </div>

          {/* 테이블 */}
          {loading ? (
            <p style={{ fontSize: 12, color: 'var(--ou-text-dimmed)' }}>로딩 중...</p>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--ou-border-subtle)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr>
                    {columns.map(col => (
                      <th key={col} style={{
                        padding: '8px 10px', textAlign: 'left', whiteSpace: 'nowrap',
                        borderBottom: '1px solid var(--ou-border-subtle)',
                        color: 'var(--ou-text-dimmed)', fontWeight: 500,
                      }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--ou-border-subtle)' }}>
                      {columns.map(col => (
                        <td key={col} style={{
                          padding: '6px 10px', maxWidth: 200, overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          color: 'var(--ou-text-secondary)',
                        }}>
                          {typeof row[col] === 'object' ? JSON.stringify(row[col])?.slice(0, 50) : String(row[col] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={btnSmall}>이전</button>
              <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed)' }}>{page} / {totalPages} ({total}건)</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={btnSmall}>다음</button>
            </div>
          )}
        </>
      )}
    </Section>
  );
}

// ---- Seed Button ----
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
    } catch {
      setStatus('error');
      setResult('네트워크 오류');
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--ou-border-subtle)' }}>
      <span style={{ fontSize: 15, color: 'var(--ou-text-body)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {result && <span style={{ fontSize: 11, color: status === 'error' ? '#e55' : 'var(--ou-text-dimmed)' }}>{result}</span>}
        <button onClick={run} disabled={status === 'loading'} style={{ ...btnSmall, opacity: status === 'loading' ? 0.5 : 1 }}>
          {status === 'loading' ? '...' : '실행'}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// 공통 컴포넌트
// ============================================================
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ou-text-bright)', marginBottom: 20 }}>{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--ou-border-subtle)' }}>
      <span style={{ fontSize: 15, color: 'var(--ou-text-body)' }}>{label}</span>
      <span style={{ fontSize: 15, color: 'var(--ou-text-secondary)' }}>{value}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 14, color: 'var(--ou-text-secondary)', display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function SliderField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
      <span style={{ fontSize: 14, color: 'var(--ou-text-body)', width: 110, flexShrink: 0 }}>{label}</span>
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: 'var(--ou-text-secondary)' }}
      />
      <span style={{ fontSize: 12, color: 'var(--ou-text-secondary)', width: 28, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

// ---- Styles ----
const inputStyle: React.CSSProperties = {
  padding: '12px 16px', borderRadius: 10,
  border: 'none',
  background: 'var(--ou-bg)',
  boxShadow: 'var(--ou-neu-pressed-sm)',
  color: 'var(--ou-text-body)',
  fontSize: 15, outline: 'none', width: '100%',
};

const btnStyle: React.CSSProperties = {
  padding: '12px 28px', borderRadius: 999,
  border: 'none',
  background: 'var(--ou-bg)',
  boxShadow: 'var(--ou-neu-raised-sm)',
  fontSize: 15, color: 'var(--ou-text-body)',
  cursor: 'pointer', transition: 'var(--ou-transition)',
};

const btnSmall: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 999,
  border: 'none',
  background: 'var(--ou-bg)',
  boxShadow: 'var(--ou-neu-raised-xs)',
  fontSize: 13, color: 'var(--ou-text-secondary)',
  cursor: 'pointer',
};
