// src/lib/spatial/cubeLayout3D.js — pure, renderer-independent placement for shape family 3: the cube (קובייה) with a word repeated on its faces.
// No three/React import. It carries NO research value, word or operation: the six faces are the solid's own geometry (derived here from the six axis
// normals and checked by tests); the face word, its value, the repetitions per face and the path result come from the model through spatialRenderModel.
// The scene draws one plate per face, the word `repetitions` times on each; "explode" pushes each face out along its own normal.
import { fitCameraDistance, layoutPhraseLetters } from "./convergenceLayout3D.js";

export const CUBE_3D = Object.freeze({
  fovDeg: 40,
  size: 230,        // edge length of the assembled cube
  faceDepth: 7,     // plate thickness
  explode: 96,      // distance each face moves out along its normal at explode = 1
  wordArea: 0.82,   // the written area of a face, as a share of its side
  apex: Object.freeze({ x: 0, y: 330, z: -170, radius: 26 }), // behind and above, so the lifted top face never crosses the route
  plinthY: -(230 / 2) - 30,
  plinthRadius: 190, // wider than the cube's corner reach (115 × √2), so the assembled cube stands inside it
  tagPad: 20,
  yaw: 0.5,         // the overview camera looks at the cube from a corner (front + side + top), not square-on
});

const unit = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// The six faces: outward axis normal + the in-plane "up" a person reads the word by. x = up × normal is the viewer's RIGHT when the face is seen from outside
// (so the first letter of a Hebrew word, placed at +x, sits on the right of every face).
const FACE_AXES = [
  { name: "front", normal: [0, 0, 1], up: [0, 1, 0] },
  { name: "right", normal: [1, 0, 0], up: [0, 1, 0] },
  { name: "back", normal: [0, 0, -1], up: [0, 1, 0] },
  { name: "left", normal: [-1, 0, 0], up: [0, 1, 0] },
  { name: "top", normal: [0, 1, 0], up: [0, 0, -1] },
  { name: "bottom", normal: [0, -1, 0], up: [0, 0, 1] },
];

export function cubeSolid(size = CUBE_3D.size, depth = CUBE_3D.faceDepth) {
  const reach = size / 2 - depth / 2; // the plate's CENTRE: its outer surface lies on the cube's surface
  const faces = FACE_AXES.map(({ name, normal, up }, index) => {
    const n = unit(normal), y = unit(up), x = unit(cross(y, n));
    return { index, name, normal: n, centroid: n.map((c) => c * reach), frame: { x, y, z: n } };
  });
  return { size, depth, faces };
}

// Position of a face (plate centre) at an explode level (0 = assembled): out along its own normal.
export function facePlacement(face, explode = 0) {
  const k = Math.max(0, Math.min(1, explode)) * CUBE_3D.explode;
  return { x: face.centroid[0] + face.normal[0] * k, y: face.centroid[1] + face.normal[1] * k, z: face.centroid[2] + face.normal[2] * k };
}

// Where the word goes on ONE face: `repetitions` cells in a cols × rows grid, the first cell at the top-right (reading order of a Hebrew page), the
// word fitted into the cell by the lab's single letter-layout rule. Counts only what the spec states.
export function cubeWordLayout(spec, { size = CUBE_3D.size, depth = CUBE_3D.faceDepth } = {}) {
  const { cols, rows } = spec.grid;
  const area = size * CUBE_3D.wordArea;
  const cell = { width: area / cols, height: area / rows };
  const box = { width: cell.width * 0.88, height: cell.height * (rows > 1 ? 0.66 : 0.6) };
  const cells = [];
  for (let i = 0; i < spec.repetitions; i += 1) {
    const col = i % cols, row = Math.floor(i / cols);
    cells.push({ index: i, x: ((cols - 1) / 2 - col) * cell.width, y: ((rows - 1) / 2 - row) * cell.height });
  }
  const { letters, size: letterSize } = layoutPhraseLetters(spec.word, { maxAdvance: box.width, maxHeight: box.height });
  return { cols, rows, cell, box, cells, letters, letterSize, surfaceZ: depth / 2 };
}

