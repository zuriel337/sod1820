// src/lib/spatial/semanticSceneCompiler.js
// Semantic Scene Compiler — Number/Entity Golden Scene (Slice 1).
// Pure, framework-free (no React/Three import here on purpose — same boundary as
// spatialRenderModel.js: this module knows how to turn live research data into a temporary,
// renderer-agnostic scene description; it renders nothing itself).
//
// Frozen Slice-0 contract (work_log 50533e56 + 27c9ad23): x/y/z, camera, size, color, animation,
// layout and LOD are PROJECTION STATE ONLY and must never become canonical knowledge. This module
// never writes anything back — it is called fresh on every compile, output is discarded on unmount.
//
// Truth-tier derivation is NOT invented here: each tier is read off a real field already on the
// live row (gematria_words.is_verified, nodes.type='convergence' curation status, research_objects
// own meta.ext / statement text) — see classifyTruthTier(). Nothing is asserted more true than its
// source record already claims.

export const TRUTH_TIERS = {
  FACT: "FACT",                 // engine-computed / is_verified=true gematria_words + dossier method output
  FINDING: "FINDING",           // curated topic_card / convergence node — editorial synthesis, not raw engine fact
  SOURCE_SUPPORTED: "SOURCE_SUPPORTED", // research_objects with an explicit Human-Gate / verified reference
  CANDIDATE: "CANDIDATE",       // research_objects explicitly marked candidate/held/not-generalized
};

export const LENSES = {
  overview: { key: "overview", label: "סקירה", layers: ["subject", "representation", "relation", "finding"] },
  methods: { key: "methods", label: "שיטות", layers: ["subject", "representation", "method"] },
  relations: { key: "relations", label: "קשרים", layers: ["subject", "relation", "finding"] },
};

