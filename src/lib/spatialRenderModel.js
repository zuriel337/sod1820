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


// ---- Multi-path convergence (Spatial v2 contract: path_i = inputs + quantities + operations -> V) ----
// Pure and renderer-independent. Reads only what the model declares: operations[{expression "a × b", result}], the phrases listed in
// gematria[[phrase, value]] and structuralProperties[{key, value, provenance}] (quantity provenance). It never calculates gematria:
// the operand's phrase value must be confirmed by the canonical engine trace (see evaluateConvergencePaths).
export function deriveConvergencePaths({ value, operations = [], gematria = [], quantities = [] } = {}) {
  const phraseByValue = new Map();
  for (const entry of gematria) {
    const [phrase, phraseValue] = Array.isArray(entry) ? entry : [];
    if (phrase && Number.isFinite(Number(phraseValue)) && !phraseByValue.has(Number(phraseValue))) phraseByValue.set(Number(phraseValue), String(phrase));
  }
  return operations.map((operation, index) => {
    const match = /^\s*(\d+)\s*[×x*]\s*(\d+)\s*$/.exec(String(operation?.expression || ""));
    const base = { id: `path:${index}`, index, expression: String(operation?.expression || ""), result: Number(operation?.result) };
    if (!match) return { ...base, parsed: false, phrase: null, resultMatches: false };
    const operand = Number(match[1]);
    const quantity = Number(match[2]);
    const property = quantities.find((item) => Number(item?.value) === quantity) || null;
    return {
      ...base, parsed: true, operand, quantity,
      phrase: phraseByValue.get(operand) || null,
      // Declared-operation consistency only (the model states the result; this guards against a mismatching declaration).
      resultMatches: operand * quantity === base.result && base.result === Number(value),
      quantityKey: property?.key || null,
      quantityProvenance: property?.provenance || null,
    };
  });
}

// status per path: "verified" (engine-confirmed phrase value + consistent declared operation), "no_phrase" (no phrase is declared for the
// operand), "pending" (trace not loaded yet), "unavailable" (trace missing/failed/mismatched), "inconsistent" (declared result disagrees).
// Only "verified" paths are counted; nothing is ever promoted from an unverified path.
export function evaluateConvergencePaths(paths, traces, isVerified) {
  const evaluated = paths.map((path) => {
    if (!path.parsed || !path.resultMatches) return { ...path, status: "inconsistent" };
    if (!path.phrase) return { ...path, status: "no_phrase" };
    const entry = traces?.[path.phrase];
    if (!entry || entry.state === "loading") return { ...path, status: "pending" };
    const verified = entry.state === "ready" && isVerified(entry.trace, { expression: path.phrase, methodKey: "רגיל", expectedValue: path.operand });
    return { ...path, status: verified ? "verified" : "unavailable", trace: verified ? entry.trace : null };
  });
  return { paths: evaluated, verifiedCount: evaluated.filter((path) => path.status === "verified").length, total: evaluated.length };
}


// ---- Structure binding for the compound pentagon family (Spatial v2 contract: regions / quantity provenance) ----
// Pure, renderer-independent. Turns model.spatial.regions + the cube leg into a render SPEC and binds each already-derived convergence path
// to the part of the structure that carries it. It draws nothing and counts nothing; a path with no approved geometry binds to `null`
// (a separate relation layer): geometry is never invented for it. `panels` (the shape's own side count) and `quantity` (the arithmetic
// multiplier from the source) are different facts and stay different fields.
export function compoundStructureSpec(spatial, cube = {}) {
  if (!isCompoundPentagonModel(spatial)) return null;
  const outer = regionFor(spatial.regions, "outer_pentagon");
  const inner = regionFor(spatial.regions, "inner_pentagon");
  const tri = regionFor(spatial.regions, "nested_triangles");
  const ring = (region) => (region ? { assignment: String(region.assignment), quantity: Number(region.quantity), panels: sidesOf(region) } : null);
  return {
    family: "compound_pentagon",
    // a cube has exactly 6 faces; a model that says otherwise is not drawn as a cube
    cube: cube?.faceWord && cubeFacesOf(spatial) === 6 ? { word: String(cube.faceWord), faces: 6 } : null,
    outer: ring(outer),
    inner: ring(inner),
    triangles: tri ? { assignment: String(tri.assignment), quantity: Number(tri.quantity), count: Number(tri.quantity) } : null,
  };
}

export const STRUCTURE_PART_LABEL = Object.freeze({ cube: "קובייה", outer: "מחומש חיצוני", inner: "מחומש פנימי", triangles: "משולשים פנימיים", relation: "שכבת קשר" });

export function bindPathsToStructure(paths, spec) {
  const taken = new Set();
  const claim = (part, matches) => {
    if (taken.has(part) || !spec?.[part] || !matches) return null;
    taken.add(part);
    return part;
  };
  return paths.map((path) => {
    const part = !spec ? null
      : claim("cube", path.phrase && path.phrase === spec.cube?.word && path.quantity === spec.cube?.faces)
      || claim("outer", path.phrase && path.phrase === spec.outer?.assignment && path.quantity === spec.outer?.quantity)
      || claim("inner", path.phrase && path.phrase === spec.inner?.assignment && path.quantity === spec.inner?.quantity)
      || claim("triangles", String(path.operand) === spec.triangles?.assignment && path.quantity === spec.triangles?.quantity)
      || null;
    return { ...path, part: part || "relation" , geometric: Boolean(part) };
  });
}

// Facts shown for the selected part, each with its ORIGIN, so a shape count is never presented as the source quantity (e.g. 5 sides ≠ 180 units).
export function describeStructurePart(path, spec) {
  const origin = path.quantityProvenance || "מוצהר במודל";
  const quantity = { key: "כמות במסלול", value: path.quantity, origin };
  const part = path.part;
  if (part === "cube") return { part, label: STRUCTURE_PART_LABEL.cube, facts: [{ key: "פאות בצורה", value: spec.cube.faces, origin: "גאומטריה של קובייה" }, quantity], note: null };
  if (part === "outer" || part === "inner") {
    const ring = spec[part];
    return { part, label: STRUCTURE_PART_LABEL[part], facts: [{ key: "צלעות בצורה", value: ring.panels, origin: "מבנה הצורה במודל" }, quantity],
      note: ring.panels !== ring.quantity ? `מספר הצלעות (${ring.panels}) הוא צורה; הכמות (${ring.quantity}) מקורה בנתוני המחקר. הם אינם אותו דבר.` : null };
  }
  if (part === "triangles") return { part, label: STRUCTURE_PART_LABEL.triangles, facts: [{ key: "משולשים בצורה", value: spec.triangles.count, origin: "שרטוט המקור במודל" }, quantity], note: null };
  return { part: "relation", label: STRUCTURE_PART_LABEL.relation, facts: [quantity], note: "אין מבנה גאומטרי מאושר למסלול הזה. הוא מוצג כשכבת קשר נפרדת ולא כצורה." };
}
