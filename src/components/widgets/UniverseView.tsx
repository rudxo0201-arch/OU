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
  confidence: number;
  createdAt: string;
}

interface GraphEdge {
  source: string;
  target: string;
  predicate: string;
  weight: number;
}

interface Props {
  visible: boolean;
}

// ─── Shaders ─────────────────────────────────────────────────────────
const NODE_VERTEX = /* glsl */ `
  uniform float uGravity;
  uniform float uRepel;
  uniform float uSizeMult;
  uniform float uSelectedNode;
  uniform float uFlatten;

  attribute vec3 hubDir;
  attribute float hubBaseR;
  attribute vec3 leafDir;
  attribute float leafBaseDist;
  attribute float baseSize;
  attribute float aNodeId;
  attribute float aHighlight;
  attribute vec3 aOffset;

  varying float vIsSelected;
  varying float vHighlight;

  void main() {
    vec3 finalPos = hubDir * (hubBaseR / uGravity) + leafDir * (leafBaseDist * uRepel);
    finalPos.z *= (1.0 - uFlatten);
    finalPos += aOffset;
    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);

    vIsSelected = abs(aNodeId - uSelectedNode) < 0.5 ? 1.0 : 0.0;
    vHighlight = aHighlight;

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
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.1, d);
    vec3 color = mix(vec3(0.9, 0.95, 1.0), vec3(0.0, 0.95, 1.0), vIsSelected);

    if (vHighlight == 1.0) { alpha *= 0.15; }
    else if (vHighlight == 2.0) { color = mix(color, vec3(1.0), 0.5); alpha = min(1.0, alpha * 2.0); }

    gl_FragColor = vec4(color, alpha + vIsSelected * 0.5);
  }
`;

const EDGE_VERTEX = /* glsl */ `
  uniform float uGravity;
  uniform float uRepel;
  uniform float uFlatten;

  attribute vec3 hubDir;
  attribute float hubBaseR;
  attribute vec3 leafDir;
  attribute float leafBaseDist;
  attribute float aHighlight;
  attribute vec3 aOffset;

  varying float vHighlight;

  void main() {
    vec3 finalPos = hubDir * (hubBaseR / uGravity) + leafDir * (leafBaseDist * uRepel);
    finalPos.z *= (1.0 - uFlatten);
    finalPos += aOffset;
    vHighlight = aHighlight;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
  }
`;

const EDGE_FRAGMENT = /* glsl */ `
  uniform float uOpacity;
  varying float vHighlight;
  void main() {
    float alpha = uOpacity;
    vec3 color = vec3(0.533, 0.533, 0.6);
    if (vHighlight == 1.0) { alpha *= 0.1; }
    else if (vHighlight == 2.0) { alpha = min(1.0, uOpacity * 6.0 + 0.3); color = vec3(0.8, 0.9, 1.0); }
    gl_FragColor = vec4(color, alpha);
  }
`;

// ─── Topology State ──────────────────────────────────────────────────
interface Topology {
  nNodes: number;
  hDir: Float32Array;
  hRad: Float32Array;
  lDir: Float32Array;
  lDist: Float32Array;
  nodeAdjacency: number[][];
  nodeEdges: number[][];
  nodeLabels: string[];
  nodeDomains: string[];
  nodeOffsets: Float32Array;
  nodeVelocities: Float32Array;
  activeNodes: Set<number>;
  edgeNodeMap: Int32Array; // [n1, n2, n1, n2, ...] per edge
}

