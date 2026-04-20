'use client';
import { useState, useEffect } from 'react';
import { useViewEditorStore } from '@/stores/viewEditorStore';
import type { OrbViewConfig } from '@/types/view-editor';

export function OrbAssistInput() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);
  const { viewType, domain, filterRules, groupBy, sortField, sortDir, range, applyOrbConfig } = useViewEditorStore();

  useEffect(() => {
    fetch('/api/nodes?domains=true')
      .then(r => r.json())
      .then(data => setAvailableDomains((data.domains ?? []).map((d: { key: string }) => d.key)))
      .catch(() => {});
  }, []);

  async function handleSubmit() {
    const prompt = input.trim();
    if (!prompt || loading) return;
    setLoading(true);
    setExplanation('');

    try {
      const res = await fetch('/api/views/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          availableDomains,
          currentConfig: { domain, viewType, filters: filterRules, groupBy, sort: sortField ? { field: sortField, dir: sortDir } : undefined, range },
        }),
      });
      const data = await res.json();
      if (data.config) {
        applyOrbConfig(data.config as OrbViewConfig);
        setInput('');
      }
      if (data.explanation) {
        setExplanation(data.explanation);
        setTimeout(() => setExplanation(''), 4000);
      }
    } catch {
      // 무시
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {/* Orb 심볼 */}
        <div style={{
          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
          background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-raised-sm)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', inset: 5, borderRadius: '50%',
            background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-pressed-sm)',
          }} />
          <div style={{
            position: 'relative', width: 5, height: 5, borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, var(--ou-accent-secondary, var(--ou-accent)), var(--ou-accent) 70%)',
            boxShadow: '0 0 6px 1px color-mix(in srgb, var(--ou-accent) 40%, transparent)',
            zIndex: 1,
          }} />
        </div>

        <div style={{
          flex: 1, display: 'flex', alignItems: 'center',
          padding: '8px 12px', borderRadius: 999,
          background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-pressed-sm)',
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
            placeholder={loading ? '생각 중…' : '뷰를 말로 만들어보세요…'}
            disabled={loading}
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 14, color: 'var(--ou-text-strong)', fontFamily: 'inherit',
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || loading}
            style={{
              width: 22, height: 22, borderRadius: '50%', border: 'none',
              cursor: input.trim() && !loading ? 'pointer' : 'default',
              background: input.trim() && !loading
                ? 'radial-gradient(circle at 30% 30%, var(--ou-accent-secondary, var(--ou-accent)), var(--ou-accent) 70%)'
                : 'var(--ou-bg)',
              boxShadow: input.trim() && !loading ? 'none' : 'var(--ou-neu-pressed-sm)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              opacity: loading ? 0.5 : 1,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={input.trim() && !loading ? 'white' : 'var(--ou-text-muted)'} strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {explanation && (
        <p style={{
          fontSize: 13, color: 'var(--ou-text-muted)', margin: '0 0 0 28px',
          lineHeight: 1.5, padding: '6px 10px', borderRadius: 8,
          background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-pressed-sm)',
        }}>
          {explanation}
        </p>
      )}
    </div>
  );
}
