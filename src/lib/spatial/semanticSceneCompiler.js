// src/lib/spatial/semanticSceneCompiler.js
// Semantic Scene Compiler — GENERALIZED CORE, re-ported unchanged from the Spatial Gematria Golden
// Slice (work_log 7f0d8ac8) since that branch is unmerged, plus ONE new adapter this task needs:
// compileTorahOccurrenceScene(). Per this task's explicit instruction ("do NOT create a parallel ELS
// Scene Compiler unless existing evidence proves the generic contract cannot represent occurrences")
// — evidence did NOT require a new primitive: TRUTH_TIERS/polar()/buildAvailableActions are reused
// exactly as-is; only a third domain adapter was added beside compileGematriaScene's slot (not
// re-ported here since unused by this task — would be dead code — but the shared core is byte-
// identical, so a future merge can carry all adapters in one file with zero conflict).
//
// Frozen Slice-0 contract: x/y/z, camera, size, color, animation, layout and LOD are PROJECTION STATE
// ONLY and never canonical knowledge. Nothing here persists; every compile is fresh and disposable.
// This module NEVER renders one scene node per Torah letter (see compileTorahOccurrenceScene below) —
// individual glyph rendering is the proven row/chunk Glyph Runtime's job, not the compiler's.

// ===== GENERIC CORE (domain-independent — identical to work_log 7f0d8ac8) =====

export const TRUTH_TIERS = {
  FACT: "FACT",
  FINDING: "FINDING",
  SOURCE_SUPPORTED: "SOURCE_SUPPORTED",
  CANDIDATE: "CANDIDATE",
  ENGINE_MISMATCH: "ENGINE_MISMATCH",
};

export function classifyResearchTruthTier(researchObject) {
  const text = JSON.stringify(researchObject).toLowerCase();
  const statement = (researchObject.statement || "").toLowerCase();
  if (statement.includes("human-gate") || statement.includes("מאומת ע\"י צוריאל") || statement.includes("מאומת על ידי צוריאל")) {
    return TRUTH_TIERS.SOURCE_SUPPORTED;
  }
  if (text.includes("candidate") || text.includes("not_generalized") || text.includes("held") || text.includes("unresolved") || text.includes("pending")) {
    return TRUTH_TIERS.CANDIDATE;
  }
  return TRUTH_TIERS.FINDING;
}

export function polar(index, count, radius, yBase) {
  const angle = (index / Math.max(count, 1)) * Math.PI * 2;
  return { x: Math.cos(angle) * radius, y: yBase, z: Math.sin(angle) * radius };
}

export function buildAvailableActions({ subjectId, sceneNodes, sceneRelations, focused, lensKeys, extra = [] }) {
  return [
    { action: "focus_subject", targetId: subjectId },
    ...sceneNodes.filter((n) => n.id !== focused).map((n) => ({ action: "select_node", targetId: n.id })),
    ...sceneRelations.map((r) => ({ action: "follow_relation", targetId: r.id })),
    { action: "show_source", targetId: focused },
    { action: "switch_depth", options: lensKeys },
    ...extra,
    { action: "back" },
  ];
}

// ===== TORAH OCCURRENCE ADAPTER (this task) =====
// LOD contract (minimum scale contract only, per task): CORPUS/BOOK SUMMARY -> CHUNK/WINDOW ->
// OCCURRENCE DETAIL. Occurrence-level truth (grapheme/niqqud/locator/path-step) is NOT carried as a
// scene node per letter — it lives in the occurrence objects themselves (torahOccurrenceAdapter.js)
// and is looked up on pick; the compiler only lays out BOOK and CHUNK summary nodes plus the path's
// own relation structure, matching the proven "don't make 10,000 glyphs 10,000 meshes" performance law.

export const TORAH_LENSES = {
  summary: { key: "summary", label: "תקציר-ספר", layers: ["book"] },
  chunk: { key: "chunk", label: "חלונות", layers: ["book", "chunk"] },
  detail: { key: "detail", label: "פירוט-מופע", layers: ["book", "chunk", "path"] },
};

const LAYER_Y = { book: 0, chunk: 0.9, path: 1.8 };

/**
 * compileTorahOccurrenceScene({ books, chunks, pathFixture }, { lens, focusId })
 * - books: [{ bookIndex, name, chunkIds:[...] }] — real book(s) covered by the currently-loaded range.
 * - chunks: [{ id, startIndex, endIndex, count, pathMemberCount }] — real 100-letter windows, computed
 *   from real occurrence data (torahOccurrenceAdapter), never invented.
 * - pathFixture: the real captured ELS path (torahElsPathFixture.js) or null.
 * Returns the standard { subjectId, sceneNodes, sceneRelations, availableActions, lens, focusId }.
 */
