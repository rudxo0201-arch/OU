# 작업 지시서 — Phase 1 Step 5: GraphView (PixiJS + Web Worker)

> 선행 조건: TASK_PHASE1_VIEWS.md 완료
> 완료 기준: /my 그래프뷰 60fps + 노드 클릭 → 상세 패널

---

## 사전 읽기

```
CLAUDE.md              "그래프뷰: 60fps 필수. 심미성 > 성능 타협 금지"
PLATFORM.md            그래프뷰 게임 요소, 노드=별, 엣지=중력
/ou-frontend/SKILL.md  섹션 6-2(GraphView 명세)
TECH.md                PixiJS + d3-force Web Worker
```

---

## 핵심 원칙

```
메인스레드: PixiJS 렌더링만 담당
Web Worker: d3-force 물리 연산 전담 → 메인스레드 블로킹 0

60fps 달성 체크리스트:
  ✓ d3-force → Web Worker
  ✓ LOD: 노드 500+ 시 원거리 단순화
  ✓ 컬링: 뷰포트 밖 노드 렌더링 제외
  ✓ 배칭: 동일 텍스처 노드 배치 처리
  ✓ RAF 기반 루프 (setInterval 금지)
```

---

## 구현 목록

```
[ ] d3-force Web Worker
[ ] PixiJS GraphView 컴포넌트
[ ] 노드 렌더링 (별 형태, importance 비례)
[ ] 엣지 렌더링 (흰색 선, opacity 가중치)
[ ] 뷰포트 패닝 + 줌
[ ] 노드 클릭 → 상세 사이드패널
[ ] 60fps 성능 검증
[ ] /my 페이지에 GraphView 통합
```

---

## Step 1. d3-force Web Worker

### `src/lib/workers/graph-physics.worker.ts`

```typescript
import * as d3 from 'd3-force';

interface Node {
  id: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  importance?: number;
}

interface Link {
  source: string;
  target: string;
  weight?: number;
}

let simulation: d3.Simulation<Node, Link> | null = null;
let nodes: Node[] = [];
let links: Link[] = [];

self.onmessage = (e: MessageEvent) => {
  const { type, data } = e.data;

  if (type === 'INIT') {
    nodes = data.nodes.map((n: Node) => ({ ...n }));
    links = data.links ?? [];

    simulation = d3.forceSimulation<Node, Link>(nodes)
      .force('link', d3.forceLink<Node, Link>(links)
        .id(d => d.id)
        .distance(80)
        .strength(0.3)
      )
      .force('charge', d3.forceManyBody().strength(-120))
      .force('center', d3.forceCenter(0, 0))
      .force('collision', d3.forceCollide<Node>().radius(d => 8 + (d.importance ?? 1) * 2))
      .alphaDecay(0.02)
      .on('tick', () => {
        // 매 tick마다 위치 전송
        self.postMessage({
          type: 'TICK',
          nodes: nodes.map(n => ({ id: n.id, x: n.x, y: n.y })),
        });
      })
      .on('end', () => {
        self.postMessage({ type: 'STABLE' });
      });
  }

  if (type === 'ADD_NODES') {
    // 새 노드 추가 (대화로 새 DataNode 생성 시)
    const newNodes = data.nodes.map((n: Node) => ({
      ...n,
      x: (Math.random() - 0.5) * 200,
      y: (Math.random() - 0.5) * 200,
    }));
    nodes = [...nodes, ...newNodes];
    simulation?.nodes(nodes).alpha(0.3).restart();
  }

  if (type === 'STOP') {
    simulation?.stop();
  }
};
```

---

## Step 2. PixiJS GraphView

### `src/components/graph/GraphView.tsx`