function emptyTopology(): Topology {
  return {
    nNodes: 0,
    hDir: new Float32Array(0),
    hRad: new Float32Array(0),
    lDir: new Float32Array(0),
    lDist: new Float32Array(0),
    nodeAdjacency: [],
    nodeEdges: [],
    nodeLabels: [],
    nodeDomains: [],
    nodeOffsets: new Float32Array(0),
    nodeVelocities: new Float32Array(0),
    activeNodes: new Set(),
    edgeNodeMap: new Int32Array(0),
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
    raf: number;
  } | null>(null);

  const [controlValues, setControlValues] = useState({
    nodes: 25000,
    edgeDensity: 2.0,
    size: 0.8,
    gravity: 1.0,
    repel: 1.0,
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
  } | null>(null);
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const ZOOM_THRESHOLD = 1600;

  // Fetch real data
  const fetchGraph = useCallback(async () => {
    try {
      const res = await fetch('/api/graph');
      if (!res.ok) { setLoading(false); return; }
      const data = await res.json();
      setGraphData(data);
    } catch {
      // silently fail, will use generated data
    } finally {
      setLoading(false);
    }
  }, []);

  // Build topology
  const buildTopology = useCallback((
    nNodes: number,
    edgeDensity: number,
    realNodes?: GraphNode[],
    realEdges?: GraphEdge[],
  ): { topology: Topology; edgeIndices: number[] } => {
    const topo: Topology = {
      nNodes,
      hDir: new Float32Array(nNodes * 3),
      hRad: new Float32Array(nNodes),
      lDir: new Float32Array(nNodes * 3),
      lDist: new Float32Array(nNodes),
      nodeAdjacency: Array.from({ length: nNodes }, () => []),
      nodeEdges: Array.from({ length: nNodes }, () => []),
      nodeLabels: Array.from({ length: nNodes }, (_, i) =>
        realNodes && i < realNodes.length ? realNodes[i].label : `Node ${i}`
      ),
      nodeDomains: Array.from({ length: nNodes }, (_, i) =>
        realNodes && i < realNodes.length ? realNodes[i].domain : 'knowledge'
      ),
      nodeOffsets: new Float32Array(nNodes * 3),
      nodeVelocities: new Float32Array(nNodes * 3),
      activeNodes: new Set(),
      edgeNodeMap: new Int32Array(0), // filled after edges are built
    };

    const numCoreHubs = Math.max(10, Math.floor(nNodes * 0.005));
    const numSubHubs = Math.max(50, Math.floor(nNodes * 0.05));
    const hubsData: { id: number; dx: number; dy: number; dz: number; r: number }[] = [];
    const sizes = new Float32Array(nNodes);
    const edges: number[] = [];

    for (let i = 0; i < nNodes; i++) {
      if (i < numCoreHubs) {
        const r = Math.random() * 800;
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        const dx = Math.sin(phi) * Math.cos(theta);
        const dy = Math.sin(phi) * Math.sin(theta);
        const dz = Math.cos(phi);
        topo.hDir[i * 3] = dx; topo.hDir[i * 3 + 1] = dy; topo.hDir[i * 3 + 2] = dz;
        topo.hRad[i] = r;
        topo.lDir[i * 3] = 0; topo.lDir[i * 3 + 1] = 0; topo.lDir[i * 3 + 2] = 0;
        topo.lDist[i] = 0;
        sizes[i] = 12.0 + Math.random() * 8.0;
        hubsData.push({ id: i, dx, dy, dz, r });
      } else {
        const target = hubsData[Math.floor(Math.random() * hubsData.length)];
        const dist = Math.random() * 150 + Math.random() * 150;
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        const dx = Math.sin(phi) * Math.cos(theta);
        const dy = Math.sin(phi) * Math.sin(theta);
        const dz = Math.cos(phi);
        topo.hDir[i * 3] = target.dx; topo.hDir[i * 3 + 1] = target.dy; topo.hDir[i * 3 + 2] = target.dz;
        topo.hRad[i] = target.r;
        topo.lDir[i * 3] = dx; topo.lDir[i * 3 + 1] = dy; topo.lDir[i * 3 + 2] = dz;
        topo.lDist[i] = dist;
        sizes[i] = (i < numCoreHubs + numSubHubs) ? (4.0 + Math.random() * 3.0) : (1.0 + Math.random() * 1.5);
        if (i < numCoreHubs + numSubHubs) {
          hubsData.push({ id: i, dx: target.dx, dy: target.dy, dz: target.dz, r: target.r });
        }
        edges.push(i, target.id);
        if (Math.random() < 0.02 * edgeDensity) {
          edges.push(i, hubsData[Math.floor(Math.random() * hubsData.length)].id);
        }
      }
    }

    // Core hub inter-connections
    for (let i = 0; i < numCoreHubs; i++) {
      for (let j = i + 1; j < numCoreHubs; j++) {
        if (Math.random() < 0.1 * edgeDensity) edges.push(i, j);
      }
    }

    // Build adjacency
    const nEdges = edges.length / 2;
    for (let i = 0; i < nEdges; i++) {
      const n1 = edges[i * 2], n2 = edges[i * 2 + 1];
      topo.nodeAdjacency[n1].push(n2);
      topo.nodeAdjacency[n2].push(n1);
      topo.nodeEdges[n1].push(i);
      topo.nodeEdges[n2].push(i);
    }

    return { topology: topo, edgeIndices: edges };
  }, []);

  // Initialize Three.js scene
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
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.7, 0.4, 0.85
    );
    composer.addPass(bloomPass);

    const uniforms: Record<string, THREE.IUniform> = {
      uGravity: { value: controlValues.gravity },
      uRepel: { value: controlValues.repel },
      uSizeMult: { value: controlValues.size },
      uOpacity: { value: controlValues.opacity },
      uSelectedNode: { value: -1.0 },
      uFlatten: { value: 0.0 },
    };

    const targetUniforms: Record<string, number> = {
      gravity: controlValues.gravity,
      repel: controlValues.repel,
      size: controlValues.size,
      opacity: controlValues.opacity,
      flatten: 0.0,
    };

    const state = {
      renderer,
      scene,
      camera,
      controls,
      composer,
      pointsMesh: null as THREE.Points | null,
      linesMesh: null as THREE.LineSegments | null,
      topology: emptyTopology(),
      uniforms,
      targetUniforms,
      selectedNodeId: -1,
      hoveredNodeId: -1,
      dragNodeId: -1,
      dragPlane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
      dragOffset: new THREE.Vector3(),
      raf: 0,
    };

    sceneRef.current = state;

    // Build initial network
    rebuildNetwork(state, controlValues.nodes, controlValues.edgeDensity);

    // Fetch real data
    fetchGraph();

    // Resize handler
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Interaction: click + drag
    let clickStartX = 0, clickStartY = 0;
    let didDrag = false;
    const raycaster = new THREE.Raycaster();
    const mouseNDC = new THREE.Vector2();

    function getMouseNDC(e: PointerEvent) {
      const rect = container.getBoundingClientRect();
      mouseNDC.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
    }

    function getNodeWorldPos(nodeId: number): THREE.Vector3 {
      const topo = state.topology;
      const grav = state.uniforms.uGravity.value;
      const rep = state.uniforms.uRepel.value;
      const flat = state.uniforms.uFlatten.value;
      const ox = topo.nodeOffsets[nodeId * 3];
      const oy = topo.nodeOffsets[nodeId * 3 + 1];
      const oz = topo.nodeOffsets[nodeId * 3 + 2];
      return new THREE.Vector3(
        topo.hDir[nodeId * 3] * (topo.hRad[nodeId] / grav) + topo.lDir[nodeId * 3] * (topo.lDist[nodeId] * rep) + ox,
        topo.hDir[nodeId * 3 + 1] * (topo.hRad[nodeId] / grav) + topo.lDir[nodeId * 3 + 1] * (topo.lDist[nodeId] * rep) + oy,
        (topo.hDir[nodeId * 3 + 2] * (topo.hRad[nodeId] / grav) + topo.lDir[nodeId * 3 + 2] * (topo.lDist[nodeId] * rep)) * (1.0 - flat) + oz,
      );
    }

    function updateNodeOffset(nodeId: number, worldPos: THREE.Vector3) {
      const topo = state.topology;
      const grav = state.uniforms.uGravity.value;
      const rep = state.uniforms.uRepel.value;
      const flat = state.uniforms.uFlatten.value;
      // offset = worldPos - basePos
      topo.nodeOffsets[nodeId * 3] = worldPos.x - (topo.hDir[nodeId * 3] * (topo.hRad[nodeId] / grav) + topo.lDir[nodeId * 3] * (topo.lDist[nodeId] * rep));
      topo.nodeOffsets[nodeId * 3 + 1] = worldPos.y - (topo.hDir[nodeId * 3 + 1] * (topo.hRad[nodeId] / grav) + topo.lDir[nodeId * 3 + 1] * (topo.lDist[nodeId] * rep));
      topo.nodeOffsets[nodeId * 3 + 2] = worldPos.z - (topo.hDir[nodeId * 3 + 2] * (topo.hRad[nodeId] / grav) + topo.lDir[nodeId * 3 + 2] * (topo.lDist[nodeId] * rep)) * (1.0 - flat);

      // Activate this node + all neighbors for physics simulation
      topo.activeNodes.add(nodeId);
      const nbs = topo.nodeAdjacency[nodeId];
      for (let i = 0; i < nbs.length; i++) {
        topo.activeNodes.add(nbs[i]);
      }

      // Update node buffer
      if (state.pointsMesh) {
        const attr = state.pointsMesh.geometry.attributes.aOffset as THREE.BufferAttribute;
        attr.setXYZ(nodeId, topo.nodeOffsets[nodeId * 3], topo.nodeOffsets[nodeId * 3 + 1], topo.nodeOffsets[nodeId * 3 + 2]);
        attr.needsUpdate = true;
      }

      // Update edge buffers
      if (state.linesMesh) {
        const edgeAttr = state.linesMesh.geometry.attributes.aOffset as THREE.BufferAttribute;
        const map = topo.edgeNodeMap;
        const nEdges = map.length / 2;
        for (let i = 0; i < nEdges; i++) {
          if (map[i * 2] === nodeId) {
            edgeAttr.setXYZ(i * 2, topo.nodeOffsets[nodeId * 3], topo.nodeOffsets[nodeId * 3 + 1], topo.nodeOffsets[nodeId * 3 + 2]);
          }
          if (map[i * 2 + 1] === nodeId) {
            edgeAttr.setXYZ(i * 2 + 1, topo.nodeOffsets[nodeId * 3], topo.nodeOffsets[nodeId * 3 + 1], topo.nodeOffsets[nodeId * 3 + 2]);
          }
        }
        edgeAttr.needsUpdate = true;
      }
    }

    // Register on container with capture phase — runs BEFORE OrbitControls on canvas
    const onPointerDown = (e: PointerEvent) => {
      clickStartX = e.clientX;
      clickStartY = e.clientY;
      didDrag = false;

      if (camera.position.distanceTo(controls.target) > ZOOM_THRESHOLD) return;

      const hitId = getRaycastedNodeId(e.clientX, e.clientY, state, container);
      if (hitId !== -1) {
        e.stopPropagation(); // prevent OrbitControls from capturing
        state.dragNodeId = hitId;
        controls.enabled = false;
        renderer.domElement.style.cursor = 'grabbing';

        // Drag plane perpendicular to camera through node
        const nodePos = getNodeWorldPos(hitId);
        const camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir);
        state.dragPlane.setFromNormalAndCoplanarPoint(camDir, nodePos);

        // Offset so node doesn't jump to cursor
        getMouseNDC(e);
        raycaster.setFromCamera(mouseNDC, camera);
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(state.dragPlane, intersection);
        if (intersection) {
          state.dragOffset.copy(nodePos).sub(intersection);
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const wasDragging = state.dragNodeId !== -1;
      state.dragNodeId = -1;
      controls.enabled = true;

      if (wasDragging && didDrag) {
        renderer.domElement.style.cursor = 'pointer';
        return;
      }

      if (Math.hypot(e.clientX - clickStartX, e.clientY - clickStartY) > 5) return;
      if (camera.position.distanceTo(controls.target) > ZOOM_THRESHOLD) return;

      const closestId = getRaycastedNodeId(e.clientX, e.clientY, state, container);

      if (state.selectedNodeId !== -1) {
        const neighbors = state.topology.nodeAdjacency[state.selectedNodeId];
        const isValidClick = closestId === state.selectedNodeId ||
          (closestId !== -1 && neighbors.includes(closestId));

        if (isValidClick && closestId !== state.selectedNodeId) {
          state.selectedNodeId = closestId;
          applyHighlight(state, closestId);
          showNodeCard(state, closestId);
        } else if (!isValidClick) {
          exitLocalView(state);
        }
      } else {
        if (closestId !== -1) {
          state.selectedNodeId = closestId;
          applyHighlight(state, closestId);
          showNodeCard(state, closestId);
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      // Dragging a node
      if (state.dragNodeId !== -1) {
        e.stopPropagation();
        didDrag = true;
        getMouseNDC(e);
        raycaster.setFromCamera(mouseNDC, camera);
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(state.dragPlane, intersection);
        if (intersection) {
          intersection.add(state.dragOffset);
          updateNodeOffset(state.dragNodeId, intersection);
        }
        return;
      }

      const currentZoom = camera.position.distanceTo(controls.target);
      if (currentZoom > ZOOM_THRESHOLD) {
        if (state.selectedNodeId === -1 && state.hoveredNodeId !== -1) {
          state.hoveredNodeId = -1;
          applyHighlight(state, -1);
        }
        renderer.domElement.style.cursor = 'grab';
        return;
      }

      const closestId = getRaycastedNodeId(e.clientX, e.clientY, state, container);

      if (state.selectedNodeId !== -1) {
        const neighbors = state.topology.nodeAdjacency[state.selectedNodeId];
        const isValid = closestId === state.selectedNodeId ||
          (closestId !== -1 && neighbors.includes(closestId));
        renderer.domElement.style.cursor = isValid ? 'pointer' : 'grab';
      } else {
        if (closestId !== state.hoveredNodeId) {
          state.hoveredNodeId = closestId;
          applyHighlight(state, closestId);
          renderer.domElement.style.cursor = closestId !== -1 ? 'pointer' : 'grab';
        }
      }
    };

    container.addEventListener('pointerdown', onPointerDown, { capture: true });
    container.addEventListener('pointerup', onPointerUp, { capture: true });
    container.addEventListener('pointermove', onPointerMove, { capture: true });

    // Animation loop
    const animate = () => {
      state.raf = requestAnimationFrame(animate);
      controls.update();

      // Smooth uniform transitions
      state.uniforms.uGravity.value += (state.targetUniforms.gravity - state.uniforms.uGravity.value) * 0.1;
      state.uniforms.uRepel.value += (state.targetUniforms.repel - state.uniforms.uRepel.value) * 0.1;
      state.uniforms.uSizeMult.value += (state.targetUniforms.size - state.uniforms.uSizeMult.value) * 0.15;
      state.uniforms.uOpacity.value += (state.targetUniforms.opacity - state.uniforms.uOpacity.value) * 0.15;
      state.uniforms.uFlatten.value += (state.targetUniforms.flatten - state.uniforms.uFlatten.value) * 0.08;

      // 2D mode: smoothly move camera to front view
      if (state.targetUniforms.flatten > 0.5) {
        const cam = camera.position;
        const dist = cam.distanceTo(controls.target);
        const targetPos = new THREE.Vector3(controls.target.x, controls.target.y, dist);
        cam.lerp(targetPos, 0.08);
        camera.up.lerp(new THREE.Vector3(0, 1, 0), 0.08);
      }

      // Physics simulation step — forces propagate from dragged/active nodes
      stepPhysics(state);

      // Update zoom level
      const currentZoom = camera.position.distanceTo(controls.target);
      if (currentZoom > ZOOM_THRESHOLD) {
        setZoomLevel('macro');
      } else if (state.selectedNodeId !== -1) {
        setZoomLevel('local');
      } else {
        setZoomLevel('micro');
      }

      composer.render();
    };
    animate();

    return () => {
      cancelAnimationFrame(state.raf);
      window.removeEventListener('resize', onResize);
      container.removeEventListener('pointerdown', onPointerDown, { capture: true });
      container.removeEventListener('pointerup', onPointerUp, { capture: true });
      container.removeEventListener('pointermove', onPointerMove, { capture: true });
      renderer.dispose();
      composer.dispose();
      container.removeChild(renderer.domElement);
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Sync control values to uniforms
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    s.targetUniforms.gravity = controlValues.gravity;
    s.targetUniforms.repel = controlValues.repel;
    s.targetUniforms.size = controlValues.size;
    s.targetUniforms.opacity = controlValues.opacity;
  }, [controlValues.gravity, controlValues.repel, controlValues.size, controlValues.opacity]);

  // Sync orbit/pan mode + dimension
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;

    const is2D = dimension === '2D';

    if (is2D) {
      // 2D: pan only, no rotation
      s.controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
      s.controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
      s.controls.enableRotate = false;
      s.targetUniforms.flatten = 1.0;
    } else {
      s.controls.enableRotate = true;
      s.targetUniforms.flatten = 0.0;
      if (mode === 'orbit') {
        s.controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
        s.controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
        s.controls.target.set(0, 0, 0);
      } else {
        s.controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
        s.controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
      }
    }
  }, [mode, dimension]);

  // ─── Physics simulation ─────────────────────────────────────────

  function getNodeBasePos(topo: Topology, i: number, grav: number, rep: number, flat: number): [number, number, number] {
    const x = topo.hDir[i * 3] * (topo.hRad[i] / grav) + topo.lDir[i * 3] * (topo.lDist[i] * rep);
    const y = topo.hDir[i * 3 + 1] * (topo.hRad[i] / grav) + topo.lDir[i * 3 + 1] * (topo.lDist[i] * rep);
    const z = (topo.hDir[i * 3 + 2] * (topo.hRad[i] / grav) + topo.lDir[i * 3 + 2] * (topo.lDist[i] * rep)) * (1.0 - flat);
    return [x, y, z];
  }

  function stepPhysics(state: NonNullable<typeof sceneRef.current>) {
    const topo = state.topology;
    if (topo.activeNodes.size === 0) return;

    const grav = state.uniforms.uGravity.value;
    const rep = state.uniforms.uRepel.value;
    const flat = state.uniforms.uFlatten.value;
    const SPRING_K = 0.02;    // spring stiffness
    const DAMPING = 0.88;     // velocity damping per frame
    const MIN_VEL = 0.05;     // below this, deactivate
    const offs = topo.nodeOffsets;
    const vels = topo.nodeVelocities;
    const toRemove: number[] = [];

    // Collect nodes to process (active + their neighbors for force propagation)
    const activeArr = Array.from(topo.activeNodes);
    const processSet = new Set<number>(activeArr);
    for (let ai = 0; ai < activeArr.length; ai++) {
      const neighbors = topo.nodeAdjacency[activeArr[ai]];
      for (let ni = 0; ni < neighbors.length; ni++) {
        processSet.add(neighbors[ni]);
      }
    }

    const processArr = Array.from(processSet);
    for (let pi = 0; pi < processArr.length; pi++) {
      const nodeId = processArr[pi];
      // Skip the currently dragged node — user controls it directly
      if (nodeId === state.dragNodeId) continue;

      // Compute current world position
      const [bx, by, bz] = getNodeBasePos(topo, nodeId, grav, rep, flat);
      const px = bx + offs[nodeId * 3];
      const py = by + offs[nodeId * 3 + 1];
      const pz = bz + offs[nodeId * 3 + 2];

      // Sum spring forces from all connected neighbors
      let fx = 0, fy = 0, fz = 0;
      const neighbors = topo.nodeAdjacency[nodeId];
      for (let ni = 0; ni < neighbors.length; ni++) {
        const nb = neighbors[ni];
        const [nbx, nby, nbz] = getNodeBasePos(topo, nb, grav, rep, flat);
        const npx = nbx + offs[nb * 3];
        const npy = nby + offs[nb * 3 + 1];
        const npz = nbz + offs[nb * 3 + 2];

        // Current distance
        const dx = npx - px, dy = npy - py, dz = npz - pz;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

        // Rest distance (from base positions, no offsets)
        const rbx = nbx - bx, rby = nby - by, rbz = nbz - bz;
        const restDist = Math.sqrt(rbx * rbx + rby * rby + rbz * rbz) || 1;

        // Spring force: pull toward rest distance
        const stretch = dist - restDist;
        const force = stretch * SPRING_K;
        fx += (dx / dist) * force;
        fy += (dy / dist) * force;
        fz += (dz / dist) * force;
      }

      // Also add a gentle return-to-origin force (pulls offset back to 0)
      fx -= offs[nodeId * 3] * 0.003;
      fy -= offs[nodeId * 3 + 1] * 0.003;
      fz -= offs[nodeId * 3 + 2] * 0.003;

      // Integrate velocity
      vels[nodeId * 3] = (vels[nodeId * 3] + fx) * DAMPING;
      vels[nodeId * 3 + 1] = (vels[nodeId * 3 + 1] + fy) * DAMPING;
      vels[nodeId * 3 + 2] = (vels[nodeId * 3 + 2] + fz) * DAMPING;

      // Integrate position
      offs[nodeId * 3] += vels[nodeId * 3];
      offs[nodeId * 3 + 1] += vels[nodeId * 3 + 1];
      offs[nodeId * 3 + 2] += vels[nodeId * 3 + 2];

      // Activate this node if it has velocity, deactivate if settled
      const speed = Math.abs(vels[nodeId * 3]) + Math.abs(vels[nodeId * 3 + 1]) + Math.abs(vels[nodeId * 3 + 2]);
      if (speed > MIN_VEL) {
        topo.activeNodes.add(nodeId);
      } else if (speed < MIN_VEL && nodeId !== state.dragNodeId) {
        toRemove.push(nodeId);
        vels[nodeId * 3] = 0;
        vels[nodeId * 3 + 1] = 0;
        vels[nodeId * 3 + 2] = 0;
      }
    }

    for (let ri = 0; ri < toRemove.length; ri++) topo.activeNodes.delete(toRemove[ri]);

    // Batch-update GPU buffers
    if (state.pointsMesh) {
      const attr = state.pointsMesh.geometry.attributes.aOffset as THREE.BufferAttribute;
      for (let pi = 0; pi < processArr.length; pi++) {
        const nid = processArr[pi];
        attr.setXYZ(nid, offs[nid * 3], offs[nid * 3 + 1], offs[nid * 3 + 2]);
      }
      attr.needsUpdate = true;
    }

    if (state.linesMesh) {
      const edgeAttr = state.linesMesh.geometry.attributes.aOffset as THREE.BufferAttribute;
      const map = topo.edgeNodeMap;
      // Only update edges connected to processed nodes
      for (let pi = 0; pi < processArr.length; pi++) {
        const nid = processArr[pi];
        const nodeEdgeList = topo.nodeEdges[nid];
        for (let ei = 0; ei < nodeEdgeList.length; ei++) {
          const edgeIdx = nodeEdgeList[ei];
          const en1 = map[edgeIdx * 2], en2 = map[edgeIdx * 2 + 1];
          edgeAttr.setXYZ(edgeIdx * 2, offs[en1 * 3], offs[en1 * 3 + 1], offs[en1 * 3 + 2]);
          edgeAttr.setXYZ(edgeIdx * 2 + 1, offs[en2 * 3], offs[en2 * 3 + 1], offs[en2 * 3 + 2]);
        }
      }
      edgeAttr.needsUpdate = true;
    }
  }

  // ─── Helper functions ────────────────────────────────────────────

  function rebuildNetwork(
    state: NonNullable<typeof sceneRef.current>,
    nNodes: number,
    edgeDensity: number,
  ) {
    if (state.pointsMesh) {
      state.pointsMesh.geometry.dispose();
      (state.pointsMesh.material as THREE.Material).dispose();
      state.scene.remove(state.pointsMesh);
    }
    if (state.linesMesh) {
      state.linesMesh.geometry.dispose();
      (state.linesMesh.material as THREE.Material).dispose();
      state.scene.remove(state.linesMesh);
    }

    const realNodes = graphData?.nodes;
    const realEdges = graphData?.edges;
    const { topology, edgeIndices } = buildTopology(nNodes, edgeDensity, realNodes ?? undefined, realEdges ?? undefined);
    topology.nodeOffsets = new Float32Array(nNodes * 3); // all zeros
    topology.edgeNodeMap = new Int32Array(edgeIndices);
    state.topology = topology;
    state.selectedNodeId = -1;
    state.hoveredNodeId = -1;
    state.dragNodeId = -1;

    // Build node sizes
    const sizes = new Float32Array(nNodes);
    const ids = new Float32Array(nNodes);
    const nHighlights = new Float32Array(nNodes);
    const numCoreHubs = Math.max(10, Math.floor(nNodes * 0.005));
    const numSubHubs = Math.max(50, Math.floor(nNodes * 0.05));
    for (let i = 0; i < nNodes; i++) {
      ids[i] = i;
      nHighlights[i] = 0.0;
      if (i < numCoreHubs) sizes[i] = 12.0 + Math.random() * 8.0;
      else if (i < numCoreHubs + numSubHubs) sizes[i] = 4.0 + Math.random() * 3.0;
      else sizes[i] = 1.0 + Math.random() * 1.5;
    }

    // Node geometry
    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nNodes * 3), 3));
    nodeGeo.setAttribute('hubDir', new THREE.BufferAttribute(topology.hDir, 3));
    nodeGeo.setAttribute('hubBaseR', new THREE.BufferAttribute(topology.hRad, 1));
    nodeGeo.setAttribute('leafDir', new THREE.BufferAttribute(topology.lDir, 3));
    nodeGeo.setAttribute('leafBaseDist', new THREE.BufferAttribute(topology.lDist, 1));
    nodeGeo.setAttribute('baseSize', new THREE.BufferAttribute(sizes, 1));
    nodeGeo.setAttribute('aNodeId', new THREE.BufferAttribute(ids, 1));
    nodeGeo.setAttribute('aHighlight', new THREE.BufferAttribute(nHighlights, 1));
    nodeGeo.setAttribute('aOffset', new THREE.BufferAttribute(new Float32Array(nNodes * 3), 3));

    const nodeMat = new THREE.ShaderMaterial({
      uniforms: state.uniforms,
      vertexShader: NODE_VERTEX,
      fragmentShader: NODE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    state.pointsMesh = new THREE.Points(nodeGeo, nodeMat);
    state.pointsMesh.frustumCulled = false;
    state.scene.add(state.pointsMesh);

    // Edge geometry
    const nEdges = edgeIndices.length / 2;
    const e_hDir = new Float32Array(nEdges * 2 * 3);
    const e_hRad = new Float32Array(nEdges * 2);
    const e_lDir = new Float32Array(nEdges * 2 * 3);
    const e_lDist = new Float32Array(nEdges * 2);
    const eHighlights = new Float32Array(nEdges * 2);

    for (let i = 0; i < nEdges; i++) {
      const n1 = edgeIndices[i * 2], n2 = edgeIndices[i * 2 + 1];
      eHighlights[i * 2] = 0.0;
      eHighlights[i * 2 + 1] = 0.0;

      e_hDir[i * 6] = topology.hDir[n1 * 3];
      e_hDir[i * 6 + 1] = topology.hDir[n1 * 3 + 1];
      e_hDir[i * 6 + 2] = topology.hDir[n1 * 3 + 2];
      e_hRad[i * 2] = topology.hRad[n1];
      e_lDir[i * 6] = topology.lDir[n1 * 3];
      e_lDir[i * 6 + 1] = topology.lDir[n1 * 3 + 1];
      e_lDir[i * 6 + 2] = topology.lDir[n1 * 3 + 2];
      e_lDist[i * 2] = topology.lDist[n1];

      e_hDir[i * 6 + 3] = topology.hDir[n2 * 3];
      e_hDir[i * 6 + 4] = topology.hDir[n2 * 3 + 1];
      e_hDir[i * 6 + 5] = topology.hDir[n2 * 3 + 2];
      e_hRad[i * 2 + 1] = topology.hRad[n2];
      e_lDir[i * 6 + 3] = topology.lDir[n2 * 3];
      e_lDir[i * 6 + 4] = topology.lDir[n2 * 3 + 1];
      e_lDir[i * 6 + 5] = topology.lDir[n2 * 3 + 2];
      e_lDist[i * 2 + 1] = topology.lDist[n2];
    }

    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nEdges * 2 * 3), 3));
    edgeGeo.setAttribute('hubDir', new THREE.BufferAttribute(e_hDir, 3));
    edgeGeo.setAttribute('hubBaseR', new THREE.BufferAttribute(e_hRad, 1));
    edgeGeo.setAttribute('leafDir', new THREE.BufferAttribute(e_lDir, 3));
    edgeGeo.setAttribute('leafBaseDist', new THREE.BufferAttribute(e_lDist, 1));
    edgeGeo.setAttribute('aHighlight', new THREE.BufferAttribute(eHighlights, 1));
    edgeGeo.setAttribute('aOffset', new THREE.BufferAttribute(new Float32Array(nEdges * 2 * 3), 3));

    const edgeMat = new THREE.ShaderMaterial({
      uniforms: state.uniforms,
      vertexShader: EDGE_VERTEX,
      fragmentShader: EDGE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    state.linesMesh = new THREE.LineSegments(edgeGeo, edgeMat);
    state.linesMesh.frustumCulled = false;
    state.scene.add(state.linesMesh);

    // Close card
    setSelectedCard(null);
  }

  function applyHighlight(
    state: NonNullable<typeof sceneRef.current>,
    targetId: number,
  ) {
    if (!state.pointsMesh || !state.linesMesh) return;
    const nArr = (state.pointsMesh.geometry.attributes.aHighlight as THREE.BufferAttribute).array as Float32Array;
    const eArr = (state.linesMesh.geometry.attributes.aHighlight as THREE.BufferAttribute).array as Float32Array;

    if (targetId === -1) {
      nArr.fill(0.0);
      eArr.fill(0.0);
    } else {
      nArr.fill(1.0);
      eArr.fill(1.0);
      nArr[targetId] = 2.0;
      const neighbors = state.topology.nodeAdjacency[targetId];
      for (const n of neighbors) nArr[n] = 2.0;
      const edges = state.topology.nodeEdges[targetId];
      for (const ei of edges) { eArr[ei * 2] = 2.0; eArr[ei * 2 + 1] = 2.0; }
    }

    (state.pointsMesh.geometry.attributes.aHighlight as THREE.BufferAttribute).needsUpdate = true;
    (state.linesMesh.geometry.attributes.aHighlight as THREE.BufferAttribute).needsUpdate = true;
  }

  function showNodeCard(
    state: NonNullable<typeof sceneRef.current>,
    nodeId: number,
  ) {
    state.uniforms.uSelectedNode.value = nodeId;
    setSelectedCard({
      id: nodeId,
      title: state.topology.nodeLabels[nodeId] || `Node ${nodeId}`,
      domain: state.topology.nodeDomains[nodeId] || 'knowledge',
      tag: `#${state.topology.nodeDomains[nodeId] || 'concept'}`,
    });
  }

  function exitLocalView(state: NonNullable<typeof sceneRef.current>) {
    state.selectedNodeId = -1;
    state.hoveredNodeId = -1;
    applyHighlight(state, -1);
    state.uniforms.uSelectedNode.value = -1.0;
    setSelectedCard(null);
  }

  function getRaycastedNodeId(
    clientX: number,
    clientY: number,
    state: NonNullable<typeof sceneRef.current>,
    container: HTMLDivElement,
  ): number {
    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    let closestId = -1;
    let minDist = Infinity;
    const threshold = 0.03;
    const grav = state.uniforms.uGravity.value;
    const rep = state.uniforms.uRepel.value;
    const flat = state.uniforms.uFlatten.value;
    const topo = state.topology;
    const pos = new THREE.Vector3();

    for (let i = 0; i < topo.nNodes; i++) {
      pos.x = topo.hDir[i * 3] * (topo.hRad[i] / grav) + topo.lDir[i * 3] * (topo.lDist[i] * rep) + topo.nodeOffsets[i * 3];
      pos.y = topo.hDir[i * 3 + 1] * (topo.hRad[i] / grav) + topo.lDir[i * 3 + 1] * (topo.lDist[i] * rep) + topo.nodeOffsets[i * 3 + 1];
      pos.z = (topo.hDir[i * 3 + 2] * (topo.hRad[i] / grav) + topo.lDir[i * 3 + 2] * (topo.lDist[i] * rep)) * (1.0 - flat) + topo.nodeOffsets[i * 3 + 2];
      pos.project(state.camera);
      if (pos.z > 1.0 || pos.z < -1.0) continue;
      const dist = mouse.distanceTo(new THREE.Vector2(pos.x, pos.y));
      if (dist < threshold && dist < minDist) { minDist = dist; closestId = i; }
    }
    return closestId;
  }

  // ─── Control handlers ────────────────────────────────────────────

  const handleShuffle = useCallback(() => {
    const s = sceneRef.current;
    if (!s) return;
    rebuildNetwork(s, controlValues.nodes, controlValues.edgeDensity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlValues.nodes, controlValues.edgeDensity, graphData]);

  const updateControl = useCallback((key: string, value: number) => {
    setControlValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleCloseCard = useCallback(() => {
    const s = sceneRef.current;
    if (s) exitLocalView(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Render ──────────────────────────────────────────────────────

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        cursor: 'grab',
      }}
    >
      {/* Loading */}
      {loading && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'rgba(255,255,255,0.5)',
            animation: 'blink 1s ease-in-out infinite',
          }} />
        </div>
      )}

      {/* Control Panel */}
      <div style={{
        position: 'absolute', top: 20, left: 20,
        background: 'rgba(20, 20, 20, 0.65)',
        padding: 20, borderRadius: 8,
        border: '1px solid rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(12px)',
        width: 280, zIndex: 100,
        maxHeight: '85vh', overflowY: 'auto',
      }}>
        <h3 style={{
          margin: '0 0 15px', fontSize: 14,
          borderBottom: '1px solid rgba(255,255,255,0.2)',
          paddingBottom: 10, fontWeight: 600, letterSpacing: 1,
          color: '#fff',
        }}>
          NAVIGATION & FORCES
        </h3>

        {/* Dimension toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <ModeButton label="3D" active={dimension === '3D'} onClick={() => setDimension('3D')} />
          <ModeButton label="2D" active={dimension === '2D'} onClick={() => setDimension('2D')} />
        </div>

        {/* Mode buttons (hidden in 2D — pan only) */}
        {dimension === '3D' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 25 }}>
            <ModeButton label="중심 고정" active={mode === 'orbit'} onClick={() => setMode('orbit')} />
            <ModeButton label="무한 탐색" active={mode === 'pan'} onClick={() => setMode('pan')} />
          </div>
        )}
        {dimension === '2D' && <div style={{ marginBottom: 25 }} />}

        <ControlSlider label="노드 수" value={controlValues.nodes} min={1000} max={50000} step={1000}
          onChange={v => updateControl('nodes', v)} />
        <ControlSlider label="엣지 강도" value={controlValues.edgeDensity} min={1.0} max={5.0} step={0.1}
          onChange={v => updateControl('edgeDensity', v)} />

        <div style={{ marginTop: 25, borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: 15 }}>
          <ControlSlider label="노드 크기" value={controlValues.size} min={0.1} max={3.0} step={0.1}
            onChange={v => updateControl('size', v)} />
          <ControlSlider label="중심 인력" value={controlValues.gravity} min={0.2} max={3.0} step={0.1}
            onChange={v => updateControl('gravity', v)} />
          <ControlSlider label="반발력 / 거리" value={controlValues.repel} min={0.1} max={3.0} step={0.1}
            onChange={v => updateControl('repel', v)} />
          <ControlSlider label="선 투명도" value={controlValues.opacity} min={0.01} max={0.2} step={0.01}
            onChange={v => updateControl('opacity', v)} />
        </div>

        <button
          onClick={handleShuffle}
          style={{
            width: '100%', padding: 12,
            background: 'rgba(255,255,255,0.1)', color: '#fff',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 4, fontWeight: 'bold', cursor: 'pointer',
            marginTop: 5, fontSize: 12, transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
        >
          네트워크 랜덤 셔플
        </button>
      </div>

      {/* Zoom Indicator */}
      <div style={{
        position: 'absolute', top: 30, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(0, 0, 0, 0.5)',
        border: zoomLevel === 'local'
          ? '1px solid rgba(0, 242, 255, 0.4)'
          : '1px solid rgba(255, 255, 255, 0.1)',
        padding: '8px 16px', borderRadius: 20,
        fontSize: 11, fontWeight: 600,
        backdropFilter: 'blur(4px)', zIndex: 100,
        color: zoomLevel === 'local' ? '#00f2ff' : zoomLevel === 'micro' ? '#fff' : '#888',
        transition: 'all 0.3s', pointerEvents: 'none', letterSpacing: 0.5,
      }}>
        {zoomLevel === 'macro' && '거시적 뷰 (더 확대하여 탐색)'}
        {zoomLevel === 'micro' && '미시적 뷰 (클릭 시 로컬 뷰 진입)'}
        {zoomLevel === 'local' && '로컬 뷰 (빈 공간 클릭 시 해제)'}
      </div>

      {/* Info Card */}
      <div style={{
        position: 'absolute', top: 20,
        right: selectedCard ? 20 : -400,
        width: 320,
        background: 'rgba(25, 25, 30, 0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: 12, padding: 25,
        boxShadow: '-5px 10px 30px rgba(0,0,0,0.5)',
        transition: 'right 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
        zIndex: 200,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, lineHeight: 1.3, color: '#fff' }}>
            {selectedCard?.title}
          </h2>
          <button
            onClick={handleCloseCard}
            style={{
              background: 'none', border: 'none', color: '#888',
              fontSize: 24, cursor: 'pointer', lineHeight: 1, padding: 0, marginLeft: 15,
            }}
          >
            &times;
          </button>
        </div>
        <span style={{
          display: 'inline-block',
          background: 'rgba(0, 242, 255, 0.15)', color: '#00f2ff',
          padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
          marginBottom: 15, border: '1px solid rgba(0,242,255,0.3)',
        }}>
          {selectedCard?.tag}
        </span>
        <div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.6, marginBottom: 25, minHeight: 60 }}>
          대화에서 추출된 데이터 노드입니다.
        </div>
        <div style={{
          borderTop: '1px dashed rgba(255,255,255,0.15)',
          paddingTop: 15, fontSize: 11, color: '#666',
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span>ID: {selectedCard?.id}</span>
          <span>Domain: {selectedCard?.domain}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────

function ModeButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '10px 0',
        background: active ? '#fff' : 'rgba(0,0,0,0.5)',
        color: active ? '#000' : '#888',
        border: active ? '1px solid #fff' : '1px solid rgba(255,255,255,0.2)',
        borderRadius: 4, fontSize: 11, fontWeight: 'bold', cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: active ? '0 0 10px rgba(255,255,255,0.3)' : 'none',
      }}
    >
      {label}
    </button>
  );
}

function ControlSlider({ label, value, min, max, step, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <label style={{ fontSize: 11, color: '#bbb', letterSpacing: 0.5 }}>{label}</label>
        <input
          type="number"
          value={value}
          step={step}
          onChange={e => onChange(parseFloat(e.target.value) || min)}
          style={{
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff', padding: 4, borderRadius: 4,
            width: 55, textAlign: 'right' as const,
            fontFamily: 'monospace', fontSize: 11,
          }}
        />
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', cursor: 'pointer', accentColor: '#fff', height: 4 }}
      />
    </div>
  );
}
