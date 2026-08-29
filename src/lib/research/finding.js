// Universal Finding → existing Research Workspace bridge.
// This module is projection-only: it never computes Gematria/ELS, writes research_objects,
// or promotes Canonical/Published state. Source-native identity remains inside the envelope.

const VALID_STAGES = new Set(["candidate", "finding", "evidence", "claim", "interpretation"]);
const VALID_VERIFICATION = new Set(["match", "mismatch", "method_unknown", "not_tested"]);

export function isUniversalFinding(finding) {
  return Boolean(
    finding &&
    finding.v === 1 &&
    typeof finding.id === "string" && finding.id.trim() &&
    typeof finding.kind === "string" && finding.kind.trim() &&
    VALID_STAGES.has(finding.stage) &&
    finding.subject && typeof finding.subject === "object" &&
    finding.source && typeof finding.source === "object" &&
    finding.identity && typeof finding.identity === "object" &&
    finding.provenance && typeof finding.provenance === "object"
  );
}

function findingLink(finding) {
  const subject = finding?.subject || {};
  if (finding?.kind === "number" && subject.key != null) return `/number/${encodeURIComponent(subject.key)}`;
  if (finding?.kind === "gematria" && subject.value != null) return `/number/${encodeURIComponent(subject.value)}`;
  if (finding?.kind === "els" && subject.label) return `/lab/els?q=${encodeURIComponent(subject.label)}`;
  return null;
}

// Preserve the complete envelope under metadata.finding so current local/cloud JSON round-trips it,
// while keeping the legacy Workspace entity fields needed by ResearchCenter/AI/convergence code.
export function findingToWorkspaceItem(finding, { link } = {}) {
  if (!isUniversalFinding(finding)) return null;
  const label = String(finding?.subject?.label ?? finding?.subject?.key ?? finding.id);
  const verificationState = finding?.verification?.verification_state || "not_tested";
  const sourceEngine = finding?.source?.engine || "source";
  // v0 projects truth-state into the existing row title until the reusable Finding Card lands.
  // This is view text only; identity remains finding.id + identity.sourceIdentity.
  const title = `${label} · ${sourceEngine} · ${finding.stage} · ${verificationState}`;
  return {
    id: finding.id,
    type: finding.kind,
    title,
    ref: finding?.subject?.key ?? finding.id,
    link: link ?? findingLink(finding),
    metadata: {
      isUniversalFinding: true,
      displayLabel: label,
      findingKind: finding.kind,
      stage: finding.stage,
      status: finding.status || "active",
      sourceEngine,
      sourceMethod: finding?.source?.method || null,
      sourceRef: finding?.source?.sourceRef || null,
      verificationState,
      finding,
    },
    addedAt: Date.now(),
  };
}

// ELS adapter consumes an already-returned canonical Tzofen state. It does not search or calculate.
// Missing exact occurrence fields remain null; they are never fabricated from display text.
export function findingFromElsState(state) {
  if (!state || state.source !== "tzofen" || state.type !== "state" || state.status !== "ok") return null;
  const term = String(state?.axis?.term || state?.axis?.t || state?.term || state?.query || state?.raw || "").trim();
  if (!term) return null;

  const corpus = state?.provenance?.scope || state?.scope || "torah";
  const searchKind = state?.provenance?.searchKind || state?.kind || "regular";
  const hitId = state?.axis?.hitId ?? state?.occurrence?.hitId ?? state?.occurrence?.index ?? null;
  const skip = Number.isFinite(Number(state?.axis?.skip)) ? Number(state.axis.skip) : null;
  const start = state?.axis?.start ?? state?.occurrence?.start ?? state?.occurrence?.startIndex ?? null;
  const dir = state?.axis?.dir ?? state?.occurrence?.dir ?? state?.occurrence?.direction ?? null;
  const sourceIdentity = hitId != null
    ? { hitId, corpus, searchKind }
    : { term, corpus, searchKind, skip, start, dir };
  const idParts = [corpus, term, searchKind, hitId ?? "na", skip ?? "na", start ?? "na", dir ?? "na"]
    .map(x => encodeURIComponent(String(x)));

  return {
    v: 1,
    id: `finding:els:${idParts.join(":")}`,
    kind: "els",
    stage: "finding",
    status: "active",
    subject: { type: "phrase", key: term, label: term, value: null },
    source: {
      engine: "els",
      adapter: "tzofen-host-v1",
      sourceRef: hitId != null ? `tzofen:${corpus}:${hitId}` : null,
      method: searchKind,
      corpus,
    },
    identity: {
      sourceIdentity,
      occurrence: { skip, start, dir, hitId },
      entityRef: null,
      relationRef: null,
      personRef: null,
      topicRef: null,
    },
    verification: {
      claimed_expression: term,
      claimed_method: searchKind,
      claimed_value: null,
      engine_method_tested: searchKind,
      engine_result: { status: state.status, hitId, skip, start, dir },
      verification_state: "match",
    },
    evidence: { refs: hitId != null ? [`tzofen:${corpus}:${hitId}`] : [], facts: [], score: null, confidence: null },
    access: { tier: null, reason: null },
    provenance: {
      createdBy: "ENGINE:els",
      createdAt: new Date().toISOString(),
      inputRef: null,
      parentFindingIds: [],
      researchSessionId: null,
      journeyNodeId: null,
    },
    projection: {
      anchors: Array.isArray(state?.axis?.positions) ? state.axis.positions : [],
      relations: [],
      dimensions: {},
    },
    view: { color: null, pinned: false, selected: false, hidden: false, rendererHints: {} },
  };
}

