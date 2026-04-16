'use client';

import { useState, useMemo, useCallback } from 'react';
import { Stack, Text, Box, Group, UnstyledButton } from '@mantine/core';
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
    <Box>
      <Group
        gap={6}
        align="center"
        wrap="nowrap"
        style={{ paddingLeft: depth * 24, minHeight: 36 }}
      >
        {hasChildren ? (
          <UnstyledButton onClick={toggle} style={{ display: 'flex', alignItems: 'center' }}>
            {expanded
              ? <CaretDown size={14} weight="bold" color="var(--mantine-color-dimmed)" />
              : <CaretRight size={14} weight="bold" color="var(--mantine-color-dimmed)" />}
          </UnstyledButton>
        ) : (
          <Box style={{ width: 14 }} />
        )}

        <Box
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: '0.5px solid var(--mantine-color-default-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            backgroundColor: depth === 0 ? 'var(--mantine-color-gray-1)' : 'transparent',
          }}
        >
          <User size={14} color="var(--mantine-color-dimmed)" />
        </Box>

        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text fz="sm" fw={500} truncate>
            {node.name}
          </Text>
          {node.role && (
            <Text fz={11} c="dimmed" truncate>
              {node.role}
            </Text>
          )}
        </Box>
      </Group>

      {expanded && hasChildren && (
        <Box
          style={{
            borderLeft: '0.5px solid var(--mantine-color-default-border)',
            marginLeft: depth * 24 + 7,
          }}
        >
          {node.children.map(child => (
            <OrgNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </Box>
      )}
    </Box>
  );
}

export function OrgChartView({ nodes }: ViewProps) {
  const tree = useMemo(() => buildTree(nodes), [nodes]);

  if (nodes.length === 0) return null;

  return (
    <Stack gap={0} p="md">
      <Text fz="xs" c="dimmed" mb="md">Organization</Text>
      {tree.map(root => (
        <OrgNode key={root.id} node={root} depth={0} />
      ))}
    </Stack>
  );
}
