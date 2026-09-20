// World contextual prominence is a read-only projection helper under research_gold_hints_law.
// It does NOT create a truth score, ranking store, lifecycle, canonicality, publication state,
// access policy, or Human-Curation state. It composes already-authorized governed reader outputs.

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

// Shared World numeric normalizer: null/undefined/booleans/arrays/plain objects/whitespace-only
// strings are never a number. A genuinely finite numeric value of 0 is preserved as 0.
function finiteOrNull(value) {
  if (value == null) return null;
  if (typeof value === "boolean") return null;
  if (typeof value === "object") return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
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
  if (explicitVerificationState(row) === "mismatch") return true;
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

// Truth Axes v3: only engine_detail.verification_state is verification authority.
// research_objects.engine_verified is a compatibility/derived signal and MUST NOT be promoted here.
function verificationClass(candidate) {
  if (candidate.decisionChangingNegative) return 0;
  if (candidate.verificationState === "match") return 0;
  if (candidate.verificationState === "method_unknown") return 2;
  return 1;
}

function curationClass(candidate) {
  if (candidate.curation?.tier === "gold") return 0;
  if (candidate.curation?.tier === "silver") return 1;
  return 2;
}

function compareDescendingNullable(a, b) {
  const av = finiteOrNull(a);
  const bv = finiteOrNull(b);
  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;
  return bv - av;
}

function compareCandidatePriority(a, b, { timeAware = false } = {}) {
  // Lexicographic semantic dimensions only — never one universal scalar.
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

  // Source-native presentation/research signals are comparable only inside the same family.
  // They are late tie-breakers and never become Truth or cross-family universal weights.
  if (a.familyKey === b.familyKey) {
    for (const key of ["importance", "meter", "quality"]) {
      const compared = compareDescendingNullable(a.signals?.[key], b.signals?.[key]);
      if (compared) return compared;
    }
  }
  return String(a.stableKey).localeCompare(String(b.stableKey));
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
      familyKey: tier === "gold" ? "gold-signature" : type === "convergence" ? "convergence" : `graph-${type}`,
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
      decisionChangingNegative: verificationState === "mismatch",
      uncertainty: verificationState === "mismatch"
        ? { state: "mismatch", note: "Engine verification contradicts the stored claim." }
        : null,
      temporal: null,
      signals: {
        meter: finiteOrNull(counterpart?.signal?.meter),
        importance: finiteOrNull(counterpart?.signal?.importance),
      },
      provenance: { refs: asArray(finding?.evidence?.refs), createdAt: finding?.provenance?.createdAt || null },
      dependency: null,
    };
  }).filter(Boolean);
}

