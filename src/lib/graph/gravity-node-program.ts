/**
 * GravityNodeProgram
 *
 * Sigma v3 커스텀 노드 프로그램.
 * 각 노드를 3레이어로 렌더링:
 *   1. Gravity Well Shadow — 노드 반지름의 3.5배, 역제곱 감쇄 어두운 후광
 *   2. Top Highlight     — 좌상단 밝은 광원 (구체 반사)
 *   3. Core              — 중심부 밝은 포인트 (도메인 밝기값)
 */

import { NodeProgram } from 'sigma/rendering';
import type { NodeDisplayData, RenderParams } from 'sigma/types';
import type { ProgramInfo } from 'sigma/rendering';
import { floatColor } from 'sigma/utils';

// ─── GLSL Shaders ────────────────────────────────────────────────────────────

const VERTEX_SHADER = /* glsl */ `
attribute vec4 a_id;
attribute vec4 a_color;
attribute vec2 a_position;
attribute float a_size;
attribute float a_angle;

uniform mat3 u_matrix;
uniform float u_sizeRatio;
uniform float u_correctionRatio;

varying vec4 v_color;
varying vec2 v_diffVector;
varying float v_radius;

const float bias = 255.0 / 254.0;
// Scale factor: node triangle circumscribes (base 4.0) × well multiplier (3.5)
const float WELL_SCALE = 3.5;

void main() {
  float size = a_size * u_correctionRatio / u_sizeRatio * 4.0 * WELL_SCALE;
  vec2 diffVector = size * vec2(cos(a_angle), sin(a_angle));
  vec2 position = a_position + diffVector;
  gl_Position = vec4(
    (u_matrix * vec3(position, 1)).xy,
    0.0,
    1.0
  );

  v_diffVector = diffVector;
  // v_radius is the outer radius of the rendered area (gravity well edge)
  v_radius = size / 2.0;

  #ifdef PICKING_MODE
  v_color = a_id;
  #else
  v_color = a_color;
  #endif

  v_color.a *= bias;
}
`;

const FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec4 v_color;
varying vec2 v_diffVector;
varying float v_radius;

uniform float u_correctionRatio;
uniform float u_isDark;

const float WELL_SCALE = 3.5;

void main() {
  #ifdef PICKING_MODE
  // Picking: only react to the actual node circle (1/3.5 of well radius)
  float pickRadius = v_radius / WELL_SCALE;
  float dist = length(v_diffVector);
  float border = u_correctionRatio * 2.0;
  if (dist > pickRadius + border) {
    gl_FragColor = vec4(0.0);
    return;
  }
  gl_FragColor = v_color;

  #else

  float dist = length(v_diffVector);
  float nodeRadius = v_radius / WELL_SCALE; // actual node radius
  float wellRadius = v_radius;              // gravity well radius

  // ── Layer 1: Gravity Well Shadow ──────────────────────────────────
  float normWell = dist / wellRadius;       // 0=center, 1=well edge
  // Inverse-square falloff: 1/(1+d²*k)
  float invSq = 1.0 / (1.0 + normWell * normWell * 3.0);
  // Smooth cutoff at well edge
  float wellMask = smoothstep(1.1, 0.25, normWell);
  float shadowStrength = u_isDark > 0.5 ? 0.18 : 0.10;
  float shadowAmt = invSq * wellMask * shadowStrength;

  // ── Layer 2: Top Highlight ────────────────────────────────────────
  // Bright light from upper-left reflecting off sphere top
  vec2 hlCenter = vec2(-0.35, 0.35) * nodeRadius;
  float hlDist = length(v_diffVector - hlCenter) / (nodeRadius * 0.55);
  float hlAmt = smoothstep(1.0, 0.0, hlDist) * 0.35;

  // ── Layer 3: Core Point ───────────────────────────────────────────
  float normCore = dist / nodeRadius;
  float coreAmt = smoothstep(1.0, 0.15, normCore);
  // Brightness from node color (grayscale: r channel = brightness)
  float brightness = v_color.r;
  float coreIntensity = brightness * coreAmt * 0.92;

  // ── Composite ─────────────────────────────────────────────────────
  // shadowAmt → darkens background (render black with alpha)
  // hlAmt + coreIntensity → brightens (render white/gray with alpha)

  float darkComp  = shadowAmt * (1.0 - coreAmt); // shadow only outside core
  float brightComp = hlAmt * 0.6 + coreIntensity;

  float totalAlpha = darkComp + brightComp - darkComp * brightComp;
  if (totalAlpha < 0.004) discard;

  // Mix: where bright > dark → lighter; where dark > bright → darker
  float colorBrightness = brightComp / max(totalAlpha, 0.001);
  vec3 finalColor = vec3(colorBrightness);

  gl_FragColor = vec4(finalColor, min(totalAlpha, 1.0));
  #endif
}
`;

// ─── Constants ───────────────────────────────────────────────────────────────

const UNIFORMS = ['u_sizeRatio', 'u_correctionRatio', 'u_matrix', 'u_isDark'] as const;
type Uniform = (typeof UNIFORMS)[number];

const GL_FLOAT = 0x1406;        // WebGLRenderingContext.FLOAT
const GL_UNSIGNED_BYTE = 0x1401; // WebGLRenderingContext.UNSIGNED_BYTE
const GL_TRIANGLES = 4;          // WebGLRenderingContext.TRIANGLES

// ─── Program Class ────────────────────────────────────────────────────────────

export default class GravityNodeProgram extends NodeProgram<Uniform> {
  static readonly ANGLE_1 = 0;
  static readonly ANGLE_2 = (2 * Math.PI) / 3;
  static readonly ANGLE_3 = (4 * Math.PI) / 3;

  private isDark = false;

  setDarkMode(dark: boolean) {
    this.isDark = dark;
  }

  getDefinition() {
    return {
      VERTICES: 3,
      VERTEX_SHADER_SOURCE: VERTEX_SHADER,
      FRAGMENT_SHADER_SOURCE: FRAGMENT_SHADER,
      METHOD: GL_TRIANGLES,
      UNIFORMS,
      ATTRIBUTES: [
        { name: 'a_position', size: 2, type: GL_FLOAT },
        { name: 'a_size', size: 1, type: GL_FLOAT },
        { name: 'a_color', size: 4, type: GL_UNSIGNED_BYTE, normalized: true },
        { name: 'a_id', size: 4, type: GL_UNSIGNED_BYTE, normalized: true },
      ],
      CONSTANT_ATTRIBUTES: [{ name: 'a_angle', size: 1, type: GL_FLOAT }],
      CONSTANT_DATA: [
        [GravityNodeProgram.ANGLE_1],
        [GravityNodeProgram.ANGLE_2],
        [GravityNodeProgram.ANGLE_3],
      ],
    };
  }

  processVisibleItem(nodeIndex: number, startIndex: number, data: NodeDisplayData) {
    const array = this.array;
    array[startIndex++] = data.x;
    array[startIndex++] = data.y;
    array[startIndex++] = data.size;
    array[startIndex++] = floatColor(data.color);
    array[startIndex++] = nodeIndex;
  }

  setUniforms(params: RenderParams, { gl, uniformLocations }: ProgramInfo) {
    const { u_sizeRatio, u_correctionRatio, u_matrix, u_isDark } = uniformLocations;
    gl.uniform1f(u_correctionRatio, params.correctionRatio);
    gl.uniform1f(u_sizeRatio, params.sizeRatio);
    gl.uniformMatrix3fv(u_matrix, false, params.matrix);
    gl.uniform1f(u_isDark, this.isDark ? 1.0 : 0.0);
  }
}
