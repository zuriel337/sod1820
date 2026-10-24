// Raziel Result-Bundle Consumer V1.
//
// A bounded, deterministic projection over the EXISTING canonical Research Result Bundle.
// It owns no engine truth, access decision, synthesis, persistence, routing or UI. The Bundle has
// already applied authorization and Finding admission; this adapter only exposes allowlisted fields
// to Raziel and to a human evidence view without copying raw capability payloads into a prompt.

export const RAZIEL_RESULT_BUNDLE_CONSUMER_VERSION = 1;

export const RAZIEL_RESULT_BUNDLE_LIMITS = Object.freeze({
  findings: 12,
  capabilities: 16,
  identities: 6,
  refs: 12,
  factsPerFinding: 8,
  actions: 6,
  methodProfile: 32,
  arrayItems: 12,
  objectKeys: 24,
  detailDepth: 3,
  shortText: 160,
  longText: 320,
});

const SAFE_DETAIL_KEYS = new Set([
  "type", "kind", "label", "text", "value", "values", "result", "results",
  "expression", "expressions", "method", "method_key", "methodKey", "method_version",
  "methodVersion", "methods", "method_count", "minimum_required_methods", "partner",
  "relation_kind", "relation_type", "expression_method", "partner_method", "engine_verified",
  "label_he", "calculation_description", "semantic_description", "relation_note",
  "confidence_source", "review_version", "profile",
  "derived_from", "dependency_rules", "dependency_version", "to", "condition", "operator", "components",
  "dependency_independence_claimed", "engine", "corpus", "source", "source_ref", "sourceRef", "ref", "refs",
  "locator", "relation", "relations", "left", "right", "number", "numbers", "count", "found",
  "status", "scope", "operation", "reason", "book", "chapter", "verse", "index", "start", "end",
  "length", "skip", "signedSkip", "dir", "direction", "occurrence", "coordinates", "matches",
  "certainty", "ai_calls", "rpc_calls", "rest_calls", "retry_count", "latency_ms", "trace_ref", "traceRef",
  "semantic_status", "public_endpoint_status",
  "confirmed_relation_source",
  "span_id", "spanId", "operation_id", "operationId", "interaction_id", "interactionId", "outcome",
  "max_search_depth", "returned_count", "total_count", "truncated", "window", "ordering",
  "rank", "lead_rank", "authority", "presentation_scope",
]);

const FORBIDDEN_KEY = /(?:authorization|auth_context|token|password|secret|private_prompt|raw_payload|raw_private|jwt|cookie|email|phone|user_id|owner_user)/i;
const COMPLETE_STATUSES = new Set(["executed", "negative_result"]);

const list = (value) => Array.isArray(value) ? value : [];

function cleanText(value, max = RAZIEL_RESULT_BUNDLE_LIMITS.shortText) {
  if (value == null) return null;
  const text = String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, max) : null;
}