function dependencyRoots(rows) {
  const byId = new Map(rows.filter((row) => row?.id).map((row) => [String(row.id), row]));
  const roots = new Map();
  const resolve = (row) => {
    const start = String(row.id);
    const seen = new Set([start]);
    let current = row;
    while (clean(current?.parent_id)) {
      const parentId = clean(current.parent_id);
      if (seen.has(parentId)) return [...seen, parentId].sort()[0];
      seen.add(parentId);
      const parent = byId.get(parentId);
      if (!parent) return parentId;
      current = parent;
    }
    return String(current?.id || start);
  };
  for (const row of rows) if (row?.id) roots.set(String(row.id), resolve(row));
  const counts = new Map();
  for (const root of roots.values()) counts.set(root, (counts.get(root) || 0) + 1);
  return { roots, counts };
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
  const rows = [...byId.values()];
  const dependencies = dependencyRoots(rows);
  const findingsByResearchId = new Map(
    asArray(data?.research?.findings)
      .filter((finding) => finding?.identity?.sourceIdentity?.researchObjectId)
      .map((finding) => [String(finding.identity.sourceIdentity.researchObjectId), finding])
  );

  return rows.map((row) => {
    const presentation = presentationForRow(row);
    const finding = findingsByResearchId.get(String(row.id)) || null;
    const verificationState = explicitVerificationState(row);
    const negativeState = operationalNegativeState(row);
    const decisionChangingNegative = rowIsDecisionChangingNegative(row);
    const sourceRef = clean(row.source_ref);
    const directnessRank = researchDirectness(row, data?.identity);
    const provenanceRefs = [sourceRef, ...asArray(row?.meta?.source_refs).map(clean)].filter(Boolean);
    const rootId = dependencies.roots.get(String(row.id)) || String(row.id);
    return {
      id: `research:${row.id}`,
      stableKey: `research:${row.id}`,
      groupKey: `research-dependency:${rootId}`,
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
      decisionChangingNegative,
      uncertainty: decisionChangingNegative
        ? { state: verificationState === "mismatch" ? "mismatch" : "negative_or_open", note: negativeState || verificationState || "Decision-changing negative/open research state." }
        : verificationState === "method_unknown"
          ? { state: "method_unknown", note: "The claimed method is not currently testable by the canonical engine." }
          : null,
      temporal: { occurredAt: null, researchAddedAt: row.created_at || null },
      signals: {
        confidence: finiteOrNull(row.confidence),
        contributor: clean(row.contributor),
        ownerPersonId: clean(row.owner_person_id),
        legacyEngineVerified: row.engine_verified === true ? true : row.engine_verified === false ? false : null,
      },
      provenance: { refs: provenanceRefs, createdAt: row.created_at || null },
      dependency: { rootId, memberCount: dependencies.counts.get(rootId) || 1 },
    };
  });
}

function topicCandidates(data) {
  const findingsByCard = new Map();
  for (const finding of asArray(data?.topics?.findings)) {
    if (finding?.identity?.sourceIdentity?.owner !== "topic_cards") continue;
    const cardId = clean(finding.identity.sourceIdentity.id);
    if (cardId) findingsByCard.set(cardId, finding);
  }

  return asArray(data?.topics?.rows).map((row) => {
    if (!row?.id) return null;
    const finding = findingsByCard.get(String(row.id)) || null;
    const entityRef = clean(finding?.identity?.entityRef);
    const nodeId = entityRef?.startsWith("node:") ? entityRef.slice(5) : null;
    return {
      id: `topic:${row.id}`,
      stableKey: `topic:${row.id}`,
      groupKey: nodeId ? `graph-counterpart:${nodeId}` : `topic:${row.id}`,
      familyKey: "convergence",
      kind: "topic",
      type: "convergence",
      label: clean(row.title) || clean(row.slug) || String(row.id),
      summary: clean(row.subtitle),
      sourceRef: finding?.source?.sourceRef || (row.slug ? `topic:${row.slug}` : null),
      relationPath: [{ relationType: "topic_contains_anchor", nodeId }],
      directness: "bounded_convergence_membership",
      directnessRank: 1,
      curation: { tier: null, role: row.status === "approved" ? "approved-editorial" : null },
      verificationState: clean(finding?.verification?.verification_state)?.toLowerCase() || null,
      decisionChangingNegative: finding?.verification?.verification_state === "mismatch",
      uncertainty: finding?.verification?.verification_state === "mismatch"
        ? { state: "mismatch", note: "The convergence projection carries a mismatch." }
        : null,
      temporal: { occurredAt: row.occurred_at || null, researchAddedAt: row.created_at || null },
      signals: {
        meter: finiteOrNull(row.meter_score),
        quality: finiteOrNull(row.quality),
      },
      provenance: {
        refs: asArray(finding?.evidence?.refs).length
          ? asArray(finding.evidence.refs)
          : row.slug ? [`topic:${row.slug}`] : [],
        createdAt: row.created_at || null,
      },
      dependency: null,
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
      decisionChangingNegative: false,
      uncertainty: null,
      temporal: null,
      signals: {},
      provenance: { refs: ref ? [ref] : [], createdAt: null },
      dependency: null,
    };
  }).filter(Boolean);
}

