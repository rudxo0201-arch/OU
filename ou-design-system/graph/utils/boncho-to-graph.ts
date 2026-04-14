import { Boncho } from '@/types/boncho';
import { Prescription } from '@/types/prescription';
import type { GraphNode, GraphEdge } from '@/components/graph/KnowledgeGraph';

// 귀경(경락) 노드 색상
const MERIDIAN_COLORS: Record<string, string> = {
  '肝': '#22b14c', '心': '#ed1c24', '脾': '#ffc90e', '肺': '#ffffff',
  '腎': '#3f48cc', '膽': '#22b14c', '小腸': '#ed1c24', '胃': '#ffc90e',
  '大腸': '#ffffff', '膀胱': '#3f48cc', '心包': '#ed1c24', '三焦': '#ff7f27',
};

/**
 * 본초 데이터를 그래프 노드/에지로 변환.
 *
 * 노드 유형: herb, meridian, prescription
 * 에지 유형: herb→meridian, herb→prescription, herb→herb(배오/연관)
 */
export function bonchoToGraph(
  herbs: Boncho[],
  prescriptions: Prescription[],
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edgeMap = new Map<string, GraphEdge>();

  // 1. 약재 노드
  for (const h of herbs) {
    nodes.push({
      id: `h:${h.id}`,
      label: h.name,
      category: 'herb',
      pronunciation: h.hanjaName,
      meaning: h.categoryMajor,
      importance: h.importance,
    });
  }

  // 2. 귀경 노드 (고유값만)
  const meridians = new Set<string>();
  for (const h of herbs) {
    for (const ch of h.channelTropism) meridians.add(ch);
  }
  for (const m of meridians) {
    nodes.push({
      id: `m:${m}`,
      label: m,
      category: 'meridian',
      meaning: '귀경',
      importance: 3,
      color: MERIDIAN_COLORS[m],
    });
  }

  // 3. 처방 노드
  for (const p of prescriptions) {
    nodes.push({
      id: `p:${p.id}`,
      label: p.nameKorean,
      category: 'prescription',
      pronunciation: p.nameHanja,
      meaning: p.categoryMajor,
      importance: 2,
    });
  }

  // 4. herb → meridian 에지
  for (const h of herbs) {
    for (const ch of h.channelTropism) {
      const key = `${h.id}-m:${ch}`;
      edgeMap.set(key, {
        source: `h:${h.id}`,
        target: `m:${ch}`,
        type: 'meridian',
        weight: 0.5,
      });
    }
  }

  // 5. herb → prescription 에지
  for (const p of prescriptions) {
    for (const ph of p.herbs) {
      const key = `${ph.bonchoId}-p:${p.id}`;
      edgeMap.set(key, {
        source: `h:${ph.bonchoId}`,
        target: `p:${p.id}`,
        type: 'prescription',
        weight: ph.role === '군' ? 2 : ph.role === '신' ? 1.5 : 1,
      });
    }
  }

  // 6. herb → herb 에지 (relatedHerbs, 상위 4개만)
  const herbEdgeSet = new Set<string>();
  for (const h of herbs) {
    const related = h.relatedHerbs.slice(0, 4);
    for (const rId of related) {
      const key = [h.id, rId].sort().join('--');
      if (herbEdgeSet.has(key)) continue;
      herbEdgeSet.add(key);
      edgeMap.set(`rel:${key}`, {
        source: `h:${h.id}`,
        target: `h:${rId}`,
        type: 'related',
        weight: 0.3,
      });
    }
  }

  return { nodes, edges: Array.from(edgeMap.values()) };
}
