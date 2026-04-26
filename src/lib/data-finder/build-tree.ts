import type { AxisKind, TreeNode } from '@/types';
import { ORBS_META } from '@/lib/ou-registry';

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

function itemLabel(item: Item): string {
  if (item.label) return item.label;
  const dd = item.domainData as any;
  if (dd?.title) return dd.title;
  if (dd?.content) return String(dd.content).slice(0, 40);
  if (item.raw) return String(item.raw).slice(0, 40);
  return item.id.slice(0, 8);
}

// ── 도메인별 ────────────────────────────────────────────────────────────────
function byDomain(items: Item[]): TreeNode {
  const groups: Record<string, Item[]> = {};
  for (const item of items) {
    const key = item.domain ?? 'unresolved';
    (groups[key] ??= []).push(item);
  }
  return {
    id: 'root',
    label: '전체',
    children: Object.entries(groups).map(([domain, domainItems]) => ({
      id: `group:domain:${domain}`,
      label: domain,
      children: domainItems.map((it) => ({
        id: `item:${it.id}`,
        label: itemLabel(it),
        itemId: it.id,
      })),
    })),
  };
}

// ── 시간순 (연→월) ──────────────────────────────────────────────────────────
function byTime(items: Item[]): TreeNode {
  const years: Record<string, Record<string, Item[]>> = {};
  for (const item of items) {
    const date = (item.domainData as any)?.date ?? item.createdAt;
    if (!date) continue;
    const [y, m] = String(date).slice(0, 7).split('-');
    ((years[y] ??= {})[m] ??= []).push(item);
  }
  return {
    id: 'root',
    label: '시간',
    children: Object.entries(years)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([year, months]) => ({
        id: `group:year:${year}`,
        label: `${year}년`,
        children: Object.entries(months)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([month, monthItems]) => ({
            id: `group:month:${year}-${month}`,
            label: `${parseInt(month)}월`,
            children: monthItems.map((it) => ({
              id: `item:${it.id}`,
              label: itemLabel(it),
              itemId: it.id,
            })),
          })),
      })),
  };
}

// ── Orb별 (domain ≈ orb 매핑) ────────────────────────────────────────────────
function byOrb(items: Item[]): TreeNode {
  const orbSlugs = ORBS_META.map((o) => o.slug);
  const groups: Record<string, Item[]> = {};
  for (const item of items) {
    const key = orbSlugs.includes(item.domain as any) ? (item.domain as string) : 'other';
    (groups[key] ??= []).push(item);
  }
  return {
    id: 'root',
    label: 'Orb별',
    children: Object.entries(groups).map(([orbSlug, orbItems]) => {
      const meta = ORBS_META.find((o) => o.slug === orbSlug);
      return {
        id: `group:orb:${orbSlug}`,
        label: meta?.label ?? orbSlug,
        icon: meta?.icon,
        children: orbItems.map((it) => ({
          id: `item:${it.id}`,
          label: itemLabel(it),
          itemId: it.id,
        })),
      };
    }),
  };
}

// ── 계층 (parent_id 기반) ────────────────────────────────────────────────────
function byParent(items: Item[]): TreeNode {
  const map = new Map<string, Item>(items.map((it) => [it.id, it]));
  const nodeMap = new Map<string, TreeNode>(
    items.map((it) => [it.id, { id: `item:${it.id}`, label: itemLabel(it), itemId: it.id, children: [] }])
  );
  const roots: TreeNode[] = [];
  for (const item of items) {
    const node = nodeMap.get(item.id)!;
    const parentId = item.parentId;
    if (parentId && map.has(parentId)) {
      nodeMap.get(parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }
  // 빈 children 배열 제거 (leaf 노드)
  function prune(n: TreeNode) {
    if (n.children?.length === 0) delete n.children;
    n.children?.forEach(prune);
  }
  roots.forEach(prune);
  return { id: 'root', label: '폴더 계층', children: roots };
}

// ── 공개 API ─────────────────────────────────────────────────────────────────
export function buildTreeData(items: Item[], axis: AxisKind): TreeNode {
  switch (axis) {
    case 'domain': return byDomain(items);
    case 'time':   return byTime(items);
    case 'orb':    return byOrb(items);
    case 'parent': return byParent(items);
    default:       return byDomain(items);
  }
}
