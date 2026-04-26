'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePresetStore } from '@/stores/presetStore';
import { buildTreeData } from './build-tree';
import type { Preset, TreeNode } from '@/types';

interface Item {
  id: string;
  domain?: string;
  raw?: string;
  label?: string;
  createdAt?: string;
  domainData?: Record<string, unknown>;
  parentId?: string | null;
  [key: string]: unknown;
}

interface UseTreeDataResult {
  preset: Preset | undefined;
  treeData: TreeNode | null;
  items: Item[];
  loading: boolean;
}

export function useTreeData(): UseTreeDataResult {
  const searchParams = useSearchParams();
  const presetId = searchParams.get('preset');
  const { presets } = usePresetStore();

  const preset = presets.find((p) => p.id === presetId) ?? presets.find((p) => p.kind === 'tree');

  const [items, setItems] = useState<Item[]>([]);
  const [treeData, setTreeData] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!preset) return;
    setLoading(true);
    const params = new URLSearchParams({ limit: '300' });
    if (preset.filter?.domains?.length) {
      params.set('domain', preset.filter.domains[0]);
    }
    if (preset.filter?.dateRange) {
      params.set('date_from', preset.filter.dateRange.from);
      params.set('date_to', preset.filter.dateRange.to);
    }
    fetch(`/api/nodes?${params}`)
      .then((r) => r.json())
      .then((res) => {
        const rawItems: Item[] = (res.data ?? res.nodes ?? []).map((n: any) => ({
          id: n.id,
          domain: n.domain,
          raw: n.raw,
          label: n.label,
          createdAt: n.created_at ?? n.createdAt,
          domainData: n.domain_data ?? n.domainData,
          parentId: n.parent_id ?? n.parentId ?? null,
        }));
        setItems(rawItems);
        setTreeData(buildTreeData(rawItems, preset.axis ?? 'domain'));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [presetId, preset?.axis]);

  return { preset, treeData, items, loading };
}