export function compileTorahOccurrenceScene(input, { lens = "summary", focusId = null } = {}) {
  const activeLens = TORAH_LENSES[lens] || TORAH_LENSES.summary;
  const { books, chunks, pathFixture } = input;

  const sceneNodes = [];
  const sceneRelations = [];

  const subjectId = "corpus";
  sceneNodes.push({
    id: subjectId, kind: "corpus", label: "תורה — קורפוס", subtitle: `${chunks.length} חלונות · ${chunks.reduce((s, c) => s + c.count, 0)} אותיות בטווח הנטען`,
    truthTier: TRUTH_TIERS.FACT, position: { x: 0, y: LAYER_Y.book, z: 0 },
    ref: { type: "torah_corpus", chunkCount: chunks.length },
  });

  if (activeLens.layers.includes("book")) {
    books.forEach((b, i) => {
      const id = `book:${b.bookIndex}`;
      const pos = polar(i, books.length, 2.2, LAYER_Y.book);
      sceneNodes.push({
        id, kind: "book", label: b.name, subtitle: `${b.chunkIds.length} חלונות בטווח`,
        truthTier: TRUTH_TIERS.FACT, position: pos,
        ref: { type: "torah_book", bookIndex: b.bookIndex, name: b.name },
      });
      sceneRelations.push({ id: `rel:${subjectId}->${id}`, from: subjectId, to: id, kind: "contains_book", explanation: `${b.name} — ${b.chunkIds.length} חלונות נטענים` });
    });
  }

  if (activeLens.layers.includes("chunk")) {
    chunks.forEach((c, i) => {
      const id = `chunk:${c.id}`;
      const pos = polar(i, chunks.length, 4.6, LAYER_Y.chunk);
      sceneNodes.push({
        id, kind: "chunk", label: `חלון ${c.id}`, subtitle: `${c.startIndex}–${c.endIndex - 1} (${c.count} אותיות)${c.pathMemberCount ? ` · ${c.pathMemberCount} בציר` : ""}`,
        truthTier: TRUTH_TIERS.FACT, position: pos,
        ref: { type: "torah_chunk", id: c.id, startIndex: c.startIndex, endIndex: c.endIndex, count: c.count, pathMemberCount: c.pathMemberCount },
      });
      const bookId = `book:${c.bookIndex}`;
      sceneRelations.push({ id: `rel:${bookId}->${id}`, from: bookId, to: id, kind: "contains_chunk", explanation: `אותיות ${c.startIndex}–${c.endIndex - 1}` });
    });
  }

  if (activeLens.layers.includes("path") && pathFixture) {
    const pathId = `path:${pathFixture.pathId}`;
    const pos = polar(0, 1, 7.2, LAYER_Y.path);
    sceneNodes.push({
      id: pathId, kind: "path", label: `צופן: ${pathFixture.term}`, subtitle: `דילוג ${pathFixture.skip} · ${pathFixture.positions.length} אותיות · מנוע-ELS אמיתי`,
      truthTier: TRUTH_TIERS.FACT, position: pos,
      ref: { type: "els_path", pathId: pathFixture.pathId, term: pathFixture.term, skip: pathFixture.skip, direction: pathFixture.direction, positions: pathFixture.positions, engineSource: pathFixture.engineSource },
    });
    const memberChunkIds = new Set(chunks.filter((c) => c.pathMemberCount > 0).map((c) => c.id));
    memberChunkIds.forEach((cid) => {
      const chunkNodeId = `chunk:${cid}`;
      sceneRelations.push({ id: `rel:${pathId}->${chunkNodeId}`, from: pathId, to: chunkNodeId, kind: "annotates", explanation: `הצופן «${pathFixture.term}» חוצה חלון ${cid} — הדגשה בלבד, לא שינוי-זהות של האותיות בו` });
    });
  }

  const focused = focusId && sceneNodes.some((n) => n.id === focusId) ? focusId : subjectId;
  const availableActions = buildAvailableActions({ subjectId, sceneNodes, sceneRelations, focused, lensKeys: Object.keys(TORAH_LENSES) });

  return { subjectId, sceneNodes, sceneRelations, availableActions, lens: activeLens.key, focusId: focused };
}


// ===== HEBREW LETTER ANATOMY ADAPTER =====
// Renderer-independent projection. Values must be supplied by a canonical engine trace;
// this compiler never calculates or persists gematria truth.
export function compileLetterAnatomyScene({ expression, methodKey, variantSource = "engine_default", letterSpecs = [], engineTrace }, { focusId = null } = {}) {
  if (!expression || !methodKey || !engineTrace?.engine_verified) {
    throw new Error("LETTER_ANATOMY_REQUIRES_ENGINE_VERIFIED_TRACE");
  }
  const subjectId = `letter-anatomy:${methodKey}:${expression}`;
  const sceneNodes = [{
    id: subjectId, kind: "expression", label: expression,
    subtitle: `${methodKey} · ${variantSource}`, truthTier: TRUTH_TIERS.FACT,
    position: { x: 0, y: 0, z: 0 },
    ref: { type: "gematria_expression", expression, methodKey, variantSource, engineTrace }
  }];
  const sceneRelations = [];
  letterSpecs.forEach((spec, i) => {
    const id = `letter:${i}:${spec.letter.codepoint}`;
    sceneNodes.push({
      id, kind: "letter_anatomy", label: spec.letter.codepoint,
      subtitle: spec.expansions?.[0]?.spelling || "",
      truthTier: TRUTH_TIERS.FACT,
      position: polar(i, letterSpecs.length, 3.2, 1),
      ref: { type: "letter_anatomy_spec", spec_id: spec.spec_id, spec }
    });
    sceneRelations.push({ id: `rel:${subjectId}->${id}`, from: subjectId, to: id, kind: "contains_letter", explanation: "projection-only letter membership" });
  });
  const resultId = `engine-result:${methodKey}:${engineTrace.value}`;
  sceneNodes.push({
    id: resultId, kind: "engine_result", label: String(engineTrace.value),
    subtitle: methodKey, truthTier: TRUTH_TIERS.FACT,
    position: { x: 0, y: 2, z: 0 },
    ref: { type: "engine_result", methodKey, value: engineTrace.value, engine_verified: true, trace: engineTrace }
  });
  sceneRelations.push({ id: `rel:${subjectId}->${resultId}`, from: subjectId, to: resultId, kind: "engine_result", explanation: "canonical engine result; representation does not verify it" });
  const focused = focusId && sceneNodes.some(n=>n.id===focusId) ? focusId : subjectId;
  return {
    subjectId, sceneNodes, sceneRelations,
    availableActions: buildAvailableActions({ subjectId, sceneNodes, sceneRelations, focused, lensKeys: ["visible","full","hidden"] }),
    lens: "visible", focusId: focused
  };
}


