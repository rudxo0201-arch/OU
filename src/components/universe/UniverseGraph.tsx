'use client';

import { useEffect, useRef, useState } from 'react';
import { forceSimulation, forceManyBody, forceCollide, forceX, forceY } from 'd3-force';

interface DataNode {
  id: string;
  raw?: string;
  domain?: string;
  created_at?: string;
  domain_data?: Record<string, unknown>;
}

interface Props {
  nodes: DataNode[];
  onNodeClick?: (node: DataNode) => void;
}

// 어두운 우주 배경에서 보이는 밝은 도메인 색상
const DOMAIN_COLORS: Record<string, number> = {
  schedule:    0x7eb8f7,  // 하늘 파랑
  task:        0x7af0b4,  // 민트 초록
  finance:     0xf7c87e,  // 골드
  habit:       0xa8f07a,  // 연두
  idea:        0xe0a8f0,  // 보라
  journal:     0xf0a8c8,  // 핑크
  note:        0xb0c8f0,  // 연한 파랑
  knowledge:   0x78d8f0,  // 청록
  relation:    0xf0c8a0,  // 살구
  media:       0xa0e0f0,  // 하늘
  default:     0x9090a0,  // 중성 회색
};

interface SimNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number | null;
  fy?: number | null;
}

export function UniverseGraph({ nodes, onNodeClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const destroyedRef = useRef(false);
  const [hovered, setHovered] = useState<DataNode | null>(null);

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;
    destroyedRef.current = false;

    let animId: number;
    let app: any;

    const init = async () => {
      const PIXI = await import('pixi.js');
      if (destroyedRef.current || !containerRef.current) return;

      const el = containerRef.current;
      const W = el.clientWidth;
      const H = el.clientHeight;

      app = new PIXI.Application();
      await app.init({
        width: W, height: H,
        backgroundColor: 0x000000,  // 우주 검은 배경
        antialias: true,
        resolution: Math.min(window.devicePixelRatio, 2),
        autoDensity: true,
      });
      if (destroyedRef.current) { app.destroy(true); return; }
      el.appendChild(app.canvas);

      const stage = app.stage;
      const world = new PIXI.Container();
      stage.addChild(world);
      world.x = W / 2;
      world.y = H / 2;

      // 도메인 기반 초기 클러스터 위치
      const domains = Array.from(new Set(nodes.map(n => n.domain || 'unknown')));
      const CLUSTER_R = Math.min(W, H) * 0.30;

      // d3-force 시뮬레이션으로 초기 위치 계산
      const simNodes: SimNode[] = nodes.map((node, i) => {
        const domain = node.domain || 'unknown';
        const dIdx = domains.indexOf(domain);
        const clusterAngle = (dIdx / domains.length) * Math.PI * 2;
        return {
          id: node.id,
          x: Math.cos(clusterAngle) * CLUSTER_R + (Math.random() - 0.5) * 60,
          y: Math.sin(clusterAngle) * CLUSTER_R + (Math.random() - 0.5) * 60,
          vx: 0, vy: 0,
        };
      });

      // domain 기준 목표 좌표 (클러스터 중심 끌어당김)
      const domainTarget = new Map<string, { tx: number; ty: number }>();
      domains.forEach((dom, dIdx) => {
        const angle = (dIdx / domains.length) * Math.PI * 2;
        domainTarget.set(dom, {
          tx: Math.cos(angle) * CLUSTER_R,
          ty: Math.sin(angle) * CLUSTER_R,
        });
      });

      const simulation = forceSimulation<SimNode>(simNodes)
        .force('charge', forceManyBody<SimNode>().strength(-80).distanceMax(250))
        .force('collide', forceCollide<SimNode>(8).strength(0.8))
        .force('x', forceX<SimNode>((d) => domainTarget.get(nodes.find(n => n.id === d.id)?.domain || 'unknown')?.tx ?? 0).strength(0.08))
        .force('y', forceY<SimNode>((d) => domainTarget.get(nodes.find(n => n.id === d.id)?.domain || 'unknown')?.ty ?? 0).strength(0.08))
        .alphaDecay(0.02)
        .velocityDecay(0.4)
        .stop();

      // 초기 틱 100회 돌려 레이아웃 수렴
      for (let i = 0; i < 200; i++) simulation.tick();

      // 엣지 레이어 (아래)
      const edgeGfx = new PIXI.Graphics();
      world.addChild(edgeGfx);

      // 도메인 내 이웃 연결 엣지
      domains.forEach(domain => {
        const domNodes = nodes.filter(n => (n.domain || 'unknown') === domain);
        domNodes.forEach((node, i) => {
          if (i === 0) return;
          const prev = domNodes[i - 1];
          const a = simNodes.find(s => s.id === node.id);
          const b = simNodes.find(s => s.id === prev.id);
          if (!a || !b) return;
          edgeGfx.moveTo(a.x, a.y);
          edgeGfx.lineTo(b.x, b.y);
          edgeGfx.stroke({ color: 0xffffff, alpha: 0.06, width: 0.6 });
        });
      });

      // 노드 렌더링
      const nodeGfxMap: Map<string, any> = new Map();
      nodes.forEach(node => {
        const sim = simNodes.find(s => s.id === node.id);
        if (!sim) return;

        const color = DOMAIN_COLORS[node.domain || ''] ?? DOMAIN_COLORS.default;
        const size = 4 + Math.min((node.raw?.length ?? 0) / 50, 5);

        const gfx = new PIXI.Graphics();
        gfx.circle(0, 0, size);
        gfx.fill({ color, alpha: 1 });        // 완전 불투명 — 엣지 비침 방지
        gfx.x = sim.x;
        gfx.y = sim.y;
        gfx.eventMode = 'static';
        gfx.cursor = 'pointer';

        gfx.on('pointerover', () => {
          setHovered(node);
          gfx.clear();
          gfx.circle(0, 0, size + 2);
          gfx.fill({ color, alpha: 1 });
          // 글로우 링
          gfx.circle(0, 0, size + 5);
          gfx.stroke({ color, alpha: 0.35, width: 2 });
        });
        gfx.on('pointerout', () => {
          setHovered(null);
          gfx.clear();
          gfx.circle(0, 0, size);
          gfx.fill({ color, alpha: 1 });
        });
        gfx.on('pointertap', () => onNodeClick?.(node));

        world.addChild(gfx);
        nodeGfxMap.set(node.id, gfx);
      });

      // 패닝/줌
      let dragStart = { x: 0, y: 0 };
      let isDragging = false;
      let camX = 0, camY = 0, camTargetX = 0, camTargetY = 0;
      let zoom = 1;
      const canvas = app.canvas as HTMLCanvasElement;

      const onMouseDown = (e: MouseEvent) => {
        isDragging = true;
        dragStart.x = e.clientX - camTargetX;
        dragStart.y = e.clientY - camTargetY;
      };
      const onMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        camTargetX = e.clientX - dragStart.x;
        camTargetY = e.clientY - dragStart.y;
      };
      const onMouseUp = () => { isDragging = false; };
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        zoom = Math.max(0.2, Math.min(6, zoom * delta));
        world.scale.set(zoom);
      };

      canvas.addEventListener('mousedown', onMouseDown);
      canvas.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      canvas.addEventListener('wheel', onWheel, { passive: false });

      // 애니메이션 루프
      const animate = () => {
        if (destroyedRef.current) return;
        camX += (camTargetX - camX) * 0.1;
        camY += (camTargetY - camY) * 0.1;
        world.x = W / 2 + camX;
        world.y = H / 2 + camY;
        animId = requestAnimationFrame(animate);
      };
      animId = requestAnimationFrame(animate);

      const onResize = () => {
        if (!el || destroyedRef.current) return;
        app.renderer.resize(el.clientWidth, el.clientHeight);
      };
      window.addEventListener('resize', onResize);

      (containerRef as any)._cleanup = () => {
        simulation.stop();
        canvas.removeEventListener('mousedown', onMouseDown);
        canvas.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        canvas.removeEventListener('wheel', onWheel);
        window.removeEventListener('resize', onResize);
        cancelAnimationFrame(animId);
        app.destroy(true);
      };
    };

    init();
    return () => {
      destroyedRef.current = true;
      if ((containerRef as any)._cleanup) (containerRef as any)._cleanup();
    };
  }, [nodes, onNodeClick]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {hovered && (
        <div style={{
          position: 'absolute', bottom: 24, left: 24,
          padding: '10px 14px', borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(12px)',
          maxWidth: 280, pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {hovered.domain || 'unknown'}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>
            {(hovered.raw || '').slice(0, 100)}{(hovered.raw || '').length > 100 ? '…' : ''}
          </div>
          {hovered.created_at && (
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
              {new Date(hovered.created_at).toLocaleDateString('ko-KR')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
