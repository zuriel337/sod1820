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

import { FORMULA_STATUS, SEMANTIC_ROLE, analyzeFormulaText, analyzeOperationSpec, evaluateFormula, formulaTokens, formulaToText, tokensToText } from "./research/numericOperationTree.js";
import { NUMERIC_OPERATION_REGISTRY } from "./research/numericArithmeticOperations.js";

export function regionFor(regions, role) {
  return (regions || []).find(r => r.role === role) || null;
}

// A ring's panel-count is a geometric property of THAT region (sides), never assumed from its role
// name or its arithmetic quantity (which can be any number). Falls back to quantity only if the model
// omitted `sides` entirely it returns 0 (nothing is drawn) — never the quantity.
export function sidesOf(region) {
  // Hardened (Royal V2): a shape's side count comes ONLY from the model's own `sides` field and must be a real polygon (integer 3..12).
  // A missing `sides` is NOT replaced by the arithmetic `quantity` (180 units is not a 180-gon); the part is then simply not drawn.
  const sides = region?.sides;
  return Number.isInteger(sides) && sides >= 3 && sides <= 12 ? sides : 0;
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


// ---- Multi-path convergence (Spatial v2 contract: path_i = inputs + quantities + operation -> V) ----
// Pure and renderer-independent. Reads only what the model declares: operations[{operationKey, inputs[], expression, result}], the phrases listed in
// gematria[[phrase, value]] and structuralProperties[{key, value, provenance}] (quantity provenance). It never calculates gematria: an Expression operand's
// value must be confirmed by the canonical engine trace (see evaluateConvergencePaths).
//
// Semantic Mathematical Understanding: the arithmetic is read by the ONE shared parser/evaluator (research/numericOperationTree.js, registry in
// research/numericArithmeticOperations.js — research_intake_foundation_contract_law §6.10/§14.3). A path no longer assumes "two integers and a ×": it carries the
// typed operation (`operationKey`, `operatorSymbol` from the registry), its TERMS with a semantic role (expression / value / quantity / geometry), and the token
// stream every consumer renders from. The legacy fields (phrase, operand, quantity, …) remain, derived from the roles, for the existing consumers.
const termOf = (node, declared) => {
  if (node.kind === "expression") return { role: SEMANTIC_ROLE.EXPRESSION, text: node.text, value: declared[node.text] ?? null };
  if (node.kind === "quantity") return { role: node.role || SEMANTIC_ROLE.QUANTITY, text: String(node.value), value: Number(node.value), origin: node.provenance || null, key: node.key || null };
  if (node.kind === "number") return { role: SEMANTIC_ROLE.VALUE, text: String(node.value), value: Number(node.value), declaredOnly: Boolean(node.declaredOnly) };
  return { role: "derived", text: formulaToText({ sides: [node] }), value: null };
};

// A model that does not declare `inputs` (legacy text) gets its roles from value matching — never a guess between two candidates:
// a number that equals exactly one declared structural quantity is that quantity; a number that equals a declared phrase value (when the other operand
// is not already that phrase) is that phrase. Models should declare `inputs` (the explicit, reviewable form).
function roleLegacyOperands(node, { declared, quantities }) {
  if (!node || node.kind !== "op") return { node, ambiguous: false };
  let ambiguous = false;
  const operands = node.operands.map((operand) => {
    if (operand.kind !== "number") return operand;
    const q = quantities.filter((item) => Number(item?.value) === Number(operand.value));
    if (q.length === 1 && node.operands.some((o) => o !== operand)) return { kind: "quantity", key: q[0].key, value: Number(operand.value), provenance: q[0].provenance || null, role: /geometry/i.test(q[0].provenance || "") ? SEMANTIC_ROLE.GEOMETRY : SEMANTIC_ROLE.QUANTITY };
    if (q.length > 1) ambiguous = true;
    return operand;
  });
  return { node: { ...node, operands }, ambiguous };
}

export function deriveConvergencePaths({ value, operations = [], gematria = [], quantities = [], assignments = [], registry = NUMERIC_OPERATION_REGISTRY } = {}) {
  const declared = {}, phraseByValue = new Map();
  for (const entry of gematria) {
    const [phrase, phraseValue] = Array.isArray(entry) ? entry : [];
    if (!phrase || !Number.isFinite(Number(phraseValue))) continue;
    if (!(phrase in declared)) declared[phrase] = Number(phraseValue);
    if (!phraseByValue.has(Number(phraseValue))) phraseByValue.set(Number(phraseValue), String(phrase));
  }
  const declaredValues = Object.fromEntries(Object.entries(declared).map(([text, v]) => [text, { value: v, state: "verified" }]));
  const model = { gematria, structuralProperties: quantities, assignments };
  return operations.map((operation, index) => {
    const expression = String(operation?.expression || "");
    const base = { id: `path:${index}`, index, operationId: operation?.id || null, expression, result: Number(operation?.result) };
    const structured = Array.isArray(operation?.inputs);
    let analysis, ambiguous = false;
    const context = { expressionValues: declaredValues, registry, trustLiterals: true };
    if (structured) analysis = analyzeOperationSpec(operation, model, context);
    else {
      analysis = analyzeFormulaText(/=/.test(expression) ? expression : `${expression} = ${Number.isFinite(base.result) ? base.result : ""}`, context);
      if (analysis.formula) {
        const first = analysis.formula.sides[0];
        const mapped = roleLegacyOperands(first, { declared, quantities });
        ambiguous = mapped.ambiguous;
        // a bare number equal to a declared phrase value is that phrase's (declared) value — legacy text formulas only
        if (mapped.node.kind === "op") mapped.node.operands = mapped.node.operands.map((o) => (o.kind === "number" && phraseByValue.has(Number(o.value)) && !mapped.node.operands.some((x) => x.kind === "expression" && declared[x.text] === Number(o.value)) ? { kind: "expression", text: phraseByValue.get(Number(o.value)) } : o));
        analysis = { ...analysis, formula: { ...analysis.formula, sides: [mapped.node, ...analysis.formula.sides.slice(1)] } };
        const ev = evaluateFormula(analysis.formula, context);
        analysis = { ...analysis, evaluation: ev, status: ev.status, tokens: ev.status === FORMULA_STATUS.UNSUPPORTED ? [] : formulaTokens(analysis.formula, ev, { registry }) };
      }
    }
    const top = analysis.formula?.sides?.[0];
    if (analysis.status === FORMULA_STATUS.UNSUPPORTED || !analysis.formula || top?.kind !== "op") {
      const code = analysis.code || "not_an_operation";
      return { ...base, parsed: false, formulaStatus: "unsupported", unsupportedCode: code, unsupportedReason: analysis.reason || "הנוסחה אינה פעולה נתמכת", operationKey: operation?.operationKey || null, operatorSymbol: null,
        terms: [], expressions: [], phrase: null, resultMatches: false };
    }
    const terms = top.operands.map((operand) => termOf(operand, declared));
    const exprTerm = terms.find((t) => t.role === SEMANTIC_ROLE.EXPRESSION) || null;
    const qTerm = terms.find((t) => t.role === SEMANTIC_ROLE.QUANTITY || t.role === SEMANTIC_ROLE.GEOMETRY) || null;
    const valueTerm = exprTerm || terms.find((t) => t.role === SEMANTIC_ROLE.VALUE) || null;
    const quantityCandidates = quantities.filter((item) => qTerm && Number(item?.value) === Number(qTerm.value));
    return {
      ...base, parsed: true, formulaStatus: "supported", formula: analysis.formula,
      operationKey: top.key, operatorSymbol: registry.symbol(top.key), terms, expressions: [...new Set(terms.filter((t) => t.role === SEMANTIC_ROLE.EXPRESSION).map((t) => t.text))],
      equationTokens: analysis.tokens, equationText: tokensToText(analysis.tokens),
      // legacy fields, derived from the typed terms
      operand: valueTerm?.value ?? null, phrase: exprTerm?.text ?? null, quantity: qTerm?.value ?? null,
      orientation: terms[0] && (terms[0].role === SEMANTIC_ROLE.QUANTITY || terms[0].role === SEMANTIC_ROLE.GEOMETRY) && exprTerm ? "quantity_first" : "value_first",
      // Declared-operation consistency only (the model's own arithmetic): the evaluation with the model's declared phrase values reaches the declared result and the card's value.
      resultMatches: analysis.status === FORMULA_STATUS.VERIFIED && base.result === Number(value),
      quantityKey: qTerm?.key || null, quantityProvenance: qTerm?.origin || null, quantityAmbiguous: structured ? false : (ambiguous || quantityCandidates.length > 1 && !qTerm?.key),
    };
  });
}

// status per path: "verified" (engine-confirmed expression values + the arithmetic re-evaluated to the declared result), "no_phrase" (an operand has no declared expression
// to confirm), "pending" (trace not loaded yet), "unavailable" (trace missing/failed/mismatched), "inconsistent" (the model's declared result disagrees with the evaluated one),
// "unsupported" (the formula is outside the supported grammar — it is shown, labelled, and NEVER as verified or as a failed check). Only "verified" paths are counted;
// nothing is ever promoted from an unverified path.
export function evaluateConvergencePaths(paths, traces, isVerified, { registry = NUMERIC_OPERATION_REGISTRY } = {}) {
  const evaluated = paths.map((path) => {
    if (path.formulaStatus === "unsupported" || path.parsed === false && path.unsupportedCode) return { ...path, status: "unsupported" };
    if (!path.parsed || !path.resultMatches) return { ...path, status: "inconsistent" };
    const exprs = path.expressions || [];
    const engine = {};
    let pending = false, unavailable = false;
    for (const text of exprs) {
      const entry = traces?.[text];
      const declaredValue = path.terms.find((t) => t.role === SEMANTIC_ROLE.EXPRESSION && t.text === text)?.value;
      if (!entry || entry.state === "loading") { pending = true; continue; }
      const verified = entry.state === "ready" && isVerified(entry.trace, { expression: text, methodKey: "רגיל", expectedValue: declaredValue });
      if (!verified) { unavailable = true; continue; }
      engine[text] = { value: declaredValue, state: "verified", trace: entry.trace };
    }
    const hasUnconfirmedLiteral = path.terms.some((t) => t.declaredOnly);
    if (!exprs.length || hasUnconfirmedLiteral) return { ...path, status: "no_phrase" };
    if (pending) return { ...path, status: "pending" };
    if (unavailable) return { ...path, status: "unavailable" };
    const evaluation = evaluateFormula(path.formula, { expressionValues: Object.fromEntries(Object.entries(engine).map(([t, e]) => [t, { value: e.value, state: e.state }])), registry });
    const status = evaluation.status === FORMULA_STATUS.VERIFIED ? "verified" : evaluation.status === FORMULA_STATUS.UNSUPPORTED ? "unsupported" : "inconsistent";
    const traceByText = Object.fromEntries(Object.entries(engine).map(([t, e]) => [t, e.trace]));
    return { ...path, status, evaluation, steps: evaluation.sides[0]?.steps || [], traces: traceByText, trace: status === "verified" ? traceByText[path.phrase] || Object.values(traceByText)[0] || null : null,
      equationTokens: formulaTokens(path.formula, evaluation, { registry }) };
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
  // a ring is drawn only when the model gives its side count; a part with no model-declared geometry is NOT drawn (its path becomes a relation layer)
  const ring = (region) => {
    const panels = sidesOf(region);
    return region && panels ? { assignment: String(region.assignment), quantity: Number(region.quantity), panels } : null;
  };
  // the triangle count is the model's own source-diagram property (`inner_triangles`), never inferred from the region's arithmetic quantity
  const triangleCount = (spatial.structuralProperties || []).find((item) => item?.key === "inner_triangles")?.value;
  return {
    family: "compound_pentagon",
    // a cube has exactly 6 faces; a model that says otherwise is not drawn as a cube
    cube: cube?.faceWord && cubeFacesOf(spatial) === 6 ? { word: String(cube.faceWord), faces: 6 } : null,
    outer: ring(outer),
    inner: ring(inner),
    triangles: tri && Number.isInteger(triangleCount) && triangleCount >= 1 && triangleCount <= 12
      ? { assignment: String(tri.assignment), quantity: Number(tri.quantity), count: triangleCount } : null,
  };
}

// Shape family 2 — the regular icosahedron (עשרימון). An icosahedron has exactly 20 faces BY DEFINITION (the same class of geometric fact as a cube's
// 6); the word on each face and its value come from the model (cube.faceWord + the declared gematria entry; the canonical engine still verifies the value).
// A model that declares another face count, or no face word / word value, is not drawn as an icosahedron.
export const ICOSAHEDRON_FACES = 20;
export function icosahedronStructureSpec({ shapeIdentity, structuralProperties = [], gematria = [], faceWord = null } = {}) {
  if (shapeIdentity !== "icosahedron" || !faceWord) return null;
  const declared = (structuralProperties || []).find((item) => item?.key === "faces")?.value;
  if (declared !== undefined && declared !== ICOSAHEDRON_FACES) return null;
  const entry = (gematria || []).find((item) => Array.isArray(item) && item[0] === faceWord);
  const wordValue = Number(entry?.[1]);
  if (!Number.isFinite(wordValue)) return null;
  return { family: "icosahedron", faces: ICOSAHEDRON_FACES, word: String(faceWord), wordValue };
}

// One entry point for every shape family the lab can draw: the compound pentagon family, or the icosahedron. null = not a drawn family.
export function structureSpecFor({ shapeIdentity, regions, structuralProperties, gematria, cubeFaceWord } = {}) {
  return compoundStructureSpec({ shapeIdentity, regions, structuralProperties }, { faceWord: cubeFaceWord })
    || icosahedronStructureSpec({ shapeIdentity, structuralProperties, gematria, faceWord: cubeFaceWord });
}

export const STRUCTURE_PART_LABEL = Object.freeze({ cube: "קובייה", outer: "מחומש חיצוני", inner: "מחומש פנימי", triangles: "משולשים פנימיים", relation: "שכבת קשר", solid: "עשרימון" });

export function bindPathsToStructure(paths, spec) {
  if (spec?.family === "icosahedron") {
    // one solid carries the whole path: word value × 20 faces; a path that does not fit the declared solid has no geometry (relation layer)
    return paths.map((path) => {
      const fits = Boolean(path.phrase) && path.phrase === spec.word && path.operand === spec.wordValue && path.quantity === spec.faces;
      return { ...path, part: fits ? "solid" : "relation", geometric: fits };
    });
  }
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
  if (part === "solid") return { part, label: STRUCTURE_PART_LABEL.solid, facts: [{ key: "פאות בצורה", value: spec.faces, origin: "גאומטריה של עשרימון משוכלל" }, quantity], note: null };
  if (part === "cube") return { part, label: STRUCTURE_PART_LABEL.cube, facts: [{ key: "פאות בצורה", value: spec.cube.faces, origin: "גאומטריה של קובייה" }, quantity], note: null };
  if (part === "outer" || part === "inner") {
    const ring = spec[part];
    return { part, label: STRUCTURE_PART_LABEL[part], facts: [{ key: "צלעות בצורה", value: ring.panels, origin: "מבנה הצורה במודל" }, quantity],
      note: ring.panels !== ring.quantity ? `מספר הצלעות (${ring.panels}) הוא צורה; הכמות (${ring.quantity}) מקורה בנתוני המחקר. הם אינם אותו דבר.` : null };
  }
  if (part === "triangles") return { part, label: STRUCTURE_PART_LABEL.triangles, facts: [{ key: "משולשים בצורה", value: spec.triangles.count, origin: "שרטוט המקור במודל" }, quantity], note: null };
  return { part: "relation", label: STRUCTURE_PART_LABEL.relation, facts: [quantity], note: "אין מבנה גאומטרי מאושר למסלול הזה. הוא מוצג כשכבת קשר נפרדת ולא כצורה." };
}

// Exact source attribution for ONE path, split by what each fact really comes from (never a blended "source" claim):
//  - the phrase value  -> the canonical engine (only when the path is verified);
//  - the quantity      -> the model's own declared property for that quantity (key + provenance), or NOT stated / ambiguous;
//  - the document      -> card-level locators only: the model does not tie an appearance to one region, and this says so.
export function describePathSource(path, locators = []) {
  const quantity = { value: path?.quantity ?? null, key: path?.quantityKey || null, origin: path?.quantityProvenance || null,
    state: path?.quantityProvenance ? "declared" : path?.quantityAmbiguous ? "ambiguous" : "not_stated" };
  const phrase = path?.phrase ? { text: path.phrase, origin: path.status === "verified" ? "gematria_method_trace" : null, verified: path.status === "verified" } : null;
  return {
    quantity, phrase,
    document: { scope: "card", locators: locators.slice(0, 4), note: "מקור כללי של הכרטיס; המודל אינו מצמיד הופעה לאזור מסוים במבנה." },
  };
}
