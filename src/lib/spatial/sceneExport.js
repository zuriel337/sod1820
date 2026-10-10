// src/lib/spatial/sceneExport.js
// Renderer-neutral scene.v1 export (M2). Materializes the SAME compiled scene.v1 as portable JSON for derived
// projections (Blender/GLB). It invents no truth: topology/identity come from the scene, display values are resolved
// through the existing resolveSceneTraceValue() and carried in a separate, clearly derived `display` payload (never
// inside node/connector identity). `parity_reference` is the JS resolver's output that a Blender run is compared to.
import {
  SCENE_V1_TRANSFORM_CONVENTION, resolveSceneWorldMatrix, resolveSceneSocketWorld, resolveSceneSocketNormalWorld,
  resolveSceneConnectorCurve, resolveSceneTraceValue,
} from "./semanticSceneCompiler.js";

export const SCENE_V1_EXPORT_SCHEMA = "sod1820.scene.v1.export/1";
export const SCENE_V1_BLENDER_PARITY_SCHEMA = "sod1820.scene.v1.blender-parity/1";
// Blender stores transforms/curve points as float32 (eps ~6e-5 at |x|~1e3 layout units, accumulating over parent chains) => explicit abs tolerance 1e-3 (~1e-6 relative at layout scale; a convention error is O(1)).
export const BLENDER_PARITY_TOLERANCE = Object.freeze({ matrix: 1e-3, position: 1e-3, normal: 1e-6, curve: 1e-3 });

const CAMERA_NODE_ID = "projection:camera";

// Projection-only camera rig (optional). Same TRS convention as every scene.v1 node; looks down local -Z.
export function normalizeCameraRig(camera) {
  if (!camera) return null;
  const t = camera.transform || {};
  return {
    id: CAMERA_NODE_ID,
    parent: null,
    lens_mm: camera.lens_mm ?? 35,
    transform: {
      position: { x: 0, y: 0, z: 0, ...(t.position || {}) },
      rotation: { x: 0, y: 0, z: 0, ...(t.rotation || {}) },
      scale: { x: 1, y: 1, z: 1, ...(t.scale || {}) },
    },
    projectionOnly: true,
  };
}

function round(v) { return Object.is(v, -0) ? 0 : v; }
const vec = (p) => ({ x: round(p.x), y: round(p.y), z: round(p.z) });

// JS-resolver reference evidence in exactly the shape the Blender parity exporter emits.
export function resolveSceneParityReference(scene, camera = null) {
  const nodes = {}, sockets = {}, connectors = {};
  scene.nodes.forEach((n) => {
    nodes[n.id] = { world_matrix: resolveSceneWorldMatrix(scene, n.id).map(round) };
    (n.sockets || []).forEach((s) => {
      const ref = { node: n.id, socket: s.id };
      sockets[s.id] = { node: n.id, position: vec(resolveSceneSocketWorld(scene, ref)), normal: vec(resolveSceneSocketNormalWorld(scene, ref)) };
    });
  });
  scene.connectors.forEach((c) => { connectors[c.id] = { points: resolveSceneConnectorCurve(scene, c).points.map(vec) }; });
  const out = { nodes, sockets, connectors };
  const rig = normalizeCameraRig(camera);
  if (rig) out.camera = { world_matrix: resolveSceneWorldMatrix({ nodes: [rig] }, rig.id).map(round) };
  return out;
}

// Derived display payload: values resolved from the canonical trace via identityRef. Keyed by id, NOT part of identity.
export function resolveSceneDisplayPayload(scene) {
  const nodes = {}, connectors = {};
  scene.nodes.forEach((n) => { if (n.identityRef?.tracePath !== undefined && n.identityRef.type !== "method_trace_word") nodes[n.id] = { ...resolveSceneTraceValue(scene, n.identityRef) }; });
  scene.connectors.forEach((c) => { connectors[c.id] = { ...resolveSceneTraceValue(scene, c.identityRef) }; });
  return { derived: true, source: "resolveSceneTraceValue(identityRef)", nodes, connectors };
}

export function exportSceneV1({ scene, camera = null }) {
  if (!scene || scene.schema !== "sod1820.scene.v1") throw new Error("SCENE_V1_EXPORT_NOT_SCENE_V1");
  const rig = normalizeCameraRig(camera);
  return {
    export_schema: SCENE_V1_EXPORT_SCHEMA,
    scene_id: scene.scene_id,
    projection_signature: scene.projection_signature,
    transform_convention: SCENE_V1_TRANSFORM_CONVENTION,
    scene,
    display: resolveSceneDisplayPayload(scene),
    projection: { derived: true, camera: rig },
    parity_reference: { schema: SCENE_V1_BLENDER_PARITY_SCHEMA, tolerance: BLENDER_PARITY_TOLERANCE, ...resolveSceneParityReference(scene, rig) },
  };
}

// Compares a Blender parity document to the JS reference. Returns { pass, checks, maxError, failures }.
export function compareBlenderParity(reference, actual, tol = BLENDER_PARITY_TOLERANCE) {
  const failures = [];
  let checks = 0, maxError = 0;
  const cmp = (label, a, b, eps) => {
    checks += 1;
    if (a === undefined || b === undefined) { failures.push(`${label}: missing`); return; }
    const err = Math.max(...a.map((v, i) => Math.abs(v - b[i])));
    maxError = Math.max(maxError, err);
    if (!(err <= eps)) failures.push(`${label}: err ${err} > ${eps}`);
  };
  const v3 = (p) => (p ? [p.x, p.y, p.z] : undefined);
  Object.entries(reference.nodes).forEach(([id, n]) => cmp(`node:${id}`, n.world_matrix, actual.nodes?.[id]?.world_matrix, tol.matrix));
  Object.entries(reference.sockets).forEach(([id, s]) => {
    cmp(`socket.pos:${id}`, v3(s.position), v3(actual.sockets?.[id]?.position), tol.position);
    cmp(`socket.normal:${id}`, v3(s.normal), v3(actual.sockets?.[id]?.normal), tol.normal);
  });
  Object.entries(reference.connectors).forEach(([id, c]) => c.points.forEach((p, i) => cmp(`connector:${id}:P${i}`, v3(p), v3(actual.connectors?.[id]?.points?.[i]), tol.curve)));
  if (reference.camera) cmp("camera", reference.camera.world_matrix, actual.camera?.world_matrix, tol.matrix);
  return { pass: failures.length === 0, checks, maxError, failures };
}
