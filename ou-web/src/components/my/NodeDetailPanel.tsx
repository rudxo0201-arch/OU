'use client';

import { useState, useEffect } from 'react';
import { X, ArrowRight, PencilSimple, Trash, FloppyDisk } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { VisibilityToggle } from '@/components/ui/VisibilityToggle';
import { getPredicateLabel, getDomainLabel, getDomainStyle, getConfidenceLabel, getConfidenceNumeric } from '@/lib/utils/domain';
import type { Visibility } from '@/types';

interface Triple {
  id: string;
  subject: string;
  predicate: string;
  object: string;
  confidence?: string;
}

interface RelatedNode {
  id: string;
  raw?: string;
  domain: string;
  predicate?: string;
}

/** Confidence dot indicator */
function ConfidenceDot({ confidence }: { confidence?: string | null }) {
  const numericVal = getConfidenceNumeric(confidence);
  const label = getConfidenceLabel(confidence);
  const size = 10;
  const isHigh = numericVal > 0.8;
  const isMedium = numericVal >= 0.5 && numericVal <= 0.8;

  return (
    <span
      title={`신뢰도: ${label}`}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        border: '1.5px solid var(--mantine-color-gray-5)',
        background: isHigh
          ? 'var(--mantine-color-gray-5)'
          : isMedium
            ? 'linear-gradient(to top, var(--mantine-color-gray-5) 50%, transparent 50%)'
            : 'transparent',
        flexShrink: 0,
      }}
    />
  );
}

interface NodeDetailPanelProps {
  node: {
    id: string;
    domain: string;
    raw?: string;
    importance?: number;
    graph_type?: string;
    source_file_url?: string;
    created_at?: string;
    confidence?: string;
    visibility?: Visibility;
    domain_data?: Record<string, any>;
  };
  onClose: () => void;
  onNodeUpdated?: (node: any) => void;
  onNodeDeleted?: (nodeId: string) => void;
  onRelatedNodeClick?: (nodeId: string) => void;
}

