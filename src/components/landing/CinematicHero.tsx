'use client';

import { useEffect, useRef, useState } from 'react';

// ============================================================
// GLSL: White Sun (Raymarched sphere with FBM convection)
// ============================================================
const SUN_FS = `
precision mediump float;

uniform float u_time;
uniform float u_birth;
uniform float u_starScale;
uniform vec2 u_resolution;
uniform vec2 u_starCenter;

float hash(vec3 p){
  p=fract(p*vec3(443.8975,397.2973,491.1871));
  p+=dot(p,p.yzx+19.19);
  return fract((p.x+p.y)*p.z);
}

float noise(vec3 p){
  vec3 i=floor(p);
  vec3 f=fract(p);
  f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),
                 mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                 mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}

float fbm(vec3 p){
  float v=0.0;
  v+=0.5*noise(p); p*=2.02;
  v+=0.25*noise(p); p*=2.03;
  v+=0.125*noise(p); p*=2.01;
  v+=0.0625*noise(p);
  return v;
}

void main(){
  vec2 uv=(gl_FragCoord.xy/u_resolution)*2.0-1.0;
  uv.x*=u_resolution.x/u_resolution.y;

  vec2 starPos=u_starCenter;
  starPos.x*=u_resolution.x/u_resolution.y;
  vec2 p=uv-starPos;
  float dist=length(p);

  float r=u_starScale*u_birth;
  if(r<0.001){gl_FragColor=vec4(0.0,0.0,0.0,0.0);return;}

  // Normalized distance from star center
  float nd=dist/r;

  vec3 color=vec3(0.0);
  float alpha=0.0;

  // Rotation angle for surface
  float rot=u_time*0.08;

  // ---- SPHERE SURFACE ----
  if(nd<1.0){
    // Sphere-mapped 3D position
    float z=sqrt(1.0-nd*nd);
    vec3 pos=vec3(p.x/r,p.y/r,z);
    // Rotate
    vec3 rp=vec3(pos.x*cos(rot)+pos.z*sin(rot),pos.y,-pos.x*sin(rot)+pos.z*cos(rot));

    // Surface noise (convection cells)
    float n1=fbm(rp*4.0+u_time*0.05);
    float n2=noise(rp*8.0-u_time*0.03);

    // Temperature
    float temp=0.9+n1*0.08+n2*0.04;

    // Limb darkening
    float mu=z;
    float limbR=0.35+0.65*pow(mu,0.3);
    float limbG=0.38+0.62*pow(mu,0.35);
    float limbB=0.45+0.55*pow(mu,0.42);

    // Color
    vec3 surfColor=vec3(temp)*vec3(limbR,limbG,limbB);
    surfColor+=vec3(pow(mu,0.15)*0.15);
    surfColor=min(surfColor,vec3(1.12));

    color=surfColor;
    alpha=1.0;
  }

  // ---- CORONA ----
  float cAngle=atan(p.y,p.x);

  // Inner corona
  float corona=exp(-(nd-1.0)*3.0)*0.5*u_birth*step(0.85,nd);
  // Outer glow
  float glow=exp(-nd*0.5)*0.15*u_birth;
  // Streamers
  float st=fbm(vec3(cAngle*2.0,nd*2.0,u_time*0.06));
  float streamers=pow(max(st,0.0),2.0)*exp(-(nd-1.0)*1.5)*0.4*u_birth;
  // Prominences
  float prom=pow(max(noise(vec3(cAngle*2.0,u_time*0.12,1.0)),0.0),4.0);
  prom*=smoothstep(0.9,1.0,nd)*smoothstep(1.6,1.05,nd)*0.5*u_birth;

  float totalCorona=corona+streamers+prom;
  vec3 coronaColor=vec3(0.9,0.93,1.0)*totalCorona;

  if(nd>=1.0){
    color=coronaColor+vec3(0.75,0.82,0.92)*glow;
    alpha=max(totalCorona,glow)*1.5;
  }else{
    color+=coronaColor*0.15;
  }

  // Wide bloom
  float bloom=exp(-nd*0.3)*0.06*u_birth;
  color+=vec3(0.8,0.85,0.95)*bloom;
  alpha=max(alpha,bloom*2.0);

  // Birth flash
  if(u_birth<0.2){
    float bp=u_birth/0.2;
    float flash=(1.0-bp)*(1.0-bp)*exp(-dist*0.6)*3.0;
    color+=vec3(1.0)*flash;
    alpha=max(alpha,flash);
  }

  alpha=clamp(alpha,0.0,1.0);
  gl_FragColor=vec4(color*alpha,alpha);
}
`;

