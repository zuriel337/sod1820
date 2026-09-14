import { normalizeAccessDescriptor } from "./researchPlanV2.js";
import { stableIdentityDigest } from "./researchRepresentations.js";

// G3 Universal Intake transport.
// This is an EPHEMERAL carrier over existing Research Intake / Representation / Person / Truth owners.
// It owns no persistence, source truth, identity registry, engine routing, promotion or publication semantics.

const RESTRICTED_TIERS = new Set([
  "private",
  "public_candidate",
  "personal",
  "user_private",
  "draft",
  "internal",
  "pending",
]);

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function valueOf(raw) {
  if (raw == null) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw.value ?? raw.text ?? raw.content ?? null;
  }
  return raw;
}

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const item of Object.values(value)) freezeDeep(item);
  return Object.freeze(value);
}

function normalizeTier(value, fallback = "unclassified") {
  return clean(value?.access?.tier ?? value?.access_tier ?? value?.accessTier ?? fallback) || "unclassified";
}

function accessOf(value, fallback) {
  return { tier: normalizeTier(value, fallback) };
}

function generatedRef(prefix, seed) {
  return `${prefix}:${stableIdentityDigest(seed || prefix)}`;
}

function normalizeRef(value, prefix, seed) {
  return clean(value?.ref ?? value?.id ?? value?.source_ref ?? value?.sourceRef)
    || generatedRef(prefix, seed);
}

function normalizeFingerprint(value) {
  if (!value) return null;
  if (typeof value === "string") {
    return { algorithm: "unspecified", value, strength: "candidate" };
  }
  if (typeof value !== "object" || Array.isArray(value)) return null;
  const fingerprint = clean(value.value ?? value.hash ?? value.digest);
  if (!fingerprint) return null;
  return {
    algorithm: clean(value.algorithm ?? value.kind) || "unspecified",
    value: fingerprint,
    strength: clean(value.strength) || "candidate",
  };
}

function dedupeDescriptor(fingerprint) {
  if (!fingerprint) return {
    artifact_identity_ref: null,
    candidate_ref: null,
    strength: null,
  };
  const seed = `${fingerprint.algorithm}:${fingerprint.value}`;
  const strength = fingerprint.strength;
  const strong = ["strong", "exact", "binary"].includes(strength);
  return {
    artifact_identity_ref: strong ? generatedRef("artifact", seed) : null,
    candidate_ref: strong ? null : generatedRef("artifact-candidate", seed),
    strength,
  };
}

function normalizeArtifact(value, fallbackTier) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const fingerprint = normalizeFingerprint(value.fingerprint ?? value.hash);
  const dedupe = dedupeDescriptor(fingerprint);
  const kind = clean(value.kind ?? value.type) || "artifact";
  const occurrenceRef = normalizeRef(
    value,
    "artifact-occurrence",
    `${kind}:${clean(value.name) || ""}:${clean(value.source_ref ?? value.sourceRef) || ""}:${fingerprint?.value || ""}`,
  );
  return {
    ref: occurrenceRef,
    occurrence_ref: occurrenceRef,
    artifact_identity_ref: dedupe.artifact_identity_ref,
    dedupe_candidate_ref: dedupe.candidate_ref,
    dedupe_strength: dedupe.strength,
    kind,
    media_type: clean(value.media_type ?? value.mediaType ?? value.mime_type ?? value.mimeType),
    source_ref: clean(value.source_ref ?? value.sourceRef),
    locator: value.locator ?? null,
    availability: clean(value.availability) || "available",
    replayable: value.replayable !== false,
    access: accessOf(value, fallbackTier),
    fingerprint,
  };
}

function normalizeExtraction(value, index, artifactRef, fallbackTier) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const kind = clean(value.kind ?? value.type) || "extraction";
  const content = valueOf(value);
  const ref = normalizeRef(
    value,
    "extraction",
    `${artifactRef || "no-artifact"}:${kind}:${index}:${content == null ? "" : String(content)}`,
  );
  return {
    ref,
    kind,
    content,
    status: clean(value.status) || "complete",
    source_artifact_ref: clean(value.source_artifact_ref ?? value.sourceArtifactRef) || artifactRef || null,
    locator: value.locator ?? null,
    method_ref: clean(value.method_ref ?? value.methodRef),
    version_ref: clean(value.version_ref ?? value.versionRef),
    confidence: value.confidence ?? null,
    access: accessOf(value, fallbackTier),
  };
}

