import { composeNameLabNormalizedEvidenceBundle } from "./nameLabFinding.js";
import {
  composeNormalizedMessageReflection,
  createSupabaseThreeCardProvider,
} from "./normalizedMessageReflection.js";
import { toRazielMessageReflectionPayload } from "./normalizedMessageReflectionProjection.js";
import { SYNTHESIS_STATUS } from "./researchSynthesis.js";

// G3_NAMELAB_NORMALIZED_REFLECTION_RUNTIME_V1 — truth-safe runtime composition seam from live
// NameLab evidence to normalized motifs + frozen message + exact 3-card reflection + post-freeze
// coherence check. No UI mount here; the live provider binder at the bottom reuses existing
// getNameMulti/getAiAnalysis/fn_tarot_sos without creating a parallel engine.

export const NAME_LAB_REFLECTION_RUNTIME_VERSION = "name-lab-reflection-runtime-v1";

export const NAME_LAB_REFLECTION_FAILURE_REASON = Object.freeze({
  INVALID_NAME: "invalid_name",
  ZERO_FINDINGS: "zero_findings",
  AI_UNAVAILABLE: "ai_unavailable",
});

const clean = (value) => {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
};

const slug = (value, fallback = "motif") => {
  const text = clean(value) || fallback;
  return text
    .toLocaleLowerCase("he")
    .replace(/[^\u0590-\u05ff\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || fallback;
};

export function extractNameLabTrackLists(nameMultiResult) {
  const res = nameMultiResult;
  if (!res || typeof res !== "object") return [];
  const graded = res.graded === true;
  if (graded) {
    const sourceTracks = Array.isArray(res.sources) ? res.sources.map((s) => s?.doc?.tracks) : [];
    const comboTracks = (Array.isArray(res.combo?.tracks) ? res.combo.tracks : [])
      .filter((t) => t?.id === "combo_gem" || t?.id === "variants");
    return [...sourceTracks, comboTracks];
  }
  return [Array.isArray(res.tracks) ? res.tracks : []];
}

function nameLabFindingWord(finding) {
  const fact = Array.isArray(finding?.evidence?.facts) ? finding.evidence.facts[0] : null;
  if (!fact) return null;
  return clean(fact.phrase) || clean(fact.word) || clean(fact.form) || null;
}

const DEFAULT_MAX_FACT_LINES = 40;

export function buildNameLabBoundedFacts(name, findings, { maxLines = DEFAULT_MAX_FACT_LINES } = {}) {
  const label = clean(name) || "?";
  const list = Array.isArray(findings) ? findings : [];
  const lines = list.slice(0, maxLines).map((finding) => {
    const family = clean(finding?.projection?.dimensions?.name_lab_family) || "other";
    const quality = clean(finding?.projection?.dimensions?.quality) || "unknown";
    const word = nameLabFindingWord(finding) || "?";
    const verificationState = clean(finding?.verification?.verification_state) || "unknown";
    return `- [${clean(finding?.id) || "?"}] family=${family} word="${word}" quality=${quality} verification=${verificationState}`;
  });
  const truncatedNote = list.length > maxLines
    ? `\n(+${list.length - maxLines} additional engine Findings not shown)`
    : "";
  return `ביטוי נחקר (word/expression — לא קביעה על אדם/זהות): ${label}\n`
    + "ממצאי-מנוע (name_lab Findings) — כל שורה תוצר-מנוע עם מגבלת-אימות משלו, לא עובדת-אמת סגורה:\n"
    + `${lines.join("\n")}${truncatedNote}`;
}

function normalizeAiInterpretation(raw) {
  if (typeof raw === "string") return { message: clean(raw), motifs: [] };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { message: null, motifs: [] };
  const message = clean(raw.message || raw.analysis || raw.text);
  const motifs = (Array.isArray(raw.motifs) ? raw.motifs : []).map((motif, index) => ({
    key: clean(motif?.key) || `motif-${index + 1}`,
    label: clean(motif?.label),
    summary: clean(motif?.summary),
    finding_ids: Array.isArray(motif?.finding_ids)
      ? motif.finding_ids.map(clean).filter(Boolean)
      : Array.isArray(motif?.findingIds) ? motif.findingIds.map(clean).filter(Boolean) : [],
    frame: motif?.frame && typeof motif.frame === "object" && !Array.isArray(motif.frame)
      ? {
          essence: clean(motif.frame.essence),
          power: clean(motif.frame.power),
          shadow: clean(motif.frame.shadow),
          balance: clean(motif.frame.balance),
          action: clean(motif.frame.action),
        }
      : {},
  }));
  return { message, motifs };
}

function familyFallback(findings) {
  const byFamily = new Map();
  for (const finding of Array.isArray(findings) ? findings : []) {
    const family = clean(finding?.projection?.dimensions?.name_lab_family) || "other";
    if (!byFamily.has(family)) byFamily.set(family, []);
    byFamily.get(family).push(finding);
  }
  return [...byFamily.entries()].map(([family, group]) => ({
    key: family,
    label: family,
    summary: null,
    finding_ids: group.map((finding) => clean(finding?.id)).filter(Boolean),
    frame: {},
  }));
}

/**
 * AI may propose interpretation motifs, but only motifs backed by real bundle Finding IDs survive.
 * If the current provider returns the legacy string-only analysis, the runtime falls back to
 * source-family motifs so the normalized contract is never empty. No motif changes calculation
 * truth or evidence weight.
 */
export function composeNameLabEvidenceBackedSynthesisDraft({
  findings,
  aiMessage,
  aiMotifs = [],
  frozenAt = null,
} = {}) {
  const list = Array.isArray(findings) ? findings : [];
  const allowed = new Set(list.map((finding) => clean(finding?.id)).filter(Boolean));

  const proposed = (Array.isArray(aiMotifs) ? aiMotifs : []).map((motif) => ({
    ...motif,
    finding_ids: [...new Set((Array.isArray(motif?.finding_ids) ? motif.finding_ids : [])
      .map(clean).filter((id) => id && allowed.has(id)))],
  })).filter((motif) => motif.finding_ids.length > 0);

  const motifInputs = proposed.length ? proposed : familyFallback(list);
  const claims = [];
  const motifs = [];

  for (const motif of motifInputs) {
    const key = slug(motif.key || motif.label);
    const claimId = `name_lab-claim-${key}`;
    const supportedFindings = motif.finding_ids
      .map((id) => list.find((finding) => clean(finding?.id) === id))
      .filter(Boolean);
    const words = [...new Set(supportedFindings.map(nameLabFindingWord).filter(Boolean))];
    const sample = words.slice(0, 5).join(", ") || "—";
    const label = clean(motif.label) || clean(motif.key) || key;
    const summary = clean(motif.summary);

    claims.push({
      id: claimId,
      text: summary
        ? `מוטיב ${label}: ${summary} (מבוסס על ${supportedFindings.length} Findings; לדוגמה: ${sample}).`
        : `מוטיב ${label}: ${supportedFindings.length} Findings — לדוגמה: ${sample}. תוצר-נרמול; לא טענת-אמת סגורה.`,
      role: proposed.length ? "interpretive_motif" : "engine_finding_summary",
      motif_key: key,
      support: {
        finding_ids: motif.finding_ids,
        dependency_groups: [...new Set(supportedFindings
          .map((finding) => clean(finding?.projection?.dimensions?.name_lab_family))
          .filter(Boolean))],
      },
    });

    motifs.push({
      key,
      label,
      summary,
      claim_ids: [claimId],
      frame: motif.frame || {},
    });
  }

  return {
    status: SYNTHESIS_STATUS.COMPOSED,
    message: clean(aiMessage),
    claims,
    motifs,
    freeze: {
      frozen: true,
      frozen_at: clean(frozenAt) || new Date().toISOString(),
      policy_version: NAME_LAB_REFLECTION_RUNTIME_VERSION,
    },
    provenance: { source_refs: ["name_lab"], version_refs: [NAME_LAB_REFLECTION_RUNTIME_VERSION] },
  };
}

function failedClosed(reason) {
  return Object.freeze({
    version: NAME_LAB_REFLECTION_RUNTIME_VERSION,
    status: "failed_closed",
    reason,
    payload: null,
  });
}

export async function runNameLabReflectionRuntime({
  name,
  surname = null,
  birthdate = null,
  question = null,
  nameMultiProvider,
  aiAnalysisProvider,
  tarotProvider,
  now = () => new Date().toISOString(),
} = {}) {
  if (typeof nameMultiProvider !== "function") {
    throw new TypeError("nameLabReflectionRuntime: nameMultiProvider function is required");
  }
  if (typeof aiAnalysisProvider !== "function") {
    throw new TypeError("nameLabReflectionRuntime: aiAnalysisProvider function is required");
  }
  if (typeof tarotProvider !== "function") {
    throw new TypeError("nameLabReflectionRuntime: tarotProvider function is required");
  }

  const first = clean(name);
  const last = clean(surname);
  const label = [first, last].filter(Boolean).join(" ");
  if (!label) return failedClosed(NAME_LAB_REFLECTION_FAILURE_REASON.INVALID_NAME);

  // Personal fields may select/shape the canonical NameLab run, but are intentionally NOT copied
  // into bounded AI facts. The AI receives only bundle-backed Findings about the expression.
  const nameMultiResult = await nameMultiProvider(first, {
    surname: last,
    birthdate: clean(birthdate),
    question: clean(question),
  });
  const trackLists = extractNameLabTrackLists(nameMultiResult);
  const bundle = composeNameLabNormalizedEvidenceBundle({ name: label, trackLists });
  const findings = Array.isArray(bundle?.findings) ? bundle.findings : [];

  if (findings.length === 0) return failedClosed(NAME_LAB_REFLECTION_FAILURE_REASON.ZERO_FINDINGS);

  const facts = buildNameLabBoundedFacts(label, findings);
  const rawInterpretation = await aiAnalysisProvider({
    kind: "name_lab",
    subject: label,
    facts,
    operation: "normalized_reflection",
  });
  const interpretation = normalizeAiInterpretation(rawInterpretation);

  if (!interpretation.message) return failedClosed(NAME_LAB_REFLECTION_FAILURE_REASON.AI_UNAVAILABLE);

  const frozenAt = now();
  const synthesizer = async () => composeNameLabEvidenceBackedSynthesisDraft({
    findings,
    aiMessage: interpretation.message,
    aiMotifs: interpretation.motifs,
    frozenAt,
  });

  const result = await composeNormalizedMessageReflection({
    trackLists,
    bundle,
    synthesizer,
    tarotProvider,
    frozenAt,
  });
  const payload = toRazielMessageReflectionPayload(result);

  return Object.freeze({
    version: NAME_LAB_REFLECTION_RUNTIME_VERSION,
    status: "ok",
    reason: null,
    payload,
  });
}

/**
 * Non-UI root binder. This is the missing wiring seam: existing product providers are bound once
 * to the pure runtime without mounting any renderer or introducing a new endpoint/engine.
 */
export function createNameLabReflectionRuntimeProviders({
  getNameMulti,
  getAiAnalysis,
  supabase,
} = {}) {
  if (typeof getNameMulti !== "function") {
    throw new TypeError("nameLabReflectionRuntime: getNameMulti function is required");
  }
  if (typeof getAiAnalysis !== "function") {
    throw new TypeError("nameLabReflectionRuntime: getAiAnalysis function is required");
  }
  return Object.freeze({
    nameMultiProvider: (name, opts) => getNameMulti(name, opts),
    aiAnalysisProvider: (args) => getAiAnalysis({
      ...args,
      fast: false,
      long: true,
      surface: "research:name-lab-reflection",
    }),
    tarotProvider: createSupabaseThreeCardProvider(supabase),
  });
}

export default runNameLabReflectionRuntime;