function finiteNumber(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function uniqueText(values, max = RAZIEL_RESULT_BUNDLE_LIMITS.refs) {
  const seen = new Set();
  const out = [];
  for (const value of list(values)) {
    const text = cleanText(value);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
    if (out.length >= max) break;
  }
  return out;
}

function projectDetail(value, depth = 0) {
  if (value == null) return { value: null, omitted: 0 };
  if (typeof value === "boolean") return { value, omitted: 0 };
  if (typeof value === "number") return Number.isFinite(value)
    ? { value, omitted: 0 }
    : { value: null, omitted: 1 };
  if (typeof value === "string") {
    const projected = cleanText(value, RAZIEL_RESULT_BUNDLE_LIMITS.longText);
    return {
      value: projected,
      omitted: projected && projected.length < value.trim().length ? 1 : 0,
    };
  }
  if (depth >= RAZIEL_RESULT_BUNDLE_LIMITS.detailDepth) return { value: null, omitted: 1 };
  if (Array.isArray(value)) {
    const out = [];
    let omitted = Math.max(0, value.length - RAZIEL_RESULT_BUNDLE_LIMITS.arrayItems);
    for (const item of value.slice(0, RAZIEL_RESULT_BUNDLE_LIMITS.arrayItems)) {
      const projected = projectDetail(item, depth + 1);
      omitted += projected.omitted;
      if (projected.value != null) out.push(projected.value);
    }
    return { value: out, omitted };
  }
  if (typeof value !== "object") return { value: null, omitted: 1 };

  const entries = Object.entries(value);
  const out = {};
  let accepted = 0;
  let omitted = 0;
  for (const [key, item] of entries) {
    if (accepted >= RAZIEL_RESULT_BUNDLE_LIMITS.objectKeys) {
      omitted++;
      continue;
    }
    if (FORBIDDEN_KEY.test(key) || !SAFE_DETAIL_KEYS.has(key)) {
      omitted++;
      continue;
    }
    const projected = projectDetail(item, depth + 1);
    omitted += projected.omitted;
    if (projected.value == null) continue;
    out[key] = projected.value;
    accepted++;
  }
  return { value: out, omitted };
}

function projectAccess(value) {
  if (!value || typeof value !== "object") return null;
  return {
    tier: cleanText(value.tier, 40),
    reason: cleanText(value.reason),
  };
}

function projectIdentity(identity) {
  if (!identity || typeof identity !== "object") return null;
  if (identity.redacted === true) {
    return {
      type: cleanText(identity.type, 40),
      ref: cleanText(identity.ref, 120),
      source: cleanText(identity.source, 60),
      confidence: cleanText(identity.confidence, 40),
      access: projectAccess(identity.access),
      redacted: true,
      redaction_reason: cleanText(identity.redaction_reason),
    };
  }
  return {
    type: cleanText(identity.type, 40),
    id: cleanText(identity.id, 120),
    ref: cleanText(identity.ref, 120),
    identity_key: cleanText(identity.identity_key, 160),
    key: cleanText(identity.key, 160),
    label: cleanText(identity.label),
    value: typeof identity.value === "number" ? finiteNumber(identity.value) : cleanText(identity.value),
    source: cleanText(identity.source, 60),
    confidence: cleanText(identity.confidence, 40),
    access: projectAccess(identity.access),
    redacted: false,
  };
}

function projectFinding(finding, rankById, outcomesById) {
  if (!finding || typeof finding !== "object") return null;
  const id = cleanText(finding.id, 200);
  if (!id) return null;
  const verificationResult = projectDetail(finding.verification?.engine_result);
  const facts = [];
  let omittedFactFields = verificationResult.omitted;
  for (const fact of list(finding.evidence?.facts).slice(0, RAZIEL_RESULT_BUNDLE_LIMITS.factsPerFinding)) {
    const projected = projectDetail(fact);
    omittedFactFields += projected.omitted;
    if (projected.value != null) facts.push(projected.value);
  }
  omittedFactFields += Math.max(0, list(finding.evidence?.facts).length - RAZIEL_RESULT_BUNDLE_LIMITS.factsPerFinding);
  const subject = finding.subject && typeof finding.subject === "object" ? finding.subject : {};
  const source = finding.source && typeof finding.source === "object" ? finding.source : {};
  const verification = finding.verification && typeof finding.verification === "object" ? finding.verification : {};
  const ranking = rankById.get(id) || null;

  return {
    id,
    kind: cleanText(finding.kind, 60),
    stage: cleanText(finding.stage, 40),
    status: cleanText(finding.status, 40),
    subject: {
      type: cleanText(subject.type, 40),
      key: cleanText(subject.key, 160),
      label: cleanText(subject.label),
      lang: cleanText(subject.lang, 20),
      value: typeof subject.value === "number" ? finiteNumber(subject.value) : cleanText(subject.value),
    },
    source: {
      engine: cleanText(source.engine, 80),
      adapter: cleanText(source.adapter, 100),
      source_name: cleanText(source.name ?? source.title ?? source.label),
      source_ref: cleanText(source.sourceRef, 200),
      method: cleanText(source.method, 80),
      corpus: cleanText(source.corpus, 80),
      lang: cleanText(source.lang, 20),
    },
    identity: {
      entity_ref: cleanText(finding.identity?.entityRef, 200),
      relation_ref: cleanText(finding.identity?.relationRef, 200),
    },
    verification: {
      state: cleanText(verification.verification_state, 40),
      claimed_expression: cleanText(verification.claimed_expression),
      claimed_method: cleanText(verification.claimed_method, 80),
      claimed_value: typeof verification.claimed_value === "number" ? finiteNumber(verification.claimed_value) : cleanText(verification.claimed_value),
      engine_method_tested: cleanText(verification.engine_method_tested, 80),
      engine_result: verificationResult.value,
    },
    evidence: {
      refs: uniqueText(finding.evidence?.refs),
      facts,
      score: finiteNumber(finding.evidence?.score),
      confidence: finiteNumber(finding.evidence?.confidence),
    },
    access: projectAccess(finding.access),
    provenance: {
      created_by: cleanText(finding.provenance?.createdBy, 100),
      created_at: cleanText(finding.provenance?.createdAt, 60),
      parent_finding_ids: uniqueText(finding.provenance?.parentFindingIds),
    },
    ranking: ranking ? {
      rank: finiteNumber(ranking.rank),
      score: finiteNumber(ranking.score),
      axes: projectDetail(ranking.axes).value,
      reasons: uniqueText(ranking.reasons, 6),
    } : null,
    evidence_relations: outcomesById.get(id) || [],
    projection_omissions: omittedFactFields,
  };
}

function projectOutcome(outcome, allowedFindingIds) {
  if (!outcome || typeof outcome !== "object") return null;
  const findingId = cleanText(outcome.finding_id, 200);
  if (!findingId || !allowedFindingIds.has(findingId)) return null;
  return {
    finding_id: findingId,
    capability: cleanText(outcome.capability, 100),
    evidence_relation: cleanText(outcome.evidence_relation, 60),
    depends_on: uniqueText(outcome.depends_on),
    convergence_key: cleanText(outcome.convergence_key, 160),
    reason: cleanText(outcome.reason),
    expectedness: cleanText(outcome.expectedness, 80),
    expectedness_model: cleanText(outcome.expectedness_model, 100),
    base_rate: finiteNumber(outcome.base_rate),
  };
}

function projectCapability(capability, allowedFindingIds) {
  if (!capability || typeof capability !== "object") return null;
  const key = cleanText(capability.key, 100);
  if (!key) return null;
  const negativeScope = projectDetail(capability.negative_result?.scope);
  const cost = projectDetail(capability.cost);
  const trace = projectDetail(capability.trace);
  return {
    key,
    owner: cleanText(capability.owner, 160),
    status: cleanText(capability.status, 60),
    requested: capability.requested !== false,
    executed: capability.executed === true,
    reason: cleanText(capability.reason),
    negative_result: capability.negative_result ? {
      searched: capability.negative_result.searched === true,
      reason: cleanText(capability.negative_result.reason),
      scope: negativeScope.value,
    } : null,
    source_refs: uniqueText(capability.source_refs),
    version_refs: uniqueText(capability.version_refs),
    finding_ids: uniqueText(capability.finding_ids).filter((id) => allowedFindingIds.has(id)),
    access_class: cleanText(capability.access_class, 60),
    semantic_class: cleanText(capability.semantic_class, 60),
    access_filtered: {
      count: finiteNumber(capability.access_filtered?.count) || 0,
      reasons: list(capability.access_filtered?.reasons).slice(0, 8).map((reason) => ({
        reason: cleanText(reason?.reason),
        count: finiteNumber(reason?.count) || 0,
      })),
    },
    bounded: capability.bounded ? {
      total_count: finiteNumber(capability.bounded.total_count),
      returned_count: finiteNumber(capability.bounded.returned_count),
      truncated: capability.bounded.truncated === true,
      window: projectDetail(capability.bounded.window).value,
      ordering: cleanText(capability.bounded.ordering, 100),
      continuation_available: capability.bounded.continuation != null,
    } : null,
    cost: cost.value,
    trace: trace.value,
    projection_omissions: negativeScope.omitted + cost.omitted + trace.omitted,
  };
}

function projectNextAction(action) {
  if (!action || typeof action !== "object") return null;
  return {
    action: cleanText(action.action, 80),
    capability: cleanText(action.capability, 100),
    label: cleanText(action.label),
    route_action: cleanText(action.route_action, 80),
    task_mode: cleanText(action.task_mode, 80),
    preferred_home: cleanText(action.preferred_home, 80),
    reason: cleanText(action.reason),
  };
}

function projectCoverage(coverage) {
  const source = coverage && typeof coverage === "object" ? coverage : {};
  const keys = [
    "requested", "executed", "executed_empty", "positive_result", "negative_result", "skipped",
    "context_required", "entitlement_gated", "unverified", "failed", "missing_adapter", "access_filtered",
  ];
  const out = {};
  for (const key of keys) out[key] = finiteNumber(source[key]) || 0;
  out.partial = source.partial === true;
  out.complete = source.complete === true;
  return out;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
}

// Result Bundle preserves source evidence order; `ranking` is a separate presentation authority.
// Apply it only at this bounded consumer edge, before the 12-Finding limit. Unranked evidence keeps
// its exact source-relative order, and ties are stable. This prevents an alphabetically early
// method family from consuming the whole model window before Human-Gate-ranked Regular phrases.
function findingsInPresentationOrder(findings, rankById) {
  return list(findings).map((finding, sourceIndex) => {
    const id = cleanText(finding?.id, 200);
    const rank = finiteNumber(rankById.get(id)?.rank);
    return { finding, sourceIndex, rank };
  }).sort((a, b) => {
    const aRanked = a.rank != null;
    const bRanked = b.rank != null;
    if (aRanked !== bRanked) return aRanked ? -1 : 1;
    if (aRanked && a.rank !== b.rank) return a.rank - b.rank;
    return a.sourceIndex - b.sourceIndex;
  }).map((entry) => entry.finding);
}

function compactCalculationProfile(findings) {
  const entries = [];
  const seen = new Set();
  for (const finding of list(findings)) {
    if (finding?.kind !== "gematria-method-value") continue;
    const methodKey = cleanText(
      finding?.verification?.engine_method_tested ?? finding?.source?.method,
      80,
    );
    const rawValue = finding?.verification?.engine_result ?? finding?.subject?.value;
    const value = finiteNumber(rawValue);
    if (!methodKey || value == null || seen.has(methodKey)) continue;
    const fact = list(finding?.evidence?.facts).find((item) => item?.type === "gematria-method-profile-value") || {};
    entries.push({
      finding_id: cleanText(finding?.id, 200),
      method_key: methodKey,
      method_label: cleanText(fact.label, 100) || methodKey,
      value,
      category: cleanText(fact.category, 60),
      mathematical_family: cleanText(fact.mathematical_family, 80),
      atomic_or_composite: cleanText(fact.atomic_or_composite, 60),
      method_version: finiteNumber(fact.method_version),
      derived_from: uniqueText(fact.derived_from, 8),
      dependency_rules: list(fact.dependency_rules).slice(0, 12).map((rule) => ({
        type: cleanText(rule?.type, 80),
        to: cleanText(rule?.to, 80),
        condition: cleanText(rule?.condition, 100),
        operator: cleanText(rule?.operator, 60),
        components: uniqueText(rule?.components, 8),
      })).filter((rule) => rule.type),
      dependency_version: finiteNumber(fact.dependency_version),
    });
    seen.add(methodKey);
    if (entries.length >= RAZIEL_RESULT_BUNDLE_LIMITS.methodProfile) break;
  }
  return entries;
}

// Normalize the canonical method map by its already-computed numeric basis. This is deliberately
// a presentation projection, not a second calculator and not an independence engine: equal values
// are grouped so a model cannot mistake repeated method outputs for repeated proof. Method
// identities remain intact, and no group is promoted to independent evidence without an explicit
// governed outcome in the source Result Bundle.
function dependencyConditionSatisfied(condition, expression) {
  const text = cleanText(expression, RAZIEL_RESULT_BUNDLE_LIMITS.longText) || "";
  const words = text.match(/[\p{L}\p{N}]+/gu) || [];
  const noFinalLetters = !/[ךםןףץ]/u.test(text);
  switch (cleanText(condition, 100)) {
    case "no_final_letters": return noFinalLetters;
    case "single_word_input": return words.length === 1;
    case "single_word_and_no_final_letters": return words.length === 1 && noFinalLetters;
    default: return false;
  }
}

function normalizedMethodIdentity(value) {
  return (cleanText(value, 100) || "")
    .normalize("NFKC")
    .replace(/["'״׳`]/gu, "")
    .replace(/[\s־–—-]+/gu, "")
    .toLowerCase();
}

function provenEquivalenceSets(methods, expression) {
  const parents = methods.map((_, index) => index);
  const find = (index) => {
    let current = index;
    while (parents[current] !== current) current = parents[current];
    while (parents[index] !== index) {
      const next = parents[index];
      parents[index] = current;
      index = next;
    }
    return current;
  };
  const union = (left, right) => {
    const a = find(left);
    const b = find(right);
    if (a !== b) parents[b] = a;
  };
  const methodIndex = new Map();
  methods.forEach((method, index) => {
    for (const key of [method?.method_key, method?.method_label]) {
      const normalized = normalizedMethodIdentity(key);
      if (normalized) methodIndex.set(normalized, index);
    }
  });
  const appliedRules = [];
  methods.forEach((method, index) => {
    for (const rule of list(method?.dependency_rules)) {
      if (rule?.type !== "conditional_equivalence"
        || !dependencyConditionSatisfied(rule?.condition, expression)) continue;
      const targetIndex = methodIndex.get(normalizedMethodIdentity(rule?.to));
      if (targetIndex == null || targetIndex === index) continue;
      union(index, targetIndex);
      appliedRules.push({
        from: cleanText(method?.method_label || method?.method_key, 100),
        to: cleanText(methods[targetIndex]?.method_label || methods[targetIndex]?.method_key, 100),
        condition: cleanText(rule?.condition, 100),
      });
    }
  });
  const membersByRoot = new Map();
  methods.forEach((method, index) => {
    const root = find(index);
    const members = membersByRoot.get(root) || [];
    members.push(cleanText(method?.method_label || method?.method_key, 100));
    membersByRoot.set(root, members);
  });
  return {
    sets: [...membersByRoot.values()].filter((members) => members.length > 1).map((members) => ({
      methods: members,
      basis: "canonical_registry_conditional_equivalence",
    })),
    applied_rules: appliedRules,
    effective_distinct_method_count: new Set(methods.map((_, index) => find(index))).size,
  };
}

function compactMethodValueGroups(calculationProfile, expression) {
  const groups = new Map();
  for (const method of list(calculationProfile)) {
    const value = finiteNumber(method?.value);
    if (value == null) continue;
    const group = groups.get(value) || { value, methods: [], families: [] };
    group.methods.push({
      finding_id: cleanText(method?.finding_id, 200),
      method_key: cleanText(method?.method_key, 80),
      method_label: cleanText(method?.method_label, 100),
      mathematical_family: cleanText(method?.mathematical_family, 80),
      atomic_or_composite: cleanText(method?.atomic_or_composite, 60),
      derived_from: uniqueText(method?.derived_from, 8),
      dependency_rules: list(method?.dependency_rules).slice(0, 12).map((rule) => ({ ...rule })),
      dependency_version: finiteNumber(method?.dependency_version),
    });
    const family = cleanText(method?.mathematical_family, 80);
    if (family && !group.families.includes(family)) group.families.push(family);
    groups.set(value, group);
  }
  return [...groups.values()].map((group) => {
    const equivalence = provenEquivalenceSets(group.methods, expression);
    const metadataAvailable = group.methods.some((method) => method.dependency_version != null);
    return {
      value: group.value,
      methods: group.methods,
      method_count: group.methods.length,
      mathematical_families: group.families,
      mathematical_family_count: group.families.length,
      same_value_collision: group.methods.length > 1,
      proven_equivalence_sets: equivalence.sets,
      applied_dependency_rules: equivalence.applied_rules,
      effective_distinct_method_count: equivalence.effective_distinct_method_count,
      dependency_resolution: metadataAvailable ? "canonical_registry_rules_applied" : "registry_metadata_unavailable",
      independent_support_count: null,
      independence: "not_claimed_without_explicit_bundle_evidence",
      counts_as_independent_evidence: false,
    };
  });
}

export function buildRazielResultBundleConsumer(bundle) {
  if (!bundle || typeof bundle !== "object" || Array.isArray(bundle)) {
    throw new TypeError("razielResultBundleConsumer: canonical Result Bundle object is required");
  }
  if (bundle.invariants?.universal_finding_only !== true) {
    throw new TypeError("razielResultBundleConsumer: unsupported bundle without universal_finding_only invariant");
  }

  const rankById = new Map(list(bundle.ranking).map((entry) => [cleanText(entry?.finding_id, 200), entry]));
  const orderedFindings = findingsInPresentationOrder(bundle.findings, rankById);
  const calculationProfile = compactCalculationProfile(orderedFindings);
  const calculationExpression = orderedFindings.find((finding) => finding?.kind === "gematria-method-value")?.subject?.label || null;
  const methodValueGroups = compactMethodValueGroups(calculationProfile, calculationExpression);
  // The compact profile carries every bounded method value. Reserve the ordinary Finding window
  // for crossings/source evidence first, then retain a few individual method Findings for replay.
  const presentationFindings = calculationProfile.length
    ? [
        ...orderedFindings.filter((finding) => finding?.kind !== "gematria-method-value"),
        ...orderedFindings.filter((finding) => finding?.kind === "gematria-method-value"),
      ]
    : orderedFindings;
  const candidateIds = new Set(presentationFindings.slice(0, RAZIEL_RESULT_BUNDLE_LIMITS.findings)
    .map((finding) => cleanText(finding?.id, 200)).filter(Boolean));
  const projectedOutcomes = list(bundle.finding_outcomes)
    .map((outcome) => projectOutcome(outcome, candidateIds))
    .filter(Boolean);
  const outcomesById = new Map();
  for (const outcome of projectedOutcomes) {
    const current = outcomesById.get(outcome.finding_id) || [];
    current.push(outcome);
    outcomesById.set(outcome.finding_id, current);
  }
  const findings = presentationFindings.slice(0, RAZIEL_RESULT_BUNDLE_LIMITS.findings)
    .map((finding) => projectFinding(finding, rankById, outcomesById))
    .filter(Boolean);
  const findingIds = new Set(findings.map((finding) => finding.id));
  const capabilities = list(bundle.capability_trace).slice(0, RAZIEL_RESULT_BUNDLE_LIMITS.capabilities)
    .map((capability) => projectCapability(capability, findingIds))
    .filter(Boolean);

  const disclosure = bundle.identity_disclosure && typeof bundle.identity_disclosure === "object"
    ? bundle.identity_disclosure : {};
  const withholdFreeText = disclosure.free_text_may_contain_restricted_terms === true;
  const rawIdentities = [
    ...list(bundle.query?.identities),
    ...list(bundle.plan?.identities),
  ];
  const identities = [];
  const identityKeys = new Set();
  for (const raw of rawIdentities) {
    const identity = projectIdentity(raw);
    if (!identity) continue;
    const key = JSON.stringify(identity);
    if (identityKeys.has(key)) continue;
    identityKeys.add(key);
    identities.push(identity);
    if (identities.length >= RAZIEL_RESULT_BUNDLE_LIMITS.identities) break;
  }

  const sourceRefs = uniqueText([
    ...capabilities.flatMap((capability) => capability.source_refs),
    ...findings.map((finding) => finding.source.source_ref),
    ...findings.flatMap((finding) => finding.evidence.refs),
  ].filter(Boolean));
  const versionRefs = uniqueText(capabilities.flatMap((capability) => capability.version_refs));
  const coverage = projectCoverage(bundle.coverage);
  const nextActions = list(bundle.next_actions).slice(0, RAZIEL_RESULT_BUNDLE_LIMITS.actions)
    .map(projectNextAction).filter(Boolean);
  const capabilityGaps = capabilities.filter((capability) => !COMPLETE_STATUSES.has(capability.status));
  const accessFiltered = capabilities.reduce((sum, capability) => sum + capability.access_filtered.count, 0);
  const outputTruncated = bundle.output_bounds?.truncated === true;

  const query = {
    question: withholdFreeText ? null : cleanText(bundle.query?.question ?? bundle.plan?.question, RAZIEL_RESULT_BUNDLE_LIMITS.longText),
    intent: cleanText(bundle.query?.intent, 80),
    free_text_withheld: withholdFreeText,
    identities,
  };

  const modelInput = {
    query,
    calculation_profile: calculationProfile,
    method_value_groups: methodValueGroups,
    findings,
    finding_outcomes: projectedOutcomes,
    capabilities,
    coverage,
    output_bounds: {
      source_truncated: outputTruncated,
      consumer_truncated: list(bundle.findings).length > findings.length
        || list(bundle.capability_trace).length > capabilities.length,
      source_finding_count: list(bundle.findings).length,
      projected_finding_count: findings.length,
    },
    source_refs: sourceRefs,
    version_refs: versionRefs,
    constraints: {
      claims_must_reference_finding_ids: true,
      facts_must_come_from_projected_findings: true,
      calculation_values_must_come_from_calculation_profile: true,
      equal_method_values_must_use_method_value_groups: true,
      method_count_is_not_independent_support_count: true,
      derivation_is_not_independent_evidence: true,
      convergence_is_not_automatically_independent: true,
      access_filtered_is_not_negative_evidence: true,
      no_ai_arithmetic_fallback: true,
      no_auto_canonicalization: true,
      no_auto_publication: true,
    },
  };

  const humanView = {
    subjects: identities,
    calculation_profile: calculationProfile,
    method_value_groups: methodValueGroups,
    cards: findings.map((finding) => ({
      finding_id: finding.id,
      label: finding.subject.label,
      kind: finding.kind,
      stage: finding.stage,
      verification_state: finding.verification.state,
      method: finding.verification.engine_method_tested || finding.source.method,
      value: finding.verification.engine_result ?? finding.subject.value,
      source_name: finding.source.source_name,
      source_ref: finding.source.source_ref,
      source_lang: finding.source.lang,
      evidence_refs: finding.evidence.refs,
      evidence_relations: finding.evidence_relations,
      access_tier: finding.access?.tier || null,
      presentation_rank: finding.ranking?.rank ?? null,
      presentation_authority: finding.ranking?.axes?.authority || null,
    })),
    coverage,
    gaps: {
      capabilities: capabilityGaps.map((capability) => ({
        key: capability.key,
        status: capability.status,
        reason: capability.reason,
      })),
      access_filtered: accessFiltered,
      output_truncated: outputTruncated,
    },
    next_actions: nextActions,
  };

  return deepFreeze({
    contract_version: RAZIEL_RESULT_BUNDLE_CONSUMER_VERSION,
    source_bundle_contract_version: finiteNumber(bundle.contract_version),
    model_input: modelInput,
    human_view: humanView,
    guards: {
      projection_only: true,
      no_calculation: true,
      no_model_call: true,
      no_network_or_database: true,
      no_access_decision: true,
      no_synthesis_generation: true,
      no_navigation_execution: true,
      existing_result_bundle_is_authority: true,
    },
  });
}

export default buildRazielResultBundleConsumer;
