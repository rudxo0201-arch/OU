'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChatPanel, type NodeSelectPayload } from '@/components/chat/ChatPanel';
import { UniverseView } from '@/components/widgets/UniverseView';

export default function ChatFullBoardPage() {
  const router = useRouter();
  const [rightPanel, setRightPanel] = useState<NodeSelectPayload | null>(null);

  const handleNodeSelect = (payload: NodeSelectPayload) => {
    setRightPanel(prev => prev?.nodeId === payload.nodeId ? null : payload);
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Top bar */}
      <div style={{
        height: 56, flexShrink: 0,
        display: 'flex', alignItems: 'center',
        padding: '0 24px',
        zIndex: 20,
      }}>
        <button
          onClick={() => router.push('/my')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            cursor: 'pointer', color: 'var(--ou-text-dimmed)',
            fontSize: 13,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          홈
        </button>
        <span style={{
          marginLeft: 16,
          fontFamily: "var(--ou-font-logo)",
          fontSize: 16, fontWeight: 600,
          color: 'var(--ou-text-strong)',
          letterSpacing: 3,
        }}>
          OU
        </span>
      </div>

      {/* 3-panel layout */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'flex',
        padding: '0 16px 16px',
        gap: 12,
      }}>
        {/* Left: Chat panel (floating dock style) */}
        <div style={{
          width: '25%', minWidth: 300, maxWidth: 400,
          flexShrink: 0,
          borderRadius: 16,
          background: 'var(--ou-surface-faint)',
          border: '1px solid var(--ou-border-faint)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <ChatPanel onNodeSelect={handleNodeSelect} />
        </div>

        {/* Center: Graph view */}
        <div style={{
          flex: 1, minWidth: 0,
          borderRadius: 16,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <UniverseView visible={true} />
        </div>

        {/* Right: Data card / view panel (collapsible) */}
        {rightPanel && (
          <div style={{
            width: '25%', minWidth: 280, maxWidth: 360,
            flexShrink: 0,
            borderRadius: 16,
            background: 'var(--ou-surface-faint)',
            border: '1px solid var(--ou-border-faint)',
            backdropFilter: 'blur(12px)',
            padding: 20,
            overflowY: 'auto',
            animation: 'ou-fade-in 0.2s ease',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ou-text-strong)', margin: 0 }}>
                  {rightPanel.title}
                </h3>
                <span style={{
                  fontSize: 11, color: 'var(--ou-text-dimmed)',
                  display: 'inline-block', marginTop: 4,
                  padding: '2px 8px', borderRadius: 999,
                  border: '0.5px solid var(--ou-border-subtle)',
                }}>
                  {rightPanel.domain}
                </span>
              </div>
              <button
                onClick={() => setRightPanel(null)}
                style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: 'var(--ou-surface-faint)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontSize: 14, color: 'var(--ou-text-dimmed)',
                }}
              >×</button>
            </div>

            {/* Node data */}
            {rightPanel.data && (
              <div style={{ fontSize: 12, color: 'var(--ou-text-secondary)', lineHeight: 1.8 }}>
                {Object.entries(rightPanel.data)
                  .filter(([k]) => !k.startsWith('_'))
                  .map(([key, val]) => (
                    <div key={key} style={{
                      padding: '6px 0',
                      borderBottom: '1px solid var(--ou-border-subtle)',
                    }}>
                      <span style={{ color: 'var(--ou-text-dimmed)', fontSize: 11 }}>{key}</span>
                      <div style={{ marginTop: 2 }}>
                        {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val ?? '')}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
