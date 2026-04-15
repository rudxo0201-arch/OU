'use client';

import { Box, Text, ActionIcon, Badge, Stack } from '@mantine/core';
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
      <Box
        style={{
          position: 'relative',
          height: '100%',
          borderLeft: '0.5px solid var(--mantine-color-default-border)',
          background: '#060810',
        }}
      >
        <Box
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
          <Text fz={10} c="dimmed">라이브 그래프</Text>
          <ActionIcon variant="subtle" color="gray" size="xs" onClick={onClose}>
            <X size={12} />
          </ActionIcon>
        </Box>

        {/* New node notification */}
        {newNodeId && (
          <Box
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              zIndex: 10,
              animation: 'ou-slide-in-right 300ms ease',
            }}
          >
            <Badge variant="light" color="gray" size="sm">
              새 데이터 추가됨
            </Badge>
          </Box>
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
          <Box
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text fz="xs" c="dimmed">대화하면 별이 나타나요</Text>
          </Box>
        )}

        {/* Node detail mini-panel */}
        {selectedNode && (
          <Box
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
            <Stack gap={4}>
              <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Badge variant="light" color="gray" size="xs">
                  {selectedNode.domain}
                </Badge>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="xs"
                  onClick={() => setSelectedNode(null)}
                >
                  <X size={10} />
                </ActionIcon>
              </Box>
              <Text fz="xs" lineClamp={3} style={{ lineHeight: 1.5 }}>
                {selectedNode.raw ?? '(내용 없음)'}
              </Text>
            </Stack>
          </Box>
        )}
      </Box>
    );
  }
);
