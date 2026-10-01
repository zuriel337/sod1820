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
