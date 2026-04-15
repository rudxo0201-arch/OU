'use client';

import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Box } from '@mantine/core';

interface GraphNode {
  id: string;
  domain: string;
  raw?: string;
  importance?: number;
  graph_type?: 'planet' | 'star';
}

interface GraphLink {
  source: string;
  target: string;
  weight?: number;
}

export interface GraphViewHandle {
  addNode: (node: GraphNode) => void;
  focusNode: (nodeId: string) => void;
}

interface GraphViewProps {
  nodes: GraphNode[];
  links?: GraphLink[];
  height?: number | string;
  fullscreen?: boolean;
  onNodeSelect?: (node: GraphNode | null) => void;
  highlightNodeIds?: Set<string> | null;
}

// LOD thresholds
const LOD_HIDE_LABELS = 200;
const LOD_SIMPLIFY_DOTS = 500;
const LOD_LABEL_ZOOM_THRESHOLD = 0.8; // show labels when scale > this

export const GraphView = forwardRef<GraphViewHandle, GraphViewProps>(
  function GraphView({ nodes, links = [], height = 600, fullscreen, onNodeSelect, highlightNodeIds }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const workerRef = useRef<Worker | null>(null);
    const nodePositions = useRef<Map<string, { x: number; y: number }>>(new Map());
    const pixiRef = useRef<any>(null);
    const nodeSpritesRef = useRef<Map<string, any>>(new Map());
    const allNodesRef = useRef<GraphNode[]>(nodes);
    const viewport = useRef({ x: 0, y: 0, scale: 1 });
    const selectedNodeId = useRef<string | null>(null);
    const selectedGlowRef = useRef<any>(null);
    const highlightIdsRef = useRef<Set<string> | null>(highlightNodeIds ?? null);

    useImperativeHandle(ref, () => ({
      addNode: (node: GraphNode) => {
        allNodesRef.current = [...allNodesRef.current, node];
        workerRef.current?.postMessage({
          type: 'ADD_NODES',
          data: { nodes: [{ id: node.id, importance: node.importance ?? 1 }] },
        });
      },
      focusNode: (nodeId: string) => {
        const pos = nodePositions.current.get(nodeId);
        if (pos) {
          viewport.current.x = -pos.x * viewport.current.scale;
          viewport.current.y = -pos.y * viewport.current.scale;
        }
      },
    }));

    // Keep highlight ref in sync
    highlightIdsRef.current = highlightNodeIds ?? null;

    const handleNodeClick = useCallback((node: GraphNode) => {
      selectedNodeId.current = node.id;
      onNodeSelect?.(node);
    }, [onNodeSelect]);

    useEffect(() => {
      if (!canvasRef.current || nodes.length === 0) return;

      let animationId: number;
      let pixiApp: any;
      const nodeSprites: Map<string, { container: any; label: any; glow: any; shape: any; isStar: boolean }> = new Map();
      let edgeGraphics: any;
      let particleGraphics: any;
      let selectionGlow: any;
      let isDestroyed = false;

      // Lane 입자 초기화 (링크당 2개)
      const particles: Array<{ src: string; tgt: string; t: number; speed: number }> =
        links.flatMap(link =>
          Array.from({ length: 2 }, (_, i) => ({
            src: link.source,
            tgt: link.target,
            t: i * 0.5 + Math.random() * 0.2,
            speed: 0.003 + Math.random() * 0.002,
          }))
        );
      let PIXI: any;

      const getSize = () => ({
        w: canvasRef.current?.clientWidth || 800,
        h: fullscreen
          ? window.innerHeight
          : typeof height === 'number' ? height : canvasRef.current?.clientHeight || 600,
      });

      const initPixi = async () => {
        if (isDestroyed) return;
        PIXI = await import('pixi.js');

        const { w, h } = getSize();
        pixiApp = new PIXI.Application();
        await pixiApp.init({
          canvas: canvasRef.current!,
          width: w,
          height: h,
          background: 0x060810,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });
        if (isDestroyed) { pixiApp.destroy(true); return; }
        pixiRef.current = pixiApp;

        // Edge layer (bottom)
        edgeGraphics = new PIXI.Graphics();
        pixiApp.stage.addChild(edgeGraphics);

        // Lane 입자 레이어
        particleGraphics = new PIXI.Graphics();
        pixiApp.stage.addChild(particleGraphics);

        // Selection glow layer
        selectionGlow = new PIXI.Graphics();
        pixiApp.stage.addChild(selectionGlow);
        selectedGlowRef.current = selectionGlow;

        // Create node sprites
        const totalNodes = nodes.length;
        const simplified = totalNodes > LOD_SIMPLIFY_DOTS;

        nodes.forEach(node => {
          const sprites = createNodeSprite(PIXI, node, totalNodes, simplified);
          sprites.container.on('pointerdown', () => wrappedHandleNodeClick(node));
          pixiApp.stage.addChild(sprites.container);
          nodeSprites.set(node.id, { ...sprites, isStar: node.graph_type === 'star' });
        });
        nodeSpritesRef.current = nodeSprites as any;

        // Init physics worker
        workerRef.current = new Worker(
          new URL('@/lib/workers/graph-physics.worker.ts', import.meta.url),
          { type: 'module' }
        );

        workerRef.current.postMessage({
          type: 'INIT',
          data: {
            nodes: nodes.map(n => ({ id: n.id, importance: n.importance ?? 1 })),
            links,
          },
        });

        workerRef.current.onmessage = (e: MessageEvent) => {
          if (e.data.type === 'TICK') {
            e.data.nodes.forEach(({ id, x, y }: { id: string; x: number; y: number }) => {
              nodePositions.current.set(id, { x, y });
            });
          }
        };

        // Twinkle phase offsets for each node (for subtle animation)
        const twinklePhases = new Map<string, number>();
        nodes.forEach(n => twinklePhases.set(n.id, Math.random() * Math.PI * 2));

        // Main render loop
        let frameCount = 0;
        const render = () => {
          if (isDestroyed) return;
          animationId = requestAnimationFrame(render);
          frameCount++;

          const { w: W, h: H } = getSize();
          const cX = W / 2;
          const cY = H / 2;
          const { x: vpX, y: vpY, scale } = viewport.current;
          const totalNodes = nodes.length;
          const time = frameCount * 0.02;

          // Determine LOD
          const showLabels = totalNodes < LOD_HIDE_LABELS
            || (totalNodes < LOD_SIMPLIFY_DOTS && scale > LOD_LABEL_ZOOM_THRESHOLD);
          const showLabelsForFewNodes = totalNodes < 50;

          // ── Lane 입자 ──────────────────────────────────────
          particleGraphics.clear();
          particles.forEach(p => {
            p.t = (p.t + p.speed) % 1;
            const src = nodePositions.current.get(p.src);
            const tgt = nodePositions.current.get(p.tgt);
            if (!src || !tgt) return;
            const px = (src.x + (tgt.x - src.x) * p.t) * scale + cX + vpX;
            const py = (src.y + (tgt.y - src.y) * p.t) * scale + cY + vpY;
            const alpha = Math.sin(p.t * Math.PI) * 0.5; // 양 끝 페이드
            const size = Math.max(0.8, 1.2 * Math.min(scale, 1.5));
            particleGraphics.circle(px, py, size).fill({ color: 0xffffff, alpha });
          });

          // ── Draw edges ─────────────────────────────────────
          edgeGraphics.clear();
          links.forEach(link => {
            const src = nodePositions.current.get(link.source);
            const tgt = nodePositions.current.get(link.target);
            if (!src || !tgt) return;
            const weight = link.weight ?? 1;
            // Edge opacity: 0.2 base + weight-based up to 0.6
            const alpha = Math.min(0.2 + weight * 0.15, 0.6);
            edgeGraphics
              .moveTo(src.x * scale + cX + vpX, src.y * scale + cY + vpY)
              .lineTo(tgt.x * scale + cX + vpX, tgt.y * scale + cY + vpY)
              .stroke({ color: 0xffffff, alpha, width: Math.max(0.5, scale * 0.8) });
          });

          // Draw selection glow
          selectionGlow.clear();
          if (selectedNodeId.current) {
            const selPos = nodePositions.current.get(selectedNodeId.current);
            if (selPos) {
              const sx = selPos.x * scale + cX + vpX;
              const sy = selPos.y * scale + cY + vpY;
              const pulseRadius = 20 * scale + Math.sin(time * 2) * 4 * scale;
              selectionGlow
                .circle(sx, sy, pulseRadius)
                .fill({ color: 0xffffff, alpha: 0.08 });
              selectionGlow
                .circle(sx, sy, pulseRadius * 0.6)
                .fill({ color: 0xffffff, alpha: 0.06 });
            }
          }

          // Update node positions
          nodeSprites.forEach((sprites, id) => {
            const pos = nodePositions.current.get(id);
            if (!pos) return;
            const screenX = pos.x * scale + cX + vpX;
            const screenY = pos.y * scale + cY + vpY;

            // Frustum culling: hide nodes off screen (with margin)
            const margin = 80;
            const offScreen = screenX < -margin || screenX > W + margin
              || screenY < -margin || screenY > H + margin;
            sprites.container.visible = !offScreen;

            if (offScreen) return;

            sprites.container.position.set(screenX, screenY);
            sprites.container.scale.set(scale);

            // Star: 느리고 강한 펄스 / Planet: 잔잔한 트윙클
            const phase = twinklePhases.get(id) ?? 0;
            if (sprites.glow) {
              if (sprites.isStar) {
                const pulse = 0.5 + 0.5 * Math.sin(time * 0.8 + phase);
                sprites.glow.alpha = sprites.glow._baseAlpha * (0.6 + pulse * 0.8);
              } else {
                const twinkle = 0.8 + 0.2 * Math.sin(time + phase);
                sprites.glow.alpha = sprites.glow._baseAlpha * twinkle;
              }
            }

            // Highlight / selection / dim logic
            const isSelected = id === selectedNodeId.current;
            const isHighlighted = highlightIdsRef.current ? highlightIdsRef.current.has(id) : true;
            if (sprites.shape) {
              if (isSelected) {
                sprites.shape.alpha = 1.0;
              } else if (!isHighlighted) {
                sprites.shape.alpha = (sprites.shape._baseAlpha ?? 0.7) * 0.15;
              } else {
                sprites.shape.alpha = sprites.shape._baseAlpha ?? 0.7;
              }
            }
            if (sprites.glow) {
              if (!isHighlighted && !isSelected) {
                sprites.glow.alpha = 0;
              }
            }

            // LOD: label visibility
            if (sprites.label) {
              sprites.label.visible = showLabelsForFewNodes
                || (showLabels && scale > LOD_LABEL_ZOOM_THRESHOLD);
            }
          });
        };

        render();

        // Resize handling
        const onResize = () => {
          if (isDestroyed || !pixiApp.renderer) return;
          const { w, h } = getSize();
          pixiApp.renderer.resize(w, h);
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
      };

      const cleanupResize = initPixi();

      // Mouse events for pan + empty-area click detection
      let isDragging = false;
      let lastPos = { x: 0, y: 0 };
      let downPos = { x: 0, y: 0 };
      let nodeClickedThisFrame = false;

      const origHandleNodeClick = handleNodeClick;
      const wrappedHandleNodeClick = (node: GraphNode) => {
        nodeClickedThisFrame = true;
        origHandleNodeClick(node);
      };

      const onMouseDown = (e: MouseEvent) => {
        isDragging = true;
        lastPos = { x: e.clientX, y: e.clientY };
        downPos = { x: e.clientX, y: e.clientY };
        nodeClickedThisFrame = false;
      };
      const onMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        viewport.current.x += e.clientX - lastPos.x;
        viewport.current.y += e.clientY - lastPos.y;
        lastPos = { x: e.clientX, y: e.clientY };
      };
      const onMouseUp = (e: MouseEvent) => {
        const dx = e.clientX - downPos.x;
        const dy = e.clientY - downPos.y;
        const isClick = Math.sqrt(dx * dx + dy * dy) < 5;
        if (isClick && !nodeClickedThisFrame) {
          selectedNodeId.current = null;
          onNodeSelect?.(null);
        }
        isDragging = false;
      };
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        const rect = canvasRef.current!.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const oldScale = viewport.current.scale;
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.1, Math.min(5, oldScale * delta));

        // Zoom toward mouse position
        viewport.current.x = mouseX - (mouseX - viewport.current.x) * (newScale / oldScale);
        viewport.current.y = mouseY - (mouseY - viewport.current.y) * (newScale / oldScale);
        viewport.current.scale = newScale;
      };

      // Touch events
      let touchStartDist = 0;
      let touchStartScale = 1;
      const onTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 1) {
          isDragging = true;
          lastPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
          isDragging = false;
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          touchStartDist = Math.sqrt(dx * dx + dy * dy);
          touchStartScale = viewport.current.scale;
        }
      };
      const onTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        if (e.touches.length === 1 && isDragging) {
          viewport.current.x += e.touches[0].clientX - lastPos.x;
          viewport.current.y += e.touches[0].clientY - lastPos.y;
          lastPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          viewport.current.scale = Math.max(0.1, Math.min(5, touchStartScale * (dist / touchStartDist)));
        }
      };
      const onTouchEnd = () => { isDragging = false; };

      const canvas = canvasRef.current;
      canvas.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      canvas.addEventListener('wheel', onWheel, { passive: false });
      canvas.addEventListener('touchstart', onTouchStart, { passive: true });
      canvas.addEventListener('touchmove', onTouchMove, { passive: false });
      canvas.addEventListener('touchend', onTouchEnd);

      return () => {
        isDestroyed = true;
        cancelAnimationFrame(animationId);
        workerRef.current?.postMessage({ type: 'STOP' });
        workerRef.current?.terminate();
        pixiApp?.destroy(true);
        canvas.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        canvas.removeEventListener('wheel', onWheel);
        canvas.removeEventListener('touchstart', onTouchStart);
        canvas.removeEventListener('touchmove', onTouchMove);
        canvas.removeEventListener('touchend', onTouchEnd);
        cleanupResize?.then?.(fn => fn?.());
      };
    }, [nodes, links, height, fullscreen, handleNodeClick]);

    const resolvedHeight = fullscreen ? '100vh' : height;

    return (
      <Box style={{
        position: fullscreen ? 'absolute' : 'relative',
        inset: fullscreen ? 0 : undefined,
        borderRadius: fullscreen ? 0 : 8,
        overflow: 'hidden',
      }}>
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: resolvedHeight,
            display: 'block',
            cursor: 'grab',
          }}
        />
      </Box>
    );
  }
);

