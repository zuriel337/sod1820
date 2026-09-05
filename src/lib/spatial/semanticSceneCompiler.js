// src/lib/spatial/semanticSceneCompiler.js
// Semantic Scene Compiler — GENERALIZED CORE + Gematria adapter (Slice 2: Spatial Gematria Golden
// Slice). Pure, framework-free (no React/Three import here on purpose).
//
// Slice 1 (Number/Entity Golden Scene, work_log 8b5b5b41) proved a compiler shaped exactly like
// this one, but on a different unmerged branch — this file is not a fork of it (a second
// "gematriaSceneCompiler"): it is the smallest reusable GENERIC CORE (truth tiers, the polar()
// projection rule, a generic research-truth classifier, a generic action-list builder) extracted so
// a second scene TYPE can share it, plus the one new adapter this slice actually needs
// (compileGematriaScene). Slice 1's own compileNumberEntityScene() was not re-ported into this
// branch — it would be dead code here (this slice's page never calls it) — but nothing about this
// core is gematria-specific; a future session can add compileNumberEntityScene back beside
// compileGematriaScene in this same file without forking either.
//
// Frozen Slice-0 contract (work_log 50533e56 + 27c9ad23): x/y/z, camera, size, color, animation,
// layout and LOD are PROJECTION STATE ONLY and never canonical knowledge. Nothing here persists;
// every compile is fresh and disposable.

// ===== GENERIC CORE (domain-independent) =====

export const TRUTH_TIERS = {
  FACT: "FACT",                         // direct live-engine output — always, by construction, here
  FINDING: "FINDING",                   // curated topic_card / convergence node — editorial synthesis
  SOURCE_SUPPORTED: "SOURCE_SUPPORTED", // research_objects with an explicit Human-Gate / verified reference
  CANDIDATE: "CANDIDATE",               // research_objects explicitly held/pending/not-generalized
  ENGINE_MISMATCH: "ENGINE_MISMATCH",   // a stored claim the live engine could NOT reproduce — never silently promoted
};

// Read off REAL fields already on a research_objects-shaped row — nothing invented. Shared verbatim
// with Slice 1's own classifier (same rule, same boundary): statement/meta text is the only source.
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

// Explicit, documented projection rule, reused across scene types:
//   radius = rank/relevance/sequence-order within its own list
//   yBase  = pipeline/provenance stage (subject closest to ground, finding furthest)
export function polar(index, count, radius, yBase) {
  const angle = (index / Math.max(count, 1)) * Math.PI * 2;
  return { x: Math.cos(angle) * radius, y: yBase, z: Math.sin(angle) * radius };
}

// Generic verb-level action list — renderer decides how to invoke; never mesh-specific.
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

// ===== GEMATRIA ADAPTER (Slice 2) =====

export const GEMATRIA_LENSES = {
  overview: { key: "overview", label: "סקירה", layers: ["subject", "component", "result", "relation", "finding"] },
  method: { key: "method", label: "שיטה — פירוק המבצע", layers: ["subject", "component", "result"] },
  compare: { key: "compare", label: "השוואת שיטות", layers: ["subject", "component", "result"] },
};

const LAYER_Y = { subject: 0, component: 0.75, result: 1.5, relation: 2.4, finding: 3.2 };
const COMPARE_X_OFFSET = 4.2;

// Component (operation-step) layout is NOT one generic fan for every primitive — the geometry class
// itself is part of what explains the operation (task: "the geometry must help explain the
// calculation"). SEMANTIC, not decorative:
//   accumulate/expand -> fan-out around the subject (each letter is an INDEPENDENT contribution)
//   sequence           -> a literal left-to-right CHAIN (order/adjacency is the whole point of מסתתר)
//   substitute         -> paired dots (original letter + the letter it becomes), fanned like accumulate
function layoutComponents(op, xOffset) {
  const n = op.steps.length;
  if (op.primitive === "sequence") {
    return op.steps.map((s, i) => ({
      ...s,
      position: { x: xOffset + (i - (n - 1) / 2) * 1.55, y: LAYER_Y.component, z: 0 },
    }));
  }
  return op.steps.map((s, i) => {
    const p = polar(i, n, 2.1 + i * 0.22, LAYER_Y.component);
    return { ...s, position: { x: p.x + xOffset, y: p.y, z: p.z } };
  });
}

function componentLabel(op, step) {
  if (op.primitive === "sequence") return step.label; // "|מ−ש|"
  if (op.primitive === "substitute") return `${step.ch}→${step.substitutedTo}`;
  if (op.primitive === "expand") return `${step.ch} → ${step.expandedTo}`;
  return step.ch;
}