const QUAD_VS = `
precision highp float;
attribute vec2 a_pos;
void main(){gl_Position=vec4(a_pos,0.0,1.0);}
`;

// ============================================================
// GLSL: Graph nodes (gl.POINTS)
// ============================================================
const GRAPH_NODE_VS = `
precision highp float;
attribute vec2 a_pos;
attribute float a_size;
attribute float a_alpha;
uniform vec2 u_cam;    // camera center (0-1 space)
uniform float u_zoom;  // camera zoom (1=fit, 500=extreme close)
uniform vec2 u_res;
varying float v_alpha;
void main(){
  // Transform: world (0-1) → camera → clip (-1,1)
  vec2 p = (a_pos - u_cam) * u_zoom;
  // Aspect correction
  p.x *= u_res.y / u_res.x;
  gl_Position = vec4(p, 0.0, 1.0);
  gl_PointSize = a_size * min(u_zoom * 0.3, 8.0);
  v_alpha = a_alpha;
}`;

const GRAPH_NODE_FS = `
precision highp float;
varying float v_alpha;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if(d > 0.5) discard;
  float glow = exp(-d*d*8.0);
  gl_FragColor = vec4(vec3(1.0), v_alpha * glow);
}`;

// ============================================================
// GLSL: Graph edges (gl.LINES)
// ============================================================
const GRAPH_EDGE_VS = `
precision highp float;
attribute vec2 a_pos;
attribute float a_alpha;
uniform vec2 u_cam;
uniform float u_zoom;
uniform vec2 u_res;
varying float v_alpha;
void main(){
  vec2 p = (a_pos - u_cam) * u_zoom;
  p.x *= u_res.y / u_res.x;
  gl_Position = vec4(p, 0.0, 1.0);
  v_alpha = a_alpha;
}`;

const GRAPH_EDGE_FS = `
precision highp float;
varying float v_alpha;
void main(){
  gl_FragColor = vec4(vec3(1.0), v_alpha * 0.06);
}`;

// ============================================================
// TIMELINE
// ============================================================
const T = {
  CURSOR: 0.5,
  TYPE_START: 1.0,
  TYPE_END: 2.8,
  SHRINK: 5.0,
  INPUT: 7.5,
  INPUT_TYPE: 7.8,
  INPUT_DONE: 9.2,
  FADE_INPUT: 9.8,
  TEXT1: 10.5,
  TEXT1_GONE: 12.0,
  STAR_START: 12.5,
  STAR_FULL: 14.5,
  TEXT2: 15.0,
  ZOOM_START: 17.0,
  ZOOM_END: 21.0,
  SHIFT: 22.0,
  FINAL: 23.0,
  ARROW: 25.0,
};

