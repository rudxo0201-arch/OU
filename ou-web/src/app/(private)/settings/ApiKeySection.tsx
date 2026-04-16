'use client';

import { useState, useEffect } from 'react';
import { Key, Trash, Copy, Check, Plus, PlugsConnected } from '@phosphor-icons/react';

interface ApiKey {
  id: string;
  key_prefix: string;
  name: string;
  last_used_at: string | null;
  created_at: string;
}

export function ApiKeySection() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/settings/api-keys');
      const data = await res.json();
      setKeys(data.keys ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchKeys(); }, []);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      const data = await res.json();
      setCreatedKey(data.plainKey);
      setNewKeyName('');
      fetchKeys();
    } catch {
      alert('키 생성에 실패했습니다');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    try {
      await fetch('/api/settings/api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId }),
      });
      fetchKeys();
      alert('키가 폐기되었습니다');
    } catch {
      alert('키 폐기에 실패했습니다');
    }
  };

  const mcpConfig = (key: string) => JSON.stringify({
    mcpServers: {
      ou: {
        url: `${typeof window !== 'undefined' ? window.location.origin : 'https://ouuniverse.com'}/api/mcp/sse`,
        headers: {
          Authorization: `Bearer ${key}`,
        },
      },
    },
  }, null, 2);

  const copyToClipboard = async (text: string, setter: (v: boolean) => void) => {
    await navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <>
      <div style={{ padding: 20, borderRadius: 8, border: '1px solid var(--color-default-border)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Key size={20} weight="bold" />
              <h4 style={{ margin: 0 }}>API Keys</h4>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setGuideOpen(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text)' }}
              >
                <PlugsConnected size={14} /> 연결 가이드
              </button>
              <button
                onClick={() => { setCreateModalOpen(true); setCreatedKey(null); }}
                style={{ background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Plus size={14} /> 새 키 생성
              </button>
            </div>
          </div>

          <span style={{ fontSize: 14, color: 'var(--color-dimmed)' }}>
            AI 클라이언트를 OU에 연결하면 모든 대화가 자동으로 기록됩니다.
          </span>

          {loading ? (
            <span style={{ fontSize: 14, color: 'var(--color-dimmed)' }}>불러오는 중...</span>
          ) : keys.length === 0 ? (
            <span style={{ fontSize: 14, color: 'var(--color-dimmed)' }}>생성된 키가 없습니다.</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {keys.map(k => (
                <div key={k.id} style={{ padding: 10, borderRadius: 6, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <code style={{ fontSize: 12, background: '#e5e7eb', padding: '2px 6px', borderRadius: 4 }}>{k.key_prefix}</code>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{k.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {k.last_used_at && (
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, border: '1px solid #e5e7eb', color: 'var(--color-dimmed)' }}>
                          마지막 사용: {new Date(k.last_used_at).toLocaleDateString('ko-KR')}
                        </span>
                      )}
                      <button
                        title="폐기"
                        onClick={() => handleRevoke(k.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 4 }}
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 키 생성 모달 */}
      {createModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 480, width: '90%', maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>새 API Key 생성</h3>
              <button onClick={() => { setCreateModalOpen(false); setCreatedKey(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            {createdKey ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#dc2626' }}>
                  이 키는 다시 볼 수 없습니다. 지금 복사해 주세요.
                </span>
                <div style={{ padding: 10, borderRadius: 6, background: '#111', wordBreak: 'break-all' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <code style={{ color: '#4ade80', flex: 1, fontSize: 12 }}>
                      {createdKey}
                    </code>
                    <button
                      onClick={() => copyToClipboard(createdKey, setCopiedKey)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedKey ? '#4ade80' : '#9ca3af', padding: 4 }}
                    >
                      {copiedKey ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                <span style={{ fontSize: 14, color: 'var(--color-dimmed)' }}>
                  Claude Code 설정에 아래 내용을 추가하세요:
                </span>
                <div style={{ padding: 10, borderRadius: 6, background: '#f3f4f6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <pre style={{ flex: 1, fontSize: 11, margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                      {mcpConfig(createdKey)}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(mcpConfig(createdKey), setCopiedConfig)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedConfig ? '#4ade80' : '#9ca3af', padding: 4, marginTop: 4 }}
                    >
                      {copiedConfig ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => { setCreateModalOpen(false); setCreatedKey(null); }}
                  style={{ width: '100%', padding: '8px 16px', borderRadius: 6, border: 'none', background: '#1a1a1a', color: '#fff', cursor: 'pointer', fontSize: 14 }}
                >
                  확인
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>키 이름</label>
                  <input
                    type="text"
                    placeholder="예: My Claude Code"
                    value={newKeyName}
                    onChange={e => setNewKeyName(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' }}
                  />
                </div>
                <button
                  onClick={handleCreate}
                  disabled={creating || !newKeyName.trim()}
                  style={{ width: '100%', padding: '8px 16px', borderRadius: 6, border: 'none', background: '#1a1a1a', color: '#fff', cursor: 'pointer', fontSize: 14, opacity: creating || !newKeyName.trim() ? 0.5 : 1 }}
                >
                  {creating ? '...' : '생성'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 연결 가이드 모달 */}
      {guideOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 600, width: '90%', maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>AI 클라이언트 연결 가이드</h3>
              <button onClick={() => setGuideOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <span style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>Claude Code</span>
                <span style={{ fontSize: 14, color: 'var(--color-dimmed)', display: 'block', marginBottom: 8 }}>
                  설정 파일에 MCP 서버를 추가하세요:
                </span>
                <pre style={{ fontSize: 11, background: '#f3f4f6', padding: 12, borderRadius: 6, margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                  {mcpConfig('ou_sk_your_key_here')}
                </pre>
              </div>

              <div>
                <span style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>claude.ai</span>
                <span style={{ fontSize: 14, color: 'var(--color-dimmed)' }}>
                  Settings &rarr; MCP Servers &rarr; Add Server에서 URL과 API Key를 입력하세요.
                </span>
              </div>

              <div>
                <span style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>기타 MCP 호환 클라이언트</span>
                <span style={{ fontSize: 14, color: 'var(--color-dimmed)' }}>
                  MCP SSE 엔드포인트: <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>/api/mcp/sse</code>
                  <br />
                  인증: <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>Authorization: Bearer ou_sk_...</code>
                </span>
              </div>

              <div>
                <span style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>ChatGPT</span>
                <span style={{ fontSize: 14, color: 'var(--color-dimmed)' }}>
                  Settings &rarr; Connectors &rarr; Add MCP Server에서 URL과 API Key를 입력하세요.
                  <br />
                  URL: <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>/api/mcp/sse</code>
                </span>
              </div>

              <div>
                <span style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>Gemini / 기타</span>
                <span style={{ fontSize: 14, color: 'var(--color-dimmed)' }}>
                  MCP 미지원 서비스는 대화 내보내기(JSON) 후
                  OU Chat View에서 업로드하면 자동으로 구조화됩니다.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
