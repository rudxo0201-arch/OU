'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Settings, Minimize2, ChevronDown, ChevronRight, RotateCcw, Crosshair, Plus, Search } from 'lucide-react';
import { useGraphSettingsStore, DEFAULT_GRAPH_SETTINGS } from '@/stores/graphSettingsStore';
import type { Attractor } from '../../lib/workers/graph-physics.types';

export interface GraphNode {
  id: string;
  label: string;
  category?: string;
  pronunciation?: string;
  meaning?: string;
  importance?: number | null;
  color?: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
  type?: string;
  weight?: number;
}

/** hex → HSL 변환 후 다크/라이트 모드에 맞게 lightness 조정, 다시 hex 정수로 반환 */
function adaptColorForMode(hex: string, isDark: boolean): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  // 다크모드: 밝기를 올림 (최소 0.65), 라이트모드: 밝기를 내림 (최대 0.4)
  const newL = isDark ? Math.max(l, 0.65) : Math.min(l, 0.4);
  // HSL → RGB → hex int
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let nr: number, ng: number, nb: number;
  if (s === 0) { nr = ng = nb = newL; }
  else {
    const q = newL < 0.5 ? newL * (1 + s) : newL + s - newL * s;
    const p = 2 * newL - q;
    nr = hue2rgb(p, q, h + 1 / 3);
    ng = hue2rgb(p, q, h);
    nb = hue2rgb(p, q, h - 1 / 3);
  }
  return (Math.round(nr * 255) << 16) | (Math.round(ng * 255) << 8) | Math.round(nb * 255);
}

interface KnowledgeGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (node: GraphNode) => void;
  /** Hide the built-in settings button (when managed externally) */
  hideSettingsButton?: boolean;
  /** Externally controlled settings panel open state */
  settingsOpen?: boolean;
  /** Callback when external settings toggle is needed */
  onSettingsToggle?: () => void;
  /** 강조할 노드 — 흰색 + 글로우로 표시 */
  activeNodeId?: string;
  /** activeNodeId의 1-hop 이웃만 표시 (activeNodeId 없으면 무시) */
  localMode?: boolean;
}

/**
 * KnowledgeGraph — PixiJS WebGL + Web Worker Physics
 *
 * Architecture (Obsidian model):
 * - Rendering: PixiJS v8 (WebGL GPU-accelerated)
 * - Physics: d3-force in Web Worker (off main thread)
 * - This is a GAME ENGINE. Treat it as such.
 */
