import {
  isUniversalFinding,
  universalFindingToResearchEntity,
} from "./universalFinding.js";
import { CAPABILITY_STATUS } from "./researchResultBundle.js";

// Pure projection from the existing, access-filtered Research Result Bundle into
// existing Workspace/Research Path shapes. This module owns no persistence,
// authorization, calculation, AI call, store or source truth.

const VALID_OUTCOME_STATUS = new Set(Object.values(CAPABILITY_STATUS));
const MAX_REF_COUNT = 200;
const MAX_REF_LENGTH = 2_048;
const MAX_NEGATIVE_SCOPE_BYTES = 16_000;
const MAX_PATH_OUTCOME_BYTES = 24_000;
const RAW_AUTHORIZATION_KEYS = new Set([
  "authorization_context",
  "authorizationContext",
  "auth_context",
  "authContext",
]);

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function utf8ByteLength(value) {
  try {
    if (typeof TextEncoder === "function") return new TextEncoder().encode(String(value)).byteLength;
  } catch { /* fail closed below */ }
  return Number.POSITIVE_INFINITY;
}

function boundedUniqueStrings(values, { maxItems = MAX_REF_COUNT, maxLength = MAX_REF_LENGTH } = {}) {
  const out = [];
  const seen = new Set();
  let truncated = false;
  for (const value of Array.isArray(values) ? values : []) {
    if (value == null) continue;
    if (typeof value !== "string" && typeof value !== "number") {
      truncated = true;
      break;
    }
    const item = clean(value);
    if (!item || seen.has(item)) continue;
    if (item.length > maxLength || out.length >= maxItems) {
      truncated = true;
      break;
    }
    seen.add(item);
    out.push(item);
  }
  return { items: out, truncated };
}

function containsRawAuthorizationContext(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsRawAuthorizationContext);
  return Object.entries(value).some(([key, item]) => (
    RAW_AUTHORIZATION_KEYS.has(key) || containsRawAuthorizationContext(item)
  ));
}

function safeNegativeScope(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    const serialized = JSON.stringify(value);
    const byteLength = utf8ByteLength(serialized);
    if (!serialized || byteLength > MAX_NEGATIVE_SCOPE_BYTES) return null;
    const cloned = JSON.parse(serialized);
    return cloned && typeof cloned === "object" && !Array.isArray(cloned)
      && !containsRawAuthorizationContext(cloned)
      ? cloned
      : null;
  } catch {
    return null;
  }
}

function isComposedResearchResultBundle(bundle) {
  return Boolean(
    bundle
      && typeof bundle === "object"
      && Array.isArray(bundle.findings)
      && Array.isArray(bundle.capability_trace)
      && bundle.invariants?.universal_finding_only === true
  );
}

function requestedFindingIds(findingIds) {
  return boundedUniqueStrings(findingIds);
}

function bundleFindingIndex(bundle) {
  const findings = [];
  const byId = new Map();
  for (const finding of isComposedResearchResultBundle(bundle) ? bundle.findings : []) {
    if (!isUniversalFinding(finding)) continue;
    const id = String(finding.id);
    if (byId.has(id)) continue;
    byId.set(id, finding);
    findings.push(finding);
  }
  return {
    findings,
    byId,
  };
}

/**
 * Select only explicit Finding IDs from the already access-filtered Bundle.
 * Missing/empty selection deliberately means "select nothing", never "save all".
 */
export function selectResearchResultFindings(bundle, findingIds = []) {
  const request = requestedFindingIds(findingIds);
  const requestedIds = request.items;
  const requested = new Set(requestedIds);
  const { findings, byId } = bundleFindingIndex(bundle);
  const selected = findings.filter((finding) => requested.has(String(finding.id)));
  const selectedIds = selected.map((finding) => String(finding.id));

  return {
    findings: selected,
    selectedIds,
    missingIds: requestedIds.filter((id) => !byId.has(id)),
    ...(request.truncated ? { truncated: true } : {}),
  };
}

/**
 * Convert selected Universal Findings through the one existing Workspace entity
 * adapter. No Bundle, synthesis, authorization descriptor or AI response is saved.
 */
export function researchEntitiesFromResultBundle(bundle, findingIds = []) {
  const selection = selectResearchResultFindings(bundle, findingIds);
  return {
    ...selection,
    entities: selection.findings
      .map(universalFindingToResearchEntity)
      .filter(Boolean),
  };
}