// ===== CONVERGENCE ADAPTER =====
// Multiple independently engine-verified routes may meet at one value node.
// Convergence is a relation/projection, never a truth score or canonicality signal.
export function compileConvergenceScene({ convergenceId, value, routes = [] }, { focusId = null } = {}) {
  if (!convergenceId || value == null || routes.length < 2) throw new Error("CONVERGENCE_REQUIRES_MULTIPLE_ROUTES");
  if (routes.some(r => !r?.engineTrace?.engine_verified || r.engineTrace.value !== value)) {
    throw new Error("CONVERGENCE_REQUIRES_MATCHING_ENGINE_VERIFIED_ROUTES");
  }
  const subjectId = `convergence:${convergenceId}`;
  const valueId = `value:${value}`;
  const sceneNodes = [{
    id: subjectId, kind: "convergence", label: String(value),
    subtitle: `${routes.length} מסלולים מאומתים במנוע`,
    truthTier: TRUTH_TIERS.FINDING, position: { x: 0, y: 0, z: 0 },
    ref: { type: "convergence_projection", convergenceId, value, truth_score: null }
  },{
    id: valueId, kind: "number", label: String(value), subtitle: "נקודת מפגש",
    truthTier: TRUTH_TIERS.FACT, position: { x: 0, y: 1.4, z: 0 },
    ref: { type: "engine_value", value }
  }];
  const sceneRelations = [];
  routes.forEach((route,i)=>{
    const id=`route:${i}:${route.methodKey}:${route.expression}`;
    sceneNodes.push({
      id, kind:"convergence_route", label:route.expression, subtitle:route.methodKey,
      truthTier:TRUTH_TIERS.FACT, position:polar(i,routes.length,4.2,0.7),
      ref:{type:"engine_route",expression:route.expression,methodKey:route.methodKey,variantSource:route.variantSource||null,engineTrace:route.engineTrace}
    });
    sceneRelations.push({id:`rel:${id}->${valueId}`,from:id,to:valueId,kind:"converges_to",explanation:`${route.methodKey} → ${value}`});
  });
  const focused=focusId&&sceneNodes.some(n=>n.id===focusId)?focusId:subjectId;
  return {subjectId,sceneNodes,sceneRelations,availableActions:buildAvailableActions({subjectId,sceneNodes,sceneRelations,focused,lensKeys:["overview","routes","sources"]}),lens:"overview",focusId:focused};
}


// ===== MOTION PROJECTION =====
// Deterministic timeline derived from an already-compiled semantic scene.
// It contains presentation cues only; it cannot add findings or numeric truth.
export function compileMotionProjection(scene,{projectionId="motion-v1"}={}) {
  if(!scene?.subjectId||!Array.isArray(scene.sceneNodes)||!Array.isArray(scene.sceneRelations)) throw new Error("MOTION_REQUIRES_COMPILED_SCENE");
  const routes=scene.sceneNodes.filter(n=>n.kind==="convergence_route");
  const valueNode=scene.sceneNodes.find(n=>n.kind==="number"||n.kind==="engine_result");
  const cues=[
    {at:0,action:"brand_open",target:scene.subjectId,tier:"T1"},
    ...routes.map((r,i)=>({at:1200+i*2200,action:"reveal_route",target:r.id,tier:"T2",label:r.label,subtitle:r.subtitle})),
    ...(valueNode?[{at:1200+routes.length*2200,action:"converge",target:valueNode.id,tier:"T2",label:valueNode.label}]:[]),
    {at:1800+routes.length*2200,action:"hold",target:scene.subjectId,tier:"T0"}
  ];
  return {
    projection_id:projectionId,
    source_subject_id:scene.subjectId,
    semantics:"projection_only",
    may_add_truth:false,
    aspect_profiles:["9:16","1:1","16:9"],
    reduced_motion:cues.map(c=>({...c,action:c.action==="converge"?"show":c.action==="reveal_route"?"show":c.action,tier:"T0"})),
    cues
  };
}


// ===== METHOD PHYSICS: MISTATER TENSION + TRIANGLE FAMILY =====
// These adapters consume canonical gematria_method_trace output. They do not calculate
// method truth. Any geometric metaphor ("tension", "potential", "triangle") is projection-only.

function assertCanonicalMethodTrace(trace, methodKey, traceKind) {
  const ok = trace &&
    trace.method_key === methodKey &&
    trace.trace_kind === traceKind &&
    trace.verification?.parity === true &&
    trace.verification?.trace_value === trace.result &&
    trace.verification?.canonical_value === trace.result;
  if (!ok) throw new Error("SPATIAL_METHOD_REQUIRES_VERIFIED_CANONICAL_TRACE");
}

