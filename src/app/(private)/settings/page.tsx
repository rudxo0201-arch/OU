'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { useWidgetStore } from '@/stores/widgetStore';
import { NeuButton, NeuInput, NeuCard, NeuSelect, NeuTable, type NeuTableColumn } from '@/components/ds';

type Tab = 'general' | 'display' | 'views' | 'admin';

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

  const tabs: { key: Tab; label: string; adminOnly?: boolean }[] = [
    { key: 'general', label: '일반' },
    { key: 'display', label: '디스플레이' },
    { key: 'views', label: '뷰 편집' },
    { key: 'admin', label: '관리자', adminOnly: true },
  ];
  const visibleTabs = tabs.filter(t => !t.adminOnly || isAdmin);

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', background: 'var(--ou-bg)' }}>
      {/* Sidebar */}
      <aside style={{
        width: 260, minHeight: '100dvh', flexShrink: 0,
        padding: '40px 20px',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, padding: '0 6px' }}>
          <button
            onClick={() => router.push('/my')}
            style={{
              width: 36, height: 36, borderRadius: '50%', border: 'none',
              background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-raised-xs)',
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
              border: 'none', fontFamily: 'inherit',
              background: activeTab === tab.key ? 'var(--ou-bg)' : 'transparent',
              boxShadow: activeTab === tab.key ? 'var(--ou-neu-raised-sm)' : 'none',
              color: activeTab === tab.key ? 'var(--ou-text-bright)' : 'var(--ou-text-secondary)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </aside>

      {/* Content */}
      <main style={{ flex: 1, padding: '40px 60px 80px', maxWidth: 880, overflow: 'auto' }}>
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
          <NeuInput value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} placeholder="간단한 소개" />
        </Field>
        <NeuButton variant="default" onClick={saveProfile} style={{ marginTop: 4 }}>
          {saving ? '저장 중...' : saved ? '저장됨' : '프로필 저장'}
        </NeuButton>
      </Section>

      <Section title="계정">
        <Row label="이메일" value={user?.email || '-'} />
        <Row label="가입일" value={user?.created_at ? new Date(user.created_at).toLocaleDateString('ko-KR') : '-'} />
        <Row label="구독 플랜" value="Free" />
      </Section>

      <Section title="내 API 키 (BYOK)">
        <p style={{ fontSize: 13, color: 'var(--ou-text-muted)', lineHeight: 1.8, marginBottom: 8 }}>
          자신의 API 키를 등록하면 고급 모델을 직접 사용할 수 있습니다.
        </p>
        {(['anthropic', 'openai', 'google'] as const).map(provider => (
          <div key={provider} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--ou-border-subtle)' }}>
            <span style={{ fontSize: 14, color: 'var(--ou-text-body)', width: 110 }}>
              {provider === 'anthropic' ? 'Anthropic' : provider === 'openai' ? 'OpenAI' : 'Google'}
            </span>
            {llmKeys[provider] ? (
              <>
                <span style={{ flex: 1, fontSize: 12, color: 'var(--ou-text-muted)' }}>등록됨</span>
                <NeuButton variant="ghost" size="sm" onClick={() => deleteLlmKey(provider)} style={{ color: 'var(--ou-accent)' }}>삭제</NeuButton>
              </>
            ) : (
              <>
                <NeuInput
                  type="password"
                  placeholder="API Key"
                  value={keyInputs[provider] || ''}
                  onChange={e => setKeyInputs(p => ({ ...p, [provider]: e.target.value }))}
                  style={{ flex: 1, fontSize: 12 }}
                />
                <NeuButton variant="default" size="sm" onClick={() => saveLlmKey(provider)}>
                  {keySaving[provider] ? '...' : '등록'}
                </NeuButton>
              </>
            )}
          </div>
        ))}
      </Section>

      <ApiKeySection />

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
        <NeuCard variant="raised" style={{ padding: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', marginBottom: 6 }}>키가 생성되었습니다. 이 키는 다시 표시되지 않습니다.</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <code style={{ flex: 1, fontSize: 11, padding: '6px 8px', borderRadius: 4, background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-pressed-sm)', color: 'var(--ou-text-body)', wordBreak: 'break-all' }}>
              {newPlainKey}
            </code>
            <NeuButton variant="default" size="sm" onClick={copyKey}>{copied ? '복사됨' : '복사'}</NeuButton>
          </div>
        </NeuCard>
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <Section title="홈 화면 그리드">
        <p style={{ fontSize: 13, color: 'var(--ou-text-muted)', lineHeight: 1.8, marginBottom: 12 }}>위젯 배치 그리드의 크기를 조절합니다.</p>
        <SliderField label="가로 칸 수" value={gridCols} min={4} max={12} onChange={setGridCols} />
        <SliderField label="세로 칸 수" value={gridRows} min={3} max={8} onChange={setGridRows} />
        <NeuCard variant="pressed" style={{ marginTop: 12, padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--ou-text-disabled)', marginBottom: 8 }}>미리보기</div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gridTemplateRows: `repeat(${gridRows}, 1fr)`, gap: 3, aspectRatio: '16/10' }}>
            {Array.from({ length: gridCols * gridRows }).map((_, i) => (
              <div key={i} style={{ borderRadius: 3, background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-raised-xs)' }} />
            ))}
          </div>
        </NeuCard>
        <NeuButton variant="default" onClick={() => store.setGridSize(gridCols, gridRows)} style={{ marginTop: 12 }}>적용</NeuButton>
      </Section>

      <Section title="테마">
        <div style={{ display: 'flex', gap: 12 }}>
          {(['light', 'dark'] as const).map(t => (
            <NeuButton key={t} variant={theme === t ? 'default' : 'ghost'} onClick={() => applyTheme(t)}>
              {t === 'light' ? '라이트' : '다크'}
            </NeuButton>
          ))}
        </div>
      </Section>

      <Section title="악센트 컬러">
        <p style={{ fontSize: 13, color: 'var(--ou-text-muted)', lineHeight: 1.8, marginBottom: 16 }}>버튼, 글로우, 강조 등에 사용되는 테마 색상입니다.</p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {PALETTES.map(p => (
            <NeuCard
              key={p.key}
              variant={palette === p.key ? 'pressed' : 'raised'}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 12, cursor: 'pointer', minWidth: 72 }}
              onClick={() => applyPalette(p.key)}
            >
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: p.color,
                boxShadow: palette === p.key ? `0 0 12px 4px ${p.color}40` : 'var(--ou-neu-raised-xs)',
                transform: palette === p.key ? 'scale(1.1)' : 'scale(1)',
                transition: 'all var(--ou-transition)',
              }} />
              <span style={{ fontSize: 11, color: palette === p.key ? 'var(--ou-text-heading)' : 'var(--ou-text-muted)', fontWeight: palette === p.key ? 600 : 400 }}>
                {p.label}
              </span>
            </NeuCard>
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
  const [views, setViews] = useState<Record<string, unknown>[]>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/views').then(r => r.json()).then(data => { setViews(data.views || data.data || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: 'var(--ou-text-muted)', fontSize: 13 }}>뷰 목록 불러오는 중...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Section title="내 뷰">
        {views.length === 0 && <p style={{ fontSize: 12, color: 'var(--ou-text-disabled)' }}>저장된 뷰가 없습니다.</p>}
        {views.map(v => (
          <NeuButton
            key={v.id as string}
            variant={selected && (selected as Record<string, unknown>).id === v.id ? 'default' : 'ghost'}
            onClick={() => setSelected(selected && (selected as Record<string, unknown>).id === v.id ? null : v)}
            style={{ justifyContent: 'space-between', width: '100%', borderBottom: '1px solid var(--ou-border-subtle)', borderRadius: 0, padding: '10px 0' }}
          >
            <div>
              <span style={{ fontSize: 13, color: 'var(--ou-text-body)' }}>{v.name as string}</span>
              <span style={{ fontSize: 11, color: 'var(--ou-text-muted)', marginLeft: 8 }}>{v.view_type as string}</span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--ou-text-disabled)' }}>{selected && (selected as Record<string, unknown>).id === v.id ? '▲' : '▼'}</span>
          </NeuButton>
        ))}
      </Section>

      {selected && <ViewEditor view={selected} onUpdate={updated => {
        setViews(vs => vs.map(v => v.id === (updated as Record<string, unknown>).id ? { ...v, ...(updated as Record<string, unknown>) } : v));
        setSelected(s => s?.id === (updated as Record<string, unknown>).id ? { ...s, ...(updated as Record<string, unknown>) } : s);
      }} />}
    </div>
  );
}