function normalizeRepresentation(value, index, artifactRef, fallbackTier) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const kind = clean(value.kind ?? value.type) || "representation";
  const content = valueOf(value);
  const ref = normalizeRef(
    value,
    "repr",
    `${artifactRef || "no-artifact"}:${kind}:${index}:${content == null ? "" : String(content)}`,
  );
  const derived = value.derived_from_refs ?? value.derivedFromRefs ?? value.component_refs ?? [];
  return {
    ref,
    kind,
    content,
    extraction_ref: clean(value.extraction_ref ?? value.extractionRef),
    source_artifact_ref: clean(value.source_artifact_ref ?? value.sourceArtifactRef) || artifactRef || null,
    derived_from_refs: [...new Set((Array.isArray(derived) ? derived : []).map(clean).filter(Boolean))],
    role: clean(value.role),
    language: clean(value.language),
    script: clean(value.script),
    access: accessOf(value, fallbackTier),
  };
}

function normalizeInterpretation(value, index, artifactRef, fallbackTier) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const content = valueOf(value);
  return {
    ref: normalizeRef(
      value,
      "interpretation",
      `${artifactRef || "no-artifact"}:${index}:${content == null ? "" : String(content)}`,
    ),
    kind: clean(value.kind ?? value.type) || "user_interpretation",
    content,
    source_artifact_ref: clean(value.source_artifact_ref ?? value.sourceArtifactRef) || artifactRef || null,
    derived_from_refs: [...new Set((Array.isArray(value.derived_from_refs ?? value.derivedFromRefs)
      ? (value.derived_from_refs ?? value.derivedFromRefs)
      : []).map(clean).filter(Boolean))],
    access: accessOf(value, fallbackTier),
  };
}

function normalizeTemporal(value, fallbackTier) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return {
    occurred_at: value.occurred_at ?? value.occurredAt ?? null,
    source_time: value.source_time ?? value.sourceTime ?? null,
    input_time: value.input_time ?? value.inputTime ?? null,
    timezone: clean(value.timezone),
    uncertainty: value.uncertainty ?? null,
    provenance: value.provenance ?? null,
    access: accessOf(value, fallbackTier),
  };
}

function normalizeOrigin(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return {
    channel: clean(value.channel),
    surface: clean(value.surface),
    source_ref: clean(value.source_ref ?? value.sourceRef),
    message_ref: clean(value.message_ref ?? value.messageRef),
    external_url: clean(value.external_url ?? value.externalUrl),
  };
}

function normalizePersistence(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { mode: "ephemeral", persisted_ref: null };
  }
  return {
    mode: clean(value.mode) || "ephemeral",
    persisted_ref: clean(value.persisted_ref ?? value.persistedRef),
  };
}

function normalizeIdentityCandidates(values, fallbackTier) {
  return (Array.isArray(values) ? values : [])
    .filter(x => x && typeof x === "object" && !Array.isArray(x))
    .map(x => ({
      ...x,
      access: x.access ?? { tier: normalizeTier(x, fallbackTier) },
    }));
}

export function isResearchIntakeTransport(value) {
  return Boolean(value && typeof value === "object"
    && value.transport === "research_intake"
    && value.v === 1);
}