export function compileMistaterTensionScene({ expression, methodTrace }, { focusId = null } = {}) {
  assertCanonicalMethodTrace(methodTrace, "מסתתר", "ADJACENT_DIFFERENCE");
  if (!expression || methodTrace.input !== expression || !Array.isArray(methodTrace.steps)) {
    throw new Error("MISTATER_TENSION_TRACE_INPUT_MISMATCH");
  }

  const subjectId = `mistater-tension:${expression}`;
  const sceneNodes = [{
    id: subjectId,
    kind: "expression",
    label: expression,
    subtitle: "מסתתר · מתח בין אותיות",
    truthTier: TRUTH_TIERS.FACT,
    position: { x: 0, y: 0, z: 0 },
    ref: {
      type: "gematria_method_trace",
      methodKey: "מסתתר",
      traceKind: methodTrace.trace_kind,
      projection_semantics: "tension_between_adjacent_letters",
      projection_only: true,
      trace: methodTrace,
    },
  }];
  const sceneRelations = [];
  let letterOffset = 0;
  let totalFromTrace = 0;

  methodTrace.steps.forEach((step, wordIndex) => {
    const letters = [...String(step.word || "")];
    const values = Array.isArray(step.letter_values) ? step.letter_values : [];
    const pairs = Array.isArray(step.pairs) ? step.pairs : [];
    if (letters.length !== values.length || pairs.length !== Math.max(letters.length - 1, 0)) {
      throw new Error("MISTATER_TENSION_TRACE_SHAPE_MISMATCH");
    }

    letters.forEach((letter, i) => {
      const id = `mistater-letter:${wordIndex}:${i}:${letter}`;
      sceneNodes.push({
        id,
        kind: "letter_anchor",
        label: letter,
        subtitle: String(values[i]),
        truthTier: TRUTH_TIERS.FACT,
        position: { x: letterOffset + i * 1.4, y: 0.7, z: 0 },
        ref: {
          type: "method_trace_letter",
          methodKey: "מסתתר",
          wordIndex,
          letterIndex: i,
          letter,
          value: values[i],
          source: "canonical_method_trace",
        },
      });
    });

    let subtotal = 0;
    pairs.forEach((pair, i) => {
      const leftId = `mistater-letter:${wordIndex}:${i}:${letters[i]}`;
      const rightId = `mistater-letter:${wordIndex}:${i + 1}:${letters[i + 1]}`;
      if (
        pair.left_value !== values[i] ||
        pair.right_value !== values[i + 1] ||
        pair.difference !== Math.abs(pair.left_value - pair.right_value)
      ) {
        throw new Error("MISTATER_TENSION_TRACE_PAIR_MISMATCH");
      }
      subtotal += pair.difference;
      sceneRelations.push({
        id: `tension:${wordIndex}:${i}`,
        from: leftId,
        to: rightId,
        kind: "tension_between",
        explanation: `|${letters[i]}(${pair.left_value})−${letters[i + 1]}(${pair.right_value})| = ${pair.difference}`,
        ref: {
          type: "adjacent_difference",
          difference: pair.difference,
          left_value: pair.left_value,
          right_value: pair.right_value,
          source: "canonical_method_trace",
          projection_only: true,
        },
      });
    });

    if (subtotal !== step.word_subtotal) throw new Error("MISTATER_TENSION_TRACE_SUBTOTAL_MISMATCH");
    totalFromTrace += step.word_subtotal;
    letterOffset += letters.length * 1.4 + 1.8;
  });

  if (totalFromTrace !== methodTrace.result) throw new Error("MISTATER_TENSION_TRACE_TOTAL_MISMATCH");

  const resultId = `mistater-result:${methodTrace.result}`;
  sceneNodes.push({
    id: resultId,
    kind: "engine_result",
    label: String(methodTrace.result),
    subtitle: "מסתתר",
    truthTier: TRUTH_TIERS.FACT,
    position: { x: 0, y: 2.2, z: 0 },
    ref: {
      type: "engine_result",
      methodKey: "מסתתר",
      value: methodTrace.result,
      engine_verified: true,
      trace: methodTrace,
    },
  });
  sceneRelations.push({
    id: `rel:${subjectId}->${resultId}`,
    from: subjectId,
    to: resultId,
    kind: "engine_result",
    explanation: "סכום קשרי המתח מתוך trace קנוני מאומת",
  });

  const focused = focusId && sceneNodes.some((n) => n.id === focusId) ? focusId : subjectId;
  return {
    subjectId,
    sceneNodes,
    sceneRelations,
    availableActions: buildAvailableActions({
      subjectId,
      sceneNodes,
      sceneRelations,
      focused,
      lensKeys: ["tension", "explain", "result"],
    }),
    lens: "tension",
    focusId: focused,
    projection_kind: "adjacent_letter_tension",
  };
}

// ===== SCENE.V1 — renderer-independent unified scene contract (M0: Mistater) =====
// Implementation-level contract under experience_governance_foundation_v1_law v8 + SOD1820_DESIGN_CONTRACT_V1.md
// (no new owner/store/engine). One scene.v1 is the single relationship model that the DOM/SVG stage consumes
// today and that a lazy R3F renderer (M1) / Blender importer (M2) must consume tomorrow. GLB is a derived asset,
// never the semantic SSOT.
//
// Rules: (1) topology + identity refs are semantic; transforms/curve/style/motion are PROJECTION STATE ONLY, never truth.
// (2) Nodes and connectors carry canonical identity REFS (trace paths) — never arithmetic values. Values are resolved
//     from the canonical trace via resolveSceneTraceValue(). (3) Connectors reference socket ids, never coordinates.
// (4) Axes: x grows rightward, y up, z toward viewer; layout.direction "rtl" means reading order runs toward -x.
//     Consumers flip y for screens. M0 layouts use translation only; the resolver supports full TRS
//     (see SCENE_V1_TRANSFORM_CONVENTION) and sockets carry object-space outward normals.

export const SCENE_V1_SCHEMA = "sod1820.scene.v1";

const MISTATER_LAYOUT = Object.freeze({
  letterWidth: 56,
  letterHeight: 72,
  letterDepth: 14,
  letterPitch: 120,
  wordGap: 48,
  resultLift: 120,
  connectorLift: 30,
});

const IDENTITY_ROTATION = Object.freeze({ x: 0, y: 0, z: 0 });
const IDENTITY_SCALE = Object.freeze({ x: 1, y: 1, z: 1 });

function sceneTransform(x, y, z = 0) {
  return { position: { x, y, z }, rotation: { ...IDENTITY_ROTATION }, scale: { ...IDENTITY_SCALE } };
}

