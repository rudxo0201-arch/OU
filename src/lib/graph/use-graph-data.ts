'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Graph from 'graphology';
import { buildGraph, type GraphNode, type GraphEdge } from './graph-builder';

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface UseGraphDataResult {
  graph: Graph | null;
  nodeCount: number;
  isLoading: boolean;
  error: string | null;
  allDomains: string[];
  refresh: () => void;
}

async function fetchGraphData(): Promise<GraphData> {
  const res = await fetch('/api/graph');
  if (!res.ok) throw new Error(`Graph fetch failed: ${res.status}`);
  return res.json();
}

function extractDomains(nodes: GraphNode[]): string[] {
  const seen: Record<string, boolean> = {};
  const domains: string[] = [];
  for (const n of nodes) {
    if (!seen[n.domain]) { seen[n.domain] = true; domains.push(n.domain); }
  }
  return domains.sort();
}

export function useGraphData(): UseGraphDataResult {
  const [graph, setGraph] = useState<Graph | null>(null);
  const [nodeCount, setNodeCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allDomains, setAllDomains] = useState<string[]>([]);
  const isMounted = useRef(true);

  const load = useCallback(async () => {
    try {
      const data = await fetchGraphData();
      if (!isMounted.current) return;

      const newGraph = buildGraph(data.nodes, data.edges);
      const domains = extractDomains(data.nodes);

      setGraph(newGraph);
      setNodeCount(data.nodes.length);
      setAllDomains(domains);
      setError(null);
    } catch (err) {
      if (!isMounted.current) return;
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    isMounted.current = true;
    load();
    return () => {
      isMounted.current = false;
    };
  }, [load]);

  // Refetch on window focus if node count changed
  useEffect(() => {
    const onFocus = async () => {
      try {
        const data = await fetchGraphData();
        if (!isMounted.current) return;
        if (data.nodes.length !== nodeCount) {
          const newGraph = buildGraph(data.nodes, data.edges);
          const domains = extractDomains(data.nodes);
          setGraph(newGraph);
          setNodeCount(data.nodes.length);
          setAllDomains(domains);
        }
      } catch {
        // ignore focus-triggered refresh errors
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [nodeCount]);

  return { graph, nodeCount, isLoading, error, allDomains, refresh: load };
}
