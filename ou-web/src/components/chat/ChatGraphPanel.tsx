'use client';

import { X } from '@phosphor-icons/react';
import dynamic from 'next/dynamic';
import { forwardRef, useImperativeHandle, useState, useRef, useCallback } from 'react';
import type { GraphViewHandle } from '@/components/graph/GraphView';

const GraphView = dynamic(
  () => import('@/components/graph/GraphView').then(m => m.GraphView),
  { ssr: false }
);

interface ChatGraphPanelProps {
  initialNodes: any[];
  onClose: () => void;
}

export interface ChatGraphPanelHandle {
  addNode: (node: any) => void;
}

export const ChatGraphPanel = forwardRef<ChatGraphPanelHandle, ChatGraphPanelProps>(
  function ChatGraphPanel({ initialNodes, onClose }, ref) {
    const [nodes, setNodes] = useState<any[]>(initialNodes);
    const [selectedNode, setSelectedNode] = useState<any>(null);
    const [newNodeId, setNewNodeId] = useState<string | null>(null);
    const graphRef = useRef<GraphViewHandle>(null);

    useImperativeHandle(ref, () => ({
      addNode: (node: any) => {
        setNodes(prev => [...prev, node]);
        // Trigger visual feedback for new node
        setNewNodeId(node.id);
        setTimeout(() => setNewNodeId(null), 2000);
        // Focus on the new node after a short delay for physics to settle
        setTimeout(() => {
          graphRef.current?.focusNode(node.id);
        }, 500);
      },
    }));

    const handleNodeSelect = useCallback((node: any) => {
      setSelectedNode(node);
    }, []);

    return (
      <div
        style={{
          position: 'relative',
          height: '100%',
          borderLeft: '0.5px solid var(--mantine-color-default-border)',
          background: '#060810',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 10, color: 'var(--mantine-color-dimmed)' }}>라이브 그래프</span>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: 'var(--mantine-color-gray-6)' }}
          >
            <X size={12} />
          </button>
        </div>

        {/* New node notification */}
        {newNodeId && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              zIndex: 10,
              animation: 'ou-slide-in-right 300ms ease',
            }}
          >
            <span style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 4,
              background: 'rgba(255,255,255,0.08)',
              color: 'var(--mantine-color-dimmed)',
            }}>
              새 데이터 추가됨
            </span>
          </div>
        )}

        {nodes.length > 0 ? (
          <GraphView
            ref={graphRef}
            nodes={nodes}
            links={[]}
            height="100%"
            onNodeSelect={handleNodeSelect}
          />
        ) : (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 'var(--mantine-font-size-xs)', color: 'var(--mantine-color-dimmed)' }}>대화하면 별이 나타나요</span>
          </div>
        )}

        {/* Node detail mini-panel */}
        {selectedNode && (
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              right: 8,
              zIndex: 10,
              background: 'rgba(6, 8, 16, 0.9)',
              border: '0.5px solid var(--mantine-color-default-border)',
              borderRadius: 8,
              padding: 12,
              animation: 'ou-slide-in-right 200ms ease',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: 'rgba(255,255,255,0.08)',
                  color: 'var(--mantine-color-dimmed)',
                }}>
                  {selectedNode.domain}
                </span>
                <button
                  onClick={() => setSelectedNode(null)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: 'var(--mantine-color-gray-6)' }}
                >
                  <X size={10} />
                </button>
              </div>
              <span style={{ fontSize: 'var(--mantine-font-size-xs)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {selectedNode.raw ?? '(내용 없음)'}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }
);