// ----- Transform semantics (M1 hardening) — renderer-neutral, pure math, no Three dependency -----
// Convention (explicit, so Web/Blender/any importer reproduce it): right-handed; transform.rotation is Euler
// angles in RADIANS applied in order "XYZ" (intrinsic; rotation matrix R = Rx * Ry * Rz — identical to the
// Three.js default Euler order and expressible in Blender as XYZ Euler); local matrix = T * R * S; world matrix =
// parent.world * local. Matrices are 16-element column-major arrays. Sockets are object-space points with a
// unit object-space outward normal.
export const SCENE_V1_TRANSFORM_CONVENTION = Object.freeze({
  handedness: "right",
  rotation: Object.freeze({ unit: "radian", euler: "XYZ", matrix: "Rx*Ry*Rz" }),
  local: "T*R*S",
  world: "parent.world*local",
  matrixLayout: "column_major_16",
});

function localMatrix(t) {
  const { x: px, y: py, z: pz } = t.position;
  const { x: a, y: b, z: c } = t.rotation;
  const { x: sx, y: sy, z: sz } = t.scale;
  const cx = Math.cos(a), sxn = Math.sin(a), cy = Math.cos(b), syn = Math.sin(b), cz = Math.cos(c), szn = Math.sin(c);
  // R = Rx * Ry * Rz (row-major entries r{row}{col})
  const r00 = cy * cz, r01 = -cy * szn, r02 = syn;
  const r10 = cx * szn + sxn * syn * cz, r11 = cx * cz - sxn * syn * szn, r12 = -sxn * cy;
  const r20 = sxn * szn - cx * syn * cz, r21 = sxn * cz + cx * syn * szn, r22 = cx * cy;
  return [
    r00 * sx, r10 * sx, r20 * sx, 0,
    r01 * sy, r11 * sy, r21 * sy, 0,
    r02 * sz, r12 * sz, r22 * sz, 0,
    px, py, pz, 1,
  ];
}

function mulMat(p, l) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c += 1) for (let r = 0; r < 4; r += 1) {
    let v = 0;
    for (let k = 0; k < 4; k += 1) v += p[k * 4 + r] * l[c * 4 + k];
    o[c * 4 + r] = v;
  }
  return o;
}

export function resolveSceneWorldMatrix(scene, nodeId) {
  const byId = new Map(scene.nodes.map((n) => [n.id, n]));
  let cur = byId.get(nodeId);
  if (!cur) throw new Error("SCENE_V1_UNKNOWN_NODE");
  const seen = new Set();
  const chain = [];
  while (cur) {
    if (seen.has(cur.id)) throw new Error("SCENE_V1_PARENT_CYCLE");
    seen.add(cur.id);
    chain.push(cur);
    cur = cur.parent ? byId.get(cur.parent) : null;
  }
  let m = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  for (let i = chain.length - 1; i >= 0; i -= 1) m = mulMat(m, localMatrix(chain[i].transform));
  return m;
}

const applyPoint = (m, p) => ({
  x: m[0] * p.x + m[4] * p.y + m[8] * p.z + m[12],
  y: m[1] * p.x + m[5] * p.y + m[9] * p.z + m[13],
  z: m[2] * p.x + m[6] * p.y + m[10] * p.z + m[14],
});

// Normals use the inverse-transpose of the upper 3x3 so they stay perpendicular under non-uniform scale.
function applyNormal(m, n) {
  const a = m[0], b = m[4], c = m[8], d = m[1], e = m[5], f = m[9], g = m[2], h = m[6], i = m[10];
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (!det) throw new Error("SCENE_V1_DEGENERATE_TRANSFORM");
  const inv = [
    (e * i - f * h) / det, (c * h - b * i) / det, (b * f - c * e) / det,
    (f * g - d * i) / det, (a * i - c * g) / det, (c * d - a * f) / det,
    (d * h - e * g) / det, (b * g - a * h) / det, (a * e - b * d) / det,
  ];
  // inverse-transpose applied to n == transpose(inv) * n
  const x = inv[0] * n.x + inv[3] * n.y + inv[6] * n.z;
  const y = inv[1] * n.x + inv[4] * n.y + inv[7] * n.z;
  const z = inv[2] * n.x + inv[5] * n.y + inv[8] * n.z;
  const len = Math.hypot(x, y, z) || 1;
  return { x: x / len, y: y / len, z: z / len };
}

export function resolveSceneWorldPosition(scene, nodeId) {
  return applyPoint(resolveSceneWorldMatrix(scene, nodeId), { x: 0, y: 0, z: 0 });
}

function findSocket(scene, socketRef) {
  const node = scene.nodes.find((n) => n.id === socketRef.node);
  const socket = node?.sockets?.find((s) => s.id === socketRef.socket);
  if (!node || !socket) throw new Error("SCENE_V1_UNKNOWN_SOCKET");
  return { node, socket };
}

export function resolveSceneSocketWorld(scene, socketRef) {
  const { node, socket } = findSocket(scene, socketRef);
  return applyPoint(resolveSceneWorldMatrix(scene, node.id), socket.position);
}

export function resolveSceneSocketNormalWorld(scene, socketRef) {
  const { node, socket } = findSocket(scene, socketRef);
  return applyNormal(resolveSceneWorldMatrix(scene, node.id), socket.normal);
}

