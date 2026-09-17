// World contextual prominence is a read-only projection helper under research_gold_hints_law.
// It does NOT create a truth score, ranking store, lifecycle, canonicality, publication state,
// or Human-Curation state. It composes already-governed reader outputs for bounded attention.

const NEGATIVE_TOKENS = [
  "MISMATCH",
  "NEGATIVE",
  "NOT_REPRODUCED",
  "NOT_FOUND",
  "HELD",
  "UNRESOLVED",
  "MISSING_ADAPTER",
  "EXPECTEDNESS_UNAVAILABLE",
  "LOW_INFORMATION",
  "FAILED",
];

const PUBLIC_RESEARCH_ACCESS = new Set([null, "", "public", "public_candidate", "published"]);

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeTier(value) {
  const tier = clean(value)?.toLowerCase() || null;
  return tier === "gold" || tier === "silver" ? tier : null;
}

function relationOf(finding) {
  return finding?.projection?.relations?.[0] || null;
}

function relationCounterpart(finding, currentNodeId) {
  const relation = relationOf(finding);
  if (!relation) return null;
  const current = String(currentNodeId || "");
  if (String(relation.fromNodeId || "") === current) return relation.to || null;
  if (String(relation.toNodeId || "") === current) return relation.from || null;
  return relation.to || relation.from || null;
}

function presentationForRow(row) {
  const presentation = objectValue(objectValue(objectValue(row?.meta).ext).presentation);
  const variants = objectValue(presentation.variants);
  const he = objectValue(variants.he);
  return {
    title: clean(he.title) || clean(row?.statement) || `Research object ${row?.id || ""}`.trim(),
    summary: clean(he.summary),
    sourceLabel: clean(he.source_label),
  };
}

function explicitVerificationState(row) {
  const detail = objectValue(row?.engine_detail);
  return clean(detail.verification_state)?.toLowerCase() || null;
}

function operationalNegativeState(row) {
  const detail = objectValue(row?.engine_detail);
  const candidates = [detail.status, detail.classification, detail.result_state, detail.outcome]
    .map(clean)
    .filter(Boolean);
  for (const candidate of candidates) {
    const upper = candidate.toUpperCase();
    if (NEGATIVE_TOKENS.some((token) => upper.includes(token))) return candidate;
  }
  return null;
}

function rowIsDecisionChangingNegative(row) {
  const verification = explicitVerificationState(row);
  if (verification === "mismatch") return true;
  return Boolean(operationalNegativeState(row));
}

function researchDirectness(row, anchor) {
  const anchorLabel = clean(anchor?.label);
  const anchorNumber = anchor?.type === "number" && Number.isFinite(Number(anchorLabel))
    ? Number(anchorLabel)
    : null;
  if (anchorNumber != null && Number(row?.value) === anchorNumber) return 0;
  if (anchorLabel && asArray(row?.terms).map(String).includes(anchorLabel)) return 0;
  if (anchorLabel && asArray(row?.relates).map(String).includes(anchorLabel)) return 0;
  return 1;
}

function verificationClass(candidate) {
  if (candidate.decisionChangingNegative) return 0;
  if (candidate.verificationState === "match") return 0;
  if (candidate.engineVerified === true) return 0;
  if (candidate.verificationState === "method_unknown") return 2;
  return 1;
}

function curationClass(candidate) {
  if (candidate.curation?.tier === "gold") return 0;
  if (candidate.curation?.tier === "silver") return 1;
  return 2;
}

function compareCandidatePriority(a, b, { timeAware = false } = {}) {
  // Lexicographic policy only. These are semantic dimensions, never one persisted/universal score.
  const dimensionsA = [
    a.decisionChangingNegative ? 0 : 1,
    a.directnessRank ?? 2,
    verificationClass(a),
    curationClass(a),
    timeAware && a.temporal?.occurredAt ? 0 : 1,
  ];
  const dimensionsB = [
    b.decisionChangingNegative ? 0 : 1,
    b.directnessRank ?? 2,
    verificationClass(b),
    curationClass(b),
    timeAware && b.temporal?.occurredAt ? 0 : 1,
  ];
  for (let i = 0; i < dimensionsA.length; i += 1) {
    if (dimensionsA[i] !== dimensionsB[i]) return dimensionsA[i] - dimensionsB[i];
  }
  return String(a.stableKey).localeCompare(String(b.stableKey));
}