/**
 * Creates a PixiJS node sprite with glow, shape, and optional label.
 * Appearance: grayscale/white, brightness based on importance.
 * Star nodes get a star shape; planet nodes get circles.
 * When LOD_SIMPLIFY_DOTS is exceeded, render as minimal dots.
 */
function createNodeSprite(
  PIXI: any,
  node: GraphNode,
  totalNodes: number,
  simplified: boolean,
) {
  const container = new PIXI.Container();
  const importance = node.importance ?? 1;
  const isStar = node.graph_type === 'star';

  // Brightness: 0.4 (low importance) to 1.0 (high importance)
  const brightness = Math.min(0.4 + importance * 0.12, 1.0);
  const colorValue = Math.round(brightness * 255);
  const nodeColor = (colorValue << 16) | (colorValue << 8) | colorValue;

  let glow: any = null;
  let shape: any = null;
  let label: any = null;

  if (simplified) {
    // LOD: >500 nodes - just dots
    const dotRadius = isStar ? 2.5 : 1.5;
    shape = new PIXI.Graphics();
    shape.circle(0, 0, dotRadius).fill({ color: nodeColor, alpha: brightness });
    (shape as any)._baseAlpha = brightness;
    container.addChild(shape);
  } else {
    const radius = isStar ? (4 + importance * 2) * 1.8 : 4 + importance * 2;

    // Outer glow (soft halo)
    glow = new PIXI.Graphics();
    const glowRadius = radius * (isStar ? 4 : 3);
    const glowAlpha = isStar ? 0.1 : 0.05;
    glow.circle(0, 0, glowRadius).fill({ color: nodeColor, alpha: glowAlpha });
    // Second glow ring
    glow.circle(0, 0, glowRadius * 0.5).fill({ color: nodeColor, alpha: glowAlpha * 1.5 });
    (glow as any)._baseAlpha = glowAlpha;
    container.addChild(glow);

    // Core shape
    shape = new PIXI.Graphics();
    if (isStar) {
      // Five-pointed star
      const spikes = 5;
      const inner = radius * 0.45;
      for (let i = 0; i < spikes * 2; i++) {
        const angle = (i * Math.PI) / spikes - Math.PI / 2;
        const r = i % 2 === 0 ? radius : inner;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      shape.closePath().fill({ color: nodeColor, alpha: 0.9 });
      (shape as any)._baseAlpha = 0.9;
    } else {
      // Glowing circle (star-like point of light)
      const coreAlpha = 0.5 + Math.min(importance * 0.1, 0.4);
      shape.circle(0, 0, radius).fill({ color: nodeColor, alpha: coreAlpha });
      // Bright center dot
      shape.circle(0, 0, radius * 0.4).fill({ color: 0xffffff, alpha: Math.min(coreAlpha + 0.2, 1.0) });
      (shape as any)._baseAlpha = coreAlpha;
    }
    container.addChild(shape);

    // Label (node name) - only created when not too many nodes
    if (totalNodes < LOD_SIMPLIFY_DOTS && node.raw) {
      const displayText = node.raw.length > 20 ? node.raw.slice(0, 18) + '..' : node.raw;
      label = new PIXI.Text({
        text: displayText,
        style: {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: 11,
          fill: 0xffffff,
          align: 'center',
        },
      });
      label.anchor.set(0.5, 0);
      label.position.set(0, radius + 4);
      label.alpha = 0.6;
      label.visible = totalNodes < 50; // initially visible only for small graphs
      container.addChild(label);
    }
  }

  container.eventMode = 'static';
  container.cursor = 'pointer';

  return { container, label, glow, shape };
}