// buildMethodSubtree — one method's subject-independent contribution to the scene: its component
// nodes + result node + the relation edges from subject through those components to the result.
// xOffset lets compare-lens place two methods side by side (SEMANTIC: left/right = which method,
// not decoration) without needing two compilers.
function buildMethodSubtree({ subjectId, op, xOffset = 0, idPrefix }) {
  const nodes = [];
  const relations = [];

  const laid = layoutComponents(op, xOffset);
  laid.forEach((step, i) => {
    const id = `${idPrefix}:comp:${i}`;
    nodes.push({
      id, kind: "component", label: componentLabel(op, step), subtitle: `${op.label} · שלב ${i + 1}`,
      truthTier: TRUTH_TIERS.FACT, position: step.position,
      ref: { type: "operation_step", method: op.key, primitive: op.primitive, step },
    });
    relations.push({
      id: `rel:${subjectId}->${id}`, from: subjectId, to: id, kind: "operation_step",
      explanation: `${op.label} · ${componentLabel(op, step)}${step.val != null ? ` = ${step.val}` : ""}`,
    });
  });

  const resultId = `${idPrefix}:result`;
  nodes.push({
    id: resultId, kind: "result", label: String(op.resultValue), subtitle: `${op.label} — התוצאה`,
    truthTier: TRUTH_TIERS.FACT, position: { x: xOffset, y: LAYER_Y.result, z: 0 },
    ref: { type: "method_result", method: op.key, sub: op.sub, soul: op.soul, primitive: op.primitive, value: op.resultValue, representationText: op.representationText },
  });
  laid.forEach((_, i) => {
    relations.push({
      id: `rel:${idPrefix}:comp:${i}->${resultId}`, from: `${idPrefix}:comp:${i}`, to: resultId, kind: "contributes_to",
      explanation: `${op.primitive === "accumulate" || op.primitive === "expand" ? "מסוכם לתוצאה" : op.primitive === "sequence" ? "מצטבר לתוצאה" : "נכלל בתוצאה"}: ${op.label} = ${op.resultValue}`,
    });
  });

  return { nodes, relations, resultId };
}

/**
 * compileGematriaScene({ word, subjectWord, activeOp, compareOp, context, compareContext }, { lens, focusId })
 *
 * - word/subjectWord: the SUBJECT (a phrase) + its own live-verified gematria_words row (if any).
 * - activeOp: buildMethodOperation() output for the currently-selected method — REQUIRED.
 * - compareOp: a second buildMethodOperation() output — only read when lens === "compare".
 * - context/compareContext: fetchGematriaContextForValue() output for activeOp/compareOp's OWN
 *   result value respectively — RELATION and FINDING layers are always anchored to the method that
 *   produced them (task: "the relation must carry its method/context" — a relation for 358 and a
 *   relation for 112 are NOT interchangeable just because both come from the same subject word).
 *
 * Returns { subjectId, sceneNodes, sceneRelations, availableActions, lens, focusId, activeMethod }.
 * Temporary, discarded on every recompile — never persisted (frozen Slice-0 invariant).
 */
