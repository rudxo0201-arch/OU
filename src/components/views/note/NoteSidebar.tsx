'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, NotePencil, Trash, CaretRight, CaretDown } from '@phosphor-icons/react';
import { useNoteStore, type NoteMeta } from '@/stores/noteStore';
import { useState } from 'react';

type NoteNodeType = NoteMeta & { children: NoteNodeType[] };

export function NoteSidebar({ activeNoteId }: { activeNoteId?: string }) {
  const router = useRouter();
  const { tree, loading, fetchPages, createPage, deletePage, sidebarOpen } = useNoteStore();

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const handleNew = async () => {
    const id = await createPage('제목 없음');
    if (id) router.push(`/note/${id}`);
  };

  if (!sidebarOpen) return null;

  return (
    <aside
      style={{
        width: 220,
        flexShrink: 0,
        height: '100dvh',
        overflowY: 'auto',
        background: 'var(--ou-bg-alt)',
        borderRight: '1px solid var(--ou-border-faint)',
        display: 'flex',
        flexDirection: 'column',
        padding: '12px 8px',
        gap: 2,
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 8px 8px',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ou-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          노트
        </span>
        <button
          onClick={handleNew}
          title="새 페이지"
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: 4,
            border: 'none',
            borderRadius: 'var(--ou-radius-sm)',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--ou-text-secondary)',
          }}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* 트리 */}
      {loading && tree.length === 0 ? (
        <div style={{ padding: 12, fontSize: 12, color: 'var(--ou-text-muted)' }}>불러오는 중…</div>
      ) : tree.length === 0 ? (
        <button
          onClick={handleNew}
          style={{
            padding: '8px 10px',
            border: 'none',
            borderRadius: 'var(--ou-radius-sm)',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 12,
            color: 'var(--ou-text-muted)',
            textAlign: 'left',
          }}
        >
          + 첫 번째 페이지 만들기
        </button>
      ) : (
        tree.map((node) => (
          <NoteTreeNode
            key={node.id}
            node={node as NoteNodeType}
            depth={0}
            activeNoteId={activeNoteId}
            onDelete={deletePage}
            onCreate={async (parentId) => {
              const id = await createPage('제목 없음', parentId);
              if (id) router.push(`/note/${id}`);
            }}
          />
        ))
      )}
    </aside>
  );
}

function NoteTreeNode({
  node,
  depth,
  activeNoteId,
  onDelete,
  onCreate,
}: {
  node: NoteNodeType;
  depth: number;
  activeNoteId?: string;
  onDelete: (id: string) => void;
  onCreate: (parentId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [hovered, setHovered] = useState(false);
  const isActive = node.id === activeNoteId;
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          paddingLeft: depth * 12 + 4,
          paddingRight: 4,
          borderRadius: 'var(--ou-radius-sm)',
          background: isActive ? 'var(--ou-surface-muted)' : 'transparent',
          boxShadow: isActive ? 'var(--ou-neu-pressed-sm)' : 'none',
        }}
      >
        {/* 접기/펼치기 */}
        <button
          onClick={() => setExpanded((e) => !e)}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: 2,
            border: 'none',
            background: 'transparent',
            cursor: hasChildren ? 'pointer' : 'default',
            color: 'var(--ou-text-faint)',
            flexShrink: 0,
            opacity: hasChildren ? 1 : 0,
          }}
        >
          {expanded ? <CaretDown size={10} /> : <CaretRight size={10} />}
        </button>

        {/* 제목 */}
        <a
          href={`/note/${node.id}`}
          style={{
            flex: 1,
            fontSize: 13,
            color: isActive ? 'var(--ou-text-bright)' : 'var(--ou-text-body)',
            textDecoration: 'none',
            padding: '5px 2px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {node.title || '제목 없음'}
        </a>

        {/* 호버 액션 */}
        {hovered && (
          <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
            <button
              onClick={() => onCreate(node.id)}
              title="하위 페이지 추가"
              style={actionBtnStyle}
            >
              <Plus size={11} />
            </button>
            <button
              onClick={() => onCreate(node.id)}
              title="편집"
              style={actionBtnStyle}
            >
              <NotePencil size={11} />
            </button>
            <button
              onClick={() => {
                if (confirm('이 페이지를 삭제할까요?')) onDelete(node.id);
              }}
              title="삭제"
              style={actionBtnStyle}
            >
              <Trash size={11} />
            </button>
          </div>
        )}
      </div>

      {/* 자식 노드 */}
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <NoteTreeNode
              key={child.id}
              node={child as NoteNodeType}
              depth={depth + 1}
              activeNoteId={activeNoteId}
              onDelete={onDelete}
              onCreate={onCreate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: 3,
  border: 'none',
  borderRadius: 'var(--ou-radius-sm)',
  background: 'transparent',
  cursor: 'pointer',
  color: 'var(--ou-text-muted)',
};
