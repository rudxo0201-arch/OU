'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, CaretRight, CaretDown, Trash, SidebarSimple, MagnifyingGlass, Graph } from '@phosphor-icons/react';
import { useNoteStore, type NoteMeta } from '@/stores/noteStore';

type NoteNodeType = NoteMeta & { children: NoteNodeType[] };

export function NoteSidebar({ activeNoteId }: { activeNoteId?: string }) {
  const router = useRouter();
  const { tree, loading, fetchPages, createPage, deletePage, sidebarOpen, setSidebarOpen } = useNoteStore();
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => { fetchPages(); }, [fetchPages]);

  const handleNew = () => {
    router.push('/note/new');
  };

  const toggleCollapse = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // 사이드바 닫힘 상태: 아이콘만 표시 (Notion 패턴)
  if (!sidebarOpen) {
    return (
      <div style={{
        width: 40, flexShrink: 0,
        height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
        paddingTop: 10, gap: 8,
        borderRight: '1px solid var(--ou-glass-border)',
        background: 'rgba(0,0,0,0.01)',
      }}>
        <button
          onClick={() => setSidebarOpen(true)}
          title="사이드바 열기"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28,
            border: 'none', borderRadius: 'var(--ou-radius-sm)',
            background: 'transparent', cursor: 'pointer',
            color: 'var(--ou-text-muted)',
            transition: 'all var(--ou-transition-fast)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--ou-glass)'; e.currentTarget.style.color = 'var(--ou-text-body)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ou-text-muted)'; }}
        >
          <SidebarSimple size={16} />
        </button>
        <button
          onClick={handleNew}
          title="새 노트"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28,
            border: 'none', borderRadius: 'var(--ou-radius-sm)',
            background: 'transparent', cursor: 'pointer',
            color: 'var(--ou-text-muted)',
            transition: 'all var(--ou-transition-fast)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--ou-glass)'; e.currentTarget.style.color = 'var(--ou-text-body)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ou-text-muted)'; }}
        >
          <Plus size={14} />
        </button>
      </div>
    );
  }

  // 검색 필터
  const filterTree = (nodes: NoteNodeType[], q: string): NoteNodeType[] => {
    if (!q) return nodes;
    const lower = q.toLowerCase();
    return nodes.flatMap(n => {
      const matches = n.title.toLowerCase().includes(lower);
      const filteredChildren = filterTree(n.children as NoteNodeType[], q);
      if (matches) return [{ ...n, children: n.children }];
      if (filteredChildren.length > 0) return [{ ...n, children: filteredChildren }];
      return [];
    });
  };

  const displayTree = filterTree(tree as NoteNodeType[], query);

  return (
    <aside style={{
      width: 240,
      flexShrink: 0,
      height: '100dvh',
      overflowY: 'auto',
      background: 'rgba(0,0,0,0.02)',
      borderRight: '1px solid var(--ou-glass-border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '12px 0',
    }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 8px 8px',
      }}>
        <button
          onClick={() => setSidebarOpen(false)}
          title="사이드바 닫기"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 26, height: 26,
            border: 'none', borderRadius: 'var(--ou-radius-sm)',
            background: 'transparent', cursor: 'pointer',
            color: 'var(--ou-text-muted)',
            transition: 'all var(--ou-transition-fast)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--ou-glass-hover)'; e.currentTarget.style.color = 'var(--ou-text-body)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ou-text-muted)'; }}
        >
          <SidebarSimple size={15} />
        </button>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: 'var(--ou-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          flex: 1, paddingLeft: 4,
        }}>
          노트
        </span>
        <button
          onClick={handleNew}
          title="새 노트"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 26, height: 26,
            border: 'none', borderRadius: 'var(--ou-radius-sm)',
            background: 'transparent', cursor: 'pointer',
            color: 'var(--ou-text-muted)',
            transition: 'all var(--ou-transition-fast)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--ou-glass-hover)'; e.currentTarget.style.color = 'var(--ou-text-body)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ou-text-muted)'; }}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* 검색 */}
      <div style={{ padding: '0 10px 10px', position: 'relative' }}>
        <MagnifyingGlass
          size={12}
          style={{
            position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--ou-text-disabled)', pointerEvents: 'none',
          }}
        />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="검색..."
          style={{
            width: '100%',
            padding: '6px 10px 6px 28px',
            background: 'var(--ou-glass)',
            border: '1px solid var(--ou-glass-border)',
            borderRadius: 'var(--ou-radius-sm)',
            fontSize: 12,
            color: 'var(--ou-text-body)',
            outline: 'none',
            transition: 'border-color var(--ou-transition-fast)',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--ou-glass-border-focus)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'var(--ou-glass-border)')}
        />
      </div>

      {/* 트리 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 6px' }}>
        {loading && tree.length === 0 ? (
          <div style={{ padding: '16px 12px', fontSize: 12, color: 'var(--ou-text-disabled)' }}>
            불러오는 중…
          </div>
        ) : displayTree.length === 0 ? (
          query ? (
            <div style={{ padding: '16px 12px', fontSize: 12, color: 'var(--ou-text-disabled)' }}>
              결과 없음
            </div>
          ) : (
            <button
              onClick={handleNew}
              style={{
                width: '100%', padding: '10px 12px',
                border: '1px dashed var(--ou-glass-border)',
                borderRadius: 'var(--ou-radius-sm)',
                background: 'transparent', cursor: 'pointer',
                fontSize: 12, color: 'var(--ou-text-muted)',
                textAlign: 'left',
                transition: 'all var(--ou-transition-fast)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--ou-glass)';
                e.currentTarget.style.color = 'var(--ou-text-body)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--ou-text-muted)';
              }}
            >
              + 첫 번째 노트 만들기
            </button>
          )
        ) : (
          displayTree.map((node) => (
            <NoteTreeNode
              key={node.id}
              node={node}
              depth={0}
              activeNoteId={activeNoteId}
              collapsed={collapsed}
              onToggle={toggleCollapse}
              onDelete={deletePage}
              onCreate={() => {
                router.push('/note/new');
              }}
            />
          ))
        )}
      </div>

      {/* 하단 액션 */}
      <div style={{ padding: '8px 10px 0', borderTop: '1px solid var(--ou-glass-border)', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <button
          onClick={() => router.push('/note/graph')}
          style={{
            width: '100%', padding: '7px 12px',
            display: 'flex', alignItems: 'center', gap: 8,
            border: 'none', borderRadius: 'var(--ou-radius-sm)',
            background: 'transparent', cursor: 'pointer',
            fontSize: 12, color: 'var(--ou-text-muted)',
            transition: 'all var(--ou-transition-fast)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--ou-glass)';
            e.currentTarget.style.color = 'var(--ou-text-body)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--ou-text-muted)';
          }}
        >
          <Graph size={13} />
          그래프 보기
        </button>
        <button
          onClick={handleNew}
          style={{
            width: '100%', padding: '7px 12px',
            display: 'flex', alignItems: 'center', gap: 8,
            border: 'none', borderRadius: 'var(--ou-radius-sm)',
            background: 'transparent', cursor: 'pointer',
            fontSize: 12, color: 'var(--ou-text-muted)',
            transition: 'all var(--ou-transition-fast)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--ou-glass)';
            e.currentTarget.style.color = 'var(--ou-text-body)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--ou-text-muted)';
          }}
        >
          <Plus size={13} />
          새 노트
        </button>
      </div>
    </aside>
  );
}

