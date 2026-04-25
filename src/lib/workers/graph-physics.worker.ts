/**
 * Graph Physics Web Worker — Obsidian Architecture
 *
 * Key design: nodes are NEVER permanently fixed with fx/fy.
 * Pre-computed positions are initial values only.
 * The simulation settles naturally, then sleeps.
 * On drag: restart simulation, fix only the dragged node.
 * On release: unfix → elastic snap-back via natural forces.
 *
 * Multi-attractor gravity: replaces single forceCenter with
 * a custom force supporting multiple gravity wells (Voronoi partitioning).
 */

import { forceSimulation, forceManyBody, forceLink, forceCollide } from 'd3-force';
import { quadtree as d3Quadtree } from 'd3-quadtree';
import type { Simulation } from 'd3-force';
import type { Quadtree } from 'd3-quadtree';
import type { Attractor } from './graph-physics.types';

interface N {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
  label: string;
  category?: string;
  pronunciation?: string;
  meaning?: string;
  importance?: number | null;
}

interface E {
  source: string | N;
  target: string | N;
  index?: number;
}

/* ── Multi-attractor custom force ── */
function multiAttractorForce(attractorList: Attractor[]) {
  let _nodes: N[] = [];

  function force(alpha: number) {
    if (attractorList.length === 0) return;

    // Update linked-node attractor positions
    for (const a of attractorList) {
      if (a.linkedNodeId) {
        const ln = _nodes.find(n => n.id === a.linkedNodeId);
        if (ln) { a.x = ln.x; a.y = ln.y; }
      }
    }

    // Apply attraction — each node pulled toward nearest attractor (Voronoi)
    for (const node of _nodes) {
      if (node.fx != null) continue;

      let nearest = attractorList[0];
      let minDist = Infinity;
      for (const a of attractorList) {
        const d = (node.x - a.x) ** 2 + (node.y - a.y) ** 2;
        if (d < minDist) { minDist = d; nearest = a; }
      }

      node.vx += (nearest.x - node.x) * nearest.strength * alpha;
      node.vy += (nearest.y - node.y) * nearest.strength * alpha;
    }
  }

  force.initialize = (nodes: N[]) => { _nodes = nodes; };
  return force;
}

/* ── State ── */
let nodes: N[] = [];
let edges: E[] = [];
let attractors: Attractor[] = [];
let sim: Simulation<N, E> | null = null;
let qt: Quadtree<N> | null = null;
let draggedId: string | null = null;

function rebuildQt() {
  qt = d3Quadtree<N>().x(d => d.x).y(d => d.y).addAll(nodes);
}

function sendPositions(type: string) {
  const buf = new Float64Array(nodes.length * 2);
  for (let i = 0; i < nodes.length; i++) {
    buf[i * 2] = nodes[i].x;
    buf[i * 2 + 1] = nodes[i].y;
  }
  // Include attractor positions (for linked-node tracking on the UI side)
  const attractorPositions = attractors.map(a => ({ id: a.id, x: a.x, y: a.y, strength: a.strength, linkedNodeId: a.linkedNodeId, visible: a.visible }));
  (self as any).postMessage({ type, positions: buf.buffer, attractors: attractorPositions }, [buf.buffer]);
}

function restartSim() {
  if (!sim) return;
  sim.force('attractors', multiAttractorForce(attractors));
  sim.alpha(0.3).restart();
  sim.on('tick', () => {
    rebuildQt();
    sendPositions('tick');
  }).on('end', () => {
    rebuildQt();
    sendPositions('settled');
  });
}

