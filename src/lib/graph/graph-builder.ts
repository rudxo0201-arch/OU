import Graph from 'graphology';
import { DOMAIN_BRIGHTNESS, EDGE_BRIGHTNESS, computeNodeSize } from './graph-constants';

export interface GraphNode {
  id: string;
  domain: string;
  label: string;
  raw: string | null;
  confidence: string;
  createdAt: string;
  isAdmin: boolean;
  domainType: string | null;
  grade: number | null;
  herbId: string | null;
}

export interface GraphEdge {
  source: string;
  target: string;
  relationType: string;
  weight: number;
}

export function buildGraph(nodes: GraphNode[], edges: GraphEdge[]): Graph {
  const graph = new Graph({ type: 'undirected', multi: false });

  // First pass: compute degrees for sizing
  const degreeMap: Record<string, number> = {};
  for (const node of nodes) {
    degreeMap[node.id] = 0;
  }
  for (const edge of edges) {
    degreeMap[edge.source] = (degreeMap[edge.source] ?? 0) + 1;
    degreeMap[edge.target] = (degreeMap[edge.target] ?? 0) + 1;
  }
  const maxDegree = Math.max(1, ...Object.values(degreeMap));

  // Add nodes
  for (const node of nodes) {
    const degree = degreeMap[node.id] ?? 0;
    const size = computeNodeSize(degree, maxDegree);
    const brightness = DOMAIN_BRIGHTNESS[node.domain] ?? 0.65;
    // Encode brightness as grayscale color — shader reads this back
    const grayVal = Math.round(brightness * 255);
    const color = `rgb(${grayVal},${grayVal},${grayVal})`;

    graph.addNode(node.id, {
      label: node.label,
      domain: node.domain,
      confidence: node.confidence,
      createdAt: node.createdAt,
      isAdmin: node.isAdmin,
      domainType: node.domainType,
      grade: node.grade,
      herbId: node.herbId,
      raw: node.raw,
      degree,
      brightness,
      // Layout: start with random positions; FA2 will arrange
      x: (Math.random() - 0.5) * 2000,
      y: (Math.random() - 0.5) * 2000,
      size,
      color,
    });
  }

  // Add edges
  for (const edge of edges) {
    if (!graph.hasNode(edge.source) || !graph.hasNode(edge.target)) continue;
    if (graph.hasEdge(edge.source, edge.target)) continue;

    const edgeBrightness = EDGE_BRIGHTNESS[edge.relationType] ?? 0.4;
    const edgeGray = Math.round(edgeBrightness * 255);

    graph.addEdge(edge.source, edge.target, {
      relationType: edge.relationType,
      weight: edge.weight,
      // color for edge - rgba via CSS string
      color: `rgba(${edgeGray},${edgeGray},${edgeGray},0.35)`,
      size: 1,
    });
  }

  return graph;
}
