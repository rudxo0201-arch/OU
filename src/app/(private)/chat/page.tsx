'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChatPanel, type NodeSelectPayload } from '@/components/chat/ChatPanel';
import dynamic from 'next/dynamic';
const UniverseView = dynamic(() => import('@/components/widgets/UniverseView').then(m => m.UniverseView), { ssr: false });
import { NeuButton, NeuCard, NeuBadge } from '@/components/ds';

export default function ChatFullBoardPage() {
  const router = useRouter();
  const [rightPanel, setRightPanel] = useState<NodeSelectPayload | null>(null);

  const handleNodeSelect = (payload: NodeSelectPayload) => {
    setRightPanel(prev => prev?.nodeId === payload.nodeId ? null : payload);
  };

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--ou-bg)' }}>
      {/* Top bar */}
      <div style={{
        height: 56, flexShrink: 0,
        display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: 16,
        borderBottom: '1px solid var(--ou-border-faint)',
      }}>
        <NeuButton variant="ghost" size="sm" onClick={() => router.push('/my')} style={{ gap: 6 }}>
          ← 홈
        </NeuButton>
        <span style={{
          fontFamily: 'var(--ou-font-logo)',
          fontSize: 15, fontWeight: 600,
          color: 'var(--ou-text-heading)',
          letterSpacing: 3,
        }}>
          OU
        </span>
      </div>

      {/* 3-panel layout */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', padding: '12px 16px 16px', gap: 12 }}>
        {/* Left: Chat panel */}
        <div style={{
          width: '25%', minWidth: 300, maxWidth: 400,
          flexShrink: 0,
          borderRadius: 'var(--ou-radius-lg)',
          boxShadow: 'var(--ou-neu-pressed-lg)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <ChatPanel onNodeSelect={handleNodeSelect} />
        </div>

        {/* Center: Graph view */}
        <div style={{ flex: 1, minWidth: 0, borderRadius: 'var(--ou-radius-lg)', position: 'relative', overflow: 'hidden' }}>
          <UniverseView visible={true} />
        </div>

        {/* Right: Node detail panel */}
        {rightPanel && (
          <NeuCard
            variant="raised"
            style={{
              width: '25%', minWidth: 280, maxWidth: 360,
              flexShrink: 0,
              padding: 20, overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ou-text-heading)', margin: '0 0 6px' }}>
                  {rightPanel.title}
                </h3>
                <NeuBadge>{rightPanel.domain}</NeuBadge>
              </div>
              <NeuButton variant="ghost" size="sm" onClick={() => setRightPanel(null)} style={{ padding: '2px 6px', minWidth: 0 }}>
                ✕
              </NeuButton>
            </div>

            {rightPanel.data && (
              <div style={{ fontSize: 12, color: 'var(--ou-text-body)', lineHeight: 1.8 }}>
                {Object.entries(rightPanel.data)
                  .filter(([k]) => !k.startsWith('_'))
                  .map(([key, val]) => (
                    <div key={key} style={{ padding: '6px 0', borderBottom: '1px solid var(--ou-border-faint)' }}>
                      <span style={{ color: 'var(--ou-text-muted)', fontSize: 11 }}>{key}</span>
                      <div style={{ marginTop: 2 }}>
                        {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val ?? '')}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </NeuCard>
        )}
      </div>
    </div>
  );
}