// Renderer-neutral connector geometry: ONE cubic Bezier (4 world-space control points) derived only from the
// connector's from/to sockets (position + outward normal) and its curve metadata. P0/P3 are the exact socket world
// positions; P1/P2 leave/enter along the socket normals by handle*|P3-P0| and are lifted along curve.liftAxis by
// curve.lift. Web (R3F tube) and Blender (bezier curve) must both reproduce these four points.
export function resolveSceneConnectorCurve(scene, connector) {
  const p0 = resolveSceneSocketWorld(scene, connector.from);
  const p3 = resolveSceneSocketWorld(scene, connector.to);
  const n0 = resolveSceneSocketNormalWorld(scene, connector.from);
  const n3 = resolveSceneSocketNormalWorld(scene, connector.to);
  const dist = Math.hypot(p3.x - p0.x, p3.y - p0.y, p3.z - p0.z);
  const h = (connector.curve.handle ?? 0) * dist;
  const axis = { x: 0, y: 0, z: 0, ...(connector.curve.liftAxis || { y: 1 }) };
  const lift = connector.curve.lift || 0;
  const off = (n) => ({ x: n.x * h + axis.x * lift, y: n.y * h + axis.y * lift, z: n.z * h + axis.z * lift });
  const o0 = off(n0), o3 = off(n3);
  return {
    kind: "cubic_bezier",
    points: [p0, { x: p0.x + o0.x, y: p0.y + o0.y, z: p0.z + o0.z }, { x: p3.x + o3.x, y: p3.y + o3.y, z: p3.z + o3.z }, p3],
  };
}

// Resolves a canonical value through an identityRef trace path. Values live only in the canonical trace.
export function resolveSceneTraceValue(scene, identityRef) {
  const trace = scene.canonical.trace;
  if (identityRef.type === "method_trace_pair") {
    const pair = trace.steps?.[identityRef.wordIndex]?.pairs?.[identityRef.pairIndex];
    if (!pair) throw new Error("SCENE_V1_IDENTITY_UNRESOLVED");
    return { difference: pair.difference, leftValue: pair.left_value, rightValue: pair.right_value };
  }
  if (identityRef.type === "method_trace_letter") {
    const value = trace.steps?.[identityRef.wordIndex]?.letter_values?.[identityRef.letterIndex];
    if (value === undefined) throw new Error("SCENE_V1_IDENTITY_UNRESOLVED");
    return { value };
  }
  if (identityRef.type === "engine_result") return { value: trace.result };
  throw new Error("SCENE_V1_IDENTITY_UNRESOLVED");
}

// ----- Portable projection identity (M0 hardening) -----
// Deterministic serializer + fingerprint over the PROJECTION only: schema, subject identity, topology, transforms,
// sockets, connectors (by identityRef path, never value), layout and fallback metadata. The canonical trace payload
// and any arithmetic-bearing field (engine_result label and its value-derived node id, normalized to "scene:result") are EXCLUDED, so the signature is a parity key for R3F/Blender
// consumers and is NOT a truth store. The fingerprint is a non-cryptographic 53-bit hash (cyrb53) — no security claim.
function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().filter((k) => value[k] !== undefined).map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function cyrb53Hex(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i += 1) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, "0");
}

export function serializeSceneProjectionV1(scene) {
  const projection = {
    schema: scene.schema,
    projection_kind: scene.projection_kind,
    subjectId: scene.subjectId,
    resultId: "scene:result",
    canonicalRef: { type: scene.canonical.type, methodKey: scene.canonical.methodKey, traceKind: scene.canonical.traceKind, input: scene.canonical.input },
    layout: scene.layout,
    nodes: scene.nodes.map((n) => (n.id === scene.resultId ? { ...n, id: "scene:result", label: undefined } : n)),
    connectors: scene.connectors,
    extent: scene.extent,
    fallback: scene.fallback,
  };
  return stableStringify(projection);
}

export function computeSceneProjectionSignatureV1(scene) {
  return `projsig.v1:cyrb53:${cyrb53Hex(serializeSceneProjectionV1(scene))}`;
}

export function computeSceneIdV1(scene) {
  return `${scene.schema}:${scene.projection_kind}:${scene.subjectId}`;
}

