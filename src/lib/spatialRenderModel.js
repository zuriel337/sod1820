// src/lib/spatialRenderModel.js — pure, framework-free derivation layer for the Spatial v2 compound
// renderer (GematriaCube.jsx). Zero React/Three import here on purpose: this is the boundary that
// proves the renderer does not know any specimen's numbers/words/formulas — it only knows how to turn
// a generic { regions[], structuralProperties[], operations[] } shape into render-ready path data.
//
// "outer_pentagon" / "inner_pentagon" / "nested_triangles" are kept as renderer vocabulary: they name
// POSITION-WITHIN-A-COMPOUND-SHAPE categories (outer ring / inner ring / center cluster), not any
// specimen's content — the same class of small taxonomy as "cube"/"icosa" already used elsewhere in
// this file family. Everything specimen-specific (assignment word, quantity, side-count, result) is
// read from the model; nothing here is a literal drawn from any one fixture.

export function regionFor(regions, role) {
  return (regions || []).find(r => r.role === role) || null;
}

// A ring's panel-count is a geometric property of THAT region (sides), never assumed from its role
// name or its arithmetic quantity (which can be any number). Falls back to quantity only if the model
// omitted `sides` entirely (defensive, not a guess at content).
export function sidesOf(region) {
  return region?.sides ?? region?.quantity ?? 0;
}

// cube_faces is read from spatial.structuralProperties (model metadata) — 6 is used only as the last-
// resort geometric fact "a cube has 6 faces" (a cube always has 6 faces by definition, same class of
// default the existing simple cube/icosahedron renderer already hardcodes for shape==='cube'), never
// as a stand-in for a model-specific quantity.
export function cubeFacesOf(spatial) {
  const p = (spatial?.structuralProperties || []).find(sp => sp.key === "cube_faces");
  return p ? p.value : 6;
}

// Builds the clickable path list (label + which color-slot) entirely from spatial.regions + the
// cube's own props. No fixture-specific string/number is ever written here — change the fixture,
// the labels change too, with zero code change in this file or in the renderer that consumes it.
export function deriveCompoundPaths(spatial, cubeProps, colors) {
  const out = [];
  const outer = regionFor(spatial.regions, "outer_pentagon");
  const inner = regionFor(spatial.regions, "inner_pentagon");
  const tri = regionFor(spatial.regions, "nested_triangles");
  if (outer) out.push({ id: "outer", label: `${outer.assignment} × ${outer.quantity}`, color: colors.outer });
  if (inner) out.push({ id: "inner", label: `${inner.assignment} × ${inner.quantity}`, color: colors.inner });
  if (tri) out.push({ id: "triangles", label: `${tri.assignment} × ${tri.quantity}`, color: colors.triangles });
  out.push({ id: "cube", label: `${cubeProps.faceWord} × ${cubeFacesOf(spatial)}`, color: colors.cube });
  return out;
}

// Whether a model's spatial contract is the "pentagon + inner pentagon + nested triangles" compound
// family this renderer knows how to draw — a shape-family check, not a value/slug check.
export function isCompoundPentagonModel(spatial) {
  return !!spatial
    && /pentagon/.test(spatial.shapeIdentity || "")
    && /triangle/.test(spatial.shapeIdentity || "")
    && (spatial.regions || []).length > 0;
}