function publicAccessAllowed(candidate, includePrivate) {
  if (includePrivate) return true;
  if (candidate.kind !== "research") return true;
  return PUBLIC_RESEARCH_ACCESS.has(candidate.access?.tier ?? null);
}

function graphCandidates(data) {
  const currentNodeId = data?.identity?.nodeId || null;
  return asArray(data?.graph?.relations).map((finding) => {
    const relation = relationOf(finding);
    const counterpart = relationCounterpart(finding, currentNodeId);
    if (!relation || !counterpart?.id) return null;
    const tier = normalizeTier(counterpart?.curation?.tier);
    const relationType = clean(relation.relationType) || "related";
    const type = clean(counterpart.type) || "entity";
    const label = clean(counterpart.label) || String(counterpart.id);
    const verificationState = clean(finding?.verification?.verification_state)?.toLowerCase() || null;
    return {
      id: `graph:${finding.id || relation.id || counterpart.id}`,
      stableKey: `graph:${counterpart.id}:${relationType}`,
      groupKey: `graph-counterpart:${counterpart.id}`,
      familyKey: tier === "gold" ? "gold-signature" : `graph-${type}`,
      kind: "graph-relation",
      type,
      label,
      summary: null,
      sourceRef: finding?.source?.sourceRef || null,
      relationPath: [{ relationType, fromNodeId: relation.fromNodeId || null, toNodeId: relation.toNodeId || null }],
      directness: "direct_typed_relation",
      directnessRank: 0,
      curation: { tier, role: clean(counterpart?.curation?.role) },
      verificationState,
      engineVerified: verificationState === "match" ? true : null,
      decisionChangingNegative: verificationState === "mismatch",
      uncertainty: verificationState === "mismatch" ? { state: "mismatch", note: "Engine verification contradicts the stored claim." } : null,
      temporal: null,
      access: { tier: null },
      signals: {
        meter: Number.isFinite(Number(counterpart?.signal?.meter)) ? Number(counterpart.signal.meter) : null,
        importance: Number.isFinite(Number(counterpart?.signal?.importance)) ? Number(counterpart.signal.importance) : null,
      },
      provenance: { refs: asArray(finding?.evidence?.refs), createdAt: finding?.provenance?.createdAt || null },
    };
  }).filter(Boolean);
}

function researchCandidates(data, inputs) {
  const baseRows = asArray(data?.research?.rows);
  const supplements = new Map(asArray(inputs?.researchSupplements).map((row) => [String(row.id), row]));
  const eventRows = asArray(inputs?.eventContext?.researchRows);
  const byId = new Map();
  for (const row of [...baseRows, ...eventRows]) {
    if (!row?.id) continue;
    byId.set(String(row.id), { ...row, ...(supplements.get(String(row.id)) || {}) });
  }
  const findingsByResearchId = new Map(
    asArray(data?.research?.findings)
      .filter((finding) => finding?.identity?.sourceIdentity?.researchObjectId)
      .map((finding) => [String(finding.identity.sourceIdentity.researchObjectId), finding])
  );

  return [...byId.values()].map((row) => {
    const presentation = presentationForRow(row);
    const finding = findingsByResearchId.get(String(row.id)) || null;
    const verificationState = explicitVerificationState(row);
    const negativeState = operationalNegativeState(row);
    const decisionChangingNegative = rowIsDecisionChangingNegative(row);
    const parentId = clean(row.parent_id);
    const sourceRef = clean(row.source_ref);
    const directnessRank = researchDirectness(row, data?.identity);
    const provenanceRefs = [sourceRef, ...asArray(row?.meta?.source_refs).map(clean)].filter(Boolean);
    return {
      id: `research:${row.id}`,
      stableKey: `research:${row.id}`,
      groupKey: parentId ? `research-parent:${parentId}` : `research:${row.id}`,
      familyKey: decisionChangingNegative ? "negative-control" : "research",
      kind: "research",
      type: clean(row.kind) || "research-object",
      label: clean(finding?.subject?.label) || presentation.title,
      summary: clean(finding?.view?.rendererHints?.presentation?.summary) || presentation.summary,
      sourceRef,
      relationPath: sourceRef ? [{ relationType: "source_provenance", sourceRef }] : [],
      directness: directnessRank === 0 ? "direct_anchor_research" : "source_or_context_research",
      directnessRank,
      curation: { tier: null, role: null },
      verificationState,
      engineVerified: row.engine_verified === true ? true : row.engine_verified === false ? false : null,
      decisionChangingNegative,
      uncertainty: decisionChangingNegative
        ? { state: verificationState === "mismatch" ? "mismatch" : "negative_or_open", note: negativeState || verificationState || "Decision-changing negative/open research state." }
        : verificationState === "method_unknown"
          ? { state: "method_unknown", note: "The claimed method is not currently testable by the canonical engine." }
          : null,
      temporal: { occurredAt: null, researchAddedAt: row.created_at || null },
      access: { tier: row.privacy_scope ?? null },
      signals: {
        confidence: Number.isFinite(Number(row.confidence)) ? Number(row.confidence) : null,
        contributor: clean(row.contributor),
        ownerPersonId: clean(row.owner_person_id),
      },
      provenance: { refs: provenanceRefs, createdAt: row.created_at || null },
      raw: row,
    };
  });
}

