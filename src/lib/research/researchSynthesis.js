export const RESEARCH_SYNTHESIS_CONTRACT_VERSION = 1;

export const SYNTHESIS_STATUS = Object.freeze({
  COMPOSED: "composed",
  INSUFFICIENT_EVIDENCE: "insufficient_evidence",
  FAILED: "failed",
});

const VALID_STATUS = new Set(Object.values(SYNTHESIS_STATUS));
const FORBIDDEN_SCORE_KEYS = new Set([
  "truth_score", "truthScore",
  "accuracy_score", "accuracyScore",
  "canonical_score", "canonicalScore",
]);

const clean = (v) => {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
};

const uniq = (v) => [...new Set((Array.isArray(v) ? v : []).map(clean).filter(Boolean))];

function rejectForbiddenScores(value, seen = new WeakSet()) {
  if (value == null || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item) => rejectForbiddenScores(item, seen));
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_SCORE_KEYS.has(key)) {
      throw new TypeError(`researchSynthesis: ${key} is forbidden`);
    }
    rejectForbiddenScores(nested, seen);
  }
}

function supportOf(input = {}, allowed = new Set()) {
  const ids = uniq(input.finding_ids || input.findingIds);
  ids.forEach((id) => {
    if (!allowed.has(id)) {
      throw new TypeError(`researchSynthesis: support references unavailable finding ${id}`);
    }
  });
  return Object.freeze({
    finding_ids: Object.freeze(ids),
    dependency_groups: Object.freeze(uniq(input.dependency_groups || input.dependencyGroups)),
    derivation_refs: Object.freeze(uniq(input.derivation_refs || input.derivationRefs)),
    negative_or_control_refs: Object.freeze(uniq(input.negative_or_control_refs || input.negativeOrControlRefs)),
  });
}

function claimOf(input = {}, allowed = new Set()) {
  const id = clean(input.id);
  const text = clean(input.text);
  if (!id || !text) throw new TypeError("researchSynthesis: every atomic claim requires id + text");
  return Object.freeze({
    id,
    text,
    role: clean(input.role) || "interpretation",
    motif_key: clean(input.motif_key || input.motifKey),
    support: supportOf(input.support, allowed),
  });
}

function motifOf(input = {}, claimIds = new Set()) {
  const key = clean(input.key);
  if (!key) throw new TypeError("researchSynthesis: motif key is required");
  const refs = uniq(input.claim_ids || input.claimIds);
  refs.forEach((id) => {
    if (!claimIds.has(id)) throw new TypeError(`researchSynthesis: motif references unknown claim ${id}`);
  });
  return Object.freeze({
    key,
    label: clean(input.label) || key,
    summary: clean(input.summary),
    claim_ids: Object.freeze(refs),
  });
}

function explainWhyOf(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return Object.freeze({});
  return Object.freeze({
    summary: clean(input.summary),
    reason: clean(input.reason),
    error_class: clean(input.error_class || input.errorClass),
    refs: Object.freeze(uniq(input.refs)),
  });
}

function provenanceOf(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return Object.freeze({});
  return Object.freeze({
    source_refs: Object.freeze(uniq(input.source_refs || input.sourceRefs)),
    version_refs: Object.freeze(uniq(input.version_refs || input.versionRefs)),
    trace_ref: clean(input.trace_ref || input.traceRef),
    policy_version: clean(input.policy_version || input.policyVersion),
  });
}

export function normalizeResearchSynthesis(input, {
  allowedFindingIds = [],
  frozenAt = null,
  sourceBundleContractVersion = null,
} = {}) {
  if (input == null) return null;
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("researchSynthesis: synthesis must be an object");
  }

  rejectForbiddenScores(input);

  const status = clean(input.status) || SYNTHESIS_STATUS.COMPOSED;
  if (!VALID_STATUS.has(status)) throw new TypeError(`researchSynthesis: invalid status "${status}"`);

  const allowed = new Set(uniq(allowedFindingIds));
  const claims = (Array.isArray(input.claims) ? input.claims : []).map((x) => claimOf(x, allowed));
  const claimIds = new Set(claims.map((x) => x.id));
  if (claimIds.size !== claims.length) throw new TypeError("researchSynthesis: duplicate atomic claim id");
  if (status === SYNTHESIS_STATUS.COMPOSED && claims.length === 0) {
    throw new TypeError("researchSynthesis: composed synthesis requires atomic claims");
  }

  const motifs = (Array.isArray(input.motifs) ? input.motifs : []).map((x) => motifOf(x, claimIds));
  const freezeIn = input.freeze && typeof input.freeze === "object" && !Array.isArray(input.freeze)
    ? input.freeze : {};

  return Object.freeze({
    contract_version: RESEARCH_SYNTHESIS_CONTRACT_VERSION,
    status,
    message: clean(input.message),
    claims: Object.freeze(claims),
    motifs: Object.freeze(motifs),
    freeze: Object.freeze({
      frozen: freezeIn.frozen !== false,
      frozen_at: clean(freezeIn.frozen_at || freezeIn.frozenAt) || clean(frozenAt),
      policy_version: clean(freezeIn.policy_version || freezeIn.policyVersion) || "research-synthesis-seam-v1",
      source_bundle_contract_version: sourceBundleContractVersion ?? null,
      source_finding_ids: Object.freeze(uniq(claims.flatMap((x) => x.support.finding_ids))),
    }),
    explain_why: explainWhyOf(input.explain_why || input.explainWhy),
    provenance: provenanceOf(input.provenance),
    invariants: Object.freeze({
      synthesis_is_not_truth: true,
      no_universal_truth_score: true,
      support_must_be_bundle_backed: true,
      no_auto_canonicalization: true,
      no_auto_publication: true,
      no_calibration_or_learning_policy_in_this_contract: true,
    }),
  });
}

export function failedResearchSynthesis(error, {
  frozenAt = null,
  sourceBundleContractVersion = null,
} = {}) {
  return Object.freeze({
    contract_version: RESEARCH_SYNTHESIS_CONTRACT_VERSION,
    status: SYNTHESIS_STATUS.FAILED,
    message: null,
    claims: Object.freeze([]),
    motifs: Object.freeze([]),
    freeze: Object.freeze({
      frozen: true,
      frozen_at: clean(frozenAt),
      policy_version: "research-synthesis-seam-v1",
      source_bundle_contract_version: sourceBundleContractVersion ?? null,
      source_finding_ids: Object.freeze([]),
    }),
    explain_why: Object.freeze({
      reason: clean(error?.message) || "synthesis failed",
      error_class: clean(error?.name) || "Error",
      refs: Object.freeze([]),
    }),
    provenance: Object.freeze({}),
    invariants: Object.freeze({
      synthesis_is_not_truth: true,
      no_universal_truth_score: true,
      support_must_be_bundle_backed: true,
      no_auto_canonicalization: true,
      no_auto_publication: true,
      no_calibration_or_learning_policy_in_this_contract: true,
    }),
  });
}

export default normalizeResearchSynthesis;