/* ── Message handler ── */
self.onmessage = (e: MessageEvent) => {
  const { type, data } = e.data;

  switch (type) {
    case 'init': {
      nodes = data.nodes.map((n: any) => ({
        ...n, vx: 0, vy: 0, fx: null, fy: null,
      }));
      edges = data.edges.map((e: any) => ({ ...e }));

      const cfg = data.config || {};
      const defaultStrength = cfg.centerForce || 0.03;

      // Initialize attractors — use provided or create default at centroid
      if (data.attractors && data.attractors.length > 0) {
        attractors = data.attractors.map((a: Attractor) => ({ ...a }));
      } else {
        // Compute centroid for default attractor
        let cx = 0, cy = 0;
        if (nodes.length > 0) {
          nodes.forEach(n => { cx += n.x; cy += n.y; });
          cx /= nodes.length; cy /= nodes.length;
        }
        attractors = [{ id: '__default__', x: cx, y: cy, strength: defaultStrength }];
      }

      sim = forceSimulation<N>(nodes)
        .alphaDecay(0.05)
        .alphaMin(0.001)
        .velocityDecay(0.55)
        .force('charge', forceManyBody<N>()
          .strength(cfg.repulsion ? -cfg.repulsion : -8)
          .distanceMax(200))
        .force('link', forceLink<N, E>(edges)
          .id(d => d.id)
          .distance(cfg.linkDistance || 25)
          .strength(0.3))
        .force('attractors', multiAttractorForce(attractors))
        .force('collide', forceCollide<N>(3).strength(0.5));

      const hasPrecomputed = nodes.length > 0 && (nodes[0].x !== 0 || nodes[0].y !== 0);

      if (hasPrecomputed) {
        sim.stop();
        const linkForce = sim.force('link') as ReturnType<typeof forceLink>;
        if (linkForce) linkForce.initialize(nodes, () => 1);

        // Recompute centroid for default attractor
        if (attractors.length === 1 && attractors[0].id === '__default__') {
          let cx = 0, cy = 0;
          nodes.forEach(n => { cx += n.x; cy += n.y; });
          cx /= nodes.length; cy /= nodes.length;
          attractors[0].x = cx;
          attractors[0].y = cy;
        }

        rebuildQt();
        sendPositions('ready');
      } else {
        sim.on('tick', () => {
          rebuildQt();
          sendPositions('tick');
        }).on('end', () => {
          rebuildQt();
          sendPositions('settled');
        });
      }
      break;
    }

    case 'dragStart': {
      if (!sim) break;
      const { nodeId } = data;
      draggedId = nodeId;
      const node = nodes.find(n => n.id === nodeId);
      if (!node) break;

      node.fx = node.x;
      node.fy = node.y;

      sim.alphaTarget(0.15).restart();
      sim.on('tick', () => {
        rebuildQt();
        sendPositions('tick');
      });
      break;
    }

    case 'dragMove': {
      const { nodeId, x, y } = data;
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        node.fx = x;
        node.fy = y;
      }
      break;
    }

    case 'dragEnd': {
      if (!sim) break;
      const node = draggedId ? nodes.find(n => n.id === draggedId) : null;
      if (node) {
        node.fx = null;
        node.fy = null;
      }
      draggedId = null;

      sim.alphaTarget(0);
      sim.on('end', () => {
        rebuildQt();
        sendPositions('settled');
      });
      break;
    }

    case 'updateForces': {
      if (!sim) break;
      const { repulsion, linkDistance, linkStrength: ls, centerForce } = data;
      const charge = sim.force('charge') as ReturnType<typeof forceManyBody>;
      const link = sim.force('link') as ReturnType<typeof forceLink>;
      if (charge && repulsion != null) charge.strength(-repulsion);
      if (link && linkDistance != null) link.distance(linkDistance);
      if (link && ls != null) link.strength(ls);

      // Update all attractor strengths
      if (centerForce != null) {
        for (const a of attractors) {
          a.strength = centerForce;
        }
      }

      sim.alpha(0.3).restart();
      sim.on('tick', () => {
        rebuildQt();
        sendPositions('tick');
      }).on('end', () => {
        rebuildQt();
        sendPositions('settled');
      });
      break;
    }

    /* ── Attractor CRUD ── */
    case 'setAttractors': {
      attractors = (data.attractors as Attractor[]).map(a => ({ ...a }));
      restartSim();
      break;
    }

    case 'addAttractor': {
      attractors.push({ ...data.attractor });
      // Remove default attractor if it was the only one
      if (attractors.length > 1 && attractors[0].id === '__default__') {
        attractors.shift();
      }
      restartSim();
      break;
    }

    case 'removeAttractor': {
      const { attractorId } = data;
      attractors = attractors.filter(a => a.id !== attractorId);
      // If all removed, create default at centroid
      if (attractors.length === 0) {
        let cx = 0, cy = 0;
        nodes.forEach(n => { cx += n.x; cy += n.y; });
        if (nodes.length > 0) { cx /= nodes.length; cy /= nodes.length; }
        attractors = [{ id: '__default__', x: cx, y: cy, strength: 0.03 }];
      }
      restartSim();
      break;
    }

    case 'moveAttractor': {
      const { attractorId: aid, x: ax, y: ay } = data;
      const att = attractors.find(a => a.id === aid);
      if (att) {
        att.x = ax;
        att.y = ay;
      }
      // Keep sim warm during drag
      if (sim) {
        sim.alpha(Math.max(sim.alpha(), 0.1)).restart();
      }
      break;
    }

    case 'updateAttractorStrength': {
      const { attractorId: sid, strength: str } = data;
      const att = attractors.find(a => a.id === sid);
      if (att) att.strength = str;
      if (sim) {
        sim.alpha(0.2).restart();
        sim.on('tick', () => { rebuildQt(); sendPositions('tick'); })
          .on('end', () => { rebuildQt(); sendPositions('settled'); });
      }
      break;
    }

    case 'getConnected': {
      const { nodeId } = data;
      const connected = new Set<string>([nodeId]);
      edges.forEach(edge => {
        const s = typeof edge.source === 'string' ? edge.source : edge.source.id;
        const t = typeof edge.target === 'string' ? edge.target : edge.target.id;
        if (s === nodeId) connected.add(t);
        if (t === nodeId) connected.add(s);
      });
      (self as any).postMessage({ type: 'connected', data: { nodeId, ids: Array.from(connected) } });
      break;
    }
  }
};