function classifyTruthTier(researchObject) {
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

// Explicit, documented projection rule (not decorative-silently):
//   radius  = rank/relevance within its own list (engine-ranked for methods; recency for research)
//   layer_y = truth tier (FACT closest to the ground plane, then RELATION, then FINDING/CANDIDATE) —
//             a stand-in for "provenance layer" per the task's own suggested semantics.
const LAYER_Y = { subject: 0, representation: 0, method: 0.6, relation: 1.6, finding: 2.8 };

function polar(index, count, radius, yBase) {
  const angle = (index / Math.max(count, 1)) * Math.PI * 2;
  return {
    x: Math.cos(angle) * radius,
    y: yBase,
    z: Math.sin(angle) * radius,
  };
}

/**
 * compileNumberEntityScene(liveData, { lens, focusId })
 * liveData: raw output of fetchNumberEntityLiveData() — never mutated.
 * lens: one of LENSES keys — which semantic layers are currently visible. MUST be explicit;
 *       nothing is hidden implicitly.
 * focusId: id of the currently-focused scene node (defaults to the subject itself).
 *
 * Returns { sceneNodes, sceneRelations, availableActions, lens, focusId } — a TEMPORARY
 * projection, never persisted, safe to discard/recompute on every lens or focus change.
 */
export function compileNumberEntityScene(liveData, { lens = "overview", focusId = null } = {}) {
  const activeLens = LENSES[lens] || LENSES.overview;
  const { value, dossier, convergences, topicCard, researchSamples, verifiedWords } = liveData;

  const sceneNodes = [];
  const sceneRelations = [];

  const subjectId = `subject:${value}`;
  sceneNodes.push({
    id: subjectId,
    kind: "subject",
    label: String(value),
    subtitle: "מספר — הישות המחקרית הפעילה",
    truthTier: TRUTH_TIERS.FACT,
    position: { x: 0, y: LAYER_Y.subject, z: 0 },
    ref: { type: "number", value },
  });

  // Layer: REPRESENTATIONS — engine-verified published phrases at this exact ragil value.
  // Radius = rank order (is_verified-first, then as returned) -> closer = more established.
  if (activeLens.layers.includes("representation")) {
    const reps = (verifiedWords || []).slice(0, 8);
    reps.forEach((w, i) => {
      const id = `rep:${w.id}`;
      const pos = polar(i, reps.length, 3.2 + i * 0.12, LAYER_Y.representation);
      sceneNodes.push({
        id, kind: "representation", label: w.phrase,
        subtitle: `רגיל = ${value}`,
        truthTier: w.is_verified ? TRUTH_TIERS.FACT : TRUTH_TIERS.FINDING,
        position: pos,
        ref: { type: "gematria_word", id: w.id, source: w.source },
      });
      sceneRelations.push({
        id: `rel:${subjectId}->${id}`, from: subjectId, to: id,
        kind: "represents", explanation: `«${w.phrase}» = ${value} ברגיל — פלט מנוע ישיר`,
      });
    });
  }

  // Layer: METHODS — the dossier's own ranked method groups (רגיל/מסתתר/אתבש/גדול/מילוי/...).
  if (activeLens.layers.includes("method") && dossier?.methods) {
    dossier.methods.forEach((m, mi) => {
      const id = `method:${m.method}`;
      const pos = polar(mi, dossier.methods.length, 3.6, LAYER_Y.method);
      sceneNodes.push({
        id, kind: "method", label: m.method,
        subtitle: (m.phrases || []).slice(0, 3).join(" · "),
        truthTier: TRUTH_TIERS.FACT,
        position: pos,
        ref: { type: "method", method: m.method, phrases: m.phrases || [] },
      });
      sceneRelations.push({
        id: `rel:${subjectId}->${id}`, from: subjectId, to: id,
        kind: "method_result", explanation: `שיטת ${m.method} מפיקה ${(m.phrases || []).length} ביטויים לערך ${value} — פלט מנוע`,
      });
    });
  }

  // Layer: RELATIONS — convergence nodes containing this number (curated, editorial FINDING tier).
  if (activeLens.layers.includes("relation")) {
    const rels = convergences || [];
    rels.forEach((c, i) => {
      const id = `conv:${c.id}`;
      const otherNumbers = (c.metadata?.numbers || []).filter((n) => n !== value);
      const pos = polar(i, rels.length, 6.4, LAYER_Y.relation);
      sceneNodes.push({
        id, kind: "relation", label: c.label, subtitle: otherNumbers.slice(0, 4).join(" · "),
        truthTier: TRUTH_TIERS.FINDING,
        position: pos,
        ref: { type: "convergence", id: c.id, description: c.description, metadata: c.metadata },
      });
      sceneRelations.push({
        id: `rel:${subjectId}->${id}`, from: subjectId, to: id,
        kind: "converges_with", explanation: c.description || `התכנסות משותפת עם ${otherNumbers.join(", ")}`,
      });
    });
  }

  // Layer: FINDINGS — the curated topic_card (if any) + a small sample of research_objects,
  // each carrying its OWN live truth tier (see classifyTruthTier). Furthest layer = least raw.
  if (activeLens.layers.includes("finding")) {
    if (topicCard) {
      const id = `topic:${topicCard.slug}`;
      const pos = polar(0, 1, 9, LAYER_Y.finding);
      sceneNodes.push({
        id, kind: "finding", label: topicCard.title, subtitle: topicCard.subtitle,
        truthTier: TRUTH_TIERS.FINDING,
        position: pos,
        ref: { type: "topic_card", slug: topicCard.slug, findings: topicCard.findings, status: topicCard.status, created_by: topicCard.created_by },
      });
      sceneRelations.push({
        id: `rel:${subjectId}->${id}`, from: subjectId, to: id,
        kind: "curated_finding", explanation: topicCard.findings?.headline || topicCard.subtitle || "כרטיס-נושא מאושר",
      });
    }
    (researchSamples || []).slice(0, 5).forEach((ro, i) => {
      const id = `ro:${ro.id}`;
      const tier = classifyTruthTier(ro);
      const pos = polar(i + 1, (researchSamples || []).length + 1, 9.6 + i * 0.2, LAYER_Y.finding + 0.3);
      sceneNodes.push({
        // Scene label stays a short marker (the full statement is already in ref.statement for the
        // DOM panel) — a long in-scene label renders oversized once the camera dollies close to it
        // (world-space text scale + proximity), unreadable and visually noisy. See AFTER report.
        id, kind: "finding", label: (ro.statement || "").slice(0, 26).trim() + ((ro.statement || "").length > 26 ? "…" : ""), subtitle: ro.kind,
        truthTier: tier,
        position: pos,
        ref: { type: "research_object", id: ro.id, statement: ro.statement, source_ref: ro.source_ref, meta: ro.meta, created_at: ro.created_at },
      });
      sceneRelations.push({
        id: `rel:${subjectId}->${id}`, from: subjectId, to: id,
        kind: "research_finding", explanation: `${ro.kind} · מקור: ${ro.source_ref || "לא-מצוין"}`,
      });
    });
  }

  const focused = focusId && sceneNodes.some((n) => n.id === focusId) ? focusId : subjectId;

  // Semantic actions — verb-level, never mesh-specific. Renderer decides how to invoke them.
  const availableActions = [
    { action: "focus_subject", targetId: subjectId },
    ...sceneNodes.filter((n) => n.id !== focused).map((n) => ({ action: "select_node", targetId: n.id })),
    ...sceneRelations.map((r) => ({ action: "follow_relation", targetId: r.id })),
    { action: "show_source", targetId: focused },
    { action: "switch_depth", options: Object.keys(LENSES) },
    { action: "back" },
  ];

  return { subjectId, sceneNodes, sceneRelations, availableActions, lens: activeLens.key, focusId: focused, value };
}
