'use client';

import { useState, useEffect } from 'react';
import { GlassButton, GlassInput } from '@/components/ds';
import { createClient } from '@/lib/supabase/client';
import { Section, Row, Field } from './_shared';

const PROVIDER_META: Record<string, { label: string; placeholder: string }> = {
  anthropic: { label: 'Anthropic', placeholder: 'sk-ant-...' },
  openai:    { label: 'OpenAI',    placeholder: 'sk-...' },
  google:    { label: 'Google',    placeholder: 'AIza...' },
};

export function GeneralTab({ user }: { user: { id: string; email?: string; created_at?: string } }) {
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
          <GlassInput
            value={profile.display_name}
            onChange={e => setProfile(p => ({ ...p, display_name: e.target.value }))}
            placeholder="이름을 입력하세요"
          />
        </Field>
        <Field label="핸들">
          <GlassInput value={profile.handle} onChange={e => setProfile(p => ({ ...p, handle: e.target.value }))} placeholder="@handle" />
        </Field>
        <Field label="소개">
          <textarea
            value={profile.bio}
            onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
            placeholder="나에 대한 짧은 설명..."
            rows={3}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 'var(--ou-radius-md)',
              border: '1px solid var(--ou-glass-border)', background: 'var(--ou-glass)',
              fontFamily: 'inherit', fontSize: 14, color: 'var(--ou-text-body)',
              resize: 'vertical', lineHeight: 1.6,
            }}
          />
        </Field>
        <GlassButton variant="accent" onClick={saveProfile} style={{ marginTop: 4 }}>
          {saving ? '저장 중...' : saved ? '저장됨' : '프로필 저장'}
        </GlassButton>
      </Section>

      <Section title="계정">
        <Row label="이메일" value={user?.email || '-'} />
        <Row label="가입일" value={user?.created_at ? new Date(user.created_at).toLocaleDateString('ko-KR') : '-'} />
        <Row label="구독 플랜" value="Free" />
      </Section>

      <Section title="내 API 키" sub="· BYOK — 내 키로 고급 모델 사용">
        <p style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--ou-text-dimmed)', margin: 0 }}>
          자신의 API 키를 등록하면 Claude Opus, GPT-5 등 상위 모델을 직접 사용할 수 있어요. 키는 AES-256으로 암호화되어 서버에 저장돼요.
        </p>
        <div>
          {(['anthropic', 'openai', 'google'] as const).map(provider => {
            const meta = PROVIDER_META[provider];
            return (
              <div key={provider} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: '0.5px solid var(--ou-border-subtle)' }}>
                <div style={{ width: 120, fontSize: 14, color: 'var(--ou-text-strong)', fontWeight: 500, flexShrink: 0 }}>
                  {meta.label}
                </div>
                {llmKeys[provider] ? (
                  <>
                    <span style={{ flex: 1, fontSize: 12, color: 'var(--ou-text-muted)' }}>등록됨</span>
                    <GlassButton variant="ghost" size="sm" onClick={() => deleteLlmKey(provider)} style={{ color: 'var(--ou-accent)' }}>삭제</GlassButton>
                  </>
                ) : (
                  <>
                    <GlassInput
                      type="password"
                      placeholder={meta.placeholder}
                      value={keyInputs[provider] || ''}
                      onChange={e => setKeyInputs(p => ({ ...p, [provider]: e.target.value }))}
                      style={{ flex: 1, fontSize: 12, padding: '8px 14px' }}
                    />
                    <GlassButton variant="accent" size="sm" onClick={() => saveLlmKey(provider)}>
                      {keySaving[provider] ? '...' : '등록'}
                    </GlassButton>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <ApiKeySection />

      <Section title="내 데이터">
        <Row label="데이터 내보내기" action={<span style={{ fontSize: 12, color: 'var(--ou-text-disabled)' }}>준비 중</span>} />
        <Row label="모든 기억 초기화" action={<span style={{ fontSize: 12, color: 'var(--ou-text-disabled)' }}>준비 중</span>} />
        <Row label="계정 삭제" action={<span style={{ fontSize: 12, color: 'var(--ou-text-disabled)' }}>준비 중</span>} />
      </Section>
    </div>
  );
}

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
    <Section title="OU API 키">
      <p style={{ fontSize: 13, color: 'var(--ou-text-muted)', lineHeight: 1.8, marginBottom: 8 }}>
        Claude Code, MCP 등 외부 도구에서 OU 데이터에 접근할 때 사용합니다.
      </p>
      {newPlainKey && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', marginBottom: 6 }}>키가 생성되었습니다. 이 키는 다시 표시되지 않습니다.</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <code style={{ flex: 1, fontSize: 11, padding: '6px 0', color: 'var(--ou-text-body)', wordBreak: 'break-all', borderBottom: '1px solid var(--ou-border-subtle)' }}>
              {newPlainKey}
            </code>
            <GlassButton variant="accent" size="sm" onClick={copyKey}>{copied ? '복사됨' : '복사'}</GlassButton>
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
            <GlassButton variant="ghost" size="sm" onClick={() => revokeKey(k.id)} style={{ color: 'var(--ou-accent)' }}>삭제</GlassButton>
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <GlassInput
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="키 이름 (예: claude-code)"
          onKeyDown={e => e.key === 'Enter' && createKey()}
          style={{ flex: 1, fontSize: 12 }}
        />
        <GlassButton variant="accent" size="sm" onClick={createKey}>{creating ? '...' : '생성'}</GlassButton>
      </div>
    </Section>
  );
}
