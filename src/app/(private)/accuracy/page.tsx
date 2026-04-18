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
}

export default function AccuracyPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<UnresolvedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processed, setProcessed] = useState(0);

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
          setItems(data.map((d: any) => ({
            id: d.id,
            raw_text: d.raw_text || d.entity_text || '',
            context_snippet: d.context || d.source_text || '',
            candidates: d.candidates || [],
            created_at: d.created_at,
          })));
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, [user]);

  const resolve = async (id: string, resolution: string) => {
    const supabase = createClient();
    await supabase.from('unresolved_entities').update({
      resolved: true,
      resolved_to: resolution,
      resolved_at: new Date().toISOString(),
    }).eq('id', id);

    setItems(prev => prev.filter(i => i.id !== id));
    setProcessed(p => p + 1);
  };

  const skip = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  if (isLoading || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.6)', animation: 'blink 1s ease-in-out infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '0 32px', maxWidth: 640, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ height: 80, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={() => router.push('/my')}
          className="ou-pressable"
          style={{
            width: 32, height: 32, borderRadius: '50%',
            border: '0.5px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span style={{ fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>내 데이터 확인</span>
        {processed > 0 && (
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>
            {processed}개 확인 완료
          </span>
        )}
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '80px 0', gap: 12,
        }}>
          <span style={{ fontSize: 32 }}>&#10024;</span>
          <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)' }}>
            확인할 항목이 없어요
          </span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
            우주가 정확해요
          </span>
        </div>
      )}

      {/* Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map(item => (
          <div key={item.id} style={{
            padding: '20px 24px',
            borderRadius: 16,
            border: '0.5px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.02)',
            animation: 'ou-fade-in 0.3s ease',
          }}>
            {/* Context */}
            {item.context_snippet && (
              <div style={{
                fontSize: 12, color: 'rgba(255,255,255,0.35)',
                marginBottom: 12, lineHeight: 1.6,
                padding: '8px 12px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.015)',
              }}>
                {item.context_snippet}
              </div>
            )}

            {/* Question */}
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 16, lineHeight: 1.6 }}>
              <strong style={{ color: 'rgba(255,255,255,0.9)' }}>&ldquo;{item.raw_text}&rdquo;</strong>
              {' '}이 누구예요?
            </div>

            {/* Candidates */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {item.candidates.map(c => (
                <button
                  key={c}
                  onClick={() => resolve(item.id, c)}
                  className="ou-pressable"
                  style={{
                    padding: '8px 18px', borderRadius: 999,
                    border: '0.5px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.03)',
                    fontSize: 13, color: 'rgba(255,255,255,0.7)',
                    transition: '180ms ease',
                  }}
                >
                  {c}
                </button>
              ))}
              <button
                onClick={() => skip(item.id)}
                className="ou-pressable"
                style={{
                  padding: '8px 18px', borderRadius: 999,
                  border: '0.5px solid rgba(255,255,255,0.06)',
                  fontSize: 13, color: 'rgba(255,255,255,0.3)',
                  transition: '180ms ease',
                }}
              >
                건너뛰기
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