// Number identity adapter. Without a canonical entityRef this remains a Candidate, not a verified Finding.
export function findingFromNumberEntity(number, { sourceRef = null, label = null } = {}) {
  const n = Number(number);
  if (!Number.isFinite(n)) return null;
  const verified = Boolean(sourceRef);
  return {
    v: 1,
    id: `finding:number:${n}`,
    kind: "number",
    stage: verified ? "finding" : "candidate",
    status: "active",
    subject: { type: "number", key: n, label: label || String(n), value: n },
    source: { engine: "graph", adapter: "number-entity-v1", sourceRef, method: null, corpus: null },
    identity: { sourceIdentity: { number: n }, occurrence: null, entityRef: sourceRef, relationRef: null, personRef: null, topicRef: null },
    verification: {
      claimed_expression: null,
      claimed_method: null,
      claimed_value: n,
      engine_method_tested: null,
      engine_result: verified ? { entityRef: sourceRef, number: n } : null,
      verification_state: verified ? "match" : "not_tested",
    },
    evidence: { refs: sourceRef ? [sourceRef] : [], facts: [], score: null, confidence: null },
    access: { tier: null, reason: null },
    provenance: { createdBy: "SYSTEM", createdAt: new Date().toISOString(), inputRef: null, parentFindingIds: [], researchSessionId: null, journeyNodeId: null },
    projection: { anchors: sourceRef ? [sourceRef] : [], relations: [], dimensions: {} },
    view: { color: null, pinned: false, selected: false, hidden: false, rendererHints: {} },
  };
}

// Gematria adapter accepts only an already-verified canonical engine result. It never computes values.
export function findingFromGematriaResult({ subject, methodKey, value, sourceRef = null, engineVersion = null, verificationState = "match" } = {}) {
  const expression = String(subject || "").trim();
  const n = Number(value);
  if (!expression || !methodKey || !Number.isFinite(n) || !VALID_VERIFICATION.has(verificationState)) return null;
  if (verificationState !== "match") return null;
  const normalizedSubject = expression.replace(/\s+/g, " ");
  return {
    v: 1,
    id: `finding:gematria:${encodeURIComponent(methodKey)}:${encodeURIComponent(normalizedSubject)}:${n}`,
    kind: "gematria",
    stage: "finding",
    status: "active",
    subject: { type: "phrase", key: normalizedSubject, label: expression, value: n },
    source: { engine: "gematria", adapter: "canonical-result-v1", sourceRef, method: methodKey, corpus: null },
    identity: { sourceIdentity: { methodKey, normalizedSubject, value: n, engineVersion, sourceRef }, occurrence: null, entityRef: null, relationRef: null, personRef: null, topicRef: null },
    verification: {
      claimed_expression: expression,
      claimed_method: methodKey,
      claimed_value: n,
      engine_method_tested: methodKey,
      engine_result: n,
      verification_state: verificationState,
    },
    evidence: { refs: sourceRef ? [sourceRef] : [], facts: [{ type: "gematria_method_value", methodKey, value: n }], score: null, confidence: null },
    access: { tier: null, reason: null },
    provenance: { createdBy: "ENGINE:gematria", createdAt: new Date().toISOString(), inputRef: null, parentFindingIds: [], researchSessionId: null, journeyNodeId: null },
    projection: { anchors: [], relations: [], dimensions: { numeric: { methodKey, value: n } } },
    view: { color: null, pinned: false, selected: false, hidden: false, rendererHints: {} },
  };
}