function NoteTreeNode({
  node, depth, activeNoteId, collapsed, onToggle, onDelete, onCreate,
}: {
  node: NoteNodeType;
  depth: number;
  activeNoteId?: string;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: (parentId: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isActive = node.id === activeNoteId;
  const isCollapsed = collapsed.has(node.id);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 1,
          paddingLeft: depth * 14 + 4,
          paddingRight: 4,
          borderRadius: 'var(--ou-radius-sm)',
          background: isActive ? 'var(--ou-glass-active)' : hovered ? 'var(--ou-glass)' : 'transparent',
          transition: 'background var(--ou-transition-fast)',
          marginBottom: 1,
        }}
      >
        {/* 접기/펼치기 */}
        <button
          onClick={() => onToggle(node.id)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 16, height: 20,
            border: 'none', background: 'transparent', cursor: hasChildren ? 'pointer' : 'default',
            color: 'var(--ou-text-disabled)',
            opacity: hasChildren ? 1 : 0, flexShrink: 0,
          }}
        >
          {isCollapsed ? <CaretRight size={9} /> : <CaretDown size={9} />}
        </button>

        {/* 이모지 / 아이콘 */}
        <span style={{
          fontSize: 12, width: 16, flexShrink: 0,
          color: 'var(--ou-text-muted)', textAlign: 'center',
        }}>
          ✎
        </span>

        {/* 제목 */}
        <Link
          href={`/note/${node.id}`}
          prefetch={true}
          style={{
            flex: 1,
            fontSize: 13,
            color: isActive ? 'var(--ou-text-heading)' : 'var(--ou-text-body)',
            textDecoration: 'none',
            padding: '6px 4px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontWeight: isActive ? 500 : 400,
          }}
        >
          {node.title || '제목 없음'}
        </Link>

        {/* 호버 액션 */}
        {hovered && (
          <div style={{ display: 'flex', gap: 1, flexShrink: 0, paddingRight: 2 }}>
            <ActionBtn title="하위 노트" onClick={() => onCreate(node.id)}>
              <Plus size={11} />
            </ActionBtn>
            <ActionBtn title="삭제" onClick={() => {
              if (confirm('이 노트를 삭제할까요?')) onDelete(node.id);
            }}>
              <Trash size={11} />
            </ActionBtn>
          </div>
        )}
      </div>

      {/* 자식 */}
      {!isCollapsed && hasChildren && (
        <div>
          {node.children.map((child) => (
            <NoteTreeNode
              key={child.id}
              node={child as NoteNodeType}
              depth={depth + 1}
              activeNoteId={activeNoteId}
              collapsed={collapsed}
              onToggle={onToggle}
              onDelete={onDelete}
              onCreate={onCreate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ActionBtn({ children, title, onClick }: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      title={title}
      onClick={e => { e.preventDefault(); onClick(); }}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 20, height: 20,
        border: 'none', borderRadius: 4,
        background: 'transparent', cursor: 'pointer',
        color: 'var(--ou-text-muted)',
        transition: 'all var(--ou-transition-fast)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--ou-glass-hover)';
        e.currentTarget.style.color = 'var(--ou-text-body)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--ou-text-muted)';
      }}
    >
      {children}
    </button>
  );
}