export function NodeDetailPanel({ node, onClose, onNodeUpdated, onNodeDeleted, onRelatedNodeClick }: NodeDetailPanelProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>(node.domain_data ?? {});
  const [editRaw, setEditRaw] = useState(node.raw ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [relatedNodes, setRelatedNodes] = useState<RelatedNode[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(true);
  const [triples, setTriples] = useState<Triple[]>([]);
  const [loadingTriples, setLoadingTriples] = useState(true);

  useEffect(() => {
    setLoadingRelated(true);
    setRelatedNodes([]);
    setConfirmDelete(false);
    setEditing(false);
    setEditData(node.domain_data ?? {});
    setEditRaw(node.raw ?? '');

    fetch(`/api/nodes/${node.id}/relations`).then(res => res.ok ? res.json() : { relations: [] }).then(data => setRelatedNodes(data.relations ?? [])).catch(() => setRelatedNodes([])).finally(() => setLoadingRelated(false));
    setLoadingTriples(true);
    setTriples([]);
    fetch(`/api/nodes/${node.id}/triples`).then(res => res.ok ? res.json() : { triples: [] }).then(data => setTriples(data.triples ?? [])).catch(() => setTriples([])).finally(() => setLoadingTriples(false));
  }, [node.id, node.domain_data, node.raw]);

  const handleSave = async () => {
    setSaving(true);
    try { const res = await fetch(`/api/nodes/${node.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ raw: editRaw, domain_data: editData }) }); if (res.ok) { onNodeUpdated?.({ ...node, raw: editRaw, domain_data: editData }); setEditing(false); } } catch { /* Silent fail */ } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { const res = await fetch(`/api/nodes/${node.id}`, { method: 'DELETE' }); if (res.ok) { onNodeDeleted?.(node.id); onClose(); } } catch { /* Silent fail */ } finally { setDeleting(false); }
  };

  const domainDataEntries = Object.entries(editData);
  const ds = getDomainStyle(node.domain);
  const inputStyle: React.CSSProperties = { width: '100%', padding: '6px 8px', fontSize: 'var(--mantine-font-size-sm)', border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 4, background: 'transparent', color: 'inherit' };
  const btnStyle: React.CSSProperties = { padding: '4px 12px', fontSize: 'var(--mantine-font-size-xs)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--mantine-color-dimmed)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' };

  return (
    <GlassCard
      p="lg"
      className="node-detail-panel"
      style={{
        position: 'absolute', top: 16, right: 16, bottom: 16, width: 320,
        zIndex: 20, overflowY: 'auto', animation: 'ou-slide-in-right 200ms ease',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: ds.borderRadius, background: 'rgba(255,255,255,0.08)', color: 'var(--mantine-color-dimmed)', borderStyle: ds.borderStyle, borderWidth: ds.borderWidth, borderColor: 'var(--mantine-color-default-border)', fontWeight: ds.fontWeight }}>
              {node.graph_type === 'star' ? '\u2605' : '\u25CF'} {getDomainLabel(node.domain)}
            </span>
            {node.importance != null && node.importance >= 3 && (
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,0,0.1)', color: 'var(--mantine-color-yellow-5)' }}>중요</span>
            )}
            <ConfidenceDot confidence={node.confidence} />
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: 'var(--mantine-color-gray-6)' }}><X size={14} /></button>
        </div>

        {editing ? (
          <textarea value={editRaw} onChange={e => setEditRaw(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        ) : (
          <span style={{ fontSize: 'var(--mantine-font-size-sm)', wordBreak: 'break-word', lineHeight: 1.6 }}>{node.raw ?? '(내용 없음)'}</span>
        )}

        {editing && domainDataEntries.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 'var(--mantine-font-size-xs)', fontWeight: 600, color: 'var(--mantine-color-dimmed)' }}>상세 정보</span>
            {domainDataEntries.map(([key, value]) => (
              <div key={key}><label style={{ fontSize: 'var(--mantine-font-size-xs)', display: 'block', marginBottom: 2 }}>{key}</label><input value={typeof value === 'string' ? value : JSON.stringify(value)} onChange={e => setEditData(prev => ({ ...prev, [key]: e.target.value }))} style={inputStyle} /></div>
            ))}
          </div>
        )}

        {!editing && domainDataEntries.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 'var(--mantine-font-size-xs)', fontWeight: 600, color: 'var(--mantine-color-dimmed)' }}>상세 정보</span>
            {domainDataEntries.map(([key, value]) => (
              <div key={key} style={{ display: 'flex', gap: 4 }}>
                <span style={{ fontSize: 'var(--mantine-font-size-xs)', color: 'var(--mantine-color-dimmed)' }}>{key}:</span>
                <span style={{ fontSize: 'var(--mantine-font-size-xs)' }}>{typeof value === 'string' ? value : JSON.stringify(value)}</span>
              </div>
            ))}
          </div>
        )}

        {node.created_at && <span style={{ fontSize: 'var(--mantine-font-size-xs)', color: 'var(--mantine-color-dimmed)' }}>{new Date(node.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>}

        <div><span style={{ fontSize: 'var(--mantine-font-size-xs)', fontWeight: 600, color: 'var(--mantine-color-dimmed)', display: 'block', marginBottom: 4 }}>공개 설정</span><VisibilityToggle nodeId={node.id} currentVisibility={node.visibility ?? 'private'} /></div>

        <div style={{ borderTop: '0.5px solid var(--mantine-color-default-border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {editing ? (
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={handleSave} disabled={saving} style={{ ...btnStyle, flex: 1, border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 4, justifyContent: 'center', gap: 4, background: 'rgba(255,255,255,0.06)' }}><FloppyDisk size={14} /> {saving ? '저장 중...' : '저장'}</button>
              <button onClick={() => { setEditing(false); setEditRaw(node.raw ?? ''); setEditData(node.domain_data ?? {}); }} style={{ ...btnStyle, flex: 1, justifyContent: 'center' }}>취소</button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} style={btnStyle}><span>편집</span> <PencilSimple size={14} /></button>
          )}
          {!editing && (confirmDelete ? (
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={handleDelete} disabled={deleting} style={{ ...btnStyle, flex: 1, color: 'var(--mantine-color-red-5)', border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 4, justifyContent: 'center' }}>{deleting ? '삭제 중...' : '정말 삭제'}</button>
              <button onClick={() => setConfirmDelete(false)} style={{ ...btnStyle, flex: 1, justifyContent: 'center' }}>취소</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} style={{ ...btnStyle, color: 'var(--mantine-color-red-5)' }}><span>삭제</span> <Trash size={14} /></button>
          ))}
          {node.source_file_url && <button onClick={() => router.push(`/view/${node.id}`)} style={btnStyle}><span>원본 보기</span> <ArrowRight size={14} /></button>}
        </div>

        <div style={{ borderTop: '0.5px solid var(--mantine-color-default-border)', paddingTop: 12 }}>
          <span style={{ fontSize: 'var(--mantine-font-size-xs)', fontWeight: 600, color: 'var(--mantine-color-dimmed)', display: 'block', marginBottom: 8 }}>관계 정보</span>
          {loadingTriples ? <span style={{ fontSize: 'var(--mantine-font-size-xs)', color: 'var(--mantine-color-dimmed)' }}>...</span> : triples.length === 0 ? <span style={{ fontSize: 'var(--mantine-font-size-xs)', color: 'var(--mantine-color-dimmed)' }}>추출된 관계가 없어요</span> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {triples.map(t => (
                <div key={t.id} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <ConfidenceDot confidence={t.confidence} />
                  <span style={{ fontSize: 'var(--mantine-font-size-xs)', lineHeight: 1.5 }}>
                    <strong>{t.subject}</strong> <span style={{ color: 'var(--mantine-color-dimmed)' }}>{getPredicateLabel(t.predicate)}</span> <strong>{t.object}</strong>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ borderTop: '0.5px solid var(--mantine-color-default-border)', paddingTop: 12 }}>
          <span style={{ fontSize: 'var(--mantine-font-size-xs)', fontWeight: 600, color: 'var(--mantine-color-dimmed)', display: 'block', marginBottom: 8 }}>연결된 데이터</span>
          {loadingRelated ? <span style={{ fontSize: 'var(--mantine-font-size-xs)', color: 'var(--mantine-color-dimmed)' }}>...</span> : relatedNodes.length === 0 ? <span style={{ fontSize: 'var(--mantine-font-size-xs)', color: 'var(--mantine-color-dimmed)' }}>연결된 데이터가 없어요</span> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {relatedNodes.map(rel => (
                <button key={rel.id} onClick={() => onRelatedNodeClick?.(rel.id)} style={{ ...btnStyle, justifyContent: 'flex-start', gap: 6 }}>
                  {rel.predicate && <span style={{ fontSize: 10, padding: '1px 4px', borderRadius: 4, border: '1px dotted var(--mantine-color-default-border)', color: 'var(--mantine-color-dimmed)' }}>{getPredicateLabel(rel.predicate)}</span>}
                  <span style={{ fontSize: 'var(--mantine-font-size-xs)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rel.raw ?? rel.domain}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