// ============================================================
// DATA
// ============================================================
function buildGraphData(nodeCount: number, edgeTarget: number) {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  // Node data: [x, y, size, alpha] per node
  const nData = new Float32Array(nodeCount * 4);
  for (let i = 0; i < nodeCount; i++) {
    const t = i / (nodeCount - 1);
    const y = 1 - t * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;
    const px = Math.cos(theta) * r * 0.42 + 0.5 + (Math.random() - 0.5) * 0.015;
    const py = y * 0.42 + 0.5 + (Math.random() - 0.5) * 0.015;
    const cd = Math.sqrt((px - 0.5) ** 2 + (py - 0.5) ** 2);
    const size = cd < 0.12 ? 1.5 + Math.random() * 2.0 : 0.5 + Math.random() * 1.0;
    const alpha = cd < 0.1 ? 0.5 + Math.random() * 0.45 : 0.1 + Math.random() * 0.25;
    const idx = i * 4;
    nData[idx] = px;
    nData[idx + 1] = py;
    nData[idx + 2] = size;
    nData[idx + 3] = alpha;
  }

  // Spatial grid for edges
  const cell = 0.015;
  const grid = new Map<number, number[]>();
  for (let i = 0; i < nodeCount; i++) {
    const gx = Math.floor(nData[i * 4] / cell);
    const gy = Math.floor(nData[i * 4 + 1] / cell);
    const key = gx * 10000 + gy;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key)!.push(i);
  }

  // Edge data: [x1, y1, x2, y2, alpha1, alpha2] — but for gl.LINES we need [x,y,alpha] per vertex
  const eVerts: number[] = [];
  let ec = 0;
  for (let i = 0; i < nodeCount && ec < edgeTarget; i++) {
    const x1 = nData[i * 4], y1 = nData[i * 4 + 1], a1 = nData[i * 4 + 3];
    const gx = Math.floor(x1 / cell), gy = Math.floor(y1 / cell);
    for (let dx = -1; dx <= 1 && ec < edgeTarget; dx++) {
      for (let dy = -1; dy <= 1 && ec < edgeTarget; dy++) {
        const nb = grid.get((gx + dx) * 10000 + (gy + dy));
        if (!nb) continue;
        for (const j of nb) {
          if (j <= i || Math.random() > 0.08) continue;
          const x2 = nData[j * 4], y2 = nData[j * 4 + 1], a2 = nData[j * 4 + 3];
          const d = Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
          if (d > 0.03) continue;
          eVerts.push(x1, y1, Math.min(a1, a2));
          eVerts.push(x2, y2, Math.min(a1, a2));
          ec++;
        }
      }
    }
  }

  // Find a node near bottom-left for the birth node
  let birthIdx = 0;
  let bestDist = Infinity;
  const target = { x: 0.15, y: 0.85 };
  for (let i = 0; i < nodeCount; i++) {
    const dx = nData[i * 4] - target.x, dy = nData[i * 4 + 1] - target.y;
    const d = dx * dx + dy * dy;
    if (d < bestDist) { bestDist = d; birthIdx = i; }
  }

  return {
    nodeData: nData,
    edgeData: new Float32Array(eVerts),
    edgeCount: ec,
    birthNode: { x: nData[birthIdx * 4], y: nData[birthIdx * 4 + 1] },
  };
}

// ============================================================
// WebGL helpers
// ============================================================
function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const s = gl.createShader(type);
  if (!s) { console.error('Failed to create shader object'); return null; }
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    console.error('Shader compile error:', log || '(no log available)');
    console.error('Shader source (first 200 chars):', src.substring(0, 200));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

function createProgram(gl: WebGLRenderingContext, vsSrc: string, fsSrc: string): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  if (!vs || !fs) { console.error('Shader compilation failed, cannot create program'); return null; }
  const prog = gl.createProgram();
  if (!prog) { console.error('Failed to create program object'); return null; }
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(prog) || '(no log)');
    gl.deleteProgram(prog);
    return null;
  }
  return prog;
}

// ============================================================
// Easing
// ============================================================
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(Math.max(t, 0), 1);
}

