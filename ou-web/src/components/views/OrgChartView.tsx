'use client';

import { useState, useMemo, useCallback } from 'react';
import { CaretRight, CaretDown, User } from '@phosphor-icons/react';
import type { ViewProps } from './registry';

interface TreeNode {
  id: string;
  name: string;
  role: string;
  children: TreeNode[];
}

function buildTree(nodes: any[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const n of nodes) {
    map.set(n.id, {
      id: n.id,
      name: n.domain_data?.title ?? n.domain_data?.name ?? ((n.raw ?? '').slice(0, 40) || 'Untitled'),
      role: n.domain_data?.role ?? n.domain_data?.description ?? '',
      children: [],
    });
  }

  for (const n of nodes) {
    const parentId = n.domain_data?.parent_id ?? n.domain_data?.parent;
    const treeNode = map.get(n.id)!;
    if (parentId && map.has(parentId)) {
      map.get(parentId)!.children.push(treeNode);
    } else {
      roots.push(treeNode);
    }
  }

  return roots;
}

function OrgNode({ node, depth }: { node: TreeNode; depth: number }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  const toggle = useCallback(() => setExpanded(p => !p), []);

  return (
    <div>
      <div
        style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'nowrap', paddingLeft: depth * 24, minHeight: 36 }}
      >
        {hasChildren ? (
          <button onClick={toggle} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0, color: 'inherit' }}>
            {expanded
              ? <CaretDown size={14} weight="bold" style={{ color: 'var(--ou-text-dimmed, #888)' }} />
              : <CaretRight size={14} weight="bold" style={{ color: 'var(--ou-text-dimmed, #888)' }} />}
          </button>
        ) : (
          <div style={{ width: 14 }} />
        )}

        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: '0.5px solid var(--ou-border, #333)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            backgroundColor: depth === 0 ? 'var(--ou-bg-subtle, #222)' : 'transparent',
          }}
        >
          <User size={14} style={{ color: 'var(--ou-text-dimmed, #888)' }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node.name}
          </span>
          {node.role && (
            <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {node.role}
            </span>
          )}
        </div>
      </div>

      {expanded && hasChildren && (
        <div
          style={{
            borderLeft: '0.5px solid var(--ou-border, #333)',
            marginLeft: depth * 24 + 7,
          }}
        >
          {node.children.map(child => (
            <OrgNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function OrgChartView({ nodes }: ViewProps) {
  const tree = useMemo(() => buildTree(nodes), [nodes]);

  if (nodes.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: 16 }}>
      <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', marginBottom: 16 }}>Organization</span>
      {tree.map(root => (
        <OrgNode key={root.id} node={root} depth={0} />
      ))}
    </div>
  );
}