export function KnowledgeGraph({ nodes, edges, onNodeClick, hideSettingsButton, settingsOpen: externalSettingsOpen, onSettingsToggle, activeNodeId, localMode = false }: KnowledgeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pixiAppRef = useRef<any>(null);
  const worldRef = useRef<any>(null);
  const edgeGfxRef = useRef<any>(null);
  const nodeGfxRef = useRef<any>(null);
  const labelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const positionsRef = useRef<Float64Array>(new Float64Array(0));
  const nodeMapRef = useRef<Map<string, { index: number; node: GraphNode }>>(new Map());
  const edgeIndicesRef = useRef<{ si: number; ti: number }[]>([]);
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  const hoveredRef = useRef<GraphNode | null>(null);
  const connectedRef = useRef<Set<string> | null>(null);
  const closeControlsRef = useRef<(() => void) | null>(null);
  const pixiLoadedRef = useRef(false);
  const attractorGfxRef = useRef<any>(null);
  const attractorsRef = useRef<Attractor[]>([]);
  const editModeRef = useRef(false);
  const dragAttractorIdRef = useRef<string | null>(null);
  const editAnimFrameRef = useRef<number>(0);
  const selectedAttractorIdRef = useRef<string | null>(null);
  const overlayGfxRef = useRef<any>(null);
  const activeNodeIdRef = useRef<string | undefined>(undefined);
  const localModeRef = useRef(false);
  const localSetRef = useRef<Set<string> | null>(null);

  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' ? document.documentElement.dataset.theme !== 'light' : true
  );
  useEffect(() => {
    const obs = new MutationObserver(() => setIsDark(document.documentElement.dataset.theme !== 'light'));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  // Controls — 그래프 설정 스토어에서 읽기
  const gs = useGraphSettingsStore();
  const { settings: graphSettings } = gs;
  const { showLabels, showGlow, nodeSize, linkThickness, labelZoom, nodeColor, adaptiveColor,
    repulsion, linkDistance, linkStrength, centerForce } = graphSettings;
  const setGS = gs.set;

  const [searchQuery, setSearchQuery] = useState('');
  const [nodeCount, setNodeCount] = useState('');
  const [internalControlsOpen, setInternalControlsOpen] = useState(false);
  const internalToggle = () => setInternalControlsOpen(v => !v);
  const closeControls = () => setInternalControlsOpen(false);
  const controlsOpen = externalSettingsOpen !== undefined ? externalSettingsOpen : internalControlsOpen;
  const toggleControls = onSettingsToggle || internalToggle;
  const [editMode, setEditMode] = useState(false);
  const [selectedAttractorId, setSelectedAttractorId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [displayOpen, setDisplayOpen] = useState(true);
  const [forceOpen, setForceOpen] = useState(false);
  closeControlsRef.current = closeControls;

  const showLabelsRef = useRef(showLabels);
  const showGlowRef = useRef(showGlow);
  const isDarkRef = useRef(isDark);
  const nodeSizeRef = useRef(nodeSize);
  const linkThicknessRef = useRef(linkThickness);
  const labelZoomRef = useRef(labelZoom);
  const nodeColorRef = useRef(nodeColor);
  const adaptiveColorRef = useRef(adaptiveColor);
  showLabelsRef.current = showLabels;
  showGlowRef.current = showGlow;
  isDarkRef.current = isDark;
  nodeSizeRef.current = nodeSize;
  editModeRef.current = editMode;
  selectedAttractorIdRef.current = selectedAttractorId;
  linkThicknessRef.current = linkThickness;
  labelZoomRef.current = labelZoom;
  nodeColorRef.current = nodeColor;
  adaptiveColorRef.current = adaptiveColor;

  const searchMatchIds = useRef(new Set<string>());

  useEffect(() => {
    searchMatchIds.current.clear();
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      nodes.forEach(n => {
        if ((n.label || '').toLowerCase().includes(q) ||
            (n.pronunciation || '').toLowerCase().includes(q) ||
            (n.meaning || '').toLowerCase().includes(q)) {
          searchMatchIds.current.add(n.id);
        }
      });
    }
    renderFrame();
  }, [searchQuery]);

  // activeNodeId / localMode → 1-hop 이웃 집합 갱신 + 재렌더
  useEffect(() => {
    activeNodeIdRef.current = activeNodeId;
    localModeRef.current = localMode;
    if (localMode && activeNodeId) {
      const set = new Set<string>([activeNodeId]);
      for (const e of edges) {
        const s = typeof e.source === 'string' ? e.source : e.source.id;
        const t = typeof e.target === 'string' ? e.target : e.target.id;
        if (s === activeNodeId) set.add(t);
        if (t === activeNodeId) set.add(s);
      }
      localSetRef.current = set;
    } else {
      localSetRef.current = null;
    }
    renderFrame();
  }, [activeNodeId, localMode, edges]);

  // Update PixiJS background when dark mode toggles & re-render on control changes
  useEffect(() => {
    const app = pixiAppRef.current;
    if (app?.renderer) {
      app.renderer.background.color = isDark ? 0x060810 : 0xfafafa;
      renderFrame();
      // Explicit render to flush background color change to WebGL
      app.render();
    } else {
      renderFrame();
    }
  }, [showLabels, showGlow, nodeSize, linkThickness, labelZoom, isDark, nodeColor]);

  // WebGL render frame
  const renderFrame = useCallback(() => {
    const PIXI = (window as any).__PIXI;
    if (!PIXI || !worldRef.current || !edgeGfxRef.current || !nodeGfxRef.current) return;

    const positions = positionsRef.current;
    const nodeMap = nodeMapRef.current;
    const edgeIdx = edgeIndicesRef.current;
    const t = transformRef.current;
    const k = t.k;
    const dark = isDarkRef.current;
    const r = nodeSizeRef.current;
    const hov = hoveredRef.current;
    const conn = connectedRef.current;
    const hasSearch = searchMatchIds.current.size > 0;
    const matches = searchMatchIds.current;

    if (positions.length === 0) return;

    const isEdit = editModeRef.current;

    // Update world transform
    const world = worldRef.current;
    world.position.set(t.x, t.y);
    world.scale.set(k, k);

    // --- Dark overlay in edit mode (dim data layer) ---
    const overlayGfx = overlayGfxRef.current;
    if (overlayGfx) {
      overlayGfx.clear();
      if (isEdit) {
        const app = pixiAppRef.current;
        const ow = app.screen.width / k, oh = app.screen.height / k;
        const ox = -t.x / k, oy = -t.y / k;
        overlayGfx.rect(ox - 100, oy - 100, ow + 200, oh + 200);
        overlayGfx.fill({ color: dark ? 0x060810 : 0xfafafa, alpha: 0.75 });
      }
    }

    // --- Edges: 렌더링 없음 ---
    edgeGfxRef.current?.clear();

    // Viewport bounds in world coords
    const app = pixiAppRef.current;
    const w = app.screen.width, h = app.screen.height;
    const vx0 = -t.x / k, vy0 = -t.y / k;
    const vx1 = (w - t.x) / k, vy1 = (h - t.y) / k;
    const pad = 30 / k;

    // --- Nodes ---
    const ng = nodeGfxRef.current;
    ng.clear();

    const rawColor = nodeColorRef.current;
    let colorHex: number;
    if (rawColor === '#888888') {
      colorHex = dark ? 0xa9a9a9 : 0x555555;
    } else if (adaptiveColorRef.current) {
      colorHex = adaptColorForMode(rawColor, dark);
    } else {
      colorHex = parseInt(rawColor.slice(1), 16);
    }

    const localSet = localSetRef.current;
    const actId = activeNodeIdRef.current;

    for (const [id, { index }] of nodeMap) {
      if (localSet && !localSet.has(id)) continue;
      const nx = positions[index * 2], ny = positions[index * 2 + 1];
      if (nx < vx0 - pad || nx > vx1 + pad || ny < vy0 - pad || ny > vy1 + pad) continue;

      let alpha = 1;
      if (hov) {
        if (id !== hov.id && !conn?.has(id)) alpha = 0.08;
      } else if (hasSearch && !matches.has(id)) {
        alpha = 0.08;
      }

      if (id === actId) {
        // active 노드: 외곽 글로우 2겹 + 흰색 코어
        ng.circle(nx, ny, r + 5);
        ng.fill({ color: 0xffffff, alpha: 0.15 });
        ng.circle(nx, ny, r + 2);
        ng.fill({ color: 0xffffff, alpha: 0.5 });
        ng.circle(nx, ny, r);
        ng.fill({ color: dark ? 0xffffff : 0x222222, alpha });
      } else {
        ng.circle(nx, ny, r);
        ng.fill({ color: colorHex, alpha });
      }
    }

    // Glow on hovered
    if (hov && showGlowRef.current) {
      const he = nodeMap.get(hov.id);
      if (he) {
        const hx = positions[he.index * 2], hy = positions[he.index * 2 + 1];
        ng.circle(hx, hy, r + 2);
        ng.fill({ color: colorHex, alpha: 0.6 });
        ng.circle(hx, hy, r + 5);
        ng.fill({ color: colorHex, alpha: 0.15 });
      }
    }

    // --- Attractors (gravity wells) ---
    const ag = attractorGfxRef.current;
    if (ag) {
      ag.clear();
      const isEdit = editModeRef.current;
      const atts = attractorsRef.current;
      const selId = selectedAttractorIdRef.current;
      const hasSelection = isEdit && selId != null;
      // Filter: in edit mode show all, otherwise only visible ones
      const visibleAtts = isEdit ? atts : atts.filter(a => a.visible === true);
      if (visibleAtts.length > 0) {
        const accentColor = dark ? 0x00CED1 : 0x008B8B;
        const pulse = isEdit ? 0.5 + 0.3 * Math.sin(Date.now() * 0.004) : 0.4;

        for (const a of visibleAtts) {
          const ax = a.x, ay = a.y;
          if (ax < vx0 - 80 || ax > vx1 + 80 || ay < vy0 - 80 || ay > vy1 + 80) continue;

          const isSelected = hasSelection && a.id === selId;
          const dimFactor = hasSelection && !isSelected ? 0.25 : 1;

          // Large outer glow — visible even zoomed out
          ag.circle(ax, ay, (isSelected ? 50 : 35) / k);
          ag.fill({ color: accentColor, alpha: pulse * 0.08 * dimFactor });
          // Outer ring
          ag.circle(ax, ay, (isSelected ? 30 : 22) / k);
          ag.fill({ color: accentColor, alpha: pulse * 0.18 * dimFactor });
          // Middle ring
          ag.circle(ax, ay, (isSelected ? 16 : 12) / k);
          ag.fill({ color: accentColor, alpha: pulse * 0.4 * dimFactor });
          // Core — bright and solid
          ag.circle(ax, ay, (isSelected ? 8 : 6) / k);
          ag.fill({ color: accentColor, alpha: 0.9 * dimFactor });

          // Selected: extra bright outer pulse
          if (isSelected) {
            ag.circle(ax, ay, 60 / k);
            ag.fill({ color: accentColor, alpha: 0.04 + 0.03 * Math.sin(Date.now() * 0.006) });
          }

          // Crosshair lines in edit mode — longer and bolder
          if (isEdit) {
            const cr = (isSelected ? 40 : 28) / k;
            ag.setStrokeStyle({ width: (isSelected ? 1.5 : 1) / k, color: accentColor, alpha: 0.5 * dimFactor });
            ag.moveTo(ax - cr, ay); ag.lineTo(ax + cr, ay);
            ag.moveTo(ax, ay - cr); ag.lineTo(ax, ay + cr);
            ag.stroke();
          }

          // Delete X indicator — larger
          if (isEdit) {
            const xr = 6 / k;
            const xox = ax + 18 / k, xoy = ay - 18 / k;
            ag.circle(xox, xoy, xr);
            ag.fill({ color: 0xff4444, alpha: 0.8 * dimFactor });
            ag.setStrokeStyle({ width: 1.2 / k, color: 0xffffff, alpha: 0.95 * dimFactor });
            ag.moveTo(xox - 3 / k, xoy - 3 / k); ag.lineTo(xox + 3 / k, xoy + 3 / k);
            ag.moveTo(xox + 3 / k, xoy - 3 / k); ag.lineTo(xox - 3 / k, xoy + 3 / k);
            ag.stroke();
          }

          // Linked node indicator
          if (a.linkedNodeId) {
            ag.setStrokeStyle({ width: 1.2 / k, color: accentColor, alpha: 0.4 * dimFactor });
            ag.circle(ax, ay, 26 / k);
            ag.stroke();
          }
        }
      }
    }

    // --- Labels (Canvas 2D overlay — no texture creation overhead) ---
    const labelCvs = labelCanvasRef.current;
    if (labelCvs) {
      const dpr = window.devicePixelRatio || 1;
      const lctx = labelCvs.getContext('2d');
      if (lctx) {
        lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        lctx.clearRect(0, 0, w, h);

        if (showLabelsRef.current && !isEdit) {
          lctx.save();
          lctx.translate(t.x, t.y);
          lctx.scale(k, k);
          lctx.textAlign = 'center';
          lctx.textBaseline = 'top';
          const fontSize = Math.max(3, Math.min(12, 8 / k));
          lctx.font = `${fontSize}px "Pretendard Variable", sans-serif`;
          const labelColor = dark ? '220,220,222' : '30,30,30';
          const zoomThreshold = labelZoomRef.current;
          const MAX_LABELS = 150;
          const MAX_HOVER_LABELS = 25;

          if (hov || hasSearch) {
            if (hov) {
              const he = nodeMap.get(hov.id);
              if (he) {
                lctx.fillStyle = `rgba(${labelColor},1)`;
                lctx.fillText(he.node.label || hov.id, positions[he.index * 2], positions[he.index * 2 + 1] + r + 2 / k);
              }
            }
            let hc = 0;
            for (const [id, { index, node }] of nodeMap) {
              if (localSet && !localSet.has(id)) continue;
              if (hov && id === hov.id) continue;
              const nx = positions[index * 2], ny = positions[index * 2 + 1];
              if (nx < vx0 - pad || nx > vx1 + pad || ny < vy0 - pad || ny > vy1 + pad) continue;
              if (hov && conn?.has(id)) {
                if (hc >= MAX_HOVER_LABELS) continue;
                lctx.fillStyle = `rgba(${labelColor},0.7)`;
                lctx.fillText(node.label || id, nx, ny + r + 2 / k);
                hc++;
              } else if (hasSearch && matches.has(id)) {
                lctx.fillStyle = `rgba(${labelColor},1)`;
                lctx.fillText(node.label || id, nx, ny + r + 2 / k);
              }
            }
          } else if (k > zoomThreshold) {
            let lc2 = 0;
            for (const [id, { index, node }] of nodeMap) {
              if (localSet && !localSet.has(id)) continue;
              if (lc2 >= MAX_LABELS) break;
              const nx = positions[index * 2], ny = positions[index * 2 + 1];
              if (nx < vx0 - pad || nx > vx1 + pad || ny < vy0 - pad || ny > vy1 + pad) continue;
              lctx.fillStyle = `rgba(${labelColor},0.55)`;
              lctx.fillText(node.label || '', nx, ny + r + 2 / k);
              lc2++;
            }
          }
          lctx.restore();
        }
      }
    }
  }, []);

  // Main setup — dynamic import PixiJS + init
  useEffect(() => {
    if (nodes.length === 0) return;
    const container = containerRef.current;
    if (!container) return;

    let destroyed = false;

    const init = async () => {
      // Dynamic import PixiJS (SSR-safe)
      const PIXI = await import('pixi.js');
      (window as any).__PIXI = PIXI;

      if (destroyed) return;

      const w = container.clientWidth;
      const h = container.clientHeight;

      // Create PixiJS app with WebGL
      const app = new PIXI.Application();
      await app.init({
        width: w,
        height: h,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        background: isDarkRef.current ? 0x060810 : 0xfafafa,
        canvas: undefined,
      });

      if (destroyed) { app.destroy(); return; }

      container.appendChild(app.canvas);
      app.canvas.style.borderRadius = '8px';
      app.canvas.style.cursor = 'grab';
      app.canvas.style.touchAction = 'none';
      pixiAppRef.current = app;

      // Force-sync background with current color scheme (handles race with Mantine hydration)
      app.renderer.background.color = isDarkRef.current ? 0x060810 : 0xfafafa;

      // World container (for zoom/pan)
      const world = new PIXI.Container();
      app.stage.addChild(world);
      worldRef.current = world;

      // Edge graphics
      const edgeGfx = new PIXI.Graphics();
      world.addChild(edgeGfx);
      edgeGfxRef.current = edgeGfx;

      // Node graphics
      const nodeGfx = new PIXI.Graphics();
      world.addChild(nodeGfx);
      nodeGfxRef.current = nodeGfx;

      // Dark overlay (between data and attractors — dims edges+nodes in edit mode)
      const overlayGfx = new PIXI.Graphics();
      world.addChild(overlayGfx);
      overlayGfxRef.current = overlayGfx;

      // Attractor graphics (above overlay, always visible in edit mode)
      const attractorGfx = new PIXI.Graphics();
      world.addChild(attractorGfx);
      attractorGfxRef.current = attractorGfx;

      // Label overlay (Canvas 2D — crisp text, no texture overhead)
      const dpr = window.devicePixelRatio || 1;
      const labelCvs = document.createElement('canvas');
      labelCvs.width = w * dpr;
      labelCvs.height = h * dpr;
      labelCvs.style.width = w + 'px';
      labelCvs.style.height = h + 'px';
      labelCvs.style.position = 'absolute';
      labelCvs.style.top = '0';
      labelCvs.style.left = '0';
      labelCvs.style.pointerEvents = 'none';
      labelCvs.style.borderRadius = '8px';
      container.appendChild(labelCvs);
      labelCanvasRef.current = labelCvs;

      // Build maps
      const nMap = new Map<string, { index: number; node: GraphNode }>();
      nodes.forEach((n, i) => nMap.set(n.id, { index: i, node: n }));
      nodeMapRef.current = nMap;

      const eIdx: { si: number; ti: number }[] = [];
      edges.forEach(e => {
        const srcId = typeof e.source === 'string' ? e.source : e.source.id;
        const tgtId = typeof e.target === 'string' ? e.target : e.target.id;
        const si = nMap.get(srcId)?.index;
        const ti = nMap.get(tgtId)?.index;
        if (si != null && ti != null) eIdx.push({ si, ti });
      });
      edgeIndicesRef.current = eIdx;

      // Init positions
      const pos = new Float64Array(nodes.length * 2);
      nodes.forEach((n, i) => { pos[i * 2] = n.x || 0; pos[i * 2 + 1] = n.y || 0; });
      positionsRef.current = pos;
      setNodeCount(`${nodes.length} nodes · ${edges.length} edges`);

      // Zoom to fit
      const zoomToFit = () => {
        const p = positionsRef.current;
        if (p.length === 0) return;
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (let i = 0; i < p.length / 2; i++) {
          if (p[i*2] < x0) x0 = p[i*2]; if (p[i*2+1] < y0) y0 = p[i*2+1];
          if (p[i*2] > x1) x1 = p[i*2]; if (p[i*2+1] > y1) y1 = p[i*2+1];
        }
        const pd = 80;
        const sc = Math.min(w / (x1-x0+pd*2), h / (y1-y0+pd*2), 2);
        transformRef.current = { x: w/2 - (x0+x1)/2*sc, y: h/2 - (y0+y1)/2*sc, k: sc };
      };

      zoomToFit();

      // Worker
      let worker: Worker;
      try {
        worker = new Worker(new URL('../../lib/workers/graph-physics.worker.ts', import.meta.url));
      } catch (err) {
        console.error('Worker failed:', err);
        renderFrame();
        return;
      }
      workerRef.current = worker;

      worker.onmessage = (ev: MessageEvent) => {
        const { type, positions, data, attractors: attData } = ev.data;
        if (type === 'tick' || type === 'ready' || type === 'settled') {
          if (positions) positionsRef.current = new Float64Array(positions);
          if (attData) {
            // Preserve local-only fields (visible) when worker updates positions
            const prev = attractorsRef.current;
            attractorsRef.current = attData.map((a: any) => {
              const old = prev.find((p: any) => p.id === a.id);
              return { ...a, visible: old?.visible ?? a.visible ?? false };
            });
          }
          if (type === 'ready') zoomToFit();
          renderFrame();
        }
        if (type === 'connected') {
          connectedRef.current = new Set(data.ids);
          renderFrame();
        }
      };

      worker.postMessage({ type: 'init', data: {
        nodes: nodes.map(n => ({ id: n.id, label: n.label, x: n.x || 0, y: n.y || 0, category: n.category, pronunciation: n.pronunciation, meaning: n.meaning, importance: n.importance })),
        edges: edges.map(e => ({ source: typeof e.source === 'string' ? e.source : e.source.id, target: typeof e.target === 'string' ? e.target : e.target.id })),
        config: { cx: 0, cy: 0, repulsion, linkDistance, centerForce },
      }});

      // --- Interaction ---
      const cvs = app.canvas as HTMLCanvasElement;
      let isPanning = false, panStart = { x: 0, y: 0 };
      let dragNode: GraphNode | null = null, dragStarted = false;
      let mouseDownPos = { x: 0, y: 0 }, lastDragSend = 0;

      const findNodeLocal = (sx: number, sy: number): GraphNode | null => {
        const t = transformRef.current;
        const wx = (sx - t.x) / t.k, wy = (sy - t.y) / t.k;
        const searchR = Math.max(15, 8 / t.k);
        let best: GraphNode | null = null, bestDist = searchR;
        for (const [, { index, node }] of nMap) {
          const nx = positionsRef.current[index * 2], ny = positionsRef.current[index * 2 + 1];
          const dist = Math.sqrt((wx - nx) ** 2 + (wy - ny) ** 2);
          if (dist < bestDist) { bestDist = dist; best = node; }
        }
        return best;
      };

      // Attractor hit-test (edit mode only)
      const findAttractorLocal = (sx: number, sy: number): Attractor | null => {
        const t = transformRef.current;
        const wx = (sx - t.x) / t.k, wy = (sy - t.y) / t.k;
        const hitR = 20 / t.k;
        let best: Attractor | null = null, bestDist = hitR;
        for (const a of attractorsRef.current) {
          const dist = Math.sqrt((wx - a.x) ** 2 + (wy - a.y) ** 2);
          if (dist < bestDist) { bestDist = dist; best = a; }
        }
        return best;
      };

      // Check if click hits the X delete button of an attractor
      const hitAttractorX = (sx: number, sy: number): Attractor | null => {
        const t = transformRef.current;
        const wx = (sx - t.x) / t.k, wy = (sy - t.y) / t.k;
        const hitR = 8 / t.k;
        for (const a of attractorsRef.current) {
          const xox = a.x + 10 / t.k, xoy = a.y - 10 / t.k;
          const dist = Math.sqrt((wx - xox) ** 2 + (wy - xoy) ** 2);
          if (dist < hitR) return a;
        }
        return null;
      };

      let lastTouchTime = 0;
      let editClickPending = false;

      cvs.addEventListener('mousedown', (e) => {
        setContextMenu(null);
        if (e.button !== 0) return;
        if (Date.now() - lastTouchTime < 500) return;
        const rect = cvs.getBoundingClientRect();
        const sx = e.clientX - rect.left, sy = e.clientY - rect.top;

        // Edit mode: only attractor interactions (no node click/hover)
        if (editModeRef.current) {
          // Check X button hit
          const xHit = hitAttractorX(sx, sy);
          if (xHit) {
            if (selectedAttractorIdRef.current === xHit.id) setSelectedAttractorId(null);
            worker.postMessage({ type: 'removeAttractor', data: { attractorId: xHit.id } });
            return;
          }
          // Check attractor click/drag
          const attHit = findAttractorLocal(sx, sy);
          if (attHit) {
            setSelectedAttractorId(attHit.id);
            dragAttractorIdRef.current = attHit.id;
            mouseDownPos = { x: e.clientX, y: e.clientY };
            cvs.style.cursor = 'grabbing';
            return;
          }
          // Empty space: mark for add-on-click, allow pan
          editClickPending = true;
          mouseDownPos = { x: e.clientX, y: e.clientY };
          isPanning = true;
          panStart = { x: e.clientX - transformRef.current.x, y: e.clientY - transformRef.current.y };
          cvs.style.cursor = 'grabbing';
          return;
        }

        // Normal mode: node drag or pan
        const found = findNodeLocal(sx, sy);
        if (found) {
          dragNode = found; dragStarted = false;
          mouseDownPos = { x: e.clientX, y: e.clientY };
          cvs.style.cursor = 'grabbing';
        } else {
          isPanning = true;
          panStart = { x: e.clientX - transformRef.current.x, y: e.clientY - transformRef.current.y };
          cvs.style.cursor = 'grabbing';
        }
      });

      const handleMove = (ev: MouseEvent) => {
        // Attractor drag in edit mode
        if (dragAttractorIdRef.current) {
          editClickPending = false;
          const now = performance.now();
          if (now - lastDragSend < 16) return;
          lastDragSend = now;
          const rect = cvs.getBoundingClientRect();
          const t = transformRef.current;
          const wx = (ev.clientX - rect.left - t.x) / t.k;
          const wy = (ev.clientY - rect.top - t.y) / t.k;
          worker.postMessage({ type: 'moveAttractor', data: { attractorId: dragAttractorIdRef.current, x: wx, y: wy } });
          return;
        }

        if (dragNode) {
          const dx = ev.clientX - mouseDownPos.x, dy = ev.clientY - mouseDownPos.y;
          if (!dragStarted && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
          if (!dragStarted) { dragStarted = true; worker.postMessage({ type: 'dragStart', data: { nodeId: dragNode.id } }); }
          const now = performance.now();
          if (now - lastDragSend < 16) return;
          lastDragSend = now;
          const rect = cvs.getBoundingClientRect();
          const t = transformRef.current;
          worker.postMessage({ type: 'dragMove', data: { nodeId: dragNode.id, x: (ev.clientX - rect.left - t.x) / t.k, y: (ev.clientY - rect.top - t.y) / t.k }});
          return;
        }
        if (isPanning) {
          transformRef.current.x = ev.clientX - panStart.x;
          transformRef.current.y = ev.clientY - panStart.y;
          renderFrame();
          return;
        }
        // Edit mode: no node hover, show attractor cursor instead
        if (editModeRef.current) {
          if (hoveredRef.current) {
            hoveredRef.current = null; connectedRef.current = null;
            renderFrame();
          }
          const rect = cvs.getBoundingClientRect();
          const sx = ev.clientX - rect.left, sy = ev.clientY - rect.top;
          const attHover = findAttractorLocal(sx, sy);
          cvs.style.cursor = attHover ? 'grab' : 'crosshair';
          return;
        }

        const rect = cvs.getBoundingClientRect();
        const sx = ev.clientX - rect.left, sy = ev.clientY - rect.top;
        if (sx < 0 || sy < 0 || sx > w || sy > h) return;
        const found = findNodeLocal(sx, sy);
        if (found) {
          if (hoveredRef.current?.id !== found.id) {
            hoveredRef.current = found;
            worker.postMessage({ type: 'getConnected', data: { nodeId: found.id } });
            cvs.style.cursor = 'pointer';
          }
        } else if (hoveredRef.current) {
          hoveredRef.current = null; connectedRef.current = null;
          renderFrame(); cvs.style.cursor = 'grab';
        }
      };

      const handleUp = (ev: MouseEvent) => {
        // Attractor drag end
        if (dragAttractorIdRef.current) {
          dragAttractorIdRef.current = null;
          cvs.style.cursor = editModeRef.current ? 'crosshair' : 'grab';
          return;
        }

        // Edit mode: click empty space to add attractor
        if (editClickPending) {
          editClickPending = false;
          const dx = ev.clientX - mouseDownPos.x, dy = ev.clientY - mouseDownPos.y;
          if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
            const rect = cvs.getBoundingClientRect();
            const t = transformRef.current;
            const wx = (ev.clientX - rect.left - t.x) / t.k;
            const wy = (ev.clientY - rect.top - t.y) / t.k;
            // Don't add if a node is there
            if (!findNodeLocal(ev.clientX - rect.left, ev.clientY - rect.top)) {
              const id = `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
              worker.postMessage({ type: 'addAttractor', data: { attractor: { id, x: wx, y: wy, strength: 0.03 } } });
            }
          }
        }

        if (dragNode) {
          if (!dragStarted) { closeControlsRef.current?.(); onNodeClick?.(dragNode); }
          else worker.postMessage({ type: 'dragEnd', data: {} });
          dragNode = null; dragStarted = false; cvs.style.cursor = 'grab';
        }
        if (isPanning) { isPanning = false; cvs.style.cursor = 'grab'; }
      };

      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);

      // Context menu: right-click node to set as attractor
      cvs.addEventListener('contextmenu', (ev) => {
        ev.preventDefault();
        const rect = cvs.getBoundingClientRect();
        const sx = ev.clientX - rect.left, sy = ev.clientY - rect.top;
        const found = findNodeLocal(sx, sy);
        if (found) {
          setContextMenu({ x: ev.clientX, y: ev.clientY, nodeId: found.id });
        } else {
          setContextMenu(null);
        }
      });

      cvs.addEventListener('wheel', (ev) => {
        ev.preventDefault();
        const t = transformRef.current;
        const rect = cvs.getBoundingClientRect();
        const mx = ev.clientX - rect.left, my = ev.clientY - rect.top;
        // Pinch gesture on trackpad sends ctrlKey + small deltaY
        const isPinch = ev.ctrlKey || ev.metaKey;
        if (isPinch) {
          const delta = -ev.deltaY * 0.01;
          const newK = Math.max(0.05, Math.min(10, t.k * Math.exp(delta)));
          const ratio = newK / t.k;
          t.x = mx - ratio * (mx - t.x); t.y = my - ratio * (my - t.y); t.k = newK;
        } else {
          // Scroll → zoom (not pan) for better usability
          const delta = -ev.deltaY * 0.003;
          const newK = Math.max(0.05, Math.min(10, t.k * Math.exp(delta)));
          const ratio = newK / t.k;
          t.x = mx - ratio * (mx - t.x); t.y = my - ratio * (my - t.y); t.k = newK;
        }
        renderFrame();
      }, { passive: false });

      cvs.addEventListener('mouseleave', () => {
        if (!dragNode) { hoveredRef.current = null; connectedRef.current = null; renderFrame(); }
      });

      // --- Touch interactions (mobile: pinch zoom, pan, node drag) ---
      let activeTouches: Touch[] = [];
      let touchDragNode: GraphNode | null = null;
      let touchDragStarted = false;
      let touchStartPos = { x: 0, y: 0 };
      let lastPinchDist = 0;
      let lastPinchCenter = { x: 0, y: 0 };
      let isTouchPanning = false;
      let touchPanStart = { x: 0, y: 0 };

      const getTouchDist = (t1: Touch, t2: Touch) =>
        Math.sqrt((t1.clientX - t2.clientX) ** 2 + (t1.clientY - t2.clientY) ** 2);
      const getTouchCenter = (t1: Touch, t2: Touch) => ({
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      });

      cvs.addEventListener('touchstart', (e) => {
        e.preventDefault();
        lastTouchTime = Date.now();
        activeTouches = Array.from(e.touches);
        const rect = cvs.getBoundingClientRect();

        if (e.touches.length === 1) {
          // Single finger: tap node or start node drag (NO panning)
          const touch = e.touches[0];
          const sx = touch.clientX - rect.left, sy = touch.clientY - rect.top;
          const found = findNodeLocal(sx, sy);
          if (found) {
            touchDragNode = found;
            touchDragStarted = false;
            touchStartPos = { x: touch.clientX, y: touch.clientY };
          }
          // Single finger on empty area: do nothing (no pan)
        } else if (e.touches.length === 2) {
          // Two fingers: pinch zoom + pan
          touchDragNode = null;
          lastPinchDist = getTouchDist(e.touches[0], e.touches[1]);
          const center = getTouchCenter(e.touches[0], e.touches[1]);
          lastPinchCenter = { x: center.x - rect.left, y: center.y - rect.top };
          isTouchPanning = true;
          touchPanStart = {
            x: (center.x - rect.left) - transformRef.current.x,
            y: (center.y - rect.top) - transformRef.current.y,
          };
        }
      }, { passive: false });

      cvs.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const rect = cvs.getBoundingClientRect();

        if (e.touches.length === 2) {
          // Two fingers: pinch zoom + pan simultaneously
          const dist = getTouchDist(e.touches[0], e.touches[1]);
          const center = getTouchCenter(e.touches[0], e.touches[1]);
          const cx = center.x - rect.left, cy = center.y - rect.top;
          const t = transformRef.current;

          // Zoom
          const scale = dist / lastPinchDist;
          const newK = Math.max(0.05, Math.min(10, t.k * scale));
          const ratio = newK / t.k;
          t.x = cx - ratio * (cx - t.x);
          t.y = cy - ratio * (cy - t.y);
          t.k = newK;

          // Pan (two-finger drag)
          const panDx = cx - lastPinchCenter.x;
          const panDy = cy - lastPinchCenter.y;
          t.x += panDx;
          t.y += panDy;

          lastPinchDist = dist;
          lastPinchCenter = { x: cx, y: cy };
          renderFrame();
          return;
        }

        if (e.touches.length === 1) {
          const touch = e.touches[0];
          // Single finger: only node drag (not panning)
          if (touchDragNode) {
            const dx = touch.clientX - touchStartPos.x, dy = touch.clientY - touchStartPos.y;
            if (!touchDragStarted && Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
            if (!touchDragStarted) { touchDragStarted = true; worker.postMessage({ type: 'dragStart', data: { nodeId: touchDragNode.id } }); }
            const t = transformRef.current;
            worker.postMessage({ type: 'dragMove', data: { nodeId: touchDragNode.id, x: (touch.clientX - rect.left - t.x) / t.k, y: (touch.clientY - rect.top - t.y) / t.k }});
            return;
          }
        }
      }, { passive: false });

      cvs.addEventListener('touchend', (e) => {
        if (touchDragNode) {
          if (!touchDragStarted) { closeControlsRef.current?.(); onNodeClick?.(touchDragNode); }
          else worker.postMessage({ type: 'dragEnd', data: {} });
          touchDragNode = null; touchDragStarted = false;
        }
        isTouchPanning = false;
        activeTouches = Array.from(e.touches);
      }, { passive: false });

      // Store zoomToFit for button
      (containerRef.current as any).__zoomToFit = zoomToFit;

      renderFrame();
    };

    init();

    return () => {
      destroyed = true;
      workerRef.current?.terminate();
      workerRef.current = null;
      if (pixiAppRef.current) {
        pixiAppRef.current.destroy(true);
        pixiAppRef.current = null;
      }
      worldRef.current = null;
      edgeGfxRef.current = null;
      nodeGfxRef.current = null;
      overlayGfxRef.current = null;
      attractorGfxRef.current = null;
      if (labelCanvasRef.current?.parentNode) {
        labelCanvasRef.current.parentNode.removeChild(labelCanvasRef.current);
      }
      labelCanvasRef.current = null;
    };
  }, [nodes, edges]);

  // Update forces
  useEffect(() => {
    workerRef.current?.postMessage({ type: 'updateForces', data: { repulsion, linkDistance, linkStrength, centerForce } });
  }, [repulsion, linkDistance, linkStrength, centerForce]);

  // Edit mode: pulse animation loop
  useEffect(() => {
    if (!editMode) {
      cancelAnimationFrame(editAnimFrameRef.current);
      setSelectedAttractorId(null);
      // Clear hover state when entering/exiting edit mode
      hoveredRef.current = null;
      connectedRef.current = null;
      renderFrame();
      return;
    }
    const animate = () => {
      renderFrame();
      editAnimFrameRef.current = requestAnimationFrame(animate);
    };
    editAnimFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(editAnimFrameRef.current);
  }, [editMode]);

  // Context menu: add node as attractor
  const handleAddNodeAsAttractor = useCallback((nodeId: string, replaceAll: boolean) => {
    if (replaceAll) {
      workerRef.current?.postMessage({ type: 'setAttractors', data: { attractors: [{ id: `att_node_${nodeId}`, x: 0, y: 0, strength: centerForce, linkedNodeId: nodeId }] } });
    } else {
      workerRef.current?.postMessage({ type: 'addAttractor', data: { attractor: { id: `att_node_${nodeId}`, x: 0, y: 0, strength: centerForce, linkedNodeId: nodeId } } });
    }
    setContextMenu(null);
  }, [centerForce]);

  const handleZoomToFit = useCallback(() => {
    const fn = (containerRef.current as any)?.__zoomToFit;
    if (fn) { fn(); renderFrame(); }
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }} />

      {!hideSettingsButton && (
        <button title="그래프 설정" onClick={toggleControls}
          style={{ position: 'absolute', top: 56, right: 16, zIndex: 21,
            background: isDark ? 'rgba(10,12,20,0.7)' : 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(8px)', border: '1px solid var(--ou-border)',
            borderRadius: 6, width: 30, height: 30, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isDark ? '#fff' : '#000' }}>
          <Settings size={16} />
        </button>
      )}

      {editMode && (
        <div style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 21,
          background: isDark ? 'rgba(0,206,209,0.15)' : 'rgba(0,139,139,0.1)',
          border: `1px solid ${isDark ? 'rgba(0,206,209,0.3)' : 'rgba(0,139,139,0.25)'}`,
          borderRadius: '8px', padding: '6px 14px', backdropFilter: 'blur(8px)',
        }}>
          <span style={{ fontSize: 11, color: isDark ? '#00CED1' : '#008B8B', display: 'block', textAlign: 'center' }}>
            중력장 편집 — 빈 공간 클릭으로 추가 · 드래그로 이동 · 우클릭 노드로 중력점 설정
          </span>
        </div>
      )}

      {contextMenu && (
        <div style={{
          position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 100,
          background: isDark ? 'rgba(10,12,20,0.95)' : 'rgba(255,255,255,0.98)',
          border: '0.5px solid var(--ou-border)',
          borderRadius: '8px', backdropFilter: 'blur(12px)',
          padding: 4, minWidth: 160,
        }}
          onMouseLeave={() => setContextMenu(null)}>
          <button
            onClick={() => handleAddNodeAsAttractor(contextMenu.nodeId, false)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 4, width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: isDark ? '#fff' : '#000' }}>
            <Plus size={12} color={isDark ? '#00CED1' : '#008B8B'} />
            <span style={{ fontSize: 11 }}>중력점으로 추가</span>
          </button>
          <button
            onClick={() => handleAddNodeAsAttractor(contextMenu.nodeId, true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 4, width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: isDark ? '#fff' : '#000' }}>
            <Crosshair size={12} color={isDark ? '#00CED1' : '#008B8B'} />
            <span style={{ fontSize: 11 }}>이 노드만 중력점으로</span>
          </button>
        </div>
      )}

      {controlsOpen && (
        <div style={{
          position: 'absolute', top: 90, right: 16, width: 220,
          maxHeight: 'calc(100% - 108px)', overflowY: 'auto',
          background: isDark ? 'rgba(10,12,20,0.92)' : 'rgba(255,255,255,0.95)',
          border: '0.5px solid var(--ou-border)',
          borderRadius: '8px', backdropFilter: 'blur(12px)', zIndex: 10,
        }}>
          <div style={{ padding: '10px 10px 0' }}>
            <div style={{ position: 'relative' }}>
              <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: isDark ? '#888' : '#666', pointerEvents: 'none' }} />
              <input placeholder="검색..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.currentTarget.value)}
                style={{ fontSize: 11, height: 30, borderRadius: 4, width: '100%', boxSizing: 'border-box',
                  padding: '0 8px 0 26px', border: '1px solid var(--ou-border)',
                  background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  color: isDark ? '#fff' : '#000', outline: 'none' }} />
            </div>
          </div>
          <div style={{ padding: '12px 10px 0' }}>
            <button onClick={() => setDisplayOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: isDark ? '#fff' : '#000' }}>
              {displayOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              <span style={{ fontSize: 11, fontWeight: 600 }}>표시</span>
            </button>
          </div>
          {displayOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: isDark ? '#ddd' : '#333' }}>라벨</span>
                <input type="checkbox" checked={showLabels} onChange={(e) => setGS('showLabels', e.currentTarget.checked)} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: isDark ? '#ddd' : '#333' }}>글로우</span>
                <input type="checkbox" checked={showGlow} onChange={(e) => setGS('showGlow', e.currentTarget.checked)} />
              </div>
              <div>
                <span style={{ fontSize: 11, display: 'block', marginBottom: 4, color: isDark ? '#ddd' : '#333' }}>텍스트 표시 시작점</span>
                <input type="range" min={1} max={10} step={0.5} value={labelZoom} onChange={(e) => setGS('labelZoom', Number(e.target.value))} style={{ width: '100%', padding: 0 }} />
              </div>
              <div>
                <span style={{ fontSize: 11, display: 'block', marginBottom: 4, color: isDark ? '#ddd' : '#333' }}>노드 크기</span>
                <input type="range" min={0.3} max={4} step={0.1} value={nodeSize} onChange={(e) => setGS('nodeSize', Number(e.target.value))} style={{ width: '100%', padding: 0 }} />
              </div>
              <div>
                <span style={{ fontSize: 11, display: 'block', marginBottom: 4, color: isDark ? '#ddd' : '#333' }}>링크 두께</span>
                <input type="range" min={0.1} max={2} step={0.1} value={linkThickness} onChange={(e) => setGS('linkThickness', Number(e.target.value))} style={{ width: '100%', padding: 0 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: isDark ? '#ddd' : '#333' }}>노드 색상</span>
                <div style={{ position: 'relative', width: 22, height: 22 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: nodeColor, border: '1.5px solid var(--ou-border)' }} />
                  <input type="color" value={nodeColor} onChange={(e) => setGS('nodeColor', e.target.value)} style={{ position: 'absolute', top: 0, left: 0, width: 22, height: 22, opacity: 0, cursor: 'pointer', border: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: isDark ? '#ddd' : '#333' }}>모드별 자동 조정</span>
                <input type="checkbox" checked={adaptiveColor} onChange={(e) => setGS('adaptiveColor', e.currentTarget.checked)} />
              </div>
            </div>
          )}
          <div style={{ borderTop: '0.5px solid var(--ou-border)' }} />
          <div style={{ padding: '8px 10px 0' }}>
            <button onClick={() => setForceOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: isDark ? '#fff' : '#000' }}>
              {forceOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              <span style={{ fontSize: 11, fontWeight: 600 }}>장력</span>
            </button>
          </div>
          {forceOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: isDark ? '#ddd' : '#333' }}>중력장 편집</span>
                <input type="checkbox" checked={editMode} onChange={(e) => { setEditMode(e.currentTarget.checked); setContextMenu(null); if (!e.currentTarget.checked) setSelectedAttractorId(null); }} />
              </div>
              {editMode && selectedAttractorId && (() => {
                const selAtt = attractorsRef.current.find(a => a.id === selectedAttractorId);
                if (!selAtt) return null;
                return (
                  <div style={{ background: isDark ? 'rgba(0,206,209,0.08)' : 'rgba(0,139,139,0.06)', borderRadius: 4, padding: '6px 8px' }}>
                    <span style={{ fontSize: 10, color: isDark ? '#00CED1' : '#008B8B', fontWeight: 600, marginBottom: 4, display: 'block' }}>
                      선택된 중력점{selAtt.linkedNodeId ? ` (${selAtt.linkedNodeId})` : ''}
                    </span>
                    <div style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: 11, display: 'block', marginBottom: 4, color: isDark ? '#ddd' : '#333' }}>개별 중력 강도</span>
                      <input type="range" min={0} max={0.3} step={0.005} value={selAtt.strength}
                        onChange={(e) => {
                          selAtt.strength = Number(e.target.value);
                          workerRef.current?.postMessage({ type: 'updateAttractorStrength', data: { attractorId: selectedAttractorId, strength: Number(e.target.value) } });
                          renderFrame();
                        }}
                        style={{ width: '100%', padding: 0 }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: isDark ? '#ddd' : '#333' }}>편집 후 표시</span>
                      <input type="checkbox" checked={selAtt.visible === true}
                        onChange={(e) => {
                          selAtt.visible = e.currentTarget.checked;
                          renderFrame();
                        }} />
                    </div>
                  </div>
                );
              })()}
              <div>
                <span style={{ fontSize: 11, display: 'block', marginBottom: 4, color: isDark ? '#ddd' : '#333' }}>중심 장력 (전체)</span>
                <input type="range" min={0} max={0.3} step={0.01} value={centerForce} onChange={(e) => setGS('centerForce', Number(e.target.value))} style={{ width: '100%', padding: 0 }} />
              </div>
              <div>
                <span style={{ fontSize: 11, display: 'block', marginBottom: 4, color: isDark ? '#ddd' : '#333' }}>반발력</span>
                <input type="range" min={1} max={100} value={repulsion} onChange={(e) => setGS('repulsion', Number(e.target.value))} style={{ width: '100%', padding: 0 }} />
              </div>
              <div>
                <span style={{ fontSize: 11, display: 'block', marginBottom: 4, color: isDark ? '#ddd' : '#333' }}>링크 거리</span>
                <input type="range" min={5} max={150} value={linkDistance} onChange={(e) => setGS('linkDistance', Number(e.target.value))} style={{ width: '100%', padding: 0 }} />
              </div>
              <div>
                <span style={{ fontSize: 11, display: 'block', marginBottom: 4, color: isDark ? '#ddd' : '#333' }}>링크 장력</span>
                <input type="range" min={0.01} max={1} step={0.01} value={linkStrength} onChange={(e) => setGS('linkStrength', Number(e.target.value))} style={{ width: '100%', padding: 0 }} />
              </div>
            </div>
          )}
          <div style={{ borderTop: '0.5px solid var(--ou-border)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px' }}>
            {nodeCount && <span style={{ fontSize: 9, color: isDark ? '#888' : '#666' }}>{nodeCount}</span>}
            <div style={{ display: 'flex', gap: 4 }}>
              <button title="초기화" onClick={() => gs.reset()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isDark ? '#888' : '#666', padding: 2 }}><RotateCcw size={12} /></button>
              <button title="전체 보기" onClick={handleZoomToFit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isDark ? '#888' : '#666', padding: 2 }}><Minimize2 size={12} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
