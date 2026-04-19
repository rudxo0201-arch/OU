'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// ─── Types ───────────────────────────────────────────────────────────
interface GraphNode {
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

interface GraphEdge {
  source: string;
  target: string;
  relationType: string;
  weight: number;
}

interface Props {
  visible: boolean;
}

// ─── Shaders ─────────────────────────────────────────────────────────
const NODE_VERTEX = /* glsl */ `
  uniform float uSizeMult;
  uniform float uSelectedNode;
  uniform float uFlatten;
  uniform float uSpread;

  attribute float baseSize;
  attribute float aNodeId;
  attribute float aHighlight;
  attribute float aDomainBright;
  attribute vec3 aPos;

  varying float vIsSelected;
  varying float vHighlight;
  varying float vBright;

  void main() {
    vec3 finalPos = aPos * uSpread;
    finalPos.z *= (1.0 - uFlatten);
    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);

    vIsSelected = abs(aNodeId - uSelectedNode) < 0.5 ? 1.0 : 0.0;
    vHighlight = aHighlight;
    vBright = aDomainBright;

    float finalSize;
    if (vIsSelected > 0.5) finalSize = baseSize * uSizeMult * 2.5;
    else if (vHighlight > 1.5) finalSize = baseSize * uSizeMult * 1.5;
    else finalSize = baseSize * uSizeMult * 1.0;

    float refDist = mix(-mvPosition.z, 2500.0, uFlatten);
    gl_PointSize = finalSize * (1000.0 / refDist);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const NODE_FRAGMENT = /* glsl */ `
  varying float vIsSelected;
  varying float vHighlight;
  varying float vBright;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.1, d);
    vec3 baseColor = vec3(vBright);
    vec3 color = mix(baseColor, vec3(1.0, 1.0, 1.0), vIsSelected);
    if (vHighlight == 1.0) { alpha *= 0.12; }
    else if (vHighlight == 2.0) { color = vec3(1.0); alpha = min(1.0, alpha * 2.0); }
    gl_FragColor = vec4(color, alpha + vIsSelected * 0.4);
  }
`;

const EDGE_VERTEX = /* glsl */ `
  uniform float uFlatten;
  uniform float uSpread;
  attribute vec3 aPos;
  attribute float aHighlight;
  attribute float aEdgeBright;
  varying float vHighlight;
  varying float vEdgeBright;
  void main() {
    vec3 finalPos = aPos * uSpread;
    finalPos.z *= (1.0 - uFlatten);
    vHighlight = aHighlight;
    vEdgeBright = aEdgeBright;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
  }
`;

const EDGE_FRAGMENT = /* glsl */ `
  uniform float uOpacity;
  varying float vHighlight;
  varying float vEdgeBright;
  void main() {
    float alpha = uOpacity * vEdgeBright;
    vec3 color = vec3(vEdgeBright);
    if (vHighlight == 1.0) { alpha *= 0.08; }
    else if (vHighlight == 2.0) { alpha = min(1.0, uOpacity * 6.0 + 0.3); color = vec3(0.9, 0.9, 0.9); }
    gl_FragColor = vec4(color, alpha);
  }
