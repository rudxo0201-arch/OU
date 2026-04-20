'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UnresolvedItem {
  id: string;
  raw_text: string;
  context_snippet: string;
  candidates: string[];
  created_at: string;
  entity_type?: string;
}

export default function AccuracyPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<UnresolvedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('unresolved_entities')
          .select('*')
          .eq('user_id', user.id)
          .eq('resolved', false)
          .order('created_at', { ascending: false })
          .limit(20);
        if (data) {
          setItems(data.map((d: Record<string, unknown>) => ({
            id: d.id as string,
            raw_text: (d.raw_text || d.entity_text || '') as string,
            context_snippet: (d.context || d.source_text || '') as string,
            candidates: (d.candidates || []) as string[],
            created_at: d.created_at as string,
            entity_type: (d.entity_type || d.type || '') as string,
          })));
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, [user]);

  const resolve = async (id: string, resolution: string) => {
    setResolving(s => new Set(s).add(id));
    const supabase = createClient();
    await supabase.from('unresolved_entities').update({
      resolved: true,
      resolved_to: resolution,
      resolved_at: new Date().toISOString(),
    }).eq('id', id);
    setTimeout(() => {
      setItems(prev => prev.filter(i => i.id !== id));
      setResolving(s => { const n = new Set(s); n.delete(id); return n; });
    }, 450);
  };

  const skip = (id: string) => {
    setResolving(s => new Set(s).add(id));
    setTimeout(() => {
      setItems(prev => prev.filter(i => i.id !== id));
      setResolving(s => { const n = new Set(s); n.delete(id); return n; });
    }, 450);
  };

  if (isLoading || loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ou-bg)' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ou-text-disabled)', animation: 'blink 1s ease-in-out infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--ou-bg)', minHeight: '100dvh' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px 120px' }}>
        {/* Header */}
        <header style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <button
            onClick={() => router.back()}
            style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'var(--ou-bg)',
              boxShadow: 'var(--ou-neu-raised-sm)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--ou-text-strong)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 style={{
            margin: 0,
            fontFamily: 'var(--ou-font-logo)',
            fontSize: 18, fontWeight: 700,
            color: 'var(--ou-text-bright)',
            letterSpacing: '-0.01em',
          }}>
            내 데이터 확인
          </h1>
          {items.length > 0 && (
            <span style={{
              marginLeft: 'auto',
              fontSize: 12, color: 'var(--ou-text-strong)',
              padding: '10px 16px', borderRadius: 999,
              background: 'var(--ou-bg)',
              boxShadow: 'var(--ou-neu-pressed-sm)',
              fontWeight: 500,
            }}>
              <strong style={{ color: 'var(--ou-accent)', fontWeight: 700 }}>{items.length}</strong>개 남음
            </span>
          )}
        </header>

        {/* Intro banner */}
        {items.length > 0 && (
          <div style={{
            fontSize: 13, color: 'var(--ou-text-body)', lineHeight: 1.7,
            padding: '20px 24px',
            borderRadius: 18,
            background: 'var(--ou-bg)',
            boxShadow: 'var(--ou-neu-pressed-sm)',
            marginBottom: 24,
            display: 'flex', gap: 14, alignItems: 'flex-start',
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: 'var(--ou-accent)',
              boxShadow: '0 0 14px color-mix(in srgb, var(--ou-accent) 70%, transparent)',
              marginTop: 6, flexShrink: 0,
            }} />
            <div>
              OU가 당신의 대화를 기억하며 <strong style={{ color: 'var(--ou-text-bright)', fontWeight: 700 }}>모호한 존재</strong>를 수집했어요.
              {' '}한 번만 확인해주시면, 우주가 더 정확해져요.
            </div>
          </div>
        )}

        {/* Items */}
        {items.length === 0 ? (
          <div style={{
            padding: '100px 20px', textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          }}>
            <div style={{
              width: 90, height: 90, borderRadius: '50%',
              background: 'var(--ou-bg)',
              boxShadow: 'var(--ou-neu-raised-lg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'pulse 3s ease-in-out infinite',
            }}>
              <div style={{
                width: 14, height: 14, borderRadius: '50%',
                background: 'var(--ou-accent)',
                boxShadow: '0 0 20px color-mix(in srgb, var(--ou-accent) 80%, transparent)',
              }} />
            </div>
            <h2 style={{
              margin: 0,
              fontFamily: 'var(--ou-font-logo)', fontSize: 18, fontWeight: 700,
              color: 'var(--ou-text-bright)',
            }}>
              확인할 항목이 없어요
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ou-text-dimmed)', lineHeight: 1.7 }}>
              우주가 깨끗하게 정리됐어요.<br />새로운 대화가 쌓이면 다시 돌아올게요.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {items.map(item => (
              <div
                key={item.id}
                style={{
                  padding: 28,
                  borderRadius: 22,
                  background: 'var(--ou-bg)',
                  boxShadow: resolving.has(item.id) ? 'var(--ou-neu-pressed-sm)' : 'var(--ou-neu-raised-md)',
                  opacity: resolving.has(item.id) ? 0 : 1,
                  transform: resolving.has(item.id) ? 'translateY(-8px) scale(0.96)' : 'none',
                  transition: 'opacity 0.45s ease, transform 0.45s ease, box-shadow 0.2s ease',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                  {item.entity_type && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
                      color: 'var(--ou-text-secondary)', fontWeight: 700,
                      padding: '7px 14px', borderRadius: 999,
                      background: 'var(--ou-bg)',
                      boxShadow: 'var(--ou-neu-pressed-sm)',
                    }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: 'var(--ou-accent)',
                        boxShadow: '0 0 6px color-mix(in srgb, var(--ou-accent) 60%, transparent)',
                      }} />
                      {item.entity_type}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--ou-text-muted)', fontFamily: 'var(--ou-font-mono)', marginLeft: 'auto' }}>
                    {item.created_at ? new Date(item.created_at).toLocaleDateString('ko-KR') : ''}
                  </span>
                </div>

                {item.context_snippet && (
                  <div style={{
                    fontSize: 13, color: 'var(--ou-text-body)',
                    marginBottom: 18, lineHeight: 1.7,
                    paddingLeft: 14,
                    borderLeft: '2px solid var(--ou-accent)',
                    fontStyle: 'italic',
                  }}>
                    {item.context_snippet}
                  </div>
                )}

                <div style={{ fontSize: 16, color: 'var(--ou-text-strong)', marginBottom: 20, lineHeight: 1.55, fontWeight: 500 }}>
                  <span style={{
                    color: 'var(--ou-text-bright)', fontWeight: 700,
                    background: 'linear-gradient(transparent 62%, color-mix(in srgb, var(--ou-accent) 40%, transparent) 62%)',
                    padding: '0 4px',
                  }}>
                    {item.raw_text}
                  </span>
                  이(가) 누구/어디/무엇이에요?
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {item.candidates.map(c => (
                    <button
                      key={c}
                      onClick={() => resolve(item.id, c)}
                      style={{
                        padding: '11px 18px', borderRadius: 999,
                        background: 'var(--ou-bg)',
                        boxShadow: 'var(--ou-neu-raised-sm)',
                        fontSize: 13, color: 'var(--ou-text-strong)',
                        fontWeight: 500,
                        cursor: 'pointer', fontFamily: 'inherit',
                        border: 'none',
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                      }}
                    >
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--ou-text-muted)', flexShrink: 0 }} />
                      {c}
                    </button>
                  ))}
                  <button
                    onClick={() => skip(item.id)}
                    style={{
                      padding: '11px 18px', borderRadius: 999,
                      background: 'transparent', boxShadow: 'none',
                      fontSize: 13, color: 'var(--ou-text-dimmed)',
                      fontWeight: 500,
                      cursor: 'pointer', fontFamily: 'inherit',
                      border: 'none',
                    }}
                  >
                    나중에
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
}