// Delegates ALL canonical validation (verified parity, shape, pair/subtotal/total consistency) to the existing
// compileMistaterTensionScene — scene.v1 adds topology/projection only and fails closed through the same errors.
export function compileMistaterSceneV1({ expression, methodTrace }) {
  const legacy = compileMistaterTensionScene({ expression, methodTrace });
  const L = MISTATER_LAYOUT;
  const half = L.letterWidth / 2;
  const nodes = [];
  const connectors = [];
  const rootId = legacy.subjectId;
  const resultLegacy = legacy.sceneNodes.find((n) => n.kind === "engine_result");

  nodes.push({
    id: rootId, kind: "expression", parent: null, label: expression,
    transform: sceneTransform(0, 0), sockets: [],
    identityRef: { type: "gematria_method_trace", methodKey: "מסתתר", traceKind: methodTrace.trace_kind },
    truthTier: TRUTH_TIERS.FACT,
  });

  let offset = 0;
  const letterIdsInOrder = [];
  methodTrace.steps.forEach((step, wordIndex) => {
    const letters = [...String(step.word || "")];
    const wordId = `mistater-word:${wordIndex}`;
    nodes.push({
      id: wordId, kind: "word_group", parent: rootId, label: step.word,
      transform: sceneTransform(-offset, 0), sockets: [],
      identityRef: { type: "method_trace_word", methodKey: "מסתתר", wordIndex, tracePath: `steps[${wordIndex}]` },
      truthTier: TRUTH_TIERS.FACT,
    });
    letters.forEach((letter, i) => {
      const id = `mistater-letter:${wordIndex}:${i}:${letter}`;
      letterIdsInOrder.push(id);
      nodes.push({
        id, kind: "letter_anchor", parent: wordId, label: letter,
        transform: sceneTransform(-i * L.letterPitch, 0),
        bounds: { width: L.letterWidth, height: L.letterHeight, depth: L.letterDepth },
        // object-space sockets: "out" faces the next letter in reading order (-x for rtl), "in" faces the previous.
        sockets: [
          { id: `${id}#in`, role: "tension_in", position: { x: half, y: 0, z: 0 }, normal: { x: 1, y: 0, z: 0 } },
          { id: `${id}#out`, role: "tension_out", position: { x: -half, y: 0, z: 0 }, normal: { x: -1, y: 0, z: 0 } },
        ],
        identityRef: { type: "method_trace_letter", methodKey: "מסתתר", wordIndex, letterIndex: i, letter, tracePath: `steps[${wordIndex}].letter_values[${i}]` },
        truthTier: TRUTH_TIERS.FACT,
      });
    });
    for (let i = 0; i < letters.length - 1; i += 1) {
      const leftId = `mistater-letter:${wordIndex}:${i}:${letters[i]}`;
      const rightId = `mistater-letter:${wordIndex}:${i + 1}:${letters[i + 1]}`;
      connectors.push({
        id: `tension:${wordIndex}:${i}`,
        kind: "tension_between",
        from: { node: leftId, socket: `${leftId}#out` },
        to: { node: rightId, socket: `${rightId}#in` },
        identityRef: { type: "method_trace_pair", methodKey: "מסתתר", wordIndex, pairIndex: i, tracePath: `steps[${wordIndex}].pairs[${i}]` },
        // kind "arc" (S2 quadratic, unchanged) stays; additive 3D metadata: cubic handles along socket normals + lift axis.
        curve: { kind: "arc", lift: L.connectorLift, handle: 0.3, liftAxis: { x: 0, y: 1, z: 0 } },
        style: { role: "tension_edge", stroke: "accent", width: 2, glow: true },
        occlusion: { mode: "under_nodes", depthBias: -0.01 },
        label: { anchor: "curve_midpoint", source: "identityRef" },
        motion: { entrance: "draw", durationMs: 700, delayMs: i * 120, reducedMotion: "static_final_state" },
      });
    }
    offset += (Math.max(letters.length, 1) - 1) * L.letterPitch + L.letterWidth + L.wordGap;
  });

  const resultId = resultLegacy.id;
  nodes.push({
    id: resultId, kind: "engine_result", parent: rootId, label: resultLegacy.label,
    transform: sceneTransform(-(offset - L.wordGap - L.letterWidth) / 2, L.resultLift),
    sockets: [],
    identityRef: { type: "engine_result", methodKey: "מסתתר", tracePath: "result" },
    truthTier: TRUTH_TIERS.FACT,
  });

  const scene = {
    schema: SCENE_V1_SCHEMA,
    projection_kind: "adjacent_letter_tension",
    subjectId: rootId,
    resultId,
    layout: { direction: "rtl", axes: { x: "right", y: "up", z: "toward_viewer" }, unit: "layout_unit", projectionOnly: true, transformConvention: SCENE_V1_TRANSFORM_CONVENTION, constants: { ...L } },
    canonical: { type: "gematria_method_trace", methodKey: "מסתתר", traceKind: methodTrace.trace_kind, input: expression, trace: methodTrace },
    nodes,
    connectors,
    fallback: {
      reducedMotion: { respects: "prefers-reduced-motion", motion: "none", topology: "identical", truthState: "identical", connectors: "static_final_state" },
      static: { kind: "semantic_list", order: letterIdsInOrder, actions: "identical" },
      narrow: { strategy: "horizontal_scroll_same_coordinate_space" },
    },
  };

  const xs = [], ys = [];
  nodes.forEach((n) => {
    if (!n.bounds && n.kind !== "engine_result") return;
    const w = resolveSceneWorldPosition(scene, n.id);
    const bw = (n.bounds?.width ?? L.letterWidth) / 2, bh = (n.bounds?.height ?? L.letterHeight) / 2;
    xs.push(w.x - bw, w.x + bw); ys.push(w.y - bh, w.y + bh);
  });
  scene.extent = { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
  scene.scene_id = computeSceneIdV1(scene);
  scene.projection_signature = computeSceneProjectionSignatureV1(scene);
  return scene;
}

export function compileTriangleMethodScene({ expression, methodKey, methodTrace }, { focusId = null } = {}) {
  const contracts = {
    "קדמי": {
      traceKind: "LETTER_LEDGER",
      projectionKind: "letter_potential_triangle",
      label: "קדמי · משולש / פוטנציאל",
      prefixRows: false,
    },
    "משולש מילה": {
      traceKind: "CUMULATIVE_PREFIX",
      projectionKind: "word_prefix_triangle",
      label: "משולש מילה · התהוות",
      prefixRows: true,
    },
  };
  const contract = contracts[methodKey];
  if (!contract) throw new Error("TRIANGLE_METHOD_UNSUPPORTED");
  assertCanonicalMethodTrace(methodTrace, methodKey, contract.traceKind);
  if (!expression || methodTrace.input !== expression || !Array.isArray(methodTrace.steps)) {
    throw new Error("TRIANGLE_METHOD_TRACE_INPUT_MISMATCH");
  }

  const subjectId = `triangle:${methodKey}:${expression}`;
  const sceneNodes = [{
    id: subjectId,
    kind: "expression",
    label: expression,
    subtitle: contract.label,
    truthTier: TRUTH_TIERS.FACT,
    position: { x: 0, y: 0, z: 0 },
    ref: {
      type: "triangle_method_projection",
      methodKey,
      projection_kind: contract.projectionKind,
      prefix_rows: contract.prefixRows,
      projection_only: true,
      interpretive_alias: methodKey === "קדמי" ? "פוטנציאל" : null,
      trace: methodTrace,
    },
  }];

  const sceneRelations = [];
  let prefix = "";
  methodTrace.steps.forEach((step, i) => {
    prefix += String(step.token || "");
    const isWordTriangle = methodKey === "משולש מילה";
    const label = isWordTriangle ? prefix : String(step.token || "");
    const value = isWordTriangle ? step.prefix_subtotal : step.contribution;
    const id = `triangle-step:${methodKey}:${i}`;
    sceneNodes.push({
      id,
      kind: isWordTriangle ? "triangle_prefix_row" : "letter_potential",
      label,
      subtitle: String(value),
      truthTier: TRUTH_TIERS.FACT,
      position: { x: 0, y: 0.8 + i * 0.7, z: 0 },
      ref: {
        type: isWordTriangle ? "cumulative_prefix_step" : "kadmi_letter_step",
        methodKey,
        step,
        display_label: label,
        source: "canonical_method_trace",
        projection_only: true,
      },
    });
    sceneRelations.push({
      id: `rel:${subjectId}->${id}`,
      from: subjectId,
      to: id,
      kind: isWordTriangle ? "builds_prefix" : "carries_potential",
      explanation: isWordTriangle
        ? `שורת התהוות ${i + 1}: ${label}`
        : `פוטנציאל אות ${step.token}: ${step.contribution}`,
    });
  });

  const resultId = `triangle-result:${methodKey}:${methodTrace.result}`;
  sceneNodes.push({
    id: resultId,
    kind: "engine_result",
    label: String(methodTrace.result),
    subtitle: methodKey,
    truthTier: TRUTH_TIERS.FACT,
    position: { x: 0, y: 1.2 + methodTrace.steps.length * 0.7, z: 0 },
    ref: { type: "engine_result", methodKey, value: methodTrace.result, engine_verified: true, trace: methodTrace },
  });
  sceneRelations.push({ id: `rel:${subjectId}->${resultId}`, from: subjectId, to: resultId, kind: "engine_result", explanation: "canonical engine result" });

  const focused = focusId && sceneNodes.some((n) => n.id === focusId) ? focusId : subjectId;
  return {
    subjectId,
    sceneNodes,
    sceneRelations,
    availableActions: buildAvailableActions({
      subjectId,
      sceneNodes,
      sceneRelations,
      focused,
      lensKeys: contract.prefixRows ? ["rows", "result"] : ["potential", "result"],
    }),
    lens: contract.prefixRows ? "rows" : "potential",
    focusId: focused,
    projection_kind: contract.projectionKind,
  };
}


// ===== REGULAR / VISIBLE LETTER LEDGER =====
// Consumes the canonical LETTER_LEDGER trace for רגיל. The renderer may emphasize
// visible letters and source context, but it never recomputes the numeric result.
export function compileRegularLedgerScene({ expression, methodTrace, sourceRef = null }, { focusId = null } = {}) {
  assertCanonicalMethodTrace(methodTrace, "רגיל", "LETTER_LEDGER");
  if (!expression || methodTrace.input !== expression || !Array.isArray(methodTrace.steps)) {
    throw new Error("REGULAR_LEDGER_TRACE_INPUT_MISMATCH");
  }

  const subjectId = `regular-ledger:${expression}`;
  const sceneNodes = [{
    id: subjectId,
    kind: "expression",
    label: expression,
    subtitle: "רגיל · האותיות הגלויות",
    truthTier: TRUTH_TIERS.FACT,
    position: { x: 0, y: 0, z: 0 },
    ref: {
      type: "gematria_method_trace",
      methodKey: "רגיל",
      traceKind: methodTrace.trace_kind,
      sourceRef,
      projection_only: true,
      trace: methodTrace,
    },
  }];
  const sceneRelations = [];
  let sum = 0;
  let visibleIndex = 0;

  methodTrace.steps.forEach((step, stepIndex) => {
    const token = String(step.token || "");
    const contribution = Number(step.contribution);
    const baseValue = Number(step.base_value);
    if (!Number.isFinite(contribution) || !Number.isFinite(baseValue) || contribution !== baseValue) {
      throw new Error("REGULAR_LEDGER_TRACE_STEP_MISMATCH");
    }
    sum += contribution;
    if (!token.trim()) return;

    const id = `regular-letter:${stepIndex}:${token}`;
    sceneNodes.push({
      id,
      kind: "visible_letter",
      label: token,
      subtitle: String(contribution),
      truthTier: TRUTH_TIERS.FACT,
      position: { x: visibleIndex * 1.1, y: 0.9, z: 0 },
      ref: {
        type: "regular_letter_step",
        methodKey: "רגיל",
        stepIndex,
        token,
        contribution,
        source: "canonical_method_trace",
        projection_only: true,
      },
    });
    sceneRelations.push({
      id: `rel:${subjectId}->${id}`,
      from: subjectId,
      to: id,
      kind: "contains_visible_letter",
      explanation: `${token} = ${contribution}`,
    });
    visibleIndex += 1;
  });

  if (sum !== methodTrace.result) throw new Error("REGULAR_LEDGER_TRACE_TOTAL_MISMATCH");

  const resultId = `regular-result:${methodTrace.result}`;
  sceneNodes.push({
    id: resultId,
    kind: "engine_result",
    label: String(methodTrace.result),
    subtitle: "רגיל",
    truthTier: TRUTH_TIERS.FACT,
    position: { x: 0, y: 2.1, z: 0 },
    ref: {
      type: "engine_result",
      methodKey: "רגיל",
      value: methodTrace.result,
      engine_verified: true,
      trace: methodTrace,
    },
  });
  sceneRelations.push({
    id: `rel:${subjectId}->${resultId}`,
    from: subjectId,
    to: resultId,
    kind: "engine_result",
    explanation: "canonical engine result from visible-letter ledger",
  });

  const focused = focusId && sceneNodes.some((n) => n.id === focusId) ? focusId : subjectId;
  return {
    subjectId,
    sceneNodes,
    sceneRelations,
    availableActions: buildAvailableActions({
      subjectId,
      sceneNodes,
      sceneRelations,
      focused,
      lensKeys: ["visible", "source", "result"],
    }),
    lens: "visible",
    focusId: focused,
    projection_kind: "regular_visible_letter_ledger",
  };
}