// How many glyph meshes the whole cube needs, and how many draw calls with one instanced mesh per distinct letter on each face (a budget the tests pin).
export function cubeLetterBudget(spec) {
  const layout = cubeWordLayout(spec);
  const perFace = layout.cells.length * layout.letters.length;
  const distinct = new Set(layout.letters.map((l) => l.char)).size;
  return { faces: spec.faces, wordsPerFace: layout.cells.length, lettersPerWord: layout.letters.length, lettersPerFace: perFace, letters: perFace * spec.faces, drawCallsPerFace: distinct, drawCalls: distinct * spec.faces };
}

// Extent of what is on screen at an explode level: the exploded cube (its silhouette from a corner is wider than its edge), the apex above and the stand below.
export function cubeExtent(explode = 0) {
  const c = CUBE_3D, k = Math.max(0, Math.min(1, explode));
  const half = (c.size / 2) * Math.SQRT2 + c.explode * k + c.tagPad;
  return { minX: -half, maxX: half, minY: c.plinthY - 20 - c.explode * k, maxY: c.apex.y + c.apex.radius * 1.5 + 80 };
}

// The stand follows the lowered bottom face, so an exploded cube never passes through it.
export function plinthPlacement(explode = 0) {
  return { x: 0, y: CUBE_3D.plinthY - CUBE_3D.explode * Math.max(0, Math.min(1, explode)), z: 0 };
}

// Everything that must stay on screen at an explode level, as 3D points: the eight corners of every (exploded) plate, the lowered stand, the apex with its
// label and the badge above it. The overview camera is fitted to THESE points through a real perspective projection, because the cube is deep (its near corner
// is much closer to the camera than the apex behind it), which a flat width/height extent underestimates.
export function cubeProbePoints(explode = 0) {
  const c = CUBE_3D, solid = cubeSolid(), half = solid.size / 2, pts = [];
  for (const f of solid.faces) {
    const at = facePlacement(f, explode), { x, y, z } = f.frame;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      const a = sx * half, b = sy * half, d = sz * (solid.depth / 2);
      pts.push([at.x + x[0] * a + y[0] * b + z[0] * d, at.y + x[1] * a + y[1] * b + z[1] * d, at.z + x[2] * a + y[2] * b + z[2] * d]);
    }
  }
  const base = plinthPlacement(explode);
  for (let i = 0; i < 16; i += 1) { const t = (i / 16) * Math.PI * 2; pts.push([Math.cos(t) * c.plinthRadius, base.y - 6, Math.sin(t) * c.plinthRadius]); }
  pts.push([c.apex.x, c.apex.y + c.apex.radius * 1.5 + 70, c.apex.z], [c.apex.x + 60, c.apex.y, c.apex.z], [c.apex.x - 60, c.apex.y, c.apex.z]);
  pts.push([half * 1.45, half + 90, half * 0.2]); // the path's tag
  return pts;
}

// Does every point lie inside the perspective frustum (with `margin` of the frame to spare) of a camera at `position` looking at `target` (world up = +y)?
export function pointsFitFrustum(points, position, target, aspect, fovDeg = CUBE_3D.fovDeg, margin = 0.94) {
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const f = unit(sub([target.x, target.y, target.z], [position.x, position.y, position.z]));
  const r = unit(cross(f, [0, 1, 0])), u = cross(r, f), tanV = Math.tan((fovDeg * Math.PI) / 360), a = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  return points.every((p) => {
    const v = sub(p, [position.x, position.y, position.z]), depth = dot(v, f);
    return depth > 0 && Math.abs(dot(v, r)) / (depth * tanV * a) <= margin && Math.abs(dot(v, u)) / (depth * tanV) <= margin;
  });
}

const OVERVIEW_ELEVATION = Math.PI / 7;
export function cubeOverviewPose(aspect, explode = 0, { elevation = OVERVIEW_ELEVATION, padding = 1.04 } = {}) {
  const ext = cubeExtent(explode), points = cubeProbePoints(explode);
  const target = { x: 0, y: (ext.minY + ext.maxY) / 2 - 30, z: 0 };
  const at = (d) => ({ x: Math.sin(CUBE_3D.yaw) * d * Math.cos(elevation), y: target.y + d * Math.sin(elevation), z: Math.cos(CUBE_3D.yaw) * d * Math.cos(elevation) });
  let d = fitCameraDistance(ext, CUBE_3D.fovDeg, aspect, 1);
  for (let i = 0; i < 80 && !pointsFitFrustum(points, at(d), target, aspect); i += 1) d *= 1.03;
  return { target, position: at(d * Math.max(1, padding)) };
}

