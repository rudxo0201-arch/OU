'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide,
  type SimulationNodeDatum, type SimulationLinkDatum,
} from 'd3-force';
import { MagnifyingGlass, ArrowsOut, ArrowsIn, House } from '@phosphor-icons/react';

// ── 타입 ───────────────────────────────────────────────────────
type RawNode = { id: string; title: string; icon: string };
type RawEdge = { source: string; target: string };

type GNode = SimulationNodeDatum & RawNode & { r: number; linkCount: number };
type GLink = SimulationLinkDatum<GNode> & { _source?: string; _target?: string };

type Transform = { x: number; y: number; k: number };

const BG        = '#0d0d0f';
const NODE_CLR  = '#8fa8c8';
const NODE_ACT  = '#ffffff';     // 현재 노트
const EDGE_CLR  = 'rgba(120,140,160,0.25)';
const EDGE_HOV  = 'rgba(160,190,220,0.55)';
const LABEL_CLR = 'rgba(200,215,230,0.7)';
const GLOW_CLR  = 'rgba(100,160,255,0.35)';

// ── 메인 컴포넌트 ──────────────────────────────────────────────
export function NoteGraphView({ activeNoteId }: { activeNoteId?: string }) {
  const router  = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const simRef    = useRef<any>(null);

  const nodesRef    = useRef<GNode[]>([]);
  const linksRef    = useRef<GLink[]>([]);
  const txRef       = useRef<Transform>({ x: 0, y: 0, k: 1 });
  const hoveredRef  = useRef<GNode | null>(null);
  const panRef      = useRef<{ startX: number; startY: number; origTx: Transform } | null>(null);

  const [query, setQuery]     = useState('');
  const [nodeCount, setNodeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [localMode, setLocalMode] = useState(false); // 연결된 노드만 보기

  // ── 캔버스 크기 ──────────────────────────────────────────────
  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width  = width  * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
  }, []);

  // ── 화면 좌표 → 그래프 좌표 변환 ──────────────────────────────
  const screenToGraph = (sx: number, sy: number): [number, number] => {
    const { x, y, k } = txRef.current;
    return [(sx - x) / k, (sy - y) / k];
  };

  // ── 히트 테스트 ───────────────────────────────────────────────
  const hitTest = (sx: number, sy: number): GNode | null => {
    const [gx, gy] = screenToGraph(sx, sy);
    for (const n of nodesRef.current) {
      if (n.x === undefined || n.y === undefined) continue;
      const dx = gx - n.x, dy = gy - n.y;
      if (dx * dx + dy * dy <= (n.r + 4) ** 2) return n;
    }
    return null;
  };

  // ── 렌더링 ────────────────────────────────────────────────────
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x: tx, y: ty, k } = txRef.current;
    const dpr = devicePixelRatio;
    const W = canvas.width, H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(tx, ty);
    ctx.scale(k, k);

    const hov     = hoveredRef.current;
    const active  = activeNoteId;
    const filtered = query
      ? new Set(nodesRef.current.filter(n => n.title.toLowerCase().includes(query.toLowerCase())).map(n => n.id))
      : null;
    const localSet = (localMode && active)
      ? new Set([active, ...linksRef.current.flatMap(l => {
          const s = typeof l.source === 'object' ? (l.source as GNode).id : l.source as string;
          const t = typeof l.target === 'object' ? (l.target as GNode).id : l.target as string;
          return (s === active || t === active) ? [s, t] : [];
        })])
      : null;

    const visible = (n: GNode) => {
      if (localSet && !localSet.has(n.id)) return false;
      if (filtered && !filtered.has(n.id)) return false;
      return true;
    };

    // 엣지
    for (const link of linksRef.current) {
      const src = link.source as GNode;
      const tgt = link.target as GNode;
      if (src.x === undefined || src.y === undefined || tgt.x === undefined || tgt.y === undefined) continue;
      if (!visible(src) || !visible(tgt)) continue;

      const isHovEdge = hov && (src.id === hov.id || tgt.id === hov.id);
      const isActEdge = active && (src.id === active || tgt.id === active);

      ctx.beginPath();
      ctx.moveTo(src.x!, src.y!);
      ctx.lineTo(tgt.x!, tgt.y!);
      ctx.strokeStyle = (isHovEdge || isActEdge) ? EDGE_HOV : EDGE_CLR;
      ctx.lineWidth   = (isHovEdge || isActEdge) ? 1.5 / k : 1 / k;
      ctx.stroke();
    }

    // 노드
    for (const node of nodesRef.current) {
      if (node.x === undefined || node.y === undefined) continue;
      if (!visible(node)) continue;

      const isActive  = node.id === active;
      const isHovered = hov?.id === node.id;
      const isLinked  = active && linksRef.current.some(l => {
        const s = typeof l.source === 'object' ? (l.source as GNode).id : l.source;
        const t = typeof l.target === 'object' ? (l.target as GNode).id : l.target;
        return (s === active && t === node.id) || (t === active && s === node.id);
      });

      const r = node.r;

      // 글로우 (active / hovered)
      if (isActive || isHovered) {
        const grd = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 3.5);
        grd.addColorStop(0, isActive ? 'rgba(255,255,255,0.15)' : GLOW_CLR);
        grd.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }

      // 노드 원
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      const alpha = filtered
        ? (filtered.has(node.id) ? 1 : 0.15)
        : localSet
          ? (localSet.has(node.id) ? 1 : 0.12)
          : 1;

      ctx.fillStyle = isActive
        ? `rgba(255,255,255,${alpha})`
        : isLinked
          ? `rgba(140,180,220,${alpha})`
          : isHovered
            ? `rgba(160,190,220,${alpha})`
            : `rgba(100,130,160,${alpha})`;
      ctx.fill();

      // 테두리 (active)
      if (isActive) {
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth   = 1.5 / k;
        ctx.stroke();
      }

      // 레이블 — 항상 표시 (k > 0.4일 때) 또는 active/hovered
      const showLabel = k > 0.4 || isActive || isHovered;
      if (showLabel) {
        const fontSize = Math.max(10, Math.min(13, 12 / k));
        ctx.font      = `${fontSize}px system-ui, sans-serif`;
        ctx.fillStyle = isActive ? 'rgba(255,255,255,0.95)' : LABEL_CLR;
        ctx.textAlign = 'center';
        ctx.fillText(
          (node.icon ? node.icon + ' ' : '') + (node.title.length > 20 ? node.title.slice(0, 18) + '…' : node.title),
          node.x,
          node.y + r + fontSize + 2,
        );
      }
    }

    ctx.restore();
  }, [activeNoteId, query, localMode]);

  // ── 애니메이션 루프 ──────────────────────────────────────────
  const startLoop = useCallback(() => {
    const loop = () => {
      render();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [render]);

  // ── 데이터 로드 + 시뮬레이션 ──────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      const res  = await fetch('/api/notes/graph');
      const json = res.ok ? await res.json() : { nodes: [], edges: [] };
      if (cancelled) return;

      const raw: RawNode[] = json.nodes ?? [];
      const rawEdges: RawEdge[] = json.edges ?? [];

      // 연결 수 계산
      const linkCount: Record<string, number> = {};
      rawEdges.forEach(e => {
        linkCount[e.source] = (linkCount[e.source] ?? 0) + 1;
        linkCount[e.target] = (linkCount[e.target] ?? 0) + 1;
      });

      const nodes: GNode[] = raw.map(n => ({
        ...n,
        linkCount: linkCount[n.id] ?? 0,
        r: 3 + Math.sqrt(linkCount[n.id] ?? 0) * 2,
        x: (Math.random() - 0.5) * 400,
        y: (Math.random() - 0.5) * 400,
      }));

      const nodeMap = new Map(nodes.map(n => [n.id, n]));
      const links: GLink[] = rawEdges
        .filter(e => nodeMap.has(e.source) && nodeMap.has(e.target))
        .map(e => ({ source: nodeMap.get(e.source)!, target: nodeMap.get(e.target)! }));

      nodesRef.current = nodes;
      linksRef.current = links;
      setNodeCount(nodes.length);
      setLoading(false);

      // 뷰 중앙 정렬
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        txRef.current = { x: rect.width / 2, y: rect.height / 2, k: 1 };
      }

      // D3-Force 시뮬레이션
      simRef.current?.stop();
      const sim = forceSimulation<GNode>(nodes)
        .force('link', forceLink<GNode, GLink>(links).id(d => d.id).distance(80).strength(0.3))
        .force('charge', forceManyBody<GNode>().strength(d => -80 - d.r * 8))
        .force('center', forceCenter(0, 0).strength(0.05))
        .force('collide', forceCollide<GNode>(d => d.r + 6))
        .alphaDecay(0.015)
        .on('tick', () => { /* render loop handles this */ });

      simRef.current = sim;
    })();

    return () => { cancelled = true; };
  }, []);

  // ── Canvas 마운트 + 이벤트 ────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    resize();
    startLoop();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // 마우스 휠 — 줌
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      txRef.current = {
        x: mx - (mx - txRef.current.x) * factor,
        y: my - (my - txRef.current.y) * factor,
        k: Math.min(4, Math.max(0.1, txRef.current.k * factor)),
      };
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });

    // 마우스 이동 — hover
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      if (panRef.current) {
        const { startX, startY, origTx } = panRef.current;
        txRef.current = { ...origTx, x: origTx.x + (sx - startX), y: origTx.y + (sy - startY) };
        canvas.style.cursor = 'grabbing';
      } else {
        const hit = hitTest(sx, sy);
        hoveredRef.current = hit;
        canvas.style.cursor = hit ? 'pointer' : 'grab';
      }
    };

    // 마우스 다운 — pan start
    const onMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      panRef.current = {
        startX: e.clientX - rect.left,
        startY: e.clientY - rect.top,
        origTx: { ...txRef.current },
      };
    };

    // 마우스 업 — click or pan end
    const onMouseUp = (e: MouseEvent) => {
      const rect   = canvas.getBoundingClientRect();
      const sx     = e.clientX - rect.left;
      const sy     = e.clientY - rect.top;
      const wasPan = panRef.current
        ? Math.hypot(sx - panRef.current.startX, sy - panRef.current.startY) > 4
        : false;
      panRef.current = null;
      canvas.style.cursor = 'grab';

      if (!wasPan) {
        const hit = hitTest(sx, sy);
        if (hit) router.push(`/note/${hit.id}`);
      }
    };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup',   onMouseUp);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      canvas.removeEventListener('wheel',     onWheel);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mouseup',   onMouseUp);
    };
  }, [resize, startLoop, router]);

  // ── 뷰 리셋 ──────────────────────────────────────────────────
  const resetView = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    txRef.current = { x: rect.width / 2, y: rect.height / 2, k: 1 };
  };

  // ── 현재 노트 포커스 ──────────────────────────────────────────
  const focusActive = useCallback(() => {
    const node = nodesRef.current.find(n => n.id === activeNoteId);
    if (!node || node.x === undefined || node.y === undefined) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    txRef.current = {
      x: rect.width  / 2 - (node.x ?? 0) * txRef.current.k,
      y: rect.height / 2 - (node.y ?? 0) * txRef.current.k,
      k: txRef.current.k,
    };
  }, [activeNoteId]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: BG }}>
      {/* 캔버스 */}
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%', cursor: 'grab' }}
      />

      {/* 로딩 */}
      {loading && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.3)', fontSize: 13,
        }}>
          그래프 로딩 중…
        </div>
      )}

      {/* 상단 컨트롤 */}
      <div style={{
        position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {/* 검색 */}
        <div style={{ position: 'relative' }}>
          <MagnifyingGlass size={12} style={{
            position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)',
            color: 'rgba(255,255,255,0.3)', pointerEvents: 'none',
          }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="노트 검색…"
            style={{
              width: 200, padding: '6px 10px 6px 28px',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 20, fontSize: 12,
              color: 'rgba(255,255,255,0.8)', outline: 'none',
            }}
          />
        </div>
      </div>

      {/* 우하단 버튼들 */}
      <div style={{
        position: 'absolute', bottom: 20, right: 20,
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        <GraphBtn title="뷰 리셋" onClick={resetView}><ArrowsIn size={14} /></GraphBtn>
        <GraphBtn title="현재 노트 포커스" onClick={focusActive}><House size={14} /></GraphBtn>
        <GraphBtn
          title={localMode ? '전체 그래프 보기' : '연결된 노트만'}
          active={localMode}
          onClick={() => setLocalMode(v => !v)}
        >
          <ArrowsOut size={14} />
        </GraphBtn>
      </div>

      {/* 좌하단 노드 수 */}
      <div style={{
        position: 'absolute', bottom: 16, left: 16,
        fontSize: 11, color: 'rgba(255,255,255,0.2)',
      }}>
        {nodeCount}개 노트
      </div>

      {/* 호버 툴팁 */}
      <HoverTooltip canvasRef={canvasRef} nodesRef={nodesRef} txRef={txRef} />
    </div>
  );
}

// ── 호버 툴팁 ──────────────────────────────────────────────────
function HoverTooltip({
  canvasRef, nodesRef, txRef,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  nodesRef:  React.MutableRefObject<GNode[]>;
  txRef:     React.MutableRefObject<Transform>;
}) {
  const [tip, setTip] = useState<{ x: number; y: number; label: string } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const { x: tx, y: ty, k } = txRef.current;
      const gx = (sx - tx) / k, gy = (sy - ty) / k;
      const hit = nodesRef.current.find(n => {
        if (!n.x || !n.y) return false;
        const dx = gx - n.x, dy = gy - n.y;
        return dx * dx + dy * dy <= (n.r + 4) ** 2;
      });
      setTip(hit ? { x: e.clientX - rect.left + 12, y: e.clientY - rect.top - 8, label: hit.title } : null);
    };
    canvas.addEventListener('mousemove', onMove);
    return () => canvas.removeEventListener('mousemove', onMove);
  }, [canvasRef, nodesRef, txRef]);

  if (!tip) return null;
  return (
    <div style={{
      position: 'absolute', left: tip.x, top: tip.y,
      background: 'rgba(20,22,28,0.92)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 6, padding: '4px 9px',
      fontSize: 12, color: 'rgba(255,255,255,0.85)',
      pointerEvents: 'none', whiteSpace: 'nowrap',
    }}>
      {tip.label}
    </div>
  );
}

// ── 그래프 버튼 ────────────────────────────────────────────────
function GraphBtn({ children, title, onClick, active }: {
  children: React.ReactNode; title: string; onClick: () => void; active?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 32, height: 32, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'rgba(100,160,255,0.25)' : 'rgba(255,255,255,0.08)',
        border: `1px solid ${active ? 'rgba(100,160,255,0.4)' : 'rgba(255,255,255,0.12)'}`,
        color: active ? '#6aa0f0' : 'rgba(255,255,255,0.5)',
        cursor: 'pointer', transition: '150ms',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.14)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = active ? 'rgba(100,160,255,0.25)' : 'rgba(255,255,255,0.08)'; }}
    >
      {children}
    </button>
  );
}
