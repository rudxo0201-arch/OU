'use client';

import { useState, useEffect, useCallback } from 'react';
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
      <span style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 2 }}>{String(data.label ?? '')}</span>
      {data.route ? <span style={{ fontSize: 10, color: '#868e96', fontFamily: 'monospace', display: 'block' }}>{String(data.route)}</span> : null}
      {data.description ? <span style={{ fontSize: 10, color: '#868e96', display: 'block', marginTop: 2 }}>{String(data.description)}</span> : null}
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
      <span style={{ fontSize: 12, fontWeight: 600 }}>{String(data.label ?? '')}</span>
      {data.description ? <span style={{ fontSize: 10, color: '#868e96', display: 'block', marginTop: 2 }}>{String(data.description)}</span> : null}
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
      <span style={{ fontSize: 12, fontWeight: 500, color: '#868e96' }}>{String(data.label ?? '')}</span>
      {data.description ? <span style={{ fontSize: 10, color: '#868e96', display: 'block', marginTop: 2 }}>{String(data.description)}</span> : null}
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
  const [addNodeOpened, setAddNodeOpened] = useState(false);
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [newNodeType, setNewNodeType] = useState<string>('page');
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
    setAddNodeOpened(false);
  };

  const handleExportPNG = () => {
    const svgEl = document.querySelector('.react-flow__viewport');
    if (!svgEl) return;

    const svg = document.querySelector('.react-flow svg');
    if (svg) {
      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(svg);
      const blob = new Blob([svgStr], { type: 'image/svg+xml' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'ux-flow.svg';
      a.click();
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={saving} onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', background: '#343a40', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
            <FloppyDisk size={14} /> {saving ? '...' : '저장'}
          </button>
          <button onClick={() => setAddNodeOpened(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
            <Plus size={14} /> 노드 추가
          </button>
          <button onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
            <ArrowCounterClockwise size={14} /> 초기화
          </button>
          <button onClick={handleExportPNG} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
            <Export size={14} /> 내보내기
          </button>
        </div>
        {lastSaved && (
          <span style={{ fontSize: 12, color: '#868e96' }}>
            마지막 저장: {new Date(lastSaved).toLocaleString('ko-KR')}
          </span>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}><div style={{ width: 12, height: 12, border: '2px solid #333', borderRadius: 3, background: '#fff' }} /><span style={{ fontSize: 10, color: '#868e96' }}>페이지</span></div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}><div style={{ width: 12, height: 12, border: '2px solid #666', borderRadius: 8, background: '#f5f5f5' }} /><span style={{ fontSize: 10, color: '#868e96' }}>컴포넌트</span></div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}><div style={{ width: 12, height: 12, border: '2px dashed #999', borderRadius: 3, background: '#fafafa' }} /><span style={{ fontSize: 10, color: '#868e96' }}>모달</span></div>
        <span style={{ fontSize: 10, color: '#868e96' }}>|</span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}><div style={{ width: 20, height: 0, borderTop: '2px solid #555' }} /><span style={{ fontSize: 10, color: '#868e96' }}>이동</span></div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}><div style={{ width: 20, height: 0, borderTop: '2px dotted #555' }} /><span style={{ fontSize: 10, color: '#868e96' }}>데이터</span></div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}><div style={{ width: 20, height: 0, borderTop: '2px dashed #555' }} /><span style={{ fontSize: 10, color: '#868e96' }}>호버</span></div>
      </div>

      {/* Flow Canvas */}
      <div style={{ height: 600, border: '1px solid #dee2e6', borderRadius: 8 }}>
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
      </div>

      {/* Add Node Modal */}
      {addNodeOpened && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setAddNodeOpened(false)}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 24, width: '90%', maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16 }}>노드 추가</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>이름</label>
                <input value={newNodeLabel} onChange={e => setNewNodeLabel(e.target.value)} placeholder="예: 프로필 페이지" style={{ width: '100%', padding: '6px 10px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 13 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>타입</label>
                <select value={newNodeType} onChange={e => setNewNodeType(e.target.value)} style={{ width: '100%', padding: '6px 10px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 13 }}>
                  <option value="page">페이지</option>
                  <option value="component">컴포넌트</option>
                  <option value="modal">모달</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>라우트 (선택)</label>
                <input value={newNodeRoute} onChange={e => setNewNodeRoute(e.target.value)} placeholder="/profile" style={{ width: '100%', padding: '6px 10px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 13 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => setAddNodeOpened(false)} style={{ padding: '6px 14px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>취소</button>
                <button onClick={handleAddNode} style={{ padding: '6px 14px', background: '#343a40', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>추가</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