```typescript
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Paper, Stack, Text, ActionIcon, Badge } from '@mantine/core';
import { X } from '@phosphor-icons/react';

interface GraphNode {
  id: string;
  domain: string;
  raw?: string;
  importance?: number;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string;
  target: string;
  weight?: number;
}

interface GraphViewProps {
  nodes: GraphNode[];
  links?: GraphLink[];
  height?: number;
}

export function GraphView({ nodes, links = [], height = 600 }: GraphViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pixiRef = useRef<any>(null);
  const workerRef = useRef<Worker | null>(null);
  const nodePositions = useRef<Map<string, { x: number; y: number }>>(new Map());
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // 뷰포트 상태 (패닝 + 줌)
  const viewport = useRef({ x: 0, y: 0, scale: 1 });

  useEffect(() => {
    if (!canvasRef.current || nodes.length === 0) return;

    let animationId: number;
    let pixiApp: any;
    let nodeSprites: Map<string, any> = new Map();
    let edgeGraphics: any;

    const initPixi = async () => {
      const PIXI = await import('pixi.js');

      pixiApp = new PIXI.Application();
      await pixiApp.init({
        canvas: canvasRef.current!,
        width: canvasRef.current!.clientWidth,
        height,
        backgroundColor: 0x060810,  // 우주 배경 (globals.css와 일치)
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
      pixiRef.current = pixiApp;

      // 엣지 레이어 (노드 뒤에)
      edgeGraphics = new PIXI.Graphics();
      pixiApp.stage.addChild(edgeGraphics);

      // 노드 스프라이트 생성
      nodes.forEach(node => {
        const container = new PIXI.Container();
        const importance = node.importance ?? 1;
        const radius = 4 + importance * 2;

        // 별 모양 (중요도에 따라 크기/밝기)
        const circle = new PIXI.Graphics();
        circle.beginFill(0xffffff, 0.6 + importance * 0.1);
        circle.drawCircle(0, 0, radius);
        circle.endFill();

        // 글로우 효과
        const glow = new PIXI.Graphics();
        glow.beginFill(0xffffff, 0.05);
        glow.drawCircle(0, 0, radius * 3);
        glow.endFill();

        container.addChild(glow);
        container.addChild(circle);
        container.interactive = true;
        container.cursor = 'pointer';
        container.on('pointerdown', () => setSelectedNode(node));

        pixiApp.stage.addChild(container);
        nodeSprites.set(node.id, container);
      });

      // Web Worker 초기화
      workerRef.current = new Worker(
        new URL('@/lib/workers/graph-physics.worker.ts', import.meta.url),
        { type: 'module' }
      );

      workerRef.current.postMessage({
        type: 'INIT',
        data: {
          nodes: nodes.map(n => ({
            id: n.id,
            importance: n.importance ?? 1,
          })),
          links,
        },
      });

      // Worker에서 위치 업데이트 수신
      workerRef.current.onmessage = (e: MessageEvent) => {
        if (e.data.type === 'TICK') {
          e.data.nodes.forEach(({ id, x, y }: { id: string; x: number; y: number }) => {
            nodePositions.current.set(id, { x, y });
          });
        }
      };

      // PixiJS 렌더 루프 (60fps RAF)
      const W = canvasRef.current!.clientWidth / 2;
      const H = height / 2;

      const render = () => {
        animationId = requestAnimationFrame(render);

        const { x: vpX, y: vpY, scale } = viewport.current;

        // 엣지 그리기
        edgeGraphics.clear();
        links.forEach(link => {
          const src = nodePositions.current.get(link.source);
          const tgt = nodePositions.current.get(link.target);
          if (!src || !tgt) return;

          const weight = link.weight ?? 1;
          edgeGraphics.lineStyle(0.5, 0xffffff, 0.1 + weight * 0.2);
          edgeGraphics.moveTo(src.x * scale + W + vpX, src.y * scale + H + vpY);
          edgeGraphics.lineTo(tgt.x * scale + W + vpX, tgt.y * scale + H + vpY);
        });

        // 노드 위치 업데이트
        nodeSprites.forEach((sprite, id) => {
          const pos = nodePositions.current.get(id);
          if (!pos) return;

          const screenX = pos.x * scale + W + vpX;
          const screenY = pos.y * scale + H + vpY;

          // LOD: 줌 아웃 시 원거리 노드 단순화
          sprite.visible = true;
          if (scale < 0.5 && Math.abs(pos.x) > 300) {
            sprite.visible = false;  // 컬링
          }

          sprite.position.set(screenX, screenY);
          sprite.scale.set(scale);
        });
      };

      render();
    };

    initPixi();

    // 패닝 이벤트
    let isDragging = false;
    let lastPos = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      lastPos = { x: e.clientX, y: e.clientY };
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      viewport.current.x += e.clientX - lastPos.x;
      viewport.current.y += e.clientY - lastPos.y;
      lastPos = { x: e.clientX, y: e.clientY };
    };
    const onMouseUp = () => { isDragging = false; };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      viewport.current.scale = Math.max(0.2, Math.min(3, viewport.current.scale * delta));
    };

    canvasRef.current.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvasRef.current.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(animationId);
      workerRef.current?.postMessage({ type: 'STOP' });
      workerRef.current?.terminate();
      pixiApp?.destroy(true);
      canvasRef.current?.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [nodes, links, height]);

  return (
    <Box style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height, display: 'block', cursor: 'grab' }}
      />

      {/* 노드 상세 패널 */}
      {selectedNode && (
        <Paper
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 280,
            maxHeight: 400,
            overflow: 'auto',
          }}
          p="md"
        >
          <Stack gap="sm">
            <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Badge variant="light" color="gray" size="sm">
                {selectedNode.domain}
              </Badge>
              <ActionIcon
                size="sm"
                variant="subtle"
                color="gray"
                onClick={() => setSelectedNode(null)}
              >
                <X size={14} />
              </ActionIcon>
            </Box>
            <Text fz="sm" style={{ wordBreak: 'break-word' }}>
              {selectedNode.raw ?? '(내용 없음)'}
            </Text>
          </Stack>
        </Paper>
      )}
    </Box>
  );
}
```

