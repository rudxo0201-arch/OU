'use client';

import { useState, useEffect, useCallback } from 'react';
import { Stack, Group, Text, Button, Loader, Paper, TextInput, Select, Modal } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { FloppyDisk, Plus, Export, ArrowCounterClockwise } from '@phosphor-icons/react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  type EdgeTypes,
  Handle,
  Position,
  BaseEdge,
  getStraightPath,
  getBezierPath,
  EdgeLabelRenderer,
  type NodeProps,
  type EdgeProps,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { DEFAULT_UX_FLOW } from '@/lib/admin/ux-flow-defaults';
import type { UXFlowData, UXNodeType, UXEdgeType } from '@/types/admin';

/** 커스텀 노드: 페이지 */
function PageNode({ data }: NodeProps) {
  return (
    <div style={{
      padding: '12px 16px',
      border: '2px solid #333',
      borderRadius: 8,
      background: '#fff',
      minWidth: 140,
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#333' }} />
      <Text fz="xs" fw={700} mb={2}>{String(data.label ?? '')}</Text>
      {data.route ? <Text fz={10} c="dimmed" ff="monospace">{String(data.route)}</Text> : null}
      {data.description ? <Text fz={10} c="dimmed" mt={2}>{String(data.description)}</Text> : null}
      <Handle type="source" position={Position.Bottom} style={{ background: '#333' }} />
    </div>
  );
}

/** 커스텀 노드: 컴포넌트 */
function ComponentNode({ data }: NodeProps) {
  return (
    <div style={{
      padding: '12px 16px',
      border: '2px solid #666',
      borderRadius: 16,
      background: '#f5f5f5',
      minWidth: 120,
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#666' }} />
      <Text fz="xs" fw={600}>{String(data.label ?? '')}</Text>
      {data.description ? <Text fz={10} c="dimmed" mt={2}>{String(data.description)}</Text> : null}
      <Handle type="source" position={Position.Bottom} style={{ background: '#666' }} />
    </div>
  );
}

/** 커스텀 노드: 모달 */
function ModalNode({ data }: NodeProps) {
  return (
    <div style={{
      padding: '10px 14px',
      border: '2px dashed #999',
      borderRadius: 8,
      background: '#fafafa',
      minWidth: 100,
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#999' }} />
      <Text fz="xs" fw={500} c="dimmed">{String(data.label ?? '')}</Text>
      {data.description ? <Text fz={10} c="dimmed" mt={2}>{String(data.description)}</Text> : null}
      <Handle type="source" position={Position.Bottom} style={{ background: '#999' }} />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  page: PageNode,
  component: ComponentNode,
  modal: ModalNode,
};

/** 커스텀 엣지: 라벨 표시 */
function LabeledEdge({ id, sourceX, sourceY, targetX, targetY, data, style }: EdgeProps) {
  const edgeType = (data?.edgeType as string) ?? 'navigate';

  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (edgeType === 'data') {
    const [path, lx, ly] = getStraightPath({ sourceX, sourceY, targetX, targetY });
    edgePath = path;
    labelX = lx;
    labelY = ly;
  } else {
    const [path, lx, ly] = getBezierPath({ sourceX, sourceY, targetX, targetY });
    edgePath = path;
    labelX = lx;
    labelY = ly;
  }

  const dashStyle = edgeType === 'hover' ? '6 3' : edgeType === 'data' ? '3 3' : undefined;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ ...style, strokeDasharray: dashStyle, stroke: '#555', strokeWidth: 1.5 }}
      />
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 10,
              background: '#fff',
              padding: '1px 6px',
              border: '1px solid #ddd',
              borderRadius: 4,
              pointerEvents: 'all',
            }}
          >
            {data.label as string}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const edgeTypes: EdgeTypes = {
  labeled: LabeledEdge,
};

/** UX 플로우 데이터 → React Flow 노드/엣지 변환 */
function toFlowNodes(data: UXFlowData): Node[] {
  return data.nodes.map(n => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: { label: n.label, route: n.route, description: n.description },
  }));
}

function toFlowEdges(data: UXFlowData): Edge[] {
  return data.edges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: 'labeled',
    data: { label: e.label, edgeType: e.type },
    animated: e.type === 'data',
  }));
}

/** React Flow → UX 플로우 데이터 변환 */
function fromFlow(nodes: Node[], edges: Edge[]): UXFlowData {
  return {
    nodes: nodes.map(n => ({
      id: n.id,
      type: (n.type ?? 'page') as UXNodeType,
      label: (n.data.label as string) ?? '',
      route: n.data.route as string | undefined,
      description: n.data.description as string | undefined,
      position: n.position,
    })),
    edges: edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: ((e.data?.edgeType as string) ?? 'navigate') as UXEdgeType,
      label: e.data?.label as string | undefined,
    })),
  };
}

