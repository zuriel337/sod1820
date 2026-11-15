// src/lib/spatial/convergenceLayout3D.js — pure, renderer-independent placement of the multi-path convergence view for S4.
// No three/React import (safe in the default bundle and in tests). It only places ALREADY-EVALUATED paths in space: it carries no
// gematria value, no operation and no verification state of its own (those come from evaluateConvergencePaths). Presentation only.
//
// Shape: a shallow fan of path slabs facing the camera (index 0 on the RIGHT, reading order of the RTL stage) whose connectors descend
// to ONE apex node (the value). Deterministic: same paths → same layout.
export const CONVERGENCE_3D = Object.freeze({
  span: 640, y: 150, depthSag: 0.22,
  slab: Object.freeze({ width: 150, height: 74, depth: 14 }),
  apex: Object.freeze({ x: 0, y: -90, z: -40, radius: 26 }),
  glyph: Object.freeze({ maxHeight: 40, maxAdvance: 150, depth: 8 }),
});

export function layoutConvergence3D(paths = []) {
  const n = paths.length;
  const { span, y, depthSag, slab, apex } = CONVERGENCE_3D;
  const nodes = paths.map((path, index) => {
    const t = n <= 1 ? 0 : index / (n - 1) - 0.5;          // −0.5 … +0.5
    const x = -t * span;                                     // index 0 → +x (right)
    return { id: path.id, index, position: { x, y, z: -Math.abs(x) * depthSag }, slab };
  });
  const connectors = nodes.map((node) => {
    const from = { x: node.position.x, y: node.position.y - slab.height / 2, z: node.position.z };
    const to = { x: apex.x, y: apex.y + apex.radius * 0.6, z: apex.z };
    return { id: `conn:${node.id}`, nodeId: node.id,
      points: [from, { x: from.x, y: from.y - 120, z: from.z }, { x: to.x + from.x * 0.25, y: to.y + 90, z: to.z }, to] };
  });
  const half = span / 2 + slab.width / 2;
  const extent = { minX: -half, maxX: half, minY: apex.y - apex.radius, maxY: y + slab.height / 2 };
  return { nodes, connectors, apex, extent,
    camera: { position: { x: 0, y: 120, z: 1000 }, target: { x: 0, y: 40, z: -30 } } };
}

// Letter placement inside a slab for one phrase: letters keep ONE scale so proportions are preserved; the first letter of the phrase
// sits on the RIGHT (Hebrew reading order). Returns [{ char, x }] with x relative to the slab center; `size` = per-letter bounds.
export function layoutPhraseLetters(phrase, { maxAdvance = CONVERGENCE_3D.glyph.maxAdvance, maxHeight = CONVERGENCE_3D.glyph.maxHeight } = {}) {
  const chars = [...String(phrase || "")].filter((ch) => ch.trim());
  if (!chars.length) return { letters: [], size: { width: 0, height: 0 } };
  const width = Math.min(maxHeight * 0.85, maxAdvance / chars.length);
  const height = Math.min(maxHeight, width / 0.85);
  const total = chars.length * width;
  const letters = chars.map((char, i) => ({ char, x: total / 2 - width * (i + 0.5) }));
  return { letters, size: { width, height } };
}

// Camera distance that keeps the whole fan inside the view at ANY canvas aspect ratio (a phone portrait box is much narrower than a desktop box).
// Pure geometry: the horizontal half-extent must fit tan(vfov/2) * aspect, the vertical half-extent tan(vfov/2).
export function fitCameraDistance(extent, vfovDeg, aspect, padding = 1.12) {
  const tanV = Math.tan((vfovDeg * Math.PI) / 360);
  const halfW = (extent.maxX - extent.minX) / 2;
  const halfH = (extent.maxY - extent.minY) / 2;
  const a = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  return Math.max(halfW / (tanV * a), halfH / tanV) * padding;
}