function temporalControlCandidate(inputs) {
  // eventContext.researchRows have already been authorized by the current-session RLS reader.
  // Do not recreate privacy/publication law here.
  const event = inputs?.eventContext;
  const occurredAt = clean(event?.occurredAt);
  if (!occurredAt) return null;
  const occurredDate = occurredAt.slice(0, 10);
  const researchDates = [...new Set(asArray(event?.researchRows)
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
    decisionChangingNegative: true,
    uncertainty: { state: "temporal_conflict", note: "Event time and research provenance date disagree." },
    temporal: { occurredAt, sourcePublishedAt: event?.post?.date || null, conflictingResearchDates: conflicting },
    signals: {},
    provenance: { refs: asArray(event?.researchRows).map((row) => clean(row?.source_ref)).filter(Boolean), createdAt: null },
    dependency: null,
  };
}

function mergeUniqueObjects(a, b) {
  const seen = new Set();
  const out = [];
  for (const value of [...asArray(a), ...asArray(b)]) {
    const key = JSON.stringify(value);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function mergeCandidateDetails(preferred, alternate) {
  return {
    ...preferred,
    summary: preferred.summary || alternate.summary || null,
    relationPath: mergeUniqueObjects(preferred.relationPath, alternate.relationPath),
    curation: {
      tier: preferred.curation?.tier || alternate.curation?.tier || null,
      role: preferred.curation?.role || alternate.curation?.role || null,
    },
    verificationState: preferred.verificationState || alternate.verificationState || null,
    decisionChangingNegative: Boolean(preferred.decisionChangingNegative || alternate.decisionChangingNegative),
    uncertainty: preferred.uncertainty || alternate.uncertainty || null,
    temporal: preferred.temporal || alternate.temporal
      ? {
        occurredAt: preferred.temporal?.occurredAt || alternate.temporal?.occurredAt || null,
        researchAddedAt: preferred.temporal?.researchAddedAt || alternate.temporal?.researchAddedAt || null,
        sourcePublishedAt: preferred.temporal?.sourcePublishedAt || alternate.temporal?.sourcePublishedAt || null,
        conflictingResearchDates: preferred.temporal?.conflictingResearchDates || alternate.temporal?.conflictingResearchDates || null,
      }
      : null,
    signals: {
      ...alternate.signals,
      ...Object.fromEntries(Object.entries(preferred.signals || {}).filter(([, value]) => value != null)),
    },
    provenance: {
      refs: [...new Set([...asArray(preferred.provenance?.refs), ...asArray(alternate.provenance?.refs)])],
      createdAt: preferred.provenance?.createdAt || alternate.provenance?.createdAt || null,
    },
    dependency: preferred.dependency || alternate.dependency || null,
  };
}

function dedupeByDependency(candidates, comparatorOptions) {
  const grouped = new Map();
  for (const candidate of candidates) {
    const key = candidate.groupKey || candidate.stableKey;
    const prior = grouped.get(key);
    if (!prior) {
      grouped.set(key, candidate);
      continue;
    }
    if (compareCandidatePriority(candidate, prior, comparatorOptions) < 0) {
      grouped.set(key, mergeCandidateDetails(candidate, prior));
    } else {
      grouped.set(key, mergeCandidateDetails(prior, candidate));
    }
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
  if (candidate.provenance?.refs?.length) researchStrengthSignals.push("provenance_present");
  if (candidate.decisionChangingNegative) researchStrengthSignals.push("decision_changing_negative_or_control");
  if ((candidate.dependency?.memberCount || 1) > 1) researchStrengthSignals.push("dependency_grouped_before_rank");
  if (candidate.signals?.ownerPersonId) researchStrengthSignals.push("canonical_person_owner_present");

  return Object.freeze({
    relevance: candidate.directness,
    relationPath: Object.freeze(asArray(candidate.relationPath)),
    humanCuration: Object.freeze({
      tier: candidate.curation?.tier || null,
      role: candidate.curation?.role || null,
    }),
    researchStrengthSignals: Object.freeze(researchStrengthSignals),
    dependency: candidate.dependency || null,
    directness: candidate.directness,
    informationGain: isFirstFamily
      ? "adds_a_new_evidence_or_content_family_to_the_attention_bundle"
      : "additional_material_within_an_already_selected_family",
    temporalRelevance: candidate.temporal || null,
    uncertainty: candidate.uncertainty || null,
    signalOnly: Object.freeze({
      meter: candidate.signals?.meter ?? null,
      importance: candidate.signals?.importance ?? null,
      quality: candidate.signals?.quality ?? null,
      confidence: candidate.signals?.confidence ?? null,
      legacyEngineVerified: candidate.signals?.legacyEngineVerified ?? null,
    }),
  });
}

/**
 * Pure contextual prominence composition.
 *
 * PRECONDITION: access/publication/privacy filtering already happened in the canonical reader/RLS
 * for the current authorized session. This helper never reimplements or widens access semantics.
 * Then: canonical identity/same-artifact/dependency grouping -> contextual ordering -> bounded
 * family-diverse attention projection. No numeric universal score is produced or persisted.
 */
// Shared World primitives — reused by worldAllResearchProjection.js and
// worldConvergenceLensProjection.js so anchored/catalog/archive readings agree.
// EXTEND_EXISTING under research_object_identity_invariant_law v2: do not fork a
// parallel numeric normalizer or verification classifier.
export const normalizeWorldNumber = finiteOrNull;
export const resolveExplicitVerificationState = explicitVerificationState;

export function buildWorldContextualProminence(data, inputs = {}, {
  limit = 7,
  timeAware = false,
} = {}) {
  if (!data?.identity) return Object.freeze({ items: [], contextSignals: {}, candidateCount: 0 });
  const requested = Math.trunc(Number(limit) || 7);
  const cap = Math.max(4, Math.min(requested, 7));
  const comparatorOptions = { timeAware: Boolean(timeAware) };

  const temporalControl = temporalControlCandidate(inputs);
  let candidates = [
    ...graphCandidates(data),
    ...researchCandidates(data, inputs),
    ...topicCandidates(data),
    ...sourceCandidates(data),
    ...(temporalControl ? [temporalControl] : []),
  ];

  // ACCESS FILTERING PRECEDES THIS FUNCTION via governed readers/current-session RLS.
  // DEDUP / SAME-ARTIFACT / DEPENDENCY GROUPING BEFORE RANK.
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
      accessBoundary: "governed_readers_current_session_rls_before_composition",
      inputAvailability: inputs?.access || null,
      // Existing dependency-aware read signal only. Counts are inspectable context, not Truth and
      // not an opaque universal rank weight.
      crossMethodStrength: crossMethod ? Object.freeze({
        signal: crossMethod.signal ?? null,
        // Raw counts retain backward-compatible corpus visibility; independent counts
        // are the dependency-normalized Research Strength signals.
        phraseCount: crossMethod.phrase_count ?? null,
        independentPhraseCount: crossMethod.independent_phrase_count ?? null,
        dependentExpressionPhraseCount: crossMethod.dependent_expression_phrase_count ?? null,
        p1Hits: crossMethod.p1_hits ?? null,
        independentP1MethodCount: crossMethod.independent_p1_method_count ?? null,
        methods: Object.freeze(asArray(crossMethod.methods)),
        dependentMethods: Object.freeze(asArray(crossMethod.dependent_methods)),
        dependentPhraseCount: crossMethod.dependent_phrase_count ?? null,
      }) : null,
    }),
    disclaimer: "Contextual prominence is a bounded presentation order, not Truth, verification, canonicality or publication state.",
  });
}

export default buildWorldContextualProminence;
