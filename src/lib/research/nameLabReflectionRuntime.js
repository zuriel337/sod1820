import { composeNameLabNormalizedEvidenceBundle } from "./nameLabFinding.js";
import { composeNormalizedMessageReflection } from "./normalizedMessageReflection.js";
import { toRazielMessageReflectionPayload } from "./normalizedMessageReflectionProjection.js";
import { SYNTHESIS_STATUS } from "./researchSynthesis.js";

// G3_NAMELAB_NORMALIZED_REFLECTION_RUNTIME_V1 — truth-safe runtime composition seam from live
// NameLab evidence to the already-released normalized frozen message + exact 3-card reflection
// (normalizedMessageReflection.js / normalizedMessageReflectionProjection.js). No UI mount here.
//
// EXTEND_EXISTING only: this module researches/computes nothing itself. It orders and bounds
// calls to capabilities that already exist, all supplied by the caller (pure/injectable):
//   nameMultiProvider(name)   -> raw getNameMulti(name) result shape (name-as-word ONLY — no
//                                surname/birthdate/question is ever accepted by this runtime)
//   aiAnalysisProvider(args)  -> getAiAnalysis({kind:"name_lab", ...}) — returns interpretation
//                                MESSAGE only; never asked to compute claims/evidence
//   tarotProvider()           -> createSupabaseThreeCardProvider(supabase) — fn_tarot_sos(3)
//
// Fail-closed order (load-bearing, matches assignment G3_NAMELAB_NORMALIZED_REFLECTION_RUNTIME_V1):
//   1. Build the Result Bundle first (Universal Findings only).
//   2. Zero Findings -> fail closed BEFORE any AI/Tarot call.
//   3. Bounded facts built ONLY from allowlisted Universal Finding source-native evidence.
//   4. AI failure/quota/null -> zero Tarot draws, fail closed (no synthesis is ever attempted).
//   5. Only a runtime-composed, explicitly-frozen synthesis (claims backed by real Finding ids,
//      never by the AI) may unlock composeNormalizedMessageReflection's own Tarot draw — that
//      ordering guarantee already lives in normalizedMessageReflection.js and is reused as-is.
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

/**
 * One shared helper for the exact graded-sources/combo vs ungraded-tracks split that
 * NameMultiSearch already performs before calling aggregateFindings() (src/components/
 * NameMultiSearch.jsx). Kept internal to the research layer per assignment scope: the existing
 * UI component is left untouched (zero behavior change), and no second copy of this split is
 * created elsewhere — this is the one place a new caller needs it.
 *
 * @param {object|null} nameMultiResult raw getNameMulti(name) result
 * @returns {Array<Array<object>>} array-of-track-arrays, same shape aggregateFindings/
 *   nameLabTrackListsToUniversalFindings already take
 */
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

/**
 * Bounded facts for the AI call — built ONLY from the Universal Findings already in the
 * allowlisted Result Bundle. Never reads surname/birthdate/question/private context: those are
 * never accepted by nameLabTrackListsToUniversalFindings in the first place (contract §11), so a
 * Finding structurally cannot carry them here.
 */
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
  return `מילה נחקרת (word — לא אדם/זהות): ${label}\n`
    + `ממצאי-מנוע (name_lab Findings) — כל שורה תוצר-מנוע עם מגבלת-אימות משלו, לא עובדת-אמת סגורה:\n`
    + `${lines.join("\n")}${truncatedNote}`;
}

/**
 * Bounded, evidence-backed synthesis draft — built by the runtime itself, never by the AI. Every
 * claim's support.finding_ids references real ids already present in the bundle so
 * normalizeResearchSynthesis's own allowlist check (researchSynthesis.js) enforces this at
 * composition time. message = the AI's interpretation text, verbatim, as the ONLY AI-authored
 * field. freeze.frozen is set explicitly true here (never defaulted) so
 * normalizedMessageReflection.js's requireExplicitFreezeIntent guard can unlock the Tarot draw.
 */