export function buildResearchIntakeTransport({
  rawInput = null,
  rawKind = "text",
  rawRef = null,
  sourceArtifact = null,
  extractions = [],
  representations = [],
  identityCandidates = [],
  userInterpretations = [],
  temporal = null,
  origin = null,
  persistence = null,
  accessTier = null,
} = {}) {
  if (isResearchIntakeTransport(rawInput)) return rawInput;

  const rawSpec = rawInput && typeof rawInput === "object" && !Array.isArray(rawInput)
    ? rawInput
    : { value: rawInput, kind: rawKind, ref: rawRef };
  const explicitTier = clean(
    rawSpec?.access?.tier
      ?? rawSpec?.access_tier
      ?? rawSpec?.accessTier
      ?? accessTier
      ?? sourceArtifact?.access?.tier
      ?? sourceArtifact?.access_tier
      ?? sourceArtifact?.accessTier,
  ) || "unclassified";

  const artifact = normalizeArtifact(sourceArtifact, explicitTier);
  const artifactRef = artifact?.ref || null;
  const rawValue = valueOf(rawSpec);
  const raw = rawValue == null ? null : {
    ref: clean(rawSpec?.ref ?? rawSpec?.id ?? rawRef)
      || generatedRef("input", `${clean(rawSpec?.kind ?? rawKind) || "text"}:${String(rawValue)}`),
    kind: clean(rawSpec?.kind ?? rawKind) || "text",
    value: String(rawValue),
    source_artifact_ref: artifactRef,
    access: accessOf(rawSpec, explicitTier),
  };

  const normalizedExtractions = (Array.isArray(extractions) ? extractions : [])
    .map((x, index) => normalizeExtraction(x, index, artifactRef, explicitTier))
    .filter(Boolean);
  const normalizedRepresentations = (Array.isArray(representations) ? representations : [])
    .map((x, index) => normalizeRepresentation(x, index, artifactRef, explicitTier))
    .filter(Boolean);
  const normalizedInterpretations = (Array.isArray(userInterpretations) ? userInterpretations : [])
    .map((x, index) => normalizeInterpretation(x, index, artifactRef, explicitTier))
    .filter(Boolean);

  return freezeDeep({
    v: 1,
    transport: "research_intake",
    owns_persistence: false,
    owns_truth: false,
    owns_identity: false,
    owns_capability_routing: false,
    root_access_tier: explicitTier,
    raw_input: raw,
    source_artifact: artifact,
    extractions: normalizedExtractions,
    representations: normalizedRepresentations,
    identity_candidates: normalizeIdentityCandidates(identityCandidates, explicitTier),
    user_interpretations: normalizedInterpretations,
    temporal: normalizeTemporal(temporal, explicitTier),
    origin: normalizeOrigin(origin),
    persistence: normalizePersistence(persistence),
  });
}

export function ensureResearchIntakeTransport(value) {
  if (!value) return null;
  return isResearchIntakeTransport(value) ? value : buildResearchIntakeTransport(value);
}

function allowedTiers(accessDescriptor) {
  return new Set(normalizeAccessDescriptor(accessDescriptor).allowed_access_tiers || ["public"]);
}

function tierDecision(tier, accessDescriptor) {
  const normalized = clean(tier) || "unclassified";
  const allowed = allowedTiers(accessDescriptor);
  if (normalized === "public") return { allowed: true, tier: normalized, reason: null };
  if (normalized === "unclassified") {
    return { allowed: false, tier: normalized, reason: "intake_access_unclassified" };
  }
  if (!RESTRICTED_TIERS.has(normalized)) {
    return { allowed: false, tier: normalized, reason: `intake_access_unknown_tier:${normalized}` };
  }
  if (!allowed.has(normalized)) {
    return { allowed: false, tier: normalized, reason: `intake_access_tier_not_permitted:${normalized}` };
  }
  return { allowed: true, tier: normalized, reason: null };
}

export function researchIntakeAccessDecision(intake, accessDescriptor) {
  const transport = ensureResearchIntakeTransport(intake);
  if (!transport) return { allowed: true, reasons: [], denied_refs: [] };

  const checks = [];
  const add = (ref, access) => {
    if (!ref) return;
    checks.push({ ref, ...tierDecision(access?.tier, accessDescriptor) });
  };

  add(transport.raw_input?.ref, transport.raw_input?.access);
  add(transport.source_artifact?.ref, transport.source_artifact?.access);
  for (const item of transport.extractions || []) add(item.ref, item.access);
  for (const item of transport.representations || []) add(item.ref, item.access);
  for (const item of transport.user_interpretations || []) add(item.ref, item.access);
  for (const [index, item] of (transport.identity_candidates || []).entries()) {
    add(
      clean(item?.ref ?? item?.identity_key ?? item?.identityKey ?? item?.id) || `identity-candidate:${index}`,
      item?.access,
    );
  }
  if (transport.temporal) add("temporal", transport.temporal.access);

  const denied = checks.filter(x => !x.allowed);
  return {
    allowed: denied.length === 0,
    reasons: [...new Set(denied.map(x => x.reason).filter(Boolean))],
    denied_refs: denied.map(x => x.ref),
  };
}

function safeRef(ref, access, accessDescriptor) {
  const value = clean(ref);
  if (!value) return null;
  const decision = tierDecision(access?.tier, accessDescriptor);
  return decision.allowed ? value : `anon:${stableIdentityDigest(value)}`;
}

