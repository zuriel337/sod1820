// src/lib/spatial/icosahedronLayout3D.js — pure, renderer-independent placement for shape family 2: the regular icosahedron (עשרימון).
// No three/React import. It carries NO research value, word or operation: the 20 faces are the solid's own geometry (V=12, E=30, F=20, derived here from
// the golden-ratio vertices and checked by tests); the word on every face, its value and the path result come from the model through spatialRenderModel.
// The scene draws one labelled face per solid face; "explode" pushes each face out along its own normal.
import { fitCameraDistance } from "./convergenceLayout3D.js";

const PHI = (1 + Math.sqrt(5)) / 2;
const RAW = [[-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0], [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI], [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1]];

export const ICOSA_3D = Object.freeze({
  fovDeg: 40,
  radius: 150, // circumradius of the solid
  explode: 70, // distance each face moves out along its normal at explode = 1
  apex: Object.freeze({ x: 0, y: 268, z: 0, radius: 26 }),
  plinthY: -250,
  tagPad: 20,
});

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const unit = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

// The solid: 12 vertices, 30 edges, 20 triangular faces — found from the vertex distances (no hand-typed index table that could drift).
export function icosahedronSolid(radius = ICOSA_3D.radius) {
  const k = radius / Math.hypot(1, PHI);
  const vertices = RAW.map((v) => v.map((c) => c * k));
  const dist = (i, j) => len(sub(vertices[i], vertices[j]));
  let edge = Infinity;
  for (let i = 0; i < 12; i += 1) for (let j = i + 1; j < 12; j += 1) edge = Math.min(edge, dist(i, j));
  const near = (i, j) => Math.abs(dist(i, j) - edge) < edge * 1e-6;
  const edges = [], faces = [];
  for (let i = 0; i < 12; i += 1) for (let j = i + 1; j < 12; j += 1) if (near(i, j)) edges.push([i, j]);
  for (let i = 0; i < 12; i += 1) for (let j = i + 1; j < 12; j += 1) for (let l = j + 1; l < 12; l += 1) {
    if (!(near(i, j) && near(j, l) && near(i, l))) continue;
    const centroid = [0, 1, 2].map((a) => (vertices[i][a] + vertices[j][a] + vertices[l][a]) / 3);
    const normal = unit(centroid); // the solid is centred on the origin: the outward normal is the centroid direction
    faces.push({ index: faces.length, vertexIndices: [i, j, l], centroid, normal, apothem: len(centroid) });
  }
  return { radius, edge, vertices, edges, faces, faceTriangle: { circumradius: edge / Math.sqrt(3), inradius: edge / (2 * Math.sqrt(3)) } };
}

// Orthonormal frame of a face: z = outward normal, y = the in-plane direction closest to world-up (labels read upright), x completes it.
export function faceFrame(normal) {
  const z = unit(normal);
  const ref = Math.abs(z[1]) > 0.98 ? [0, 0, 1] : [0, 1, 0];
  const x = unit(cross(ref, z));
  const y = cross(z, x);
  return { x, y, z };
}

// The face triangle in its own frame (2D points around the centroid), so the scene can extrude exactly the real face.
export function faceTriangle2D(solid, face) {
  const { x, y } = faceFrame(face.normal);
  return face.vertexIndices.map((i) => { const d = sub(solid.vertices[i], face.centroid); return [dot(d, x), dot(d, y)]; });
}

// Position of a face at an explode level (0 = assembled): out along its own normal.
export function facePlacement(face, explode = 0) {
  const k = Math.max(0, Math.min(1, explode)) * ICOSA_3D.explode;
  return { x: face.centroid[0] + face.normal[0] * k, y: face.centroid[1] + face.normal[1] * k, z: face.centroid[2] + face.normal[2] * k };
}

// Extent of what is on screen at an explode level: the exploded solid, the apex above it and the stand below.
export function icosaExtent(explode = 0) {
  const c = ICOSA_3D, k = Math.max(0, Math.min(1, explode));
  const half = c.radius + c.explode * k + c.tagPad;
  return { minX: -half, maxX: half, minY: c.plinthY - 20, maxY: c.apex.y + c.apex.radius * 1.5 + 80 };
}

const OVERVIEW_ELEVATION = Math.PI / 7;
export function icosaOverviewPose(aspect, explode = 0, { elevation = OVERVIEW_ELEVATION, padding = 1.04 } = {}) {
  const ext = icosaExtent(explode);
  const target = { x: 0, y: (ext.minY + ext.maxY) / 2, z: 0 };
  const d = fitCameraDistance(ext, ICOSA_3D.fovDeg, aspect, padding);
  return { target, position: { x: 0, y: target.y + d * Math.sin(elevation), z: d * Math.cos(elevation) } };
}

// Focus: frame ONE face (by index) square-on from its outward side, slightly above, so the word on it reads.
export function icosaFocusPose(solid, faceIndex, aspect, explode = 0, { padding = 1.3 } = {}) {
  const face = solid.faces[Math.max(0, Math.min(solid.faces.length - 1, Number(faceIndex) || 0))];
  const target = facePlacement(face, explode);
  const half = solid.faceTriangle.circumradius * 1.1;
  const d = fitCameraDistance({ minX: -half, maxX: half, minY: -half, maxY: half }, ICOSA_3D.fovDeg, aspect, padding);
  const dir = unit([face.normal[0], face.normal[1] + 0.22, face.normal[2]]);
  return { target, position: { x: target.x + dir[0] * d, y: target.y + dir[1] * d, z: target.z + dir[2] * d } };
}

// The ONE route from the solid to the apex (the path's result).
export function icosaConnectorPoints() {
  const c = ICOSA_3D, to = { x: c.apex.x, y: c.apex.y - c.apex.radius * 0.6, z: c.apex.z };
  return [{ x: 0, y: c.radius, z: 0 }, { x: 8, y: c.radius + 36, z: 0 }, { x: -8, y: to.y - 40, z: 0 }, to];
}
