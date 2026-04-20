// ─── Domain Brightness Map ────────────────────────────────────────────────
// Each domain maps to a brightness value (0.0 = black, 1.0 = white)
// Higher brightness = lighter/more prominent node
export const DOMAIN_BRIGHTNESS: Record<string, number> = {
  knowledge:   0.85,
  education:   0.80,
  idea:        0.78,
  emotion:     0.65,
  schedule:    0.70,
  task:        0.72,
  habit:       0.68,
  relation:    0.60,
  finance:     0.55,
  product:     0.75,
  broadcast:   0.73,
  media:       0.70,
  location:    0.65,
  development: 0.82,
  unresolved:  0.45,
};

// ─── Edge Relation Weight ─────────────────────────────────────────────────
export const EDGE_BRIGHTNESS: Record<string, number> = {
  is_a:        0.55,
  part_of:     0.50,
  causes:      0.45,
  derived_from:0.40,
  related_to:  0.35,
  opposite_of: 0.30,
  requires:    0.48,
  example_of:  0.42,
  involves:    0.38,
  located_at:  0.36,
  occurs_at:   0.34,
};

// ─── ForceAtlas2 Parameters ───────────────────────────────────────────────
export const FA2_SETTINGS = {
  gravity: 1.0,
  strongGravityMode: true,
  scalingRatio: 10.0,
  slowDown: 5.0,
  barnesHutOptimize: true,
  barnesHutTheta: 0.5,
  adjustSizes: false,
  linLogMode: false,
  outboundAttractionDistribution: true,
  edgeWeightInfluence: 1.0,
};

// Run FA2 for this many ms before stopping (let it settle)
export const FA2_RUN_DURATION_MS = 6000;

// ─── Node Sizing ──────────────────────────────────────────────────────────
export const NODE_SIZE_MIN = 2;
export const NODE_SIZE_MAX = 14;

export function computeNodeSize(degree: number, maxDegree: number): number {
  if (maxDegree <= 0) return NODE_SIZE_MIN;
  return NODE_SIZE_MIN + Math.sqrt(degree / maxDegree) * (NODE_SIZE_MAX - NODE_SIZE_MIN);
}