function topicCandidates(data) {
  return asArray(data?.topics?.rows).map((row) => {
    if (!row?.id) return null;
    return {
      id: `topic:${row.id}`,
      stableKey: `topic:${row.id}`,
      groupKey: `topic:${row.id}`,
      familyKey: "convergence",
      kind: "topic",
      type: "convergence",
      label: clean(row.title) || clean(row.slug) || String(row.id),
      summary: clean(row.subtitle),
      sourceRef: row.slug ? `topic:${row.slug}` : null,
      relationPath: [{ relationType: "topic_contains_anchor" }],
      directness: "bounded_convergence_membership",
      directnessRank: 1,
      curation: { tier: null, role: row.status === "approved" ? "approved-editorial" : null },
      verificationState: null,
      engineVerified: null,
      decisionChangingNegative: false,
      uncertainty: null,
      temporal: { occurredAt: row.occurred_at || null, researchAddedAt: row.created_at || null },
      access: { tier: null },
      signals: {
        meter: Number.isFinite(Number(row.meter_score)) ? Number(row.meter_score) : null,
        quality: Number.isFinite(Number(row.quality)) ? Number(row.quality) : null,
      },
      provenance: { refs: row.slug ? [`topic:${row.slug}`] : [], createdAt: row.created_at || null },
    };
  }).filter(Boolean);
}

function sourceCandidates(data) {
  return asArray(data?.sources).map((source, index) => {
    const label = clean(source?.label ?? source);
    if (!label) return null;
    const type = clean(source?.type) || "source";
    const ref = clean(source?.ref);
    const verse = type === "verse";
    return {
      id: `source:${ref || index}:${label}`,
      stableKey: `source:${ref || label}`,
      groupKey: `source:${ref || label}`,
      familyKey: verse ? "verse-source" : "source",
      kind: "source",
      type,
      label,
      summary: null,
      sourceRef: ref,
      relationPath: [{ relationType: verse ? "number_journey_source" : "research_source" }],
      directness: verse ? "canonical_number_journey_source" : "source_provenance",
      directnessRank: verse ? 1 : 2,
      curation: { tier: null, role: null },
      verificationState: null,
      engineVerified: null,
      decisionChangingNegative: false,
      uncertainty: null,
      temporal: null,
      access: { tier: null },
      signals: {},
      provenance: { refs: ref ? [ref] : [], createdAt: null },
    };
  }).filter(Boolean);
}