export function composeNameLabEvidenceBackedSynthesisDraft({ findings, aiMessage, frozenAt = null } = {}) {
  const list = Array.isArray(findings) ? findings : [];
  const byFamily = new Map();
  for (const finding of list) {
    const family = clean(finding?.projection?.dimensions?.name_lab_family) || "other";
    if (!byFamily.has(family)) byFamily.set(family, []);
    byFamily.get(family).push(finding);
  }

  const claims = [...byFamily.entries()].map(([family, group]) => {
    const words = [...new Set(group.map(nameLabFindingWord).filter(Boolean))];
    const sample = words.slice(0, 5).join(", ") || "—";
    return {
      id: `name_lab-claim-${family}`,
      text: `משפחת ${family}: ${group.length} ממצאי-מנוע (Findings) — לדוגמה: ${sample}. תוצר-מנוע עם מגבלת-אימות משלו; לא טענת-אמת סגורה.`,
      role: "engine_finding_summary",
      motif_key: family,
      support: { finding_ids: group.map((finding) => clean(finding?.id)).filter(Boolean) },
    };
  });

  return {
    status: SYNTHESIS_STATUS.COMPOSED,
    message: clean(aiMessage),
    claims,
    motifs: [],
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

/**
 * The runtime composition seam itself. Every capability is injected so this stays pure/testable —
 * it never imports supabase.js/getNameMulti/getAiAnalysis directly (no UI mount, no live wiring
 * in this task; a future caller binds the live providers).
 *
 * @param {object} args
 * @param {string} args.name researched name-as-word (no surname/birthdate/question)
 * @param {(name: string) => Promise<object|null>} args.nameMultiProvider
 * @param {(args: {kind: "name_lab", subject: string, facts: string}) => Promise<string|null>} args.aiAnalysisProvider
 * @param {() => Promise<object>} args.tarotProvider fn_tarot_sos(3) provider, e.g.
 *   createSupabaseThreeCardProvider(supabase) from normalizedMessageReflection.js
 * @param {() => string} [args.now] injectable clock for frozen_at, defaults to new Date().toISOString()
 */
export async function runNameLabReflectionRuntime({
  name,
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

  const label = clean(name);
  if (!label) return failedClosed(NAME_LAB_REFLECTION_FAILURE_REASON.INVALID_NAME);

  // 1) Result Bundle first — Universal Findings only, name-as-word lane.
  const nameMultiResult = await nameMultiProvider(label);
  const trackLists = extractNameLabTrackLists(nameMultiResult);
  const bundle = composeNameLabNormalizedEvidenceBundle({ name: label, trackLists });
  const findings = Array.isArray(bundle?.findings) ? bundle.findings : [];

  // 2) Zero Findings -> fail closed BEFORE any AI/Tarot call.
  if (findings.length === 0) return failedClosed(NAME_LAB_REFLECTION_FAILURE_REASON.ZERO_FINDINGS);

  // 3) Bounded facts ONLY from allowlisted Universal Finding evidence.
  const facts = buildNameLabBoundedFacts(label, findings);
  const aiMessage = clean(await aiAnalysisProvider({ kind: "name_lab", subject: label, facts }));

  // 4) AI null/quota/error -> zero Tarot draws, fail closed.
  if (!aiMessage) return failedClosed(NAME_LAB_REFLECTION_FAILURE_REASON.AI_UNAVAILABLE);

  const frozenAt = now();
  const synthesizer = async () => composeNameLabEvidenceBackedSynthesisDraft({ findings, aiMessage, frozenAt });

  // 5) composeNormalizedMessageReflection enforces normalize-before-synthesis and
  // synthesis-freeze-before-tarot itself; tarotProvider is only ever called after that.
  const result = await composeNormalizedMessageReflection({ trackLists, bundle, synthesizer, tarotProvider, frozenAt });
  const payload = toRazielMessageReflectionPayload(result);

  return Object.freeze({
    version: NAME_LAB_REFLECTION_RUNTIME_VERSION,
    status: "ok",
    reason: null,
    payload,
  });
}

export default runNameLabReflectionRuntime;