// Focus: frame ONE face (by index) square-on from its outward side, slightly raised, so the repeated word reads. The top/bottom faces are seen from the front side
// (never straight along the up axis, where the orbit camera has no horizon).
export function cubeFocusPose(solid, faceIndex, aspect, explode = 0, { padding = 1.28 } = {}) {
  const face = solid.faces[Math.max(0, Math.min(solid.faces.length - 1, Number(faceIndex) || 0))];
  const target = facePlacement(face, explode);
  const half = (solid.size / 2) * 1.04;
  const d = fitCameraDistance({ minX: -half, maxX: half, minY: -half, maxY: half }, CUBE_3D.fovDeg, aspect, padding);
  const vertical = Math.abs(face.normal[1]) > 0.9;
  const dir = unit(vertical ? [0, face.normal[1] * 1, 0.42] : [face.normal[0], face.normal[1] + 0.2, face.normal[2]]);
  return { target, position: { x: target.x + dir[0] * d, y: target.y + dir[1] * d, z: target.z + dir[2] * d } };
}

// The ONE route from the cube to the apex (the path's result): from the top-back edge, up and behind, clear of the lifted top face.
export function cubeConnectorPoints() {
  const c = CUBE_3D, h = c.size / 2, to = { x: c.apex.x, y: c.apex.y - c.apex.radius * 0.6, z: c.apex.z };
  const from = { x: 0, y: h, z: -h };
  return [from, { x: 6, y: h + 70, z: -h - 20 }, { x: -6, y: to.y - 70, z: to.z + 20 }, to];
}

// ---- the INSIDE of the cube (inner exploration) ----
// The camera stands in the hollow, near the wall OPPOSITE the face it looks at (that wall is left open — the doorway), with a wide lens, so the whole inner side of
// the chosen face fills the view. The inner side carries the same word, turned to be read from inside.
// entryFace: the near wall the camera crosses (the overview looks at the front); defaultFace: the face read first (the one behind it)
export const CUBE_INSIDE = Object.freeze({ fovDeg: 78, lantern: 3200, lanternDistance: 520, entryFace: 0, defaultFace: 2 });

export function oppositeFaceIndex(solid, index) {
  const face = solid.faces[Math.max(0, Math.min(solid.faces.length - 1, Number(index) || 0))];
  return solid.faces.findIndex((other) => other.normal.every((v, i) => Math.abs(v + face.normal[i]) < 1e-9));
}

export function cubeInsidePose(solid, faceIndex, aspect) {
  const face = solid.faces[Math.max(0, Math.min(solid.faces.length - 1, Number(faceIndex) || 0))];
  const n = face.normal, inner = solid.size / 2 - solid.depth;          // the plane of the face's inner surface
  const half = (solid.size / 2) * 1.02;
  // a leaning camera (top/bottom face) sees the face obliquely: its near edge is farther off-axis, so it needs a little more room
  const leans = Math.abs(n[1]) > 0.9;
  const wanted = fitCameraDistance({ minX: -half, maxX: half, minY: -half, maxY: half }, CUBE_INSIDE.fovDeg, aspect, leans ? 1.2 : 1.02);
  const d = Math.max(70, Math.min(wanted, solid.size * 1.08));            // never farther than the doorway plane (+ a little), so it still reads as standing inside
  const target = { x: n[0] * inner, y: n[1] * inner, z: n[2] * inner };
  // looking straight up/down an orbit camera has no horizon: lean the camera toward the viewer's side so the word stays upright (top: up is −z, bottom: up is +z)
  const lean = leans ? [0, 0, (n[1] > 0 ? 1 : -1) * d * 0.2] : [0, 0, 0];
  return { target, position: { x: target.x - n[0] * d + lean[0], y: target.y - n[1] * d + lean[1], z: target.z - n[2] * d + lean[2] }, fovDeg: CUBE_INSIDE.fovDeg };
}