export function UXFlowEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [addNodeOpened, { open: openAddNode, close: closeAddNode }] = useDisclosure(false);
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [newNodeType, setNewNodeType] = useState<string | null>('page');
  const [newNodeRoute, setNewNodeRoute] = useState('');

  useEffect(() => {
    loadFlow();
  }, []);

  const loadFlow = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ux-flow');
      const json = await res.json();
      const flowData: UXFlowData = json.data ?? DEFAULT_UX_FLOW;
      setNodes(toFlowNodes(flowData));
      setEdges(toFlowEdges(flowData));
      setLastSaved(json.updated_at);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = fromFlow(nodes, edges);
      await fetch('/api/admin/ux-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      setLastSaved(new Date().toISOString());
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setNodes(toFlowNodes(DEFAULT_UX_FLOW));
    setEdges(toFlowEdges(DEFAULT_UX_FLOW));
  };

  const onConnect = useCallback((connection: Connection) => {
    setEdges(eds => addEdge({
      ...connection,
      type: 'labeled',
      data: { label: '', edgeType: 'navigate' },
    }, eds));
  }, [setEdges]);

  const handleAddNode = () => {
    if (!newNodeLabel) return;
    const id = `node_${Date.now()}`;
    const newNode: Node = {
      id,
      type: (newNodeType ?? 'page') as string,
      position: { x: Math.random() * 600, y: Math.random() * 400 },
      data: { label: newNodeLabel, route: newNodeRoute || undefined },
    };
    setNodes(nds => [...nds, newNode]);
    setNewNodeLabel('');
    setNewNodeRoute('');
    closeAddNode();
  };

  const handleExportPNG = () => {
    const svgEl = document.querySelector('.react-flow__viewport');
    if (!svgEl) return;

    // HTML to Canvas export using built-in toPng
    const a = document.createElement('a');
    a.href = '#';
    a.download = 'ux-flow.svg';

    const svg = document.querySelector('.react-flow svg');
    if (svg) {
      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(svg);
      const blob = new Blob([svgStr], { type: 'image/svg+xml' });
      a.href = URL.createObjectURL(blob);
      a.download = 'ux-flow.svg';
      a.click();
    }
  };

  if (loading) {
    return <Group justify="center" py="xl"><Loader size="sm" /></Group>;
  }

  return (
    <Stack gap="md" h="100%">
      {/* Toolbar */}
      <Group justify="space-between">
        <Group gap="xs">
          <Button size="xs" variant="light" color="dark" leftSection={<FloppyDisk size={14} />} loading={saving} onClick={handleSave}>
            저장
          </Button>
          <Button size="xs" variant="light" color="gray" leftSection={<Plus size={14} />} onClick={openAddNode}>
            노드 추가
          </Button>
          <Button size="xs" variant="light" color="gray" leftSection={<ArrowCounterClockwise size={14} />} onClick={handleReset}>
            초기화
          </Button>
          <Button size="xs" variant="light" color="gray" leftSection={<Export size={14} />} onClick={handleExportPNG}>
            내보내기
          </Button>
        </Group>
        {lastSaved && (
          <Text fz="xs" c="dimmed">
            마지막 저장: {new Date(lastSaved).toLocaleString('ko-KR')}
          </Text>
        )}
      </Group>

      {/* Legend */}
      <Group gap="md">
        <Group gap={4}><div style={{ width: 12, height: 12, border: '2px solid #333', borderRadius: 3, background: '#fff' }} /><Text fz={10} c="dimmed">페이지</Text></Group>
        <Group gap={4}><div style={{ width: 12, height: 12, border: '2px solid #666', borderRadius: 8, background: '#f5f5f5' }} /><Text fz={10} c="dimmed">컴포넌트</Text></Group>
        <Group gap={4}><div style={{ width: 12, height: 12, border: '2px dashed #999', borderRadius: 3, background: '#fafafa' }} /><Text fz={10} c="dimmed">모달</Text></Group>
        <Text fz={10} c="dimmed">|</Text>
        <Group gap={4}><div style={{ width: 20, height: 0, borderTop: '2px solid #555' }} /><Text fz={10} c="dimmed">이동</Text></Group>
        <Group gap={4}><div style={{ width: 20, height: 0, borderTop: '2px dotted #555' }} /><Text fz={10} c="dimmed">데이터</Text></Group>
        <Group gap={4}><div style={{ width: 20, height: 0, borderTop: '2px dashed #555' }} /><Text fz={10} c="dimmed">호버</Text></Group>
      </Group>

      {/* Flow Canvas */}
      <Paper style={{ height: 600, border: '1px solid var(--mantine-color-gray-3)', borderRadius: 8 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          deleteKeyCode="Delete"
          style={{ borderRadius: 8 }}
        >
          <Controls />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#ddd" />
          <MiniMap
            nodeStrokeColor="#333"
            nodeColor={n => {
              if (n.type === 'page') return '#fff';
              if (n.type === 'component') return '#f5f5f5';
              return '#fafafa';
            }}
            style={{ border: '1px solid #ddd' }}
          />
        </ReactFlow>
      </Paper>

      {/* Add Node Modal */}
      <Modal opened={addNodeOpened} onClose={closeAddNode} title="노드 추가" centered size="sm">
        <Stack gap="md">
          <TextInput label="이름" value={newNodeLabel} onChange={e => setNewNodeLabel(e.target.value)} placeholder="예: 프로필 페이지" />
          <Select
            label="타입"
            data={[
              { value: 'page', label: '페이지' },
              { value: 'component', label: '컴포넌트' },
              { value: 'modal', label: '모달' },
            ]}
            value={newNodeType}
            onChange={setNewNodeType}
          />
          <TextInput label="라우트 (선택)" value={newNodeRoute} onChange={e => setNewNodeRoute(e.target.value)} placeholder="/profile" />
          <Group justify="flex-end" gap="xs">
            <Button variant="light" color="gray" onClick={closeAddNode}>취소</Button>
            <Button color="dark" onClick={handleAddNode}>추가</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