export function compileGematriaScene(input, { lens = "overview", focusId = null } = {}) {
  const activeLens = GEMATRIA_LENSES[lens] || GEMATRIA_LENSES.overview;
  const { word, subjectWord, activeOp, compareOp, context, compareContext } = input;

  const sceneNodes = [];
  const sceneRelations = [];

  const subjectId = "subject";
  const subjectVerified = subjectWord ? subjectWord.ragil === activeOp.resultValue || true : false;
  sceneNodes.push({
    id: subjectId, kind: "subject", label: word, subtitle: `שיטה פעילה: ${activeOp.label}`,
    truthTier: TRUTH_TIERS.FACT, position: { x: 0, y: LAYER_Y.subject, z: 0 },
    ref: { type: "gematria_subject", word, subjectWord, engineValue: activeOp.resultValue },
  });

  if (activeLens.layers.includes("component") || activeLens.layers.includes("result")) {
    const primary = buildMethodSubtree({ subjectId, op: activeOp, xOffset: lens === "compare" ? -COMPARE_X_OFFSET : 0, idPrefix: "a" });
    sceneNodes.push(...primary.nodes);
    sceneRelations.push(...primary.relations);

    if (lens === "compare" && compareOp) {
      const secondary = buildMethodSubtree({ subjectId, op: compareOp, xOffset: COMPARE_X_OFFSET, idPrefix: "b" });
      sceneNodes.push(...secondary.nodes);
      sceneRelations.push(...secondary.relations);
      // The comparison claim itself is a visible relation, not an implied one: same subject, two
      // methods, explicitly NOT asserted equal or interchangeable (task: "do not visually imply
      // methods are interchangeable" — the explanation states the values plainly, side by side).
      sceneRelations.push({
        id: "rel:compare", from: primary.resultId, to: secondary.resultId, kind: "compared_with",
        explanation: `${activeOp.label}(${word})=${activeOp.resultValue} לעומת ${compareOp.label}(${word})=${compareOp.resultValue} — אותו קלט, פעולה שונה, תוצאה שונה`,
      });
    }
  }

  // RELATION — convergence nodes for the ACTIVE method's own result value (method-carried, per
  // golden-case evidence: אתבש(משיח)=112 relates to convergence "112 — איחוד השמות", a DIFFERENT
  // node from the 4 convergences רגיל(משיח)=358 relates to).
  if (activeLens.layers.includes("relation") && context) {
    (context.convergences || []).forEach((c, i) => {
      const id = `conv:${c.id}`;
      const otherNumbers = (c.metadata?.numbers || []).filter((n) => n !== context.value);
      const pos = polar(i, context.convergences.length, 5.4, LAYER_Y.relation);
      sceneNodes.push({
        id, kind: "relation", label: c.label, subtitle: otherNumbers.slice(0, 4).join(" · "),
        truthTier: TRUTH_TIERS.FINDING, position: pos,
        ref: { type: "convergence", id: c.id, description: c.description, metadata: c.metadata },
      });
      sceneRelations.push({
        id: `rel:${subjectId}->${id}`, from: subjectId, to: id, kind: "converges_with",
        explanation: `${activeOp.label}(${word}) = ${context.value} — ${c.description || `מתכנס עם ${otherNumbers.join(", ")}`} (בהקשר שיטת ${activeOp.label})`,
      });
    });

    // Sibling phrases sharing the SAME value under the SAME method — each cross-checked against the
    // live engine before being trusted (never silently promoted; see engineVerifyClaim upstream).
    (context.verifiedWords || []).filter((w) => w.phrase !== word).slice(0, 6).forEach((w, i) => {
      const id = `word:${w.id}`;
      const pos = polar(i, context.verifiedWords.length, 4.0 + i * 0.1, LAYER_Y.relation - 0.5);
      sceneNodes.push({
        id, kind: "relation", label: w.phrase, subtitle: `${activeOp.label} = ${context.value}`,
        truthTier: w.__engineVerified === false ? TRUTH_TIERS.ENGINE_MISMATCH : (w.is_verified ? TRUTH_TIERS.FACT : TRUTH_TIERS.FINDING),
        position: pos,
        ref: { type: "gematria_word", id: w.id, source: w.source, engineVerified: w.__engineVerified },
      });
      sceneRelations.push({
        id: `rel:${subjectId}->${id}`, from: subjectId, to: id, kind: "same_value_under_method",
        explanation: `«${w.phrase}» = ${context.value} תחת שיטת ${activeOp.label} — לא הצלבה אוטומטית, שוויון חישובי בלבד`,
      });
    });
  }

  // FINDING — the curated topic_card + a small research_objects sample for the active method's value.
  if (activeLens.layers.includes("finding") && context) {
    if (context.topicCard) {
      const id = `topic:${context.topicCard.slug}`;
      const pos = polar(0, 1, 7.4, LAYER_Y.finding);
      sceneNodes.push({
        id, kind: "finding", label: context.topicCard.title, subtitle: context.topicCard.subtitle,
        truthTier: TRUTH_TIERS.FINDING, position: pos,
        ref: { type: "topic_card", slug: context.topicCard.slug, findings: context.topicCard.findings, status: context.topicCard.status, created_by: context.topicCard.created_by },
      });
      sceneRelations.push({
        id: `rel:${subjectId}->${id}`, from: subjectId, to: id, kind: "curated_finding",
        explanation: context.topicCard.findings?.headline || context.topicCard.subtitle || "כרטיס-נושא מאושר",
      });
    }
    (context.researchSamples || []).slice(0, 4).forEach((ro, i) => {
      const id = `ro:${ro.id}`;
      const tier = classifyResearchTruthTier(ro);
      const pos = polar(i + 1, (context.researchSamples || []).length + 1, 8.0 + i * 0.2, LAYER_Y.finding + 0.3);
      sceneNodes.push({
        id, kind: "finding",
        label: (ro.statement || "").slice(0, 26).trim() + ((ro.statement || "").length > 26 ? "…" : ""),
        subtitle: ro.kind, truthTier: tier, position: pos,
        ref: { type: "research_object", id: ro.id, statement: ro.statement, source_ref: ro.source_ref, meta: ro.meta, created_at: ro.created_at },
      });
      sceneRelations.push({
        id: `rel:${subjectId}->${id}`, from: subjectId, to: id, kind: "research_finding",
        explanation: `${ro.kind} · מקור: ${ro.source_ref || "לא-מצוין"}`,
      });
    });
  }

  const focused = focusId && sceneNodes.some((n) => n.id === focusId) ? focusId : subjectId;
  const availableActions = buildAvailableActions({
    subjectId, sceneNodes, sceneRelations, focused, lensKeys: Object.keys(GEMATRIA_LENSES),
    extra: [{ action: "compare_methods" }],
  });

  return { subjectId, sceneNodes, sceneRelations, availableActions, lens: activeLens.key, focusId: focused, word, activeMethod: activeOp.key };
}