/**
 * Project one capability attempt into the outcome fields already supported by
 * Research Path revisions. Findings must be both visible in bundle.findings and
 * owned by this capability trace entry.
 */
export function researchPathOutcomeFromResultBundle(bundle, {
  capabilityKey,
  findingIds = [],
} = {}) {
  const key = clean(capabilityKey);
  const request = requestedFindingIds(findingIds);
  const requestedIds = request.items;
  const { findings, byId } = bundleFindingIndex(bundle);
  if (!key || !isComposedResearchResultBundle(bundle)) {
    return {
      outcome: null,
      selectedIds: [],
      missingIds: requestedIds,
      ...(request.truncated ? { truncated: true } : {}),
    };
  }

  const capability = bundle.capability_trace.find((item) => clean(item?.key) === key);
  const status = clean(capability?.status);
  if (!capability || !VALID_OUTCOME_STATUS.has(status)) {
    return {
      outcome: null,
      selectedIds: [],
      missingIds: requestedIds,
      ...(request.truncated ? { truncated: true } : {}),
    };
  }

  const capabilityFindingBounds = boundedUniqueStrings(capability.finding_ids);
  const capabilityFindingIds = new Set(capabilityFindingBounds.items);
  const requested = new Set(requestedIds);
  const selected = findings.filter((finding) => {
    const id = String(finding.id);
    return requested.has(id) && capabilityFindingIds.has(id);
  });
  const selectedIds = selected.map((finding) => String(finding.id));
  const selectedSet = new Set(selectedIds);
  const missingIds = requestedIds.filter((id) => !byId.has(id) || !capabilityFindingIds.has(id));
  // Capability-level trace refs cannot be attributed to the visible Findings after the
  // composition boundary withholds even one sibling. Persist none of those refs rather than
  // risk turning a filtered source identifier into durable Research Path state.
  const hasAccessFilteredFindings = Number(capability.access_filtered?.count) > 0;
  const reason = hasAccessFilteredFindings
    ? null
    : clean(capability.reason || capability.negative_result?.reason);
  const negativeScope = safeNegativeScope(capability.negative_result?.scope);
  const sourceRefBounds = boundedUniqueStrings(capability.source_refs);
  const versionRefBounds = boundedUniqueStrings(capability.version_refs);

  if (request.truncated || capabilityFindingBounds.truncated
      || (!hasAccessFilteredFindings && (sourceRefBounds.truncated || versionRefBounds.truncated))) {
    return { outcome: null, selectedIds: [], missingIds, truncated: true };
  }

  // In the durable Path contract `executed + []` means the engine really ran and
  // found no positive result. It must not also mean "positive results existed but
  // the user selected none" or "all results were withheld by access filtering".
  if (status === CAPABILITY_STATUS.EXECUTED && selectedIds.length === 0
      && (capabilityFindingIds.size > 0 || hasAccessFilteredFindings)) {
    return { outcome: null, selectedIds: [], missingIds };
  }

  if (status === CAPABILITY_STATUS.NEGATIVE_RESULT
      && (!reason || !negativeScope || typeof negativeScope !== "object" || Array.isArray(negativeScope))) {
    return { outcome: null, selectedIds: [], missingIds: requestedIds };
  }
  if (status === CAPABILITY_STATUS.MISSING_ADAPTER && !reason) {
    return { outcome: null, selectedIds: [], missingIds: requestedIds };
  }

  const outcome = {
    capability_key: key,
    outcome_status: status,
    finding_refs: status === CAPABILITY_STATUS.NEGATIVE_RESULT ? [] : selectedIds,
    source_refs: hasAccessFilteredFindings ? [] : sourceRefBounds.items,
    version_refs: hasAccessFilteredFindings ? [] : versionRefBounds.items,
  };
  if (reason) outcome.reason = reason;
  if (status === CAPABILITY_STATUS.NEGATIVE_RESULT) outcome.negative_scope = negativeScope;
  if (utf8ByteLength(JSON.stringify(outcome)) > MAX_PATH_OUTCOME_BYTES) {
    return { outcome: null, selectedIds: [], missingIds, truncated: true };
  }

  return {
    outcome,
    selectedIds: status === CAPABILITY_STATUS.NEGATIVE_RESULT ? [] : selectedIds,
    // A valid Bundle Finding from another capability is still missing for THIS outcome.
    missingIds: missingIds.filter((id) => !selectedSet.has(id)),
  };
}

export default researchEntitiesFromResultBundle;
