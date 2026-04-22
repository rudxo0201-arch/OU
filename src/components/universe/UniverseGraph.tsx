'use client';

import { useEffect, useRef, useState } from 'react';

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

const DOMAIN_COLORS: Record<string, number> = {
  schedule: 0x555566,
  task: 0x446655,
  finance: 0x665544,
  habit: 0x556644,
  idea: 0x665566,
  note: 0x555555,
  knowledge: 0x444466,
  relation: 0x664455,
  media: 0x446666,
  default: 0x444444,
};

export function UniverseGraph({ nodes, onNodeClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const destroyedRef = useRef(false);
  const [hovered, setHovered] = useState<DataNode | null>(null);
  const hoveredRef = useRef<DataNode | null>(null);
  hoveredRef.current = hovered;

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;
    destroyedRef.current = false;

    let animId: number;
    let app: any;
    let viewport: any;

    const init = async () => {
      const PIXI = await import('pixi.js');
      if (destroyedRef.current || !containerRef.current) return;

      const el = containerRef.current;
      const W = el.clientWidth;
      const H = el.clientHeight;

      app = new PIXI.Application();
      await app.init({
        width: W, height: H,
        backgroundColor: 0xe4e4ea,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio, 2),
        autoDensity: true,
      });
      if (destroyedRef.current) { app.destroy(true); return; }
      el.appendChild(app.canvas);

      // 간단한 줌/팬 (마우스 드래그)
      let dragStart = { x: 0, y: 0 };
      let isDragging = false;
      let camX = 0, camY = 0;
      let camTargetX = 0, camTargetY = 0;
      let zoom = 1;

      const stage = app.stage;
      const world = new PIXI.Container();
      stage.addChild(world);
      world.x = W / 2;
      world.y = H / 2;

      // 노드 레이아웃 — 도메인별 원형 클러스터
      const domains = Array.from(new Set(nodes.map(n => n.domain || 'unknown')));
      const positions: Map<string, { x: number; y: number }> = new Map();
      const CLUSTER_R = Math.min(W, H) * 0.28;

      nodes.forEach((node, i) => {
        const domain = node.domain || 'unknown';
        const dIdx = domains.indexOf(domain);
        const clusterAngle = (dIdx / domains.length) * Math.PI * 2;
        const clusterCX = Math.cos(clusterAngle) * CLUSTER_R;
        const clusterCY = Math.sin(clusterAngle) * CLUSTER_R;
        const domainNodes = nodes.filter(n => (n.domain || 'unknown') === domain);
        const idx = domainNodes.indexOf(node);
        const spread = Math.min(CLUSTER_R * 0.4, 80);
        const angle = (idx / domainNodes.length) * Math.PI * 2 + Math.random() * 0.3;
        const r = Math.random() * spread;
        positions.set(node.id, {
          x: clusterCX + Math.cos(angle) * r,
          y: clusterCY + Math.sin(angle) * r,
        });
      });

      // 엣지 레이어 (도메인 내 이웃 노드 연결)
      const edgeGfx = new PIXI.Graphics();
      world.addChild(edgeGfx);

      // 노드 렌더링
      const nodeSprites: Map<string, { gfx: any; node: DataNode; px: number; py: number }> = new Map();
      nodes.forEach(node => {
        const pos = positions.get(node.id);
        if (!pos) return;

        const gfx = new PIXI.Graphics();
        const color = DOMAIN_COLORS[node.domain || ''] || DOMAIN_COLORS.default;
        const size = 4 + Math.min((node.raw?.length || 0) / 40, 4);

        gfx.circle(0, 0, size);
        gfx.fill({ color, alpha: 0.75 });
        gfx.x = pos.x;
        gfx.y = pos.y;
        gfx.eventMode = 'static';
        gfx.cursor = 'pointer';

        gfx.on('pointerover', () => {
          setHovered(node);
          gfx.clear();
          gfx.circle(0, 0, size + 2);
          gfx.fill({ color, alpha: 1 });
        });
        gfx.on('pointerout', () => {
          setHovered(null);
          gfx.clear();
          gfx.circle(0, 0, size);
          gfx.fill({ color, alpha: 0.75 });
        });
        gfx.on('pointertap', () => {
          if (onNodeClick) onNodeClick(node);
        });

        world.addChild(gfx);
        nodeSprites.set(node.id, { gfx, node, px: pos.x, py: pos.y });
      });

      // 도메인 내 연결 엣지 (가까운 이웃 2개씩)
      domains.forEach(domain => {
        const domNodes = nodes.filter(n => (n.domain || 'unknown') === domain);
        domNodes.forEach((node, i) => {
          if (i === 0) return;
          const prev = domNodes[i - 1];
          const posA = positions.get(node.id);
          const posB = positions.get(prev.id);
          if (!posA || !posB) return;
          edgeGfx.moveTo(posA.x, posA.y);
          edgeGfx.lineTo(posB.x, posB.y);
          edgeGfx.stroke({ color: 0x444444, alpha: 0.06, width: 0.8 });
        });
      });

      // 마우스 이벤트 (팬)
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
        zoom = Math.max(0.3, Math.min(4, zoom * delta));
        world.scale.set(zoom);
      };

      canvas.addEventListener('mousedown', onMouseDown);
      canvas.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      canvas.addEventListener('wheel', onWheel, { passive: false });

      // 애니메이션 루프 (부드러운 팬 이동)
      const animate = () => {
        if (destroyedRef.current) return;
        camX += (camTargetX - camX) * 0.1;
        camY += (camTargetY - camY) * 0.1;
        world.x = W / 2 + camX;
        world.y = H / 2 + camY;
        animId = requestAnimationFrame(animate);
      };
      animId = requestAnimationFrame(animate);

      // 리사이즈
      const onResize = () => {
        if (!el || destroyedRef.current) return;
        app.renderer.resize(el.clientWidth, el.clientHeight);
      };
      window.addEventListener('resize', onResize);

      (containerRef as any)._cleanup = () => {
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

      {/* 호버 툴팁 */}
      {hovered && (
        <div style={{
          position: 'absolute', bottom: 24, left: 24,
          padding: '10px 14px', borderRadius: 10,
          border: '1px solid var(--ou-glass-border)',
          background: 'rgba(255,255,255,0.96)',
          boxShadow: 'var(--ou-shadow-md)',
          maxWidth: 280, pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 10, color: 'var(--ou-text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {hovered.domain || 'unknown'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ou-text-body)', lineHeight: 1.5 }}>
            {(hovered.raw || '').slice(0, 100)}{(hovered.raw || '').length > 100 ? '...' : ''}
          </div>
          {hovered.created_at && (
            <div style={{ fontSize: 10, color: 'var(--ou-text-disabled)', marginTop: 6 }}>
              {new Date(hovered.created_at).toLocaleDateString('ko-KR')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