---

## Step 3. /my 페이지에 GraphView 통합

`src/app/(private)/my/MyPageClient.tsx` 상단에 GraphView 추가:

```typescript
// MyPageClient.tsx에 추가
import { GraphView } from '@/components/graph/GraphView';

// JSX 내 추가 (뷰 목록 위)
<Stack gap="sm">
  <Text fw={600} fz="sm">내 우주 그래프</Text>
  <GraphView
    nodes={nodes}
    links={[]}  // Phase 2에서 node_relations 기반 엣지 추가
    height={400}
  />
</Stack>
```

---

## Step 4. 성능 검증

```bash
# Chrome DevTools → Performance 탭
# 1. /my 페이지 열기
# 2. Record 시작
# 3. 그래프 패닝 + 줌
# 4. Record 중단
# 5. Frames 확인 → 60fps 유지 여부
#
# 기준:
#   Frame time < 16.7ms → ✅
#   Frame time > 16.7ms → 최적화 필요
#
# 최적화 체크:
#   - Worker postMessage 빈도 조절 (매 tick 대신 requestAnimationFrame과 동기화)
#   - 불필요한 Graphics.clear() 최소화
#   - 노드 100개 이하: 전체 렌더
#   - 노드 100~500: LOD 적용
#   - 노드 500+: 클러스터링 + 중요 노드만 렌더
```

---

## 완료 체크리스트

```
[ ] PixiJS 앱 초기화 (배경 #060810)
[ ] 노드 별 형태 렌더링 (importance 비례 크기)
[ ] 엣지 렌더링 (흰색, opacity 가중치)
[ ] d3-force Web Worker 물리 연산
[ ] 패닝 (마우스 드래그)
[ ] 줌 (마우스 휠)
[ ] 노드 클릭 → 상세 패널
[ ] 상세 패널 닫기
[ ] /my 페이지에 GraphView 통합
[ ] 60fps 달성 확인 (Chrome DevTools)
[ ] pnpm build 통과
[ ] git commit: "feat: PixiJS GraphView 60fps (Web Worker 물리 엔진)"
```

---

## 다음 작업

**TASK_PHASE1_ACCURACY.md** → 정확도 높이기 (/accuracy)