// ============================================================
// COMPONENT
// ============================================================
export function CinematicHero({ onComplete }: { onComplete?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState(-1);
  const phaseRef = useRef(-1);
  const startRef = useRef(0);
  const destroyRef = useRef(false);
  const doneRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    destroyRef.current = false;
    doneRef.current = false;

    const dpr = Math.min(window.devicePixelRatio, 2);
    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';

    const gl = canvas.getContext('webgl', { alpha: false, antialias: true, premultipliedAlpha: true })!;
    if (!gl) { console.error('WebGL not available'); return; }

    // ---- Programs ----
    const sunProg = createProgram(gl, QUAD_VS, SUN_FS);
    const nodeProg = createProgram(gl, GRAPH_NODE_VS, GRAPH_NODE_FS);
    const edgeProg = createProgram(gl, GRAPH_EDGE_VS, GRAPH_EDGE_FS);

    if (!sunProg || !nodeProg || !edgeProg) {
      console.error('One or more WebGL programs failed to compile. Check shader errors above.');
      return;
    }

    // ---- Sun quad VBO ----
    const quadBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);

    // ---- Sun uniforms ----
    const su = {
      time: gl.getUniformLocation(sunProg, 'u_time'),
      birth: gl.getUniformLocation(sunProg, 'u_birth'),
      starScale: gl.getUniformLocation(sunProg, 'u_starScale'),
      resolution: gl.getUniformLocation(sunProg, 'u_resolution'),
      starCenter: gl.getUniformLocation(sunProg, 'u_starCenter'),
    };

    // ---- Graph data ----
    const graph = buildGraphData(20000, 40000);

    // Node VBO: interleaved [x, y, size, alpha]
    const nodeBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, nodeBuf);
    gl.bufferData(gl.ARRAY_BUFFER, graph.nodeData, gl.STATIC_DRAW);

    // Edge VBO: interleaved [x, y, alpha]
    const edgeBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, edgeBuf);
    gl.bufferData(gl.ARRAY_BUFFER, graph.edgeData, gl.STATIC_DRAW);

    // ---- Node attribute locations ----
    const na = {
      pos: gl.getAttribLocation(nodeProg, 'a_pos'),
      size: gl.getAttribLocation(nodeProg, 'a_size'),
      alpha: gl.getAttribLocation(nodeProg, 'a_alpha'),
      cam: gl.getUniformLocation(nodeProg, 'u_cam'),
      zoom: gl.getUniformLocation(nodeProg, 'u_zoom'),
      res: gl.getUniformLocation(nodeProg, 'u_res'),
    };

    // ---- Edge attribute locations ----
    const ea = {
      pos: gl.getAttribLocation(edgeProg, 'a_pos'),
      alpha: gl.getAttribLocation(edgeProg, 'a_alpha'),
      cam: gl.getUniformLocation(edgeProg, 'u_cam'),
      zoom: gl.getUniformLocation(edgeProg, 'u_zoom'),
      res: gl.getUniformLocation(edgeProg, 'u_res'),
    };

    // ---- Background stars ----
    const bgStars: { x: number; y: number; s: number; sp: number; ph: number }[] = [];
    for (let i = 0; i < 200; i++) {
      bgStars.push({
        x: (Math.random() * 2 - 1),
        y: (Math.random() * 2 - 1),
        s: Math.random() * 1.5 + 0.3,
        sp: 0.3 + Math.random() * 2,
        ph: Math.random() * 6.28,
      });
    }
    // BG stars as points (reuse nodeProg with fixed camera)
    const bgData = new Float32Array(bgStars.length * 4);
    bgStars.forEach((s, i) => {
      bgData[i * 4] = s.x * 0.5 + 0.5;
      bgData[i * 4 + 1] = s.y * 0.5 + 0.5;
      bgData[i * 4 + 2] = s.s;
      bgData[i * 4 + 3] = 0.3;
    });
    const bgBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, bgBuf);
    gl.bufferData(gl.ARRAY_BUFFER, bgData, gl.STATIC_DRAW);

    // ---- Camera state ----
    const birthNode = graph.birthNode;
    const camStart = { x: birthNode.x, y: birthNode.y, zoom: 400 };
    const camEnd = { x: 0.5, y: 0.5, zoom: 2.2 };

    let animId: number;

    function render(timestamp: number) {
      if (destroyRef.current) return;
      if (!startRef.current) startRef.current = timestamp;
      const t = (timestamp - startRef.current) / 1000;

      gl.viewport(0, 0, canvas!.width, canvas!.height);
      gl.clearColor(0.024, 0.031, 0.063, 1.0); // #060810
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

      const resW = canvas!.width;
      const resH = canvas!.height;

      // ---- Camera interpolation ----
      let camX = camStart.x, camY = camStart.y, camZ = camStart.zoom;
      if (t >= T.ZOOM_START) {
        const zp = easeInOutCubic(Math.min((t - T.ZOOM_START) / (T.ZOOM_END - T.ZOOM_START), 1));
        camX = lerp(camStart.x, camEnd.x, zp);
        camY = lerp(camStart.y, camEnd.y, zp);
        camZ = lerp(camStart.zoom, camEnd.zoom, zp);
      }

      // Graph shift up after zoom
      if (t >= T.SHIFT) {
        const sp = Math.min((t - T.SHIFT) / 1.5, 1);
        camY -= 0.05 * easeInOutCubic(sp);
      }

      // ---- Draw background stars ----
      gl.useProgram(nodeProg);
      gl.uniform2f(na.cam!, 0.5, 0.5);
      gl.uniform1f(na.zoom!, 2.0);
      gl.uniform2f(na.res!, resW, resH);
      gl.bindBuffer(gl.ARRAY_BUFFER, bgBuf);
      gl.enableVertexAttribArray(na.pos);
      gl.vertexAttribPointer(na.pos, 2, gl.FLOAT, false, 16, 0);
      gl.enableVertexAttribArray(na.size);
      gl.vertexAttribPointer(na.size, 1, gl.FLOAT, false, 16, 8);
      gl.enableVertexAttribArray(na.alpha);
      gl.vertexAttribPointer(na.alpha, 1, gl.FLOAT, false, 16, 12);
      gl.drawArrays(gl.POINTS, 0, bgStars.length);

      // ---- Draw graph edges (only when zooming/zoomed) ----
      if (t >= T.ZOOM_START - 1) {
        const graphAlpha = Math.min((t - (T.ZOOM_START - 1)) / 2, 1);
        if (graphAlpha > 0) {
          gl.useProgram(edgeProg);
          gl.uniform2f(ea.cam!, camX, camY);
          gl.uniform1f(ea.zoom!, camZ);
          gl.uniform2f(ea.res!, resW, resH);
          gl.bindBuffer(gl.ARRAY_BUFFER, edgeBuf);
          gl.enableVertexAttribArray(ea.pos);
          gl.vertexAttribPointer(ea.pos, 2, gl.FLOAT, false, 12, 0);
          gl.enableVertexAttribArray(ea.alpha);
          gl.vertexAttribPointer(ea.alpha, 1, gl.FLOAT, false, 12, 8);
          gl.drawArrays(gl.LINES, 0, graph.edgeCount * 2);
        }
      }

      // ---- Draw graph nodes ----
      if (t >= T.ZOOM_START - 0.5) {
        gl.useProgram(nodeProg);
        gl.uniform2f(na.cam!, camX, camY);
        gl.uniform1f(na.zoom!, camZ);
        gl.uniform2f(na.res!, resW, resH);
        gl.bindBuffer(gl.ARRAY_BUFFER, nodeBuf);
        gl.enableVertexAttribArray(na.pos);
        gl.vertexAttribPointer(na.pos, 2, gl.FLOAT, false, 16, 0);
        gl.enableVertexAttribArray(na.size);
        gl.vertexAttribPointer(na.size, 1, gl.FLOAT, false, 16, 8);
        gl.enableVertexAttribArray(na.alpha);
        gl.vertexAttribPointer(na.alpha, 1, gl.FLOAT, false, 16, 12);
        gl.drawArrays(gl.POINTS, 0, 20000);
      }

      // ---- Draw sun ----
      const showStar = t >= T.STAR_START && t < T.ZOOM_END + 2;
      if (showStar) {
        let birth = Math.min((t - T.STAR_START) / (T.STAR_FULL - T.STAR_START), 1);
        let starScale = 0.35;

        // During zoom, star shrinks with camera
        if (t >= T.ZOOM_START) {
          const zp = easeInOutCubic(Math.min((t - T.ZOOM_START) / (T.ZOOM_END - T.ZOOM_START), 1));
          starScale = lerp(0.35, 0.002, zp);
        }

        // Star position follows camera (stays at birth node)
        let sx = (birthNode.x - camX) * camZ;
        sx *= resH / resW; // aspect correction
        let sy = (birthNode.y - camY) * camZ;

        gl.useProgram(sunProg);
        gl.uniform1f(su.time!, t);
        gl.uniform1f(su.birth!, birth);
        gl.uniform1f(su.starScale!, starScale);
        gl.uniform2f(su.resolution!, resW, resH);
        gl.uniform2f(su.starCenter!, sx, -sy); // flip Y for clip space

        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
        const posLoc = gl.getAttribLocation(sunProg!, 'a_pos');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }

      // ---- Phase updates ----
      const newPhase =
        t >= T.ARROW ? 10 :
        t >= T.FINAL ? 9 :
        t >= T.SHIFT ? 8 :
        t >= T.ZOOM_START ? 7 :
        t >= T.TEXT2 ? 6 :
        t >= T.STAR_START ? 5 :
        t >= T.TEXT1_GONE ? 4.5 :
        t >= T.TEXT1 ? 4 :
        t >= T.FADE_INPUT ? 3.5 :
        t >= T.INPUT_TYPE ? 3 :
        t >= T.INPUT ? 2.5 :
        t >= T.SHRINK ? 2 :
        t >= T.TYPE_START ? 1 :
        t >= T.CURSOR ? 0 :
        -1;

      if (newPhase !== phaseRef.current) {
        phaseRef.current = newPhase;
        setPhase(newPhase);
      }

      if (t >= T.ARROW && !doneRef.current) {
        doneRef.current = true;
        onComplete?.();
      }

      animId = requestAnimationFrame(render);
    }

    animId = requestAnimationFrame(render);

    const onResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas!.width = W * dpr;
      canvas!.height = H * dpr;
      canvas!.style.width = W + 'px';
      canvas!.style.height = H + 'px';
    };
    window.addEventListener('resize', onResize);

    return () => {
      destroyRef.current = true;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [onComplete]);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Text Overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        zIndex: 1, pointerEvents: 'none',
      }}>
        {/* Phase 0-2: Cursor + "Just Talk." */}
        {phase >= 0 && phase < 3.5 && (
          <TypeWriter
            text="Just Talk."
            active={phase >= 1}
            style={{
              fontFamily: "var(--font-orbitron, 'Orbitron')",
              fontSize: phase >= 2 ? 80 : 140,
              fontWeight: 800,
              color: '#fff',
              textShadow: '0 0 80px rgba(255,255,255,0.3), 0 0 160px rgba(255,255,255,0.1)',
              transition: 'all 2s cubic-bezier(0.4,0,0.2,1)',
              transform: phase >= 2 ? 'translateY(-80px)' : 'none',
              opacity: phase >= 3.5 ? 0 : 1,
            }}
          />
        )}

        {/* Phase 2.5-3.5: Chat input */}
        {phase >= 2.5 && phase < 3.5 && (
          <div style={{
            marginTop: 24,
            padding: '20px 40px',
            borderRadius: 999,
            border: '0.5px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.015)',
            backdropFilter: 'blur(12px)',
            minWidth: 380,
            fontSize: 20,
            color: 'rgba(255,255,255,0.45)',
            animation: 'ou-fade-in 0.5s ease',
            boxShadow: '0 0 40px rgba(255,255,255,0.03)',
            opacity: phase >= 3.5 ? 0 : 1,
            transition: 'opacity 0.5s ease',
          }}>
            {phase >= 3 ? (
              <TypeWriter text="OU와 대화하세요" active speed={55} />
            ) : (
              <BlinkCursor />
            )}
          </div>
        )}

        {/* Phase 4: "이 대화는" */}
        {phase >= 4 && phase < 5 && (
          <TypeWriter
            text="이 대화는"
            active
            speed={70}
            style={{
              fontSize: 80,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.9)',
              letterSpacing: 6,
              opacity: phase >= 4.5 ? 0 : 1,
              transition: 'opacity 0.8s ease',
            }}
          />
        )}

        {/* Phase 6: "별을 탄생시킵니다." */}
        {phase >= 6 && phase < 8 && (
          <div style={{ position: 'absolute', bottom: '25%', animation: 'ou-fade-in 0.6s ease' }}>
            <TypeWriter
              text="별을 탄생시킵니다."
              active
              speed={65}
              style={{
                fontSize: 56,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.7)',
                letterSpacing: 3,
              }}
            />
          </div>
        )}

        {/* Phase 9: Final */}
        {phase >= 9 && (
          <div style={{ position: 'absolute', bottom: '12%', animation: 'ou-fade-in 0.8s ease' }}>
            <TypeWriter
              text="이 우주는 이런 것들을 가능하게 해요"
              active
              speed={45}
              style={{
                fontSize: 46,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.5)',
                letterSpacing: 2,
              }}
            />
          </div>
        )}

        {/* Phase 10: Arrow */}
        {phase >= 10 && (
          <div style={{
            position: 'absolute', bottom: '4%',
            animation: 'ou-fade-in 1s ease',
            pointerEvents: 'auto', cursor: 'pointer',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              style={{ animation: 'float 2s ease-in-out infinite' }}>
              <path d="M12 5v14M5 12l7 7 7-7" stroke="rgba(255,255,255,0.2)"
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- TypeWriter ----
function TypeWriter({ text, active, speed = 40, style }: {
  text: string; active: boolean; speed?: number; style?: React.CSSProperties;
}) {
  const [shown, setShown] = useState('');
  const [cursor, setCursor] = useState(true);
  const started = useRef(false);

  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(iv);
        setTimeout(() => setCursor(false), 1000);
      }
    }, speed);
    return () => clearInterval(iv);
  }, [active, text, speed]);

  return (
    <span style={style}>
      {active ? shown : ''}
      {cursor && <BlinkCursor />}
    </span>
  );
}

function BlinkCursor() {
  return (
    <span style={{
      display: 'inline-block', width: 3, height: '0.7em',
      background: '#fff', marginLeft: 4,
      animation: 'blink 0.7s step-end infinite',
      verticalAlign: 'text-bottom',
      boxShadow: '0 0 15px 4px rgba(255,255,255,0.5)',
      borderRadius: 1,
    }} />
  );
}
