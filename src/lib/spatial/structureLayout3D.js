// src/lib/spatial/structureLayout3D.js — pure, renderer-independent placement for the S4 structure view of a compound pentagon model.
// No three/React import. It places ALREADY-BOUND parts (see bindPathsToStructure) in space and carries no gematria value, operation,
// quantity or verification state of its own. The topology is the one the earlier accepted renderer used (concentric rings of petals in a
// plane, a cluster of triangles at the centre, the cube as a SEPARATE group), re-expressed on the model's own spec: a ring has exactly
// `panels` petals, the triangle cluster exactly `count` triangles, the cube exactly `faces` faces. Nothing is drawn that the spec lacks.
import { fitCameraDistance } from "./convergenceLayout3D.js";

export const STRUCTURE_3D = Object.freeze({
  fovDeg: 40,
  // Compact, large-part layout (Royal V2): the rings are tighter and the parts bigger relative to the whole, so on a phone — where the shot is
  // width-bound — the cube and the pentagons are large and readable. Shape counts are the model's; these are only sizes and radii.
  outerR: 150, innerR: 84,
  petal: Object.freeze({ outer: 82, inner: 62, depth: 6 }),
  tri: Object.freeze({ r: 42, size: 32, depth: 8, y: 14 }),
  cube: Object.freeze({ y: -190, size: 124 }),
  apex: Object.freeze({ x: 0, y: 215, z: 0, radius: 26 }),
  // The relation layer (a path with NO approved geometry) hovers as a separate plaque above the rings, beside the apex, INSIDE the main
  // structure's frame — so the camera frames the finding, not the plaque (Royal V2: it no longer widens the shot).
  relation: Object.freeze({ x: 128, y: 195, z: -40, w: 140, h: 62 }),
  // vertical spread (and a sideways nudge for the relation layer) at explode = 1
  explode: Object.freeze({ cube: -130, outer: 0, inner: 70, triangles: 140, relation: 30 }),
  relationShiftX: 16,
});

const PARTS = ["cube", "outer", "inner", "triangles", "relation"];
const TAG_PAD = 40;

export function partsPresent(spec, hasRelation) {
  return PARTS.filter((part) => (part === "relation" ? hasRelation : Boolean(spec?.[part])));
}

export function partCenter(part, explode = 0) {
  const c = STRUCTURE_3D;
  const base = { cube: { x: 0, y: c.cube.y, z: 0 }, outer: { x: 0, y: 0, z: 0 }, inner: { x: 0, y: 0, z: 0 },
    triangles: { x: 0, y: c.tri.y, z: 0 }, relation: { x: c.relation.x, y: c.relation.y, z: c.relation.z } }[part];
  return { x: base.x + (part === "relation" ? c.relationShiftX * explode : 0), y: base.y + (c.explode[part] || 0) * explode, z: base.z };
}

// Petals of a ring: `panels` evenly spaced, first at the top of the circle (like the earlier renderer), each facing outward.
export function ringPetals(panels, radius) {
  return Array.from({ length: panels }, (_, i) => {
    const a = (i / panels) * Math.PI * 2 - Math.PI / 2;
    return { x: Math.cos(a) * radius, z: Math.sin(a) * radius, rotY: -a + Math.PI / 2 };
  });
}

export function trianglePositions(count, radius) {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2;
    return { x: Math.cos(a) * radius, z: Math.sin(a) * radius, rotY: -a };
  });
}

// Anchor (where the part's route leaves it) at the given explode level.
function anchorOf(part, explode) {
  const c = STRUCTURE_3D, p = partCenter(part, explode);
  const dx = { cube: c.cube.size * 0.55, outer: c.outerR + c.petal.outer * 0.5, inner: c.innerR + 8, triangles: c.tri.r + 6, relation: -c.relation.w / 2 }[part];
  return { x: p.x + dx, y: p.y + (part === "cube" ? c.cube.size * 0.1 : 10), z: p.z };
}

export function connectorPoints(part, explode = 0) {
  const a = anchorOf(part, explode), apex = STRUCTURE_3D.apex;
  const to = { x: apex.x, y: apex.y - apex.radius * 0.6, z: apex.z };
  return [a, { x: a.x, y: a.y + 150, z: a.z }, { x: to.x + a.x * 0.35, y: to.y - 70, z: to.z }, to];
}

// Extent of the MAIN structure (cube, rings, triangles, apex, and the relation plaque where it sits) at an explode level
// (0 = assembled, 1 = fully exploded): the overview fits what is actually on screen.
export function structureExtent(explode = 1) {
  const c = STRUCTURE_3D, e = c.explode, k = Math.max(0, Math.min(1, explode));
  const relationRight = c.relation.x + c.relationShiftX * k + c.relation.w / 2;
  return {
    // the ring's "× quantity" tag sits just outside the petals, so the frame is padded by its width on both sides
    minX: -(c.outerR + c.petal.outer / 2 + TAG_PAD),
    maxX: Math.max(c.outerR + c.petal.outer / 2 + TAG_PAD, relationRight + 14),
    minY: c.cube.y + e.cube * k - c.cube.size / 2 - 40,
    maxY: Math.max(c.apex.y + c.apex.radius * 1.5 + 80, c.tri.y + e.triangles * k + c.tri.size + 40),
  };
}

// Camera poses. overview fits the whole structure at the current explode level and any aspect, from an elevated angle (so the rings read
// as rings, not edge-on lines); focus frames one part.
const OVERVIEW_ELEVATION = Math.PI / 6.4; // ≈ 28°
export function overviewPose(aspect, explode = 0, { elevation = OVERVIEW_ELEVATION, padding = 1.06 } = {}) {
  const ext = structureExtent(explode);
  const target = { x: (ext.minX + ext.maxX) / 2, y: (ext.minY + ext.maxY) / 2, z: 0 };
  const d = fitCameraDistance(ext, STRUCTURE_3D.fovDeg, aspect, padding);
  return { target, position: { x: target.x, y: target.y + d * Math.sin(elevation), z: d * Math.cos(elevation) } };
}

export function focusPose(part, aspect, explode = 0, { padding = 1.25 } = {}) {
  const c = STRUCTURE_3D, center = partCenter(part, explode);
  const half = { cube: c.cube.size * 0.9, outer: c.outerR + c.petal.outer, inner: c.innerR + c.petal.inner, triangles: c.tri.r + c.tri.size * 1.4, relation: c.relation.w }[part];
  const ext = { minX: -half, maxX: half, minY: -half * 0.7, maxY: half * 0.7 };
  const d = fitCameraDistance(ext, c.fovDeg, aspect, padding);
  return { target: center, position: { x: center.x, y: center.y + d * 0.42, z: center.z + d * 0.92 } };
}

// How a word on a face is drawn: "pending" while its 3D letters are still loading, "glyph" when every letter has its 3D geometry, "text" when any letter
// could not be loaded (or the person/diagnostics asked for text) — the word is then a readable flat text plane, never an empty face.
export function glyphWordMode(letterKeys = [], available = new Map(), status = "loading") {
  if (status === "loading") return "pending";
  return letterKeys.every((k) => available.has(k)) ? "glyph" : "text";
}