`;

// ─── Topology ────────────────────────────────────────────────────────
interface Topology {
  nNodes: number;
  positions: Float32Array;   // [x,y,z] per node — current (mutated by physics/drag)
  positions3D: Float32Array; // [x,y,z] per node — 3D backup for restoration
  nodeAdjacency: number[][];
  nodeEdges: number[][];
  nodeLabels: string[];
  nodeDomains: string[];
  nodeIds: string[];         // real DB ids
  nodeConfidences: string[];
  nodeVelocities: Float32Array;
  activeNodes: Set<number>;
  edgeNodeMap: Int32Array;
}

// ─── Domain brightness map (greyscale only, per CLAUDE.md) ──────────
const DOMAIN_BRIGHTNESS: Record<string, number> = {
  schedule: 1.0,
  emotion: 0.95,
  idea: 0.9,
  task: 0.85,
  education: 0.8,
  knowledge: 0.75,
  development: 0.7,
  habit: 0.65,
  finance: 0.6,
  media: 0.55,
  health: 0.5,
};
const DEFAULT_BRIGHTNESS = 0.7;

// ─── Edge relation visual weight ────────────────────────────────────
const EDGE_WEIGHT: Record<string, { bright: number; thick: number }> = {
  is_a: { bright: 0.9, thick: 2.0 },
  part_of: { bright: 0.85, thick: 1.8 },
  causes: { bright: 0.7, thick: 1.4 },
  requires: { bright: 0.7, thick: 1.4 },
  derived_from: { bright: 0.65, thick: 1.2 },
  involves: { bright: 0.6, thick: 1.0 },
  example_of: { bright: 0.6, thick: 1.0 },
  located_at: { bright: 0.55, thick: 1.0 },
  occurs_at: { bright: 0.55, thick: 1.0 },
  opposite_of: { bright: 0.5, thick: 0.8 },
  related_to: { bright: 0.4, thick: 0.6 },
};
const DEFAULT_EDGE_WEIGHT = { bright: 0.4, thick: 0.6 };

// ─── Build topology from real data ───────────────────────────────────
function buildFromRealData(
  nodes: GraphNode[],
  edges: GraphEdge[],
): { topology: Topology; edgeIndices: number[]; edgeRelTypes: string[] } {
  const nNodes = nodes.length;
  const idToIdx = new Map<string, number>();
  nodes.forEach((n, i) => idToIdx.set(n.id, i));

  // Build adjacency from real edges
  const adjacency: number[][] = Array.from({ length: nNodes }, () => []);
  const edgeIndices: number[] = [];
  const edgeRelTypes: string[] = [];
  const nodeEdgesList: number[][] = Array.from({ length: nNodes }, () => []);

  let edgeIdx = 0;
  for (const e of edges) {
    const si = idToIdx.get(e.source);
    const ti = idToIdx.get(e.target);
    if (si === undefined || ti === undefined || si === ti) continue;
    adjacency[si].push(ti);
    adjacency[ti].push(si);
    edgeIndices.push(si, ti);
    edgeRelTypes.push(e.relationType);
    nodeEdgesList[si].push(edgeIdx);
    nodeEdgesList[ti].push(edgeIdx);
    edgeIdx++;
  }

  // Compute degree for each node
  const degrees = adjacency.map(a => a.length);

  // Find hubs: top 5% by degree, but only nodes with degree >= 2
  const sorted = degrees.map((d, i) => ({ d, i })).sort((a, b) => b.d - a.d);
  const numHubs = Math.max(5, Math.floor(nNodes * 0.05));
  const hubSet = new Set<number>();
  for (let i = 0; i < Math.min(numHubs, sorted.length); i++) {
    if (sorted[i].d >= 2) hubSet.add(sorted[i].i);
  }
  // Ensure at least 1 hub exists
  if (hubSet.size === 0 && sorted.length > 0) hubSet.add(sorted[0].i);

  // Position hubs spherically
  const positions = new Float32Array(nNodes * 3);
  const hubArray = Array.from(hubSet);
  const SPHERE_R = 600;

  for (let i = 0; i < hubArray.length; i++) {
    const phi = Math.acos(1 - 2 * (i + 0.5) / hubArray.length);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i; // golden angle
    const hi = hubArray[i];
    positions[hi * 3] = SPHERE_R * Math.sin(phi) * Math.cos(theta);
    positions[hi * 3 + 1] = SPHERE_R * Math.sin(phi) * Math.sin(theta);
    positions[hi * 3 + 2] = SPHERE_R * Math.cos(phi);
  }

  // Assign non-hub nodes to their most-connected hub neighbor
  for (let i = 0; i < nNodes; i++) {
    if (hubSet.has(i)) continue;

    // Find closest hub via adjacency
    let bestHub = hubArray[0]; // fallback
    let bestDeg = -1;
    for (const nb of adjacency[i]) {
      if (hubSet.has(nb) && degrees[nb] > bestDeg) {
        bestDeg = degrees[nb];
        bestHub = nb;
      }
    }
    // If no hub neighbor, pick random hub
    if (bestDeg === -1) {
      bestHub = hubArray[Math.floor(Math.random() * hubArray.length)];
    }

    // Position near hub with random offset
    const dist = 50 + Math.random() * 200;
    const lPhi = Math.acos(2 * Math.random() - 1);
    const lTheta = Math.random() * 2 * Math.PI;
    positions[i * 3] = positions[bestHub * 3] + dist * Math.sin(lPhi) * Math.cos(lTheta);
    positions[i * 3 + 1] = positions[bestHub * 3 + 1] + dist * Math.sin(lPhi) * Math.sin(lTheta);
    positions[i * 3 + 2] = positions[bestHub * 3 + 2] + dist * Math.cos(lPhi);
  }

  return {
    topology: {
      nNodes,
      positions,
      positions3D: new Float32Array(positions), // backup copy
      nodeAdjacency: adjacency,
      nodeEdges: nodeEdgesList,
      nodeLabels: nodes.map(n => n.label),
      nodeDomains: nodes.map(n => n.domain),
      nodeIds: nodes.map(n => n.id),
      nodeConfidences: nodes.map(n => n.confidence),
      nodeVelocities: new Float32Array(nNodes * 3),
      activeNodes: new Set(),
      edgeNodeMap: new Int32Array(edgeIndices),
    },
    edgeIndices,
    edgeRelTypes,
  };
}

// ─── Component ───────────────────────────────────────────────────────
export function UniverseView({ visible }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    composer: EffectComposer;
    pointsMesh: THREE.Points | null;
    linesMesh: THREE.LineSegments | null;
    topology: Topology;
    uniforms: Record<string, THREE.IUniform>;
    targetUniforms: Record<string, number>;
    selectedNodeId: number;
    hoveredNodeId: number;
    dragNodeId: number;
    dragPlane: THREE.Plane;
    dragOffset: THREE.Vector3;
    worker: unknown;
    restoring3D: boolean;
    graphNodes: GraphNode[];
    graphEdges: GraphEdge[];
    raf: number;
  } | null>(null);

  const [controlValues, setControlValues] = useState({
    size: 0.8,
    gravity: 1.0,
    repel: 1.0,
    linkForce: 0.3,
    linkDistance: 80,
    opacity: 0.05,
  });

  const [mode, setMode] = useState<'orbit' | 'pan'>('orbit');
  const [dimension, setDimension] = useState<'3D' | '2D'>('3D');
  const [zoomLevel, setZoomLevel] = useState<'macro' | 'micro' | 'local'>('macro');
  const [selectedCard, setSelectedCard] = useState<{
    id: number;
    title: string;
    domain: string;
    tag: string;
    realId: string;
    degree: number;
    confidence: string;
    raw: string | null;
    sections: { id: string; heading: string; sentences: { id: string; text: string }[] }[] | null;
    triples: { id: string; subject: string; predicate: string; object: string; confidence: string }[] | null;
    relations: { id: string; raw?: string; domain: string; predicate?: string }[] | null;
  } | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<{ idx: number; label: string }[]>([]);
  const [visibleLabels, setVisibleLabels] = useState<{ x: number; y: number; label: string }[]>([]);
  const [allDomains, setAllDomains] = useState<string[]>([]);
  const [domainFilter, setDomainFilter] = useState<Set<string>>(new Set());
  const [confidenceFilter, setConfidenceFilter] = useState<Set<string>>(new Set(['high', 'medium', 'low']));
  const [dateFilter, setDateFilter] = useState<'all' | '1d' | '1w' | '1m'>('all');

  const ZOOM_THRESHOLD = 1600;

  // Initialize scene + fetch data
  useEffect(() => {
    if (!visible || !containerRef.current) return;

    const container = containerRef.current;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060810, 0.00035);

    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 1, 15000);
    camera.position.z = 2500;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.zoomSpeed = 1.8;

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight), 0.7, 0.4, 0.85
    ));

    const uniforms: Record<string, THREE.IUniform> = {
      uSizeMult: { value: controlValues.size },
      uOpacity: { value: controlValues.opacity },
      uSelectedNode: { value: -1.0 },
      uFlatten: { value: 0.0 },
      uSpread: { value: 1.0 },
    };

    const targetUniforms: Record<string, number> = {
      size: controlValues.size,
      opacity: controlValues.opacity,
      flatten: 0.0,
      spread: 1.0,
    };

    const emptyTopo: Topology = {
      nNodes: 0, positions: new Float32Array(0), positions3D: new Float32Array(0),
      nodeAdjacency: [], nodeEdges: [], nodeLabels: [], nodeDomains: [], nodeIds: [], nodeConfidences: [],
      nodeVelocities: new Float32Array(0), activeNodes: new Set(), edgeNodeMap: new Int32Array(0),
    };

    const state = {
      renderer, scene, camera, controls, composer,
      pointsMesh: null as THREE.Points | null,
      linesMesh: null as THREE.LineSegments | null,
      topology: emptyTopo, uniforms, targetUniforms,
      selectedNodeId: -1, hoveredNodeId: -1, dragNodeId: -1,
      dragPlane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
      dragOffset: new THREE.Vector3(),
      worker: null, restoring3D: false,
      graphNodes: [], graphEdges: [],
      raf: 0,
    };
    sceneRef.current = state;

    // Fetch real data
    fetch('/api/graph')
      .then(res => { if (!res.ok) throw new Error('API error'); return res.json(); })
      .then(data => {
        if (!data.nodes || data.nodes.length === 0) { setStatus('empty'); return; }
        state.graphNodes = data.nodes;
        state.graphEdges = data.edges ?? [];
        buildMeshes(state, data.nodes, data.edges ?? []);
        // Initialize domain filter with all present domains
        const domainArr = Array.from(new Set(data.nodes.map((n: GraphNode) => n.domain))).sort() as string[];
        setAllDomains(domainArr);
        setDomainFilter(new Set(domainArr));
        setStatus('ready');
        // Build initial projection cache
        rebuildProjCache(state);
      })
      .catch(() => setStatus('error'));

    // Refetch on window focus (user may have added data in another tab/chat)
    const onFocus = () => {
      fetch('/api/graph')
        .then(res => { if (!res.ok) throw new Error(); return res.json(); })
        .then(data => {
          if (!data.nodes || data.nodes.length === 0) return;
          // Only rebuild if node count changed
          if (data.nodes.length !== state.graphNodes.length) {
            state.graphNodes = data.nodes;
            state.graphEdges = data.edges ?? [];
            // Remove old meshes
            if (state.pointsMesh) { state.pointsMesh.geometry.dispose(); (state.pointsMesh.material as THREE.Material).dispose(); state.scene.remove(state.pointsMesh); }
            if (state.linesMesh) { state.linesMesh.geometry.dispose(); (state.linesMesh.material as THREE.Material).dispose(); state.scene.remove(state.linesMesh); }
            buildMeshes(state, data.nodes, data.edges ?? []);
            rebuildProjCache(state);
            setStatus('ready');
          }
        })
        .catch(() => {});
    };
    window.addEventListener('focus', onFocus);

    // Resize
    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
      composer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // Interaction
    let clickStartX = 0, clickStartY = 0, didDrag = false;
    const raycaster = new THREE.Raycaster();
    const mouseNDC = new THREE.Vector2();

    function getMouseNDC(e: PointerEvent) {
      const rect = container.getBoundingClientRect();
      mouseNDC.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    }

    function updateNodePos(nodeId: number, worldPos: THREE.Vector3) {
      const topo = state.topology;
      topo.positions[nodeId * 3] = worldPos.x;
      topo.positions[nodeId * 3 + 1] = worldPos.y;
      topo.positions[nodeId * 3 + 2] = worldPos.z;
      topo.activeNodes.add(nodeId);
      const nbs = topo.nodeAdjacency[nodeId];
      for (let i = 0; i < nbs.length; i++) topo.activeNodes.add(nbs[i]);

      if (state.pointsMesh) {
        const attr = state.pointsMesh.geometry.attributes.aPos as THREE.BufferAttribute;
        attr.setXYZ(nodeId, worldPos.x, worldPos.y, worldPos.z);
        attr.needsUpdate = true;
      }
      if (state.linesMesh) {
        const edgeAttr = state.linesMesh.geometry.attributes.aPos as THREE.BufferAttribute;
        const map = topo.edgeNodeMap;
        const nodeEdgeList = topo.nodeEdges[nodeId];
        for (let ei = 0; ei < nodeEdgeList.length; ei++) {
          const idx = nodeEdgeList[ei];
          const n1 = map[idx * 2], n2 = map[idx * 2 + 1];
          edgeAttr.setXYZ(idx * 2, topo.positions[n1 * 3], topo.positions[n1 * 3 + 1], topo.positions[n1 * 3 + 2]);
          edgeAttr.setXYZ(idx * 2 + 1, topo.positions[n2 * 3], topo.positions[n2 * 3 + 1], topo.positions[n2 * 3 + 2]);
        }
        edgeAttr.needsUpdate = true;
      }
    }

    const onPointerDown = (e: PointerEvent) => {
      clickStartX = e.clientX; clickStartY = e.clientY; didDrag = false;
      const hitId = getRaycastedNodeId(e.clientX, e.clientY, state, container);
      if (hitId !== -1) {
        e.stopPropagation();
        state.dragNodeId = hitId;
        controls.enabled = false;
        renderer.domElement.style.cursor = 'grabbing';
        const pos = new THREE.Vector3(state.topology.positions[hitId * 3], state.topology.positions[hitId * 3 + 1], state.topology.positions[hitId * 3 + 2]);
        const camDir = new THREE.Vector3(); camera.getWorldDirection(camDir);
        state.dragPlane.setFromNormalAndCoplanarPoint(camDir, pos);
        getMouseNDC(e); raycaster.setFromCamera(mouseNDC, camera);
        const inter = new THREE.Vector3();
        raycaster.ray.intersectPlane(state.dragPlane, inter);
        if (inter) state.dragOffset.copy(pos).sub(inter);
        // Notify worker
        if (state.worker) (state.worker as any).postMessage({ type: 'DRAG_START', data: { id: state.topology.nodeIds[hitId] } });
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const wasDragging = state.dragNodeId !== -1;
      if (wasDragging && state.worker) (state.worker as Worker).postMessage({ type: 'DRAG_END', data: { id: state.topology.nodeIds[state.dragNodeId] } });
      state.dragNodeId = -1; controls.enabled = true;
      if (wasDragging && didDrag) { renderer.domElement.style.cursor = 'pointer'; return; }
      if (Math.hypot(e.clientX - clickStartX, e.clientY - clickStartY) > 5) return;
      if (camera.position.distanceTo(controls.target) > ZOOM_THRESHOLD) return;
      const closestId = getRaycastedNodeId(e.clientX, e.clientY, state, container);
      if (state.selectedNodeId !== -1) {
        const neighbors = state.topology.nodeAdjacency[state.selectedNodeId];
        const valid = closestId === state.selectedNodeId || (closestId !== -1 && neighbors.includes(closestId));
        if (valid && closestId !== state.selectedNodeId) { state.selectedNodeId = closestId; applyHL(state, closestId); showCard(state, closestId); }
        else if (!valid) exitLocal(state);
      } else if (closestId !== -1) { state.selectedNodeId = closestId; applyHL(state, closestId); showCard(state, closestId); }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (state.dragNodeId !== -1) {
        e.stopPropagation(); didDrag = true;
        getMouseNDC(e); raycaster.setFromCamera(mouseNDC, camera);
        const inter = new THREE.Vector3();
        raycaster.ray.intersectPlane(state.dragPlane, inter);
        if (inter) {
          inter.add(state.dragOffset);
          updateNodePos(state.dragNodeId, inter);
          if (state.worker) (state.worker as Worker).postMessage({ type: 'DRAG_MOVE', data: { id: state.topology.nodeIds[state.dragNodeId], x: inter.x, y: inter.y } });
        }
        return;
      }
      const zoom = camera.position.distanceTo(controls.target);
      if (zoom > ZOOM_THRESHOLD) { renderer.domElement.style.cursor = 'grab'; return; }
      const closestId = getRaycastedNodeId(e.clientX, e.clientY, state, container);
      if (state.selectedNodeId !== -1) {
        const nb = state.topology.nodeAdjacency[state.selectedNodeId];
        renderer.domElement.style.cursor = (closestId === state.selectedNodeId || (closestId !== -1 && nb.includes(closestId))) ? 'pointer' : 'grab';
      } else {
        if (closestId !== state.hoveredNodeId) { state.hoveredNodeId = closestId; applyHL(state, closestId); renderer.domElement.style.cursor = closestId !== -1 ? 'pointer' : 'grab'; }
      }
    };

    container.addEventListener('pointerdown', onPointerDown, { capture: true });
    container.addEventListener('pointerup', onPointerUp, { capture: true });
    container.addEventListener('pointermove', onPointerMove, { capture: true });

    // Keyboard shortcuts
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in search input
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

      if (e.key === 'Escape') {
        if (state.selectedNodeId !== -1) exitLocal(state);
        setSearchOpen(false);
        setSearchQuery('');
      }
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'r' && !e.metaKey && !e.ctrlKey) {
        // Reset camera
        camera.position.set(0, 0, 2500);
        controls.target.set(0, 0, 0);
      }
    };
    window.addEventListener('keydown', onKeyDown);

    // Animation loop
    let frameCount = 0;
    let prevZoomLevel: 'macro' | 'micro' | 'local' = 'macro';
    const animate = () => {
      state.raf = requestAnimationFrame(animate);
      controls.update();
      // Rebuild projection cache every 5 frames for fast raycasting
      if (++frameCount % 5 === 0 && state.topology.nNodes > 0) rebuildProjCache(state);
      state.uniforms.uSizeMult.value += (state.targetUniforms.size - state.uniforms.uSizeMult.value) * 0.15;
      state.uniforms.uOpacity.value += (state.targetUniforms.opacity - state.uniforms.uOpacity.value) * 0.15;
      state.uniforms.uSpread.value += (state.targetUniforms.spread - state.uniforms.uSpread.value) * 0.08;
      state.uniforms.uFlatten.value += (state.targetUniforms.flatten - state.uniforms.uFlatten.value) * 0.08;

      if (state.targetUniforms.flatten > 0.5) {
        const cam = camera.position;
        const dist = cam.distanceTo(controls.target);
        cam.lerp(new THREE.Vector3(controls.target.x, controls.target.y, dist), 0.08);
        camera.up.lerp(new THREE.Vector3(0, 1, 0), 0.08);
      }

      stepPhysics(state);

      // 3D position restoration morph
      if (state.restoring3D && state.pointsMesh && state.linesMesh) {
        const pos = state.topology.positions;
        const target = state.topology.positions3D;
        let maxDiff = 0;
        for (let i = 0; i < pos.length; i++) {
          pos[i] += (target[i] - pos[i]) * 0.05;
          maxDiff = Math.max(maxDiff, Math.abs(target[i] - pos[i]));
        }
        // Update GPU buffers
        const nodeAttr = state.pointsMesh.geometry.attributes.aPos as THREE.BufferAttribute;
        for (let i = 0; i < state.topology.nNodes; i++) nodeAttr.setXYZ(i, pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
        nodeAttr.needsUpdate = true;
        const edgeAttr = state.linesMesh.geometry.attributes.aPos as THREE.BufferAttribute;
        const map = state.topology.edgeNodeMap;
        const nEdges = map.length / 2;
        for (let i = 0; i < nEdges; i++) {
          const n1 = map[i * 2], n2 = map[i * 2 + 1];
          edgeAttr.setXYZ(i * 2, pos[n1 * 3], pos[n1 * 3 + 1], pos[n1 * 3 + 2]);
          edgeAttr.setXYZ(i * 2 + 1, pos[n2 * 3], pos[n2 * 3 + 1], pos[n2 * 3 + 2]);
        }
        edgeAttr.needsUpdate = true;
        if (maxDiff < 0.1) state.restoring3D = false;
      }

      const currentZoom = camera.position.distanceTo(controls.target);
      const newZoom: 'macro' | 'micro' | 'local' =
        currentZoom > ZOOM_THRESHOLD ? 'macro' :
        state.selectedNodeId !== -1 ? 'local' : 'micro';
      if (newZoom !== prevZoomLevel) { prevZoomLevel = newZoom; setZoomLevel(newZoom); }

      composer.render();
    };
    animate();

    return () => {
      cancelAnimationFrame(state.raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('focus', onFocus);
      container.removeEventListener('pointerdown', onPointerDown, { capture: true });
      container.removeEventListener('pointerup', onPointerUp, { capture: true });
      container.removeEventListener('pointermove', onPointerMove, { capture: true });
      window.removeEventListener('keydown', onKeyDown);
      (state.worker as any)?.postMessage({ type: 'STOP' });
      (state.worker as any)?.terminate();
      renderer.dispose(); composer.dispose();
      if (renderer.domElement.parentNode) container.removeChild(renderer.domElement);
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Sync controls
  useEffect(() => {
    const s = sceneRef.current; if (!s) return;
    s.targetUniforms.size = controlValues.size;
    s.targetUniforms.opacity = controlValues.opacity;
    s.targetUniforms.spread = controlValues.repel / controlValues.gravity;

    // Forward force params to worker (2D mode)
    if (s.worker) {
      (s.worker as Worker).postMessage({
        type: 'UPDATE_FORCES',
        data: {
          centerForce: controlValues.gravity * 0.05,
          repelForce: controlValues.repel * 120,
          linkForce: controlValues.linkForce,
          linkDistance: controlValues.linkDistance,
        },
      });
    }
  }, [controlValues]);

  useEffect(() => {
    const s = sceneRef.current; if (!s) return;
    if (dimension === '2D') {
      s.controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
      s.controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
      s.controls.enableRotate = false;
      s.targetUniforms.flatten = 1.0;

      // Backup 3D positions before 2D takes over
      s.restoring3D = false;
      if (s.topology.nNodes > 0) {
        s.topology.positions3D.set(s.topology.positions);
      }

      // Start d3-force worker for live physics (Obsidian-style)
      if (!s.worker && s.graphNodes.length > 0) {
        const worker = new Worker(
          new URL('@/lib/workers/graph-physics.worker.ts', import.meta.url)
        );
        worker.onerror = () => { s.worker = null; }; // recover from crash
        s.worker = worker;

        const topo = s.topology;
        const idToIdx = new Map<string, number>();
        topo.nodeIds.forEach((id, i) => idToIdx.set(id, i));

        // Init worker with current positions
        const physicsNodes = s.graphNodes.map((n, i) => ({
          id: n.id,
          degree: topo.nodeAdjacency[i]?.length ?? 0,
          x: topo.positions[i * 3],
          y: topo.positions[i * 3 + 1],
        }));
        const physicsLinks = s.graphEdges
          .filter(e => idToIdx.has(e.source) && idToIdx.has(e.target))
          .map(e => ({ source: e.source, target: e.target, weight: e.weight }));

        worker.postMessage({
          type: 'INIT',
          data: {
            nodes: physicsNodes,
            links: physicsLinks,
            centerForce: controlValues.gravity * 0.05,
            repelForce: controlValues.repel * 120,
            linkForce: controlValues.linkForce,
            linkDistance: controlValues.linkDistance,
          },
        });

        // Receive tick updates
        worker.onmessage = (e: MessageEvent) => {
          if (e.data.type === 'TICK') {
            const topo = s.topology;
            if (!s.pointsMesh || !s.linesMesh) return;
            const nodeAttr = s.pointsMesh.geometry.attributes.aPos as THREE.BufferAttribute;
            const edgeAttr = s.linesMesh.geometry.attributes.aPos as THREE.BufferAttribute;

            for (const pos of e.data.nodes) {
              const idx = idToIdx.get(pos.id);
              if (idx === undefined) continue;
              topo.positions[idx * 3] = pos.x;
              topo.positions[idx * 3 + 1] = pos.y;
              topo.positions[idx * 3 + 2] = 0; // flat in 2D
              nodeAttr.setXYZ(idx, pos.x, pos.y, 0);
            }
            nodeAttr.needsUpdate = true;

            // Update edge positions
            const map = topo.edgeNodeMap;
            const nEdges = map.length / 2;
            for (let i = 0; i < nEdges; i++) {
              const n1 = map[i * 2], n2 = map[i * 2 + 1];
              edgeAttr.setXYZ(i * 2, topo.positions[n1 * 3], topo.positions[n1 * 3 + 1], 0);
              edgeAttr.setXYZ(i * 2 + 1, topo.positions[n2 * 3], topo.positions[n2 * 3 + 1], 0);
            }
            edgeAttr.needsUpdate = true;
          }
        };
      }
    } else {
      // 3D mode: stop worker + restore 3D positions via morph
      if (s.worker) {
        (s.worker as Worker).postMessage({ type: 'STOP' });
        (s.worker as any).terminate();
        s.worker = null;
      }
      s.restoring3D = true; // animate loop will lerp positions back
      s.controls.enableRotate = true;
      s.targetUniforms.flatten = 0.0;
      if (mode === 'orbit') { s.controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE; s.controls.mouseButtons.RIGHT = THREE.MOUSE.PAN; s.controls.target.set(0, 0, 0); }
      else { s.controls.mouseButtons.LEFT = THREE.MOUSE.PAN; s.controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE; }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, dimension]);

  // ─── Filter effect ────────────────────────────────────────────────
  useEffect(() => {
    const s = sceneRef.current;
    if (!s || !s.pointsMesh || !s.linesMesh || s.selectedNodeId !== -1) return;
    const topo = s.topology;
    if (topo.nNodes === 0) return;

    const nArr = (s.pointsMesh.geometry.attributes.aHighlight as THREE.BufferAttribute).array as Float32Array;
    const eArr = (s.linesMesh.geometry.attributes.aHighlight as THREE.BufferAttribute).array as Float32Array;

    // Date threshold
    let dateThreshold = 0;
    if (dateFilter !== 'all') {
      const now = Date.now();
      const ms = dateFilter === '1d' ? 86400000 : dateFilter === '1w' ? 604800000 : 2592000000;
      dateThreshold = now - ms;
    }

    const nodeVisible = new Uint8Array(topo.nNodes);
    for (let i = 0; i < topo.nNodes; i++) {
      const domain = topo.nodeDomains[i];
      const conf = topo.nodeConfidences[i];
      const domainOk = domainFilter.size === 0 || domainFilter.has(domain);
      const confOk = confidenceFilter.has(conf);
      const dateOk = dateFilter === 'all' || (s.graphNodes[i] && new Date(s.graphNodes[i].createdAt).getTime() >= dateThreshold);
      nodeVisible[i] = (domainOk && confOk && dateOk) ? 1 : 0;
      nArr[i] = nodeVisible[i] ? 0.0 : 1.0;
    }

    // Edges: dim if either endpoint is filtered out
    const map = topo.edgeNodeMap;
    const nEdges = map.length / 2;
    for (let i = 0; i < nEdges; i++) {
      const n1 = map[i * 2], n2 = map[i * 2 + 1];
      const vis = (nodeVisible[n1] && nodeVisible[n2]) ? 0.0 : 1.0;
      eArr[i * 2] = vis;
      eArr[i * 2 + 1] = vis;
    }

    (s.pointsMesh.geometry.attributes.aHighlight as THREE.BufferAttribute).needsUpdate = true;
    (s.linesMesh.geometry.attributes.aHighlight as THREE.BufferAttribute).needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domainFilter, confidenceFilter, dateFilter]);

  // ─── Build meshes from real data ─────────────────────────────────

  function buildMeshes(
    state: NonNullable<typeof sceneRef.current>,
    nodes: GraphNode[],
    edges: GraphEdge[],
  ) {
    const { topology, edgeIndices, edgeRelTypes } = buildFromRealData(nodes, edges);
    state.topology = topology;
    const nNodes = topology.nNodes;

    // Node sizes — normalized by degree distribution
    const sizes = new Float32Array(nNodes);
    const ids = new Float32Array(nNodes);
    const highlights = new Float32Array(nNodes);
    const domainBrights = new Float32Array(nNodes);
    const degs = topology.nodeAdjacency.map(a => a.length);
    const maxDeg = Math.max(1, ...degs);
    for (let i = 0; i < nNodes; i++) {
      ids[i] = i;
      highlights[i] = 0.0;
      domainBrights[i] = DOMAIN_BRIGHTNESS[topology.nodeDomains[i]] ?? DEFAULT_BRIGHTNESS;
      const t = Math.sqrt(degs[i] / maxDeg); // sqrt for smoother scaling
      sizes[i] = 1.5 + t * 16; // range: 1.5 (isolated) to 17.5 (max hub)
    }

    // Node geometry
    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nNodes * 3), 3));
    nodeGeo.setAttribute('aPos', new THREE.BufferAttribute(topology.positions, 3));
    nodeGeo.setAttribute('baseSize', new THREE.BufferAttribute(sizes, 1));
    nodeGeo.setAttribute('aNodeId', new THREE.BufferAttribute(ids, 1));
    nodeGeo.setAttribute('aHighlight', new THREE.BufferAttribute(highlights, 1));
    nodeGeo.setAttribute('aDomainBright', new THREE.BufferAttribute(domainBrights, 1));

    const nodeMat = new THREE.ShaderMaterial({
      uniforms: state.uniforms,
      vertexShader: NODE_VERTEX,
      fragmentShader: NODE_FRAGMENT,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    state.pointsMesh = new THREE.Points(nodeGeo, nodeMat);
    state.pointsMesh.frustumCulled = false;
    state.scene.add(state.pointsMesh);

    // Edge geometry
    const nEdges = edgeIndices.length / 2;
    const edgePos = new Float32Array(nEdges * 2 * 3);
    const edgeHL = new Float32Array(nEdges * 2);
    const edgeBrights = new Float32Array(nEdges * 2);
    for (let i = 0; i < nEdges; i++) {
      const n1 = edgeIndices[i * 2], n2 = edgeIndices[i * 2 + 1];
      edgePos[i * 6] = topology.positions[n1 * 3]; edgePos[i * 6 + 1] = topology.positions[n1 * 3 + 1]; edgePos[i * 6 + 2] = topology.positions[n1 * 3 + 2];
      edgePos[i * 6 + 3] = topology.positions[n2 * 3]; edgePos[i * 6 + 4] = topology.positions[n2 * 3 + 1]; edgePos[i * 6 + 5] = topology.positions[n2 * 3 + 2];
      const ew = EDGE_WEIGHT[edgeRelTypes[i]] ?? DEFAULT_EDGE_WEIGHT;
      edgeBrights[i * 2] = ew.bright;
      edgeBrights[i * 2 + 1] = ew.bright;
    }

    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nEdges * 2 * 3), 3));
    edgeGeo.setAttribute('aPos', new THREE.BufferAttribute(edgePos, 3));
    edgeGeo.setAttribute('aHighlight', new THREE.BufferAttribute(edgeHL, 1));
    edgeGeo.setAttribute('aEdgeBright', new THREE.BufferAttribute(edgeBrights, 1));

    const edgeMat = new THREE.ShaderMaterial({
      uniforms: state.uniforms,
      vertexShader: EDGE_VERTEX,
      fragmentShader: EDGE_FRAGMENT,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    state.linesMesh = new THREE.LineSegments(edgeGeo, edgeMat);
    state.linesMesh.frustumCulled = false;
    state.scene.add(state.linesMesh);
  }

  // ─── Physics ────────────────────────────────────────────────────

  function stepPhysics(state: NonNullable<typeof sceneRef.current>) {
    const topo = state.topology;
    if (topo.activeNodes.size === 0) return;
    const SPRING_K = 0.02, DAMPING = 0.88, MIN_VEL = 0.05;
    const pos = topo.positions, vels = topo.nodeVelocities;
    const activeArr = Array.from(topo.activeNodes);
    const processSet = new Set<number>(activeArr);
    for (let ai = 0; ai < activeArr.length; ai++) {
      const neighbors = topo.nodeAdjacency[activeArr[ai]];
      for (let ni = 0; ni < neighbors.length; ni++) processSet.add(neighbors[ni]);
    }
    const processArr = Array.from(processSet);
    const toRemove: number[] = [];

    for (let pi = 0; pi < processArr.length; pi++) {
      const nodeId = processArr[pi];
      if (nodeId === state.dragNodeId) continue;
      const px = pos[nodeId * 3], py = pos[nodeId * 3 + 1], pz = pos[nodeId * 3 + 2];
      let fx = 0, fy = 0, fz = 0;
      const neighbors = topo.nodeAdjacency[nodeId];
      for (let ni = 0; ni < neighbors.length; ni++) {
        const nb = neighbors[ni];
        const dx = pos[nb * 3] - px, dy = pos[nb * 3 + 1] - py, dz = pos[nb * 3 + 2] - pz;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        const restDist = 120; // approx rest distance
        const force = (dist - restDist) * SPRING_K;
        fx += (dx / dist) * force; fy += (dy / dist) * force; fz += (dz / dist) * force;
      }
      vels[nodeId * 3] = (vels[nodeId * 3] + fx) * DAMPING;
      vels[nodeId * 3 + 1] = (vels[nodeId * 3 + 1] + fy) * DAMPING;
      vels[nodeId * 3 + 2] = (vels[nodeId * 3 + 2] + fz) * DAMPING;
      pos[nodeId * 3] += vels[nodeId * 3]; pos[nodeId * 3 + 1] += vels[nodeId * 3 + 1]; pos[nodeId * 3 + 2] += vels[nodeId * 3 + 2];
      const speed = Math.abs(vels[nodeId * 3]) + Math.abs(vels[nodeId * 3 + 1]) + Math.abs(vels[nodeId * 3 + 2]);
      if (speed > MIN_VEL) topo.activeNodes.add(nodeId);
      else { toRemove.push(nodeId); vels[nodeId * 3] = 0; vels[nodeId * 3 + 1] = 0; vels[nodeId * 3 + 2] = 0; }
    }
    for (let ri = 0; ri < toRemove.length; ri++) topo.activeNodes.delete(toRemove[ri]);

    if (state.pointsMesh) {
      const attr = state.pointsMesh.geometry.attributes.aPos as THREE.BufferAttribute;
      for (let pi = 0; pi < processArr.length; pi++) { const nid = processArr[pi]; attr.setXYZ(nid, pos[nid * 3], pos[nid * 3 + 1], pos[nid * 3 + 2]); }
      attr.needsUpdate = true;
    }
    if (state.linesMesh) {
      const edgeAttr = state.linesMesh.geometry.attributes.aPos as THREE.BufferAttribute;
      const map = topo.edgeNodeMap;
      for (let pi = 0; pi < processArr.length; pi++) {
        const nid = processArr[pi];
        const nodeEdgeList = topo.nodeEdges[nid];
        for (let ei = 0; ei < nodeEdgeList.length; ei++) {
          const edgeIdx = nodeEdgeList[ei];
          const en1 = map[edgeIdx * 2], en2 = map[edgeIdx * 2 + 1];
          edgeAttr.setXYZ(edgeIdx * 2, pos[en1 * 3], pos[en1 * 3 + 1], pos[en1 * 3 + 2]);
          edgeAttr.setXYZ(edgeIdx * 2 + 1, pos[en2 * 3], pos[en2 * 3 + 1], pos[en2 * 3 + 2]);
        }
      }
      edgeAttr.needsUpdate = true;
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────

  function applyHL(state: NonNullable<typeof sceneRef.current>, targetId: number) {
    if (!state.pointsMesh || !state.linesMesh) return;
    const nArr = (state.pointsMesh.geometry.attributes.aHighlight as THREE.BufferAttribute).array as Float32Array;
    const eArr = (state.linesMesh.geometry.attributes.aHighlight as THREE.BufferAttribute).array as Float32Array;
    if (targetId === -1) { nArr.fill(0.0); eArr.fill(0.0); }
    else {
      nArr.fill(1.0); eArr.fill(1.0); nArr[targetId] = 2.0;
      for (const n of state.topology.nodeAdjacency[targetId]) nArr[n] = 2.0;
      for (const ei of state.topology.nodeEdges[targetId]) { eArr[ei * 2] = 2.0; eArr[ei * 2 + 1] = 2.0; }
    }
    (state.pointsMesh.geometry.attributes.aHighlight as THREE.BufferAttribute).needsUpdate = true;
    (state.linesMesh.geometry.attributes.aHighlight as THREE.BufferAttribute).needsUpdate = true;
  }

  function showCard(state: NonNullable<typeof sceneRef.current>, nodeId: number) {
    state.uniforms.uSelectedNode.value = nodeId;
    const topo = state.topology;
    const realId = topo.nodeIds[nodeId];
    const graphNode = state.graphNodes.find(n => n.id === realId);
    setSelectedCard({
      id: nodeId,
      title: topo.nodeLabels[nodeId] || `Node ${nodeId}`,
      domain: topo.nodeDomains[nodeId] || 'knowledge',
      tag: `#${topo.nodeDomains[nodeId] || 'concept'}`,
      realId,
      degree: topo.nodeAdjacency[nodeId]?.length ?? 0,
      confidence: topo.nodeConfidences[nodeId] || 'medium',
      raw: graphNode?.raw ?? null,
      sections: null,
      triples: null,
      relations: null,
    });
    // Fetch detail data in parallel
    Promise.all([
      fetch(`/api/nodes/${realId}/content`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/nodes/${realId}/triples`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/nodes/${realId}/relations`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([contentData, triplesData, relData]) => {
      setSelectedCard(prev => {
        if (!prev || prev.realId !== realId) return prev;
        return {
          ...prev,
          sections: contentData?.sections ?? null,
          triples: triplesData?.triples ?? null,
          relations: relData?.relations ?? null,
        };
      });
    });
  }

  function exitLocal(state: NonNullable<typeof sceneRef.current>) {
    state.selectedNodeId = -1; state.hoveredNodeId = -1;
    applyHL(state, -1); state.uniforms.uSelectedNode.value = -1.0; setSelectedCard(null);
  }

  // Projected node cache for fast raycasting — rebuilt periodically
  const projCacheRef = useRef<{ ndc: Float32Array; frame: number }>({ ndc: new Float32Array(0), frame: 0 });
  const prevLabelsKeyRef = useRef<string>('');

  function rebuildProjCache(state: NonNullable<typeof sceneRef.current>) {
    const topo = state.topology;
    const flat = state.uniforms.uFlatten.value;
    const spread = state.uniforms.uSpread?.value ?? 1;
    const n = topo.nNodes;
    if (projCacheRef.current.ndc.length !== n * 2) {
      projCacheRef.current.ndc = new Float32Array(n * 2);
    }
    const ndc = projCacheRef.current.ndc;
    const pos3 = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      pos3.set(
        topo.positions[i * 3] * spread,
        topo.positions[i * 3 + 1] * spread,
        topo.positions[i * 3 + 2] * spread * (1.0 - flat),
      );
      pos3.project(state.camera);
      ndc[i * 2] = pos3.x;
      ndc[i * 2 + 1] = pos3.y;
    }
    projCacheRef.current.frame++;

    // Update visible labels (only when zoomed in, top degree nodes visible on screen)
    const container = containerRef.current;
    if (!container) return;
    const zoom = state.camera.position.distanceTo(state.controls.target);
    if (zoom > 1200) {
      if (prevLabelsKeyRef.current !== '') { prevLabelsKeyRef.current = ''; setVisibleLabels([]); }
      return;
    }

    const rect = container.getBoundingClientRect();
    const labels: { x: number; y: number; label: string }[] = [];
    const maxLabels = zoom < 500 ? 30 : 15;
    // Sort by degree descending, pick visible ones
    const degs = topo.nodeAdjacency.map((a, i) => ({ d: a.length, i }));
    degs.sort((a, b) => b.d - a.d);

    for (let di = 0; di < degs.length && labels.length < maxLabels; di++) {
      const i = degs[di].i;
      const nx = ndc[i * 2], ny = ndc[i * 2 + 1];
      // Check if on screen
      if (nx < -1 || nx > 1 || ny < -1 || ny > 1) continue;
      const sx = (nx + 1) / 2 * rect.width;
      const sy = (1 - ny) / 2 * rect.height;
      labels.push({ x: sx, y: sy, label: topo.nodeLabels[i] });
    }
    const key = labels.map(l => `${Math.round(l.x)},${Math.round(l.y)},${l.label}`).join('|');
    if (key !== prevLabelsKeyRef.current) { prevLabelsKeyRef.current = key; setVisibleLabels(labels); }
  }

  function getRaycastedNodeId(clientX: number, clientY: number, state: NonNullable<typeof sceneRef.current>, container: HTMLDivElement): number {
    const rect = container.getBoundingClientRect();
    const mx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const my = -((clientY - rect.top) / rect.height) * 2 + 1;
    const threshold = 0.03;

    // First pass: check large nodes (degree > 10) only — fast
    const topo = state.topology;
    const ndc = projCacheRef.current.ndc;
    let closestId = -1, minDist = Infinity;

    for (let i = 0; i < topo.nNodes; i++) {
      const dx = ndc[i * 2] - mx, dy = ndc[i * 2 + 1] - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < threshold && dist < minDist) { minDist = dist; closestId = i; }
    }
    return closestId;
  }

  const navigateToNode = useCallback((nodeRealId: string) => {
    const s = sceneRef.current;
    if (!s) return;
    const idx = s.topology.nodeIds.indexOf(nodeRealId);
    if (idx === -1) return;
    const spread = s.uniforms.uSpread?.value ?? 1;
    const p = s.topology.positions;
    s.controls.target.set(p[idx * 3] * spread, p[idx * 3 + 1] * spread, p[idx * 3 + 2] * spread);
    s.camera.position.set(p[idx * 3] * spread, p[idx * 3 + 1] * spread, p[idx * 3 + 2] * spread + 400);
    s.selectedNodeId = idx;
    applyHL(s, idx);
    showCard(s, idx);
  }, []);
  const handleCloseCard = useCallback(() => { const s = sceneRef.current; if (s) exitLocal(s); }, []);
  const updateControl = useCallback((key: string, value: number) => { setControlValues(prev => ({ ...prev, [key]: value })); }, []);

  // ─── Render ──────────────────────────────────────────────────────

  if (!visible) return null;

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, cursor: 'grab' }}>
      {/* Status overlays */}
      {status === 'loading' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', animation: 'blink 1s ease-in-out infinite' }} />
        </div>
      )}
      {status === 'empty' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>대화를 시작하면 별이 생깁니다</span>
        </div>
      )}
      {status === 'error' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>데이터를 불러올 수 없습니다</span>
        </div>
      )}

      {/* Control Panel */}
      {status === 'ready' && (
        <div style={{
          position: 'absolute', top: 20, left: 20,
          background: 'rgba(0, 0, 0, 0.6)', padding: 20, borderRadius: 8,
          border: '1px solid rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(12px)',
          width: 240, zIndex: 100, maxHeight: '80vh', overflowY: 'auto',
        }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: 10, fontWeight: 600, letterSpacing: 1, color: '#fff' }}>
            GRAPH VIEW
          </h3>

          {/* Search */}
          <div style={{ marginBottom: 16, position: 'relative' }}>
            <input
              type="text"
              placeholder="노드 검색... ( / )"
              value={searchQuery}
              onChange={e => {
                const q = e.target.value;
                setSearchQuery(q);
                const s = sceneRef.current;
                if (!s || !q.trim()) { setSearchResults([]); return; }
                const lower = q.trim().toLowerCase();
                const parts = lower.split(/\s+/);
                const results: { idx: number; label: string }[] = [];
                for (let i = 0; i < s.topology.nNodes && results.length < 10; i++) {
                  const label = s.topology.nodeLabels[i].toLowerCase();
                  const domain = s.topology.nodeDomains[i].toLowerCase();
                  const match = parts.every(p => label.includes(p) || domain.includes(p));
                  if (match) results.push({ idx: i, label: s.topology.nodeLabels[i] });
                }
                setSearchResults(results);
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={e => {
                if (e.key === 'Enter' && searchResults.length > 0) {
                  const s = sceneRef.current;
                  if (!s) return;
                  const idx = searchResults[0].idx;
                  s.selectedNodeId = idx;
                  applyHL(s, idx);
                  showCard(s, idx);
                  const spread = s.uniforms.uSpread?.value ?? 1;
                  const p = s.topology.positions;
                  s.controls.target.set(p[idx * 3] * spread, p[idx * 3 + 1] * spread, p[idx * 3 + 2] * spread);
                  s.camera.position.set(p[idx * 3] * spread, p[idx * 3 + 1] * spread, p[idx * 3 + 2] * spread + 400);
                  setSearchResults([]);
                  setSearchQuery('');
                }
                if (e.key === 'Escape') { setSearchQuery(''); setSearchResults([]); setSearchOpen(false); (e.target as HTMLElement).blur(); }
              }}
              ref={el => { if (searchOpen && el) el.focus(); }}
              style={{
                width: '100%', padding: '8px 10px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 4, color: '#fff', fontSize: 12,
                outline: 'none',
              }}
            />
            {searchResults.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 4, overflow: 'hidden', zIndex: 200,
              }}>
                {searchResults.map((r, i) => (
                  <button
                    key={r.idx}
                    onClick={() => {
                      const s = sceneRef.current;
                      if (!s) return;
                      s.selectedNodeId = r.idx;
                      applyHL(s, r.idx);
                      showCard(s, r.idx);
                      const spread = s.uniforms.uSpread?.value ?? 1;
                      const p = s.topology.positions;
                      s.controls.target.set(p[r.idx * 3] * spread, p[r.idx * 3 + 1] * spread, p[r.idx * 3 + 2] * spread);
                      s.camera.position.set(p[r.idx * 3] * spread, p[r.idx * 3 + 1] * spread, p[r.idx * 3 + 2] * spread + 400);
                      setSearchResults([]);
                      setSearchQuery('');
                    }}
                    style={{
                      display: 'block', width: '100%', padding: '6px 10px',
                      background: i === 0 ? 'rgba(255,255,255,0.08)' : 'transparent',
                      border: 'none', color: '#fff', fontSize: 11, textAlign: 'left', cursor: 'pointer',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                    onMouseLeave={e => { if (i !== 0) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span>{r.label}</span>
                    <span style={{ float: 'right', fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>
                      {sceneRef.current?.topology.nodeDomains[r.idx]}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2D/3D */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <ModeButton label="3D" active={dimension === '3D'} onClick={() => setDimension('3D')} />
            <ModeButton label="2D" active={dimension === '2D'} onClick={() => setDimension('2D')} />
          </div>

          {dimension === '3D' && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <ModeButton label="중심 고정" active={mode === 'orbit'} onClick={() => setMode('orbit')} />
              <ModeButton label="무한 탐색" active={mode === 'pan'} onClick={() => setMode('pan')} />
            </div>
          )}
          {dimension === '2D' && <div style={{ marginBottom: 20 }} />}

          <ControlSlider label="노드 크기" value={controlValues.size} min={0.1} max={3.0} step={0.1} onChange={v => updateControl('size', v)} />
          <ControlSlider label="중심 인력" value={controlValues.gravity} min={0.2} max={3.0} step={0.1} onChange={v => updateControl('gravity', v)} />
          <ControlSlider label="반발력" value={controlValues.repel} min={0.2} max={3.0} step={0.1} onChange={v => updateControl('repel', v)} />
          <ControlSlider label="링크 장력" value={controlValues.linkForce} min={0.01} max={1.0} step={0.01} onChange={v => updateControl('linkForce', v)} />
          <ControlSlider label="링크 거리" value={controlValues.linkDistance} min={20} max={300} step={10} onChange={v => updateControl('linkDistance', v)} />
          <ControlSlider label="선 투명도" value={controlValues.opacity} min={0.01} max={0.2} step={0.01} onChange={v => updateControl('opacity', v)} />

          <button
            onClick={() => {
              setControlValues({ size: 0.8, gravity: 1.0, repel: 1.0, linkForce: 0.3, linkDistance: 80, opacity: 0.05 });
              const s = sceneRef.current;
              if (s) { s.camera.position.set(0, 0, 2500); s.controls.target.set(0, 0, 0); }
            }}
            style={{
              width: '100%', padding: 8, marginTop: 8,
              background: 'none', color: 'rgba(255,255,255,0.4)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 4, fontSize: 11, cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          >
            초기화 (R)
          </button>

          {/* Domain filter */}
          <div style={{ marginTop: 20, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>도메인</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {allDomains.map(d => (
                <button
                  key={d}
                  onClick={() => {
                    setDomainFilter(prev => {
                      const next = new Set(prev);
                      if (next.has(d)) next.delete(d); else next.add(d);
                      return next;
                    });
                  }}
                  style={{
                    padding: '3px 8px', fontSize: 10, borderRadius: 3, cursor: 'pointer',
                    background: domainFilter.has(d) ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.03)',
                    color: domainFilter.has(d) ? '#fff' : 'rgba(255,255,255,0.25)',
                    border: `1px solid ${domainFilter.has(d) ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    transition: 'all 0.15s',
                  }}
                >{d}</button>
              ))}
            </div>
          </div>

          {/* Confidence filter */}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>신뢰도</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['high', 'medium', 'low'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => {
                    setConfidenceFilter(prev => {
                      const next = new Set(prev);
                      if (next.has(c)) next.delete(c); else next.add(c);
                      return next;
                    });
                  }}
                  style={{
                    flex: 1, padding: '4px 0', fontSize: 10, borderRadius: 3, cursor: 'pointer',
                    background: confidenceFilter.has(c) ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.03)',
                    color: confidenceFilter.has(c) ? '#fff' : 'rgba(255,255,255,0.25)',
                    border: `1px solid ${confidenceFilter.has(c) ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    transition: 'all 0.15s',
                  }}
                >{c}</button>
              ))}
            </div>
          </div>

          {/* Date filter */}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>기간</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {([['all', '전체'], ['1d', '1일'], ['1w', '1주'], ['1m', '1달']] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setDateFilter(val)}
                  style={{
                    flex: 1, padding: '4px 0', fontSize: 10, borderRadius: 3, cursor: 'pointer',
                    background: dateFilter === val ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.03)',
                    color: dateFilter === val ? '#fff' : 'rgba(255,255,255,0.25)',
                    border: `1px solid ${dateFilter === val ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    transition: 'all 0.15s',
                  }}
                >{label}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Zoom Indicator */}
      <div style={{
        position: 'absolute', top: 30, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(0, 0, 0, 0.5)',
        border: zoomLevel === 'local' ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
        padding: '8px 16px', borderRadius: 20, fontSize: 11, fontWeight: 600,
        backdropFilter: 'blur(4px)', zIndex: 100,
        color: zoomLevel === 'local' ? '#fff' : zoomLevel === 'micro' ? 'rgba(255,255,255,0.7)' : '#888',
        transition: 'all 0.3s', pointerEvents: 'none', letterSpacing: 0.5,
      }}>
        {zoomLevel === 'macro' && '거시적 뷰 (더 확대하여 탐색)'}
        {zoomLevel === 'micro' && '미시적 뷰 (클릭 시 로컬 뷰 진입)'}
        {zoomLevel === 'local' && '로컬 뷰 (빈 공간 클릭 시 해제)'}
      </div>

      {/* Info Card */}
      <div style={{
        position: 'absolute', top: 20, right: selectedCard ? 20 : -420, width: 360,
        background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: 12, padding: 0,
        boxShadow: '-5px 10px 30px rgba(0,0,0,0.5)', transition: 'right 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)', zIndex: 200,
        maxHeight: '80vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 0', position: 'sticky', top: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, lineHeight: 1.3, color: '#fff' }}>{selectedCard?.title}</h2>
            <button onClick={handleCloseCard} style={{ background: 'none', border: 'none', color: '#888', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 0, marginLeft: 15 }}>&times;</button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <span style={{
              display: 'inline-block', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)',
              padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
            }}>
              {selectedCard?.tag}
            </span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', lineHeight: '22px' }}>
              연결 {selectedCard?.degree} · {selectedCard?.confidence}
            </span>
          </div>
        </div>

        <div style={{ padding: '0 20px 20px' }}>
          {/* Raw text */}
          {selectedCard?.raw && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>원본</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, maxHeight: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedCard.raw.slice(0, 200)}{selectedCard.raw.length > 200 ? '…' : ''}
              </div>
            </div>
          )}

          {/* Triples */}
          {selectedCard?.triples && selectedCard.triples.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>트리플</div>
              {selectedCard.triples.slice(0, 8).map(t => (
                <div key={t.id} style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, display: 'flex', gap: 4 }}>
                  <span style={{ color: '#fff' }}>{t.subject}</span>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>{t.predicate}</span>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>{t.object}</span>
                </div>
              ))}
            </div>
          )}

          {/* Sections */}
          {selectedCard?.sections && selectedCard.sections.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>섹션</div>
              {selectedCard.sections.slice(0, 5).map(sec => (
                <div key={sec.id} style={{ marginBottom: 8 }}>
                  {sec.heading && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginBottom: 2 }}>{sec.heading}</div>}
                  {sec.sentences.slice(0, 3).map(s => (
                    <div key={s.id} style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{s.text}</div>
                  ))}
                  {sec.sentences.length > 3 && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>+{sec.sentences.length - 3}문장</div>}
                </div>
              ))}
            </div>
          )}

          {/* Related nodes */}
          {selectedCard?.relations && selectedCard.relations.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>연결 노드</div>
              {selectedCard.relations.slice(0, 8).map(rel => (
                <button
                  key={rel.id}
                  onClick={() => navigateToNode(rel.id)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '6px 8px', marginBottom: 4,
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 4, cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                >
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
                    {rel.raw ? (rel.raw.length > 40 ? rel.raw.slice(0, 40) + '…' : rel.raw) : rel.id.slice(0, 8)}
                  </div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>
                    {rel.predicate && <span>{rel.predicate} · </span>}{rel.domain}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Loading indicator for detail data */}
          {selectedCard && selectedCard.triples === null && selectedCard.sections === null && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '10px 0' }}>
              불러오는 중...
            </div>
          )}

          {/* Footer */}
          <div style={{
            borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: 12, marginTop: 8,
            fontSize: 10, color: 'rgba(255,255,255,0.2)', display: 'flex', justifyContent: 'space-between',
          }}>
            <span>{selectedCard?.domain}</span>
            <span style={{ fontFamily: 'monospace' }}>{selectedCard?.realId?.slice(0, 8)}</span>
          </div>
        </div>
      </div>

      {/* Node labels overlay */}
      {visibleLabels.length > 0 && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
          {visibleLabels.map((lbl, i) => (
            <span
              key={i}
              style={{
                position: 'absolute',
                left: lbl.x,
                top: lbl.y + 12,
                transform: 'translateX(-50%)',
                fontSize: 10,
                color: 'rgba(255,255,255,0.5)',
                whiteSpace: 'nowrap',
                textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              }}
            >
              {lbl.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function ModeButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: '10px 0',
      background: active ? '#fff' : 'rgba(0,0,0,0.5)',
      color: active ? '#000' : '#888',
      border: active ? '1px solid #fff' : '1px solid rgba(255,255,255,0.2)',
      borderRadius: 4, fontSize: 11, fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s',
      boxShadow: active ? '0 0 10px rgba(255,255,255,0.3)' : 'none',
    }}>{label}</button>
  );
}

function ControlSlider({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <label style={{ fontSize: 11, color: '#bbb', letterSpacing: 0.5 }}>{label}</label>
        <span style={{ fontSize: 11, color: '#888', fontFamily: 'monospace' }}>{value}</span>
      </div>
      <input type="range" value={value} min={min} max={max} step={step}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', cursor: 'pointer', accentColor: '#fff', height: 4 }}
      />
    </div>
  );
}