function temporalControlCandidate(inputs, { includePrivate = false } = {}) {
  const event = inputs?.eventContext;
  const occurredAt = clean(event?.occurredAt);
  if (!occurredAt) return null;
  const visibleRows = asArray(event?.researchRows).filter((row) => (
    includePrivate || PUBLIC_RESEARCH_ACCESS.has(row?.privacy_scope ?? null)
  ));
  const occurredDate = occurredAt.slice(0, 10);
  const researchDates = [...new Set(visibleRows
    .map((row) => clean(row?.source_ref))
    .map((ref) => ref?.match(/#event:(\d{4}-\d{2}-\d{2})(?::|$)/)?.[1] || null)
    .filter(Boolean))];
  const conflicting = researchDates.filter((date) => date !== occurredDate);
  if (!conflicting.length) return null;
  return {
    id: `temporal-control:${event?.nodeId || occurredDate}`,
    stableKey: `temporal-control:${event?.nodeId || occurredDate}`,
    groupKey: `temporal-control:${event?.nodeId || occurredDate}`,
    familyKey: "negative-control",
    kind: "temporal-control",
    type: "uncertainty",
    label: "פער זמן דורש בירור",
    summary: `זמן האירוע בצומת הוא ${occurredDate}, בעוד provenance מחקרי מצביע גם על ${conflicting.join(", ")}. אין לבחור אחד מהם בשקט.`,
    sourceRef: event?.post?.id ? `posts:${event.post.id}` : null,
    relationPath: [{ relationType: "temporal_provenance_conflict" }],
    directness: "direct_event_temporal_control",
    directnessRank: 0,
    curation: { tier: null, role: null },
    verificationState: null,
    engineVerified: null,
    decisionChangingNegative: true,
    uncertainty: { state: "temporal_conflict", note: "Event time and research provenance date disagree." },
    temporal: { occurredAt, sourcePublishedAt: event?.post?.date || null, conflictingResearchDates: conflicting },
    access: { tier: null },
    signals: {},
    provenance: { refs: visibleRows.map((row) => clean(row?.source_ref)).filter(Boolean), createdAt: null },
  };
}

function dedupeByDependency(candidates, comparatorOptions) {
  const grouped = new Map();
  for (const candidate of candidates) {
    const key = candidate.groupKey || candidate.stableKey;
    const prior = grouped.get(key);
    if (!prior || compareCandidatePriority(candidate, prior, comparatorOptions) < 0) grouped.set(key, candidate);
  }
  return [...grouped.values()];
}

function selectWithFamilyGain(sorted, limit) {
  const selected = [];
  const selectedIds = new Set();
  const seenFamilies = new Set();

  for (const candidate of sorted) {
    if (selected.length >= limit) break;
    if (seenFamilies.has(candidate.familyKey)) continue;
    selected.push(candidate);
    selectedIds.add(candidate.id);
    seenFamilies.add(candidate.familyKey);
  }
  for (const candidate of sorted) {
    if (selected.length >= limit) break;
    if (selectedIds.has(candidate.id)) continue;
    selected.push(candidate);
    selectedIds.add(candidate.id);
  }
  return selected;
}

function ensureRelevantGold(selected, sorted, limit, comparatorOptions) {
  const gold = sorted.filter((candidate) => candidate.curation?.tier === "gold").slice(0, 2);
  if (!gold.length || !limit) return selected;
  const out = [...selected];
  for (const candidate of gold) {
    if (out.some((item) => item.id === candidate.id)) continue;
    if (out.length < limit) out.push(candidate);
    else {
      let replaceAt = -1;
      for (let i = out.length - 1; i >= 0; i -= 1) {
        if (!out[i].decisionChangingNegative && out[i].curation?.tier !== "gold") {
          replaceAt = i;
          break;
        }
      }
      if (replaceAt >= 0) out[replaceAt] = candidate;
    }
  }
  return [...new Map(out.map((item) => [item.id, item])).values()]
    .sort((a, b) => compareCandidatePriority(a, b, comparatorOptions))
    .slice(0, limit);
}

function explainCandidate(candidate, { isFirstFamily = false } = {}) {
  const researchStrengthSignals = [];
  if (candidate.verificationState === "match") researchStrengthSignals.push("engine_match");
  else if (candidate.engineVerified === true) researchStrengthSignals.push("engine_result_verified");
  if (candidate.provenance?.refs?.length) researchStrengthSignals.push("provenance_present");
  if (candidate.decisionChangingNegative) researchStrengthSignals.push("decision_changing_negative_or_control");
  if (candidate.signals?.ownerPersonId) researchStrengthSignals.push("canonical_person_owner_present");

  return Object.freeze({
    relevance: candidate.directness,
    relationPath: Object.freeze(asArray(candidate.relationPath)),
    humanCuration: Object.freeze({
      tier: candidate.curation?.tier || null,
      role: candidate.curation?.role || null,
    }),
    researchStrengthSignals: Object.freeze(researchStrengthSignals),
    directness: candidate.directness,
    informationGain: isFirstFamily
      ? "adds_a_new_evidence_or_content_family_to_the_attention_bundle"
      : "additional_material_within_an_already_selected_family",
    temporalRelevance: candidate.temporal || null,
    uncertainty: candidate.uncertainty || null,
    signalOnly: Object.freeze({
      meter: candidate.signals?.meter ?? null,
      importance: candidate.signals?.importance ?? null,
      confidence: candidate.signals?.confidence ?? null,
      quality: candidate.signals?.quality ?? null,
    }),
  });
}

/**
 * Pure contextual prominence composition.
 *
 * Mandatory order:
 * access -> dependency/dedup grouping -> contextual ordering -> bounded family-diverse selection.
 * No numeric universal score is produced or persisted. Gold is guaranteed discoverability when
 * relevant but is not forced to rank #1. Silver is only a comparator/tie preference. Negative or
 * contradictory material may rank up when it changes how nearby material must be understood.
 */
export function buildWorldContextualProminence(data, inputs = {}, {
  limit = 7,
  includePrivate = false,
  timeAware = false,
} = {}) {
  if (!data?.identity) return Object.freeze({ items: [], contextSignals: {}, candidateCount: 0 });
  const cap = Math.max(1, Math.min(Math.trunc(Number(limit) || 7), 7));
  const comparatorOptions = { timeAware: Boolean(timeAware) };

  const temporalControl = temporalControlCandidate(inputs, { includePrivate });
  let candidates = [
    ...graphCandidates(data),
    ...researchCandidates(data, inputs),
    ...topicCandidates(data),
    ...sourceCandidates(data),
    ...(temporalControl ? [temporalControl] : []),
  ];

  // FILTER / ACCESS BEFORE RANK.
  candidates = candidates.filter((candidate) => publicAccessAllowed(candidate, includePrivate));

  // DEDUP / DEPENDENCY GROUPING BEFORE RANK.
  candidates = dedupeByDependency(candidates, comparatorOptions);

  const sorted = candidates.sort((a, b) => compareCandidatePriority(a, b, comparatorOptions));
  let selected = selectWithFamilyGain(sorted, cap);
  selected = ensureRelevantGold(selected, sorted, cap, comparatorOptions);

  const firstFamilySeen = new Set();
  const items = selected.map((candidate) => {
    const first = !firstFamilySeen.has(candidate.familyKey);
    firstFamilySeen.add(candidate.familyKey);
    return Object.freeze({
      id: candidate.id,
      kind: candidate.kind,
      type: candidate.type,
      label: candidate.label,
      summary: candidate.summary,
      sourceRef: candidate.sourceRef,
      familyKey: candidate.familyKey,
      explainWhy: explainCandidate(candidate, { isFirstFamily: first }),
    });
  });

  const crossMethod = inputs?.crossMethodStrength || null;
  return Object.freeze({
    items: Object.freeze(items),
    candidateCount: candidates.length,
    contextSignals: Object.freeze({
      // Existing dependency-aware read signal only. Counts/popularity are NOT used as truth or as
      // an opaque universal score; they remain inspectable inputs for Explain-Why/deep research.
      crossMethodStrength: crossMethod ? Object.freeze({
        signal: crossMethod.signal ?? null,
        phraseCount: crossMethod.phrase_count ?? null,
        methods: Object.freeze(asArray(crossMethod.methods)),
        dependentMethods: Object.freeze(asArray(crossMethod.dependent_methods)),
        dependentPhraseCount: crossMethod.dependent_phrase_count ?? null,
      }) : null,
    }),
    disclaimer: "Contextual prominence is a bounded presentation order, not Truth, verification, canonicality or publication state.",
  });
}

export default buildWorldContextualProminence;
