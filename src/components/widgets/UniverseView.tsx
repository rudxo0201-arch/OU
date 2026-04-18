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
  attribute vec3 aPos;

  varying float vIsSelected;
  varying float vHighlight;

  void main() {
    vec3 finalPos = aPos * uSpread;
    finalPos.z *= (1.0 - uFlatten);
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
  uniform float uFlatten;
  uniform float uSpread;
  attribute vec3 aPos;
  attribute float aHighlight;
  varying float vHighlight;
  void main() {
    vec3 finalPos = aPos * uSpread;
    finalPos.z *= (1.0 - uFlatten);
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

// ─── Topology ────────────────────────────────────────────────────────
interface Topology {
  nNodes: number;
  positions: Float32Array;   // [x,y,z] per node
  nodeAdjacency: number[][];
  nodeEdges: number[][];
  nodeLabels: string[];
  nodeDomains: string[];
  nodeIds: string[];         // real DB ids
  nodeVelocities: Float32Array;
  activeNodes: Set<number>;
  edgeNodeMap: Int32Array;
}

// ─── Build topology from real data ───────────────────────────────────
function buildFromRealData(
  nodes: GraphNode[],
  edges: GraphEdge[],
): { topology: Topology; edgeIndices: number[] } {
  const nNodes = nodes.length;
  const idToIdx = new Map<string, number>();
  nodes.forEach((n, i) => idToIdx.set(n.id, i));

  // Build adjacency from real edges
  const adjacency: number[][] = Array.from({ length: nNodes }, () => []);
  const edgeIndices: number[] = [];
  const nodeEdgesList: number[][] = Array.from({ length: nNodes }, () => []);

  let edgeIdx = 0;
  for (const e of edges) {
    const si = idToIdx.get(e.source);
    const ti = idToIdx.get(e.target);
    if (si === undefined || ti === undefined || si === ti) continue;
    adjacency[si].push(ti);
    adjacency[ti].push(si);
    edgeIndices.push(si, ti);
    nodeEdgesList[si].push(edgeIdx);
    nodeEdgesList[ti].push(edgeIdx);
    edgeIdx++;
  }

  // Compute degree for each node
  const degrees = adjacency.map(a => a.length);

  // Find hubs: top 5% by degree (min 5 hubs)
  const sorted = degrees.map((d, i) => ({ d, i })).sort((a, b) => b.d - a.d);
  const numHubs = Math.max(5, Math.floor(nNodes * 0.05));
  const hubSet = new Set<number>();
  for (let i = 0; i < Math.min(numHubs, sorted.length); i++) {
    if (sorted[i].d > 0) hubSet.add(sorted[i].i);
  }

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
      nodeAdjacency: adjacency,
      nodeEdges: nodeEdgesList,
      nodeLabels: nodes.map(n => n.label),
      nodeDomains: nodes.map(n => n.domain),
      nodeIds: nodes.map(n => n.id),
      nodeVelocities: new Float32Array(nNodes * 3),
      activeNodes: new Set(),
      edgeNodeMap: new Int32Array(edgeIndices),
    },
    edgeIndices,
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
    realId: string;
  } | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');

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
      nNodes: 0, positions: new Float32Array(0),
      nodeAdjacency: [], nodeEdges: [], nodeLabels: [], nodeDomains: [], nodeIds: [],
      nodeVelocities: new Float32Array(0), activeNodes: new Set(), edgeNodeMap: new Int32Array(0),
    };

    const state = {
      renderer, scene, camera, controls, composer,
      pointsMesh: null as THREE.Points | null,
      linesMesh: null as THREE.LineSegments | null,
      topology: emptyTopo, uniforms, targetUniforms,
      selectedNodeId: -1, hoveredNodeId: -1, dragNodeId: -1,
      dragPlane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
      dragOffset: new THREE.Vector3(), raf: 0,
    };
    sceneRef.current = state;

    // Fetch real data
    fetch('/api/graph')
      .then(res => { if (!res.ok) throw new Error('API error'); return res.json(); })
      .then(data => {
        if (!data.nodes || data.nodes.length === 0) { setStatus('empty'); return; }
        buildMeshes(state, data.nodes, data.edges);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));

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
      if (camera.position.distanceTo(controls.target) > ZOOM_THRESHOLD) return;
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
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const wasDragging = state.dragNodeId !== -1;
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
        if (inter) { inter.add(state.dragOffset); updateNodePos(state.dragNodeId, inter); }
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

    // Animation loop
    const animate = () => {
      state.raf = requestAnimationFrame(animate);
      controls.update();
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

      const currentZoom = camera.position.distanceTo(controls.target);
      if (currentZoom > ZOOM_THRESHOLD) setZoomLevel('macro');
      else if (state.selectedNodeId !== -1) setZoomLevel('local');
      else setZoomLevel('micro');

      composer.render();
    };
    animate();

    return () => {
      cancelAnimationFrame(state.raf);
      window.removeEventListener('resize', onResize);
      container.removeEventListener('pointerdown', onPointerDown, { capture: true });
      container.removeEventListener('pointerup', onPointerUp, { capture: true });
      container.removeEventListener('pointermove', onPointerMove, { capture: true });
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
  }, [controlValues]);

  useEffect(() => {
    const s = sceneRef.current; if (!s) return;
    if (dimension === '2D') {
      s.controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
      s.controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
      s.controls.enableRotate = false;
      s.targetUniforms.flatten = 1.0;
    } else {
      s.controls.enableRotate = true;
      s.targetUniforms.flatten = 0.0;
      if (mode === 'orbit') { s.controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE; s.controls.mouseButtons.RIGHT = THREE.MOUSE.PAN; s.controls.target.set(0, 0, 0); }
      else { s.controls.mouseButtons.LEFT = THREE.MOUSE.PAN; s.controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE; }
    }
  }, [mode, dimension]);

  // ─── Build meshes from real data ─────────────────────────────────

  function buildMeshes(
    state: NonNullable<typeof sceneRef.current>,
    nodes: GraphNode[],
    edges: GraphEdge[],
  ) {
    const { topology, edgeIndices } = buildFromRealData(nodes, edges);
    state.topology = topology;
    const nNodes = topology.nNodes;

    // Node sizes based on degree
    const sizes = new Float32Array(nNodes);
    const ids = new Float32Array(nNodes);
    const highlights = new Float32Array(nNodes);
    for (let i = 0; i < nNodes; i++) {
      ids[i] = i;
      highlights[i] = 0.0;
      const deg = topology.nodeAdjacency[i].length;
      if (deg > 50) sizes[i] = 12.0 + Math.min(deg * 0.1, 8);
      else if (deg > 10) sizes[i] = 4.0 + deg * 0.15;
      else sizes[i] = 1.5 + Math.random() * 1.0;
    }

    // Node geometry
    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nNodes * 3), 3));
    nodeGeo.setAttribute('aPos', new THREE.BufferAttribute(topology.positions, 3));
    nodeGeo.setAttribute('baseSize', new THREE.BufferAttribute(sizes, 1));
    nodeGeo.setAttribute('aNodeId', new THREE.BufferAttribute(ids, 1));
    nodeGeo.setAttribute('aHighlight', new THREE.BufferAttribute(highlights, 1));

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
    for (let i = 0; i < nEdges; i++) {
      const n1 = edgeIndices[i * 2], n2 = edgeIndices[i * 2 + 1];
      edgePos[i * 6] = topology.positions[n1 * 3]; edgePos[i * 6 + 1] = topology.positions[n1 * 3 + 1]; edgePos[i * 6 + 2] = topology.positions[n1 * 3 + 2];
      edgePos[i * 6 + 3] = topology.positions[n2 * 3]; edgePos[i * 6 + 4] = topology.positions[n2 * 3 + 1]; edgePos[i * 6 + 5] = topology.positions[n2 * 3 + 2];
    }

    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nEdges * 2 * 3), 3));
    edgeGeo.setAttribute('aPos', new THREE.BufferAttribute(edgePos, 3));
    edgeGeo.setAttribute('aHighlight', new THREE.BufferAttribute(edgeHL, 1));

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
    setSelectedCard({
      id: nodeId,
      title: state.topology.nodeLabels[nodeId] || `Node ${nodeId}`,
      domain: state.topology.nodeDomains[nodeId] || 'knowledge',
      tag: `#${state.topology.nodeDomains[nodeId] || 'concept'}`,
      realId: state.topology.nodeIds[nodeId],
    });
  }

  function exitLocal(state: NonNullable<typeof sceneRef.current>) {
    state.selectedNodeId = -1; state.hoveredNodeId = -1;
    applyHL(state, -1); state.uniforms.uSelectedNode.value = -1.0; setSelectedCard(null);
  }

  function getRaycastedNodeId(clientX: number, clientY: number, state: NonNullable<typeof sceneRef.current>, container: HTMLDivElement): number {
    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    let closestId = -1, minDist = Infinity;
    const threshold = 0.03;
    const topo = state.topology, flat = state.uniforms.uFlatten.value;
    const pos3 = new THREE.Vector3();
    for (let i = 0; i < topo.nNodes; i++) {
      pos3.set(topo.positions[i * 3], topo.positions[i * 3 + 1], topo.positions[i * 3 + 2] * (1.0 - flat));
      pos3.project(state.camera);
      if (pos3.z > 1.0 || pos3.z < -1.0) continue;
      const dist = mouse.distanceTo(new THREE.Vector2(pos3.x, pos3.y));
      if (dist < threshold && dist < minDist) { minDist = dist; closestId = i; }
    }
    return closestId;
  }

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
          background: 'rgba(20, 20, 20, 0.65)', padding: 20, borderRadius: 8,
          border: '1px solid rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(12px)',
          width: 240, zIndex: 100, maxHeight: '80vh', overflowY: 'auto',
        }}>
          <h3 style={{ margin: '0 0 15px', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: 10, fontWeight: 600, letterSpacing: 1, color: '#fff' }}>
            GRAPH VIEW
          </h3>

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
          <ControlSlider label="반발력 / 거리" value={controlValues.repel} min={0.2} max={3.0} step={0.1} onChange={v => updateControl('repel', v)} />
          <ControlSlider label="선 투명도" value={controlValues.opacity} min={0.01} max={0.2} step={0.01} onChange={v => updateControl('opacity', v)} />
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
        position: 'absolute', top: 20, right: selectedCard ? 20 : -400, width: 320,
        background: 'rgba(25, 25, 30, 0.85)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: 12, padding: 25,
        boxShadow: '-5px 10px 30px rgba(0,0,0,0.5)', transition: 'right 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)', zIndex: 200,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, lineHeight: 1.3, color: '#fff' }}>{selectedCard?.title}</h2>
          <button onClick={handleCloseCard} style={{ background: 'none', border: 'none', color: '#888', fontSize: 24, cursor: 'pointer', lineHeight: 1, padding: 0, marginLeft: 15 }}>&times;</button>
        </div>
        <span style={{
          display: 'inline-block', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)',
          padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, marginBottom: 15,
          border: '1px solid rgba(255,255,255,0.2)',
        }}>
          {selectedCard?.tag}
        </span>
        <div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.6, marginBottom: 25, minHeight: 60 }}>
          {selectedCard?.domain === 'knowledge' ? '한자/본초 데이터 노드' : '데이터 노드'}
        </div>
        <div style={{
          borderTop: '1px dashed rgba(255,255,255,0.15)', paddingTop: 15, fontSize: 11, color: '#666',
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span>Domain: {selectedCard?.domain}</span>
          <span style={{ fontFamily: 'monospace', fontSize: 10 }}>{selectedCard?.realId?.slice(0, 8)}</span>
        </div>
      </div>
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