function ViewEditor({ view, onUpdate }: { view: Record<string, unknown>; onUpdate: (v: Record<string, unknown>) => void }) {
  const [meta, setMeta] = useState({ name: (view.name as string) || '', description: (view.description as string) || '' });
  const [layout, setLayout] = useState<Record<string, unknown>>((view.layout_config as Record<string, unknown>) || {});
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const res = await fetch('/api/views', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: view.id, ...meta, layout_config: layout }) });
    if (res.ok) onUpdate({ id: view.id, ...meta, layout_config: layout });
    setSaving(false);
  };

  return (
    <NeuCard variant="raised" style={{ padding: 20 }}>
      <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--ou-text-heading)', marginBottom: 16 }}>{view.name as string} 편집</h4>
      <Field label="이름"><NeuInput value={meta.name} onChange={e => setMeta(m => ({ ...m, name: e.target.value }))} /></Field>
      <Field label="설명"><NeuInput value={meta.description} onChange={e => setMeta(m => ({ ...m, description: e.target.value }))} /></Field>
      <div style={{ marginTop: 16 }}>
        <span style={{ fontSize: 12, color: 'var(--ou-text-muted)', marginBottom: 8, display: 'block' }}>레이아웃</span>
        <SliderField label="카드 둥글기" value={((layout.card as Record<string, number>) || {}).borderRadius ?? 8} min={0} max={24} onChange={v => setLayout(l => ({ ...l, card: { ...(l.card as Record<string, unknown> || {}), borderRadius: v } }))} />
        <SliderField label="글자 크기" value={(((layout.textStyles as Record<string, unknown>)?.primary as Record<string, number>) || {}).fontSize ?? 14} min={10} max={36} onChange={v => setLayout(l => ({ ...l, textStyles: { ...(l.textStyles as Record<string, unknown> || {}), primary: { ...((l.textStyles as Record<string, Record<string, unknown>>)?.primary || {}), fontSize: v } } }))} />
        <SliderField label="그리드 칸 수" value={((layout.grid as Record<string, number>) || {}).columns ?? 4} min={1} max={12} onChange={v => setLayout(l => ({ ...l, grid: { ...(l.grid as Record<string, unknown> || {}), columns: v } }))} />
      </div>
      <NeuButton variant="default" onClick={save} style={{ marginTop: 16 }}>{saving ? '저장 중...' : '저장'}</NeuButton>
    </NeuCard>
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
// 공통 컴포넌트
// ============================================================
function Section({ title, children, sub }: { title: string; children: React.ReactNode; sub?: string }) {
  return (
    <div style={{
      background: 'var(--ou-bg)', borderRadius: 20, padding: '28px 32px',
      boxShadow: 'var(--ou-neu-pressed-sm)',
      display: 'flex', flexDirection: 'column', gap: 18,
    }}>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--ou-text-bright)', letterSpacing: '0.2px' }}>
        {title}
        {sub && <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed)', fontWeight: 400, marginLeft: 10, letterSpacing: 0 }}>{sub}</span>}
      </h2>
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