function projectItem(item, accessDescriptor, fields = []) {
  if (!item) return null;
  const decision = tierDecision(item.access?.tier, accessDescriptor);
  const out = {
    ref: safeRef(item.ref, item.access, accessDescriptor),
    kind: item.kind ?? null,
    access_tier: item.access?.tier ?? "unclassified",
    redacted: !decision.allowed,
  };
  for (const field of fields) {
    if (!(field in item)) continue;
    if (field.endsWith("_ref")) {
      out[field] = safeRef(item[field], item.access, accessDescriptor);
    } else if (decision.allowed) {
      out[field] = item[field];
    }
  }
  return out;
}

export function projectResearchIntakeLineage(intake, accessDescriptor) {
  const transport = ensureResearchIntakeTransport(intake);
  if (!transport) return null;
  const decision = researchIntakeAccessDecision(transport, accessDescriptor);
  const artifact = transport.source_artifact;
  const artifactDecision = artifact ? tierDecision(artifact.access?.tier, accessDescriptor) : null;

  return {
    v: 1,
    transport: "research_intake",
    access_allowed_for_execution: decision.allowed,
    access_reasons: decision.reasons,
    raw_input: transport.raw_input ? {
      ref: safeRef(transport.raw_input.ref, transport.raw_input.access, accessDescriptor),
      kind: transport.raw_input.kind,
      access_tier: transport.raw_input.access?.tier ?? "unclassified",
      redacted: !tierDecision(transport.raw_input.access?.tier, accessDescriptor).allowed,
    } : null,
    source_artifact: artifact ? {
      ref: safeRef(artifact.ref, artifact.access, accessDescriptor),
      occurrence_ref: safeRef(artifact.occurrence_ref, artifact.access, accessDescriptor),
      artifact_identity_ref: artifact.artifact_identity_ref,
      dedupe_candidate_ref: artifact.dedupe_candidate_ref,
      dedupe_strength: artifact.dedupe_strength,
      kind: artifact.kind,
      media_type: artifactDecision?.allowed ? artifact.media_type : null,
      availability: artifact.availability,
      replayable: artifact.replayable,
      access_tier: artifact.access?.tier ?? "unclassified",
      redacted: !artifactDecision?.allowed,
    } : null,
    extractions: (transport.extractions || []).map(x => projectItem(
      x,
      accessDescriptor,
      ["status", "source_artifact_ref", "method_ref", "version_ref"],
    )),
    representations: (transport.representations || []).map(x => projectItem(
      x,
      accessDescriptor,
      ["extraction_ref", "source_artifact_ref", "role", "language", "script"],
    )),
    user_interpretations: (transport.user_interpretations || []).map(x => projectItem(
      x,
      accessDescriptor,
      ["source_artifact_ref"],
    )),
    temporal: transport.temporal ? (() => {
      const temporalDecision = tierDecision(transport.temporal.access?.tier, accessDescriptor);
      return temporalDecision.allowed ? {
        occurred_at: transport.temporal.occurred_at,
        source_time: transport.temporal.source_time,
        input_time: transport.temporal.input_time,
        timezone: transport.temporal.timezone,
        uncertainty: transport.temporal.uncertainty,
        access_tier: transport.temporal.access?.tier ?? "unclassified",
        redacted: false,
      } : {
        present: true,
        access_tier: transport.temporal.access?.tier ?? "unclassified",
        redacted: true,
      };
    })() : null,
    origin: transport.origin ? {
      channel: transport.origin.channel,
      surface: transport.origin.surface,
    } : null,
    persistence: {
      mode: transport.persistence?.mode || "ephemeral",
      persisted_ref: safeRef(
        transport.persistence?.persisted_ref,
        { tier: transport.root_access_tier },
        accessDescriptor,
      ),
    },
  };
}

export function rawInputForIntakeOutput(intake, accessDescriptor) {
  const transport = ensureResearchIntakeTransport(intake);
  if (!transport?.raw_input) return null;
  return tierDecision(transport.raw_input.access?.tier, accessDescriptor).allowed
    ? transport.raw_input.value
    : null;
}

export function questionForIntakeOutput(question, intake, accessDescriptor) {
  const transport = ensureResearchIntakeTransport(intake);
  const raw = transport?.raw_input?.value;
  if (!raw) return clean(question);
  if (tierDecision(transport.raw_input.access?.tier, accessDescriptor).allowed) return clean(question);
  const q = clean(question);
  if (!q) return null;
  return q.includes(String(raw)) ? null : q;
}

export default buildResearchIntakeTransport;
