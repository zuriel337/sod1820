import { normalizeResearchDisplayText } from "./researchObjectPresentation.js";

// Source Bundle projection v1 — PRESENTATION-ONLY grouping of already-governed Universal Findings.
//
// Pure. Never queries. Consumes Universal Findings that have ALREADY passed the
// Result Bundle access boundary, so a private Finding that was filtered out can never
// be revealed or counted here. It mints no Finding / Node / Research Object identity,
// carries no ranking or truth score, and group membership is NOT independent evidence.
//
// Source attribution header comes from supplied source-occurrence metadata only and is
// never copied into child Finding provenance (attribution is per-object, non-inherited).

const clean = (value) => (value == null ? "" : String(value).trim());
const uniq = (values) => [...new Set((Array.isArray(values) ? values : []).map(clean).filter(Boolean))];

export function canonicalResearchSourceRef(value) {
  const ref = clean(value);
  if (!ref) return null;
  // Projection mirror of DB owner fn_research_source_uid(text): strip ONLY proven
  // ingestion ordinals. Semantic fragments such as #interpretation remain identity.
  return ref.replace(/#(?:batch|a)\d+$/i, "").toLowerCase();
}

const SOURCE_METHOD_PATTERNS = Object.freeze([
  { token: "מילוי דמילוי גדול", methodKey: "מילוי דמילוי גדול", re: /מילוי\s+דמילוי\s+גדול/u },
  { token: "מילוי דמילוי", methodKey: "מילוי דמילוי", re: /מילוי\s+דמילוי/u },
  { token: "מילוי בלבד גדול", methodKey: "מילוי בלבד גדול", re: /מילוי\s+בלבד\s+גדול/u },
  { token: "מילוי בלבד", methodKey: "מילוי בלבד", re: /מילוי\s+בלבד/u },
  { token: "מילוי גדול", methodKey: "מילוי גדול", re: /מילוי\s+גדול/u },
  { token: "מילוי", methodKey: "מילוי", re: /מילוי/u },
  { token: "משולש מילה", methodKey: "משולש מילה", re: /משולש\s+מילה/u },
  { token: "משולש הפוך", methodKey: "משולש הפוך", re: /משולש\s+הפוך/u },
  { token: "משולש מדרגות", methodKey: "משולש מדרגות", re: /משולש\s+מדרגות/u },
  { token: "ריבוע", methodKey: "ריבוע", re: /ריבוע/u },
  { token: "סידורי", methodKey: "סידורי", re: /סידורי/u },
  { token: "מסתתר", methodKey: "מסתתר", re: /(?:גימטר(?:יא|יה)|שיטת?)\s+מסתתר/u },
  { token: "אתבש", methodKey: "אתבש", re: /אתב["״']?ש/u },
  { token: "אלבם", methodKey: "אלבם", re: /אלב["״']?ם/u },
  { token: "אטבח", methodKey: "אטבח", re: /אטב["״']?ח/u },
  { token: "איק בכר", methodKey: "איק בכר", re: /אי["״']?ק\s+בכ["״']?ר/u },
  { token: "אות רבתי", methodKey: "אות רבתי", re: /אות\s+רבתי/u },
  { token: "מיקום האות", methodKey: "מיקום האות", re: /מיקום\s+האות/u },
]);

const MILUY_VARIANTS = Object.freeze([
  { token: "מילוי ע״ב", re: /מילוי[^\n.!?]{0,40}(?:ע["״']?ב|שם\s*ע["״']?ב)/u },
  { token: "מילוי ס״ג", re: /מילוי[^\n.!?]{0,40}(?:ס["״']?ג|שם\s*ס["״']?ג)/u },
  { token: "מילוי מ״ה", re: /מילוי[^\n.!?]{0,40}(?:מ["״']?ה|שם\s*מ["״']?ה)/u },
  { token: "מילוי ב״ן", re: /מילוי[^\n.!?]{0,40}(?:ב["״']?ן|שם\s*ב["״']?ן)/u },
]);

export function researchSourceOccurrenceKey(value) {
  const ref = canonicalResearchSourceRef(value);
  if (!ref) return null;
  // A source occurrence is the underlying source item, not a finding/sub-locus fragment.
  // Preserve the full ref separately for provenance/claim identity.
  const match = ref.match(/^((?:channel_updates|wa_bot_log|gallery_images|posts):[^#]+)(?:#.*)?$/i);
  return match?.[1] || ref;
}

export function sourceOccurrenceMethodMentions(value, { registryRows = [] } = {}) {
  const text = value == null ? "" : String(value);
  if (!text.trim()) return [];
  const registry = new Map((Array.isArray(registryRows) ? registryRows : [])
    .filter((row) => clean(row?.method_key))
    .map((row) => [clean(row.method_key), row]));
  const out = [];
  const add = ({ token, methodKey = null, variant = false }) => {
    if (!token || out.some((row) => row.token === token)) return;
    const registered = methodKey ? registry.get(methodKey) || null : null;
    const state = registered
      ? (registered.in_engine === true && registered.active !== false
        ? "registry_supported_unlinked"
        : "registry_registered_not_engine")
      : (variant ? "source_attested_variant_unregistered" : "source_attested_unresolved");
    out.push({
      token,
      methodKey: clean(registered?.method_key) || methodKey,
      displayLabel: clean(registered?.display_label) || token,
      state,
      sourceAttested: true,
      appliesToFinding: false,
    });
  };

  let hasMiluyVariant = false;
  for (const pattern of MILUY_VARIANTS) {
    if (pattern.re.test(text)) {
      hasMiluyVariant = true;
      add({ token: pattern.token, variant: true });
    }
  }
  for (const pattern of SOURCE_METHOD_PATTERNS) {
    if (pattern.token === "מילוי" && hasMiluyVariant) continue;
    if (pattern.re.test(text)) add(pattern);
  }
  if (/גימטר(?:יא|יה)\s+אחורית/u.test(text) || /הארה\s+אחורית/u.test(text)) {
    add({ token: "אחורית" });
  }
  if (/גימטר(?:יא|יה)\s+קדמית/u.test(text) || /הארה\s+קדמית/u.test(text)) {
    add({ token: "קדמית" });
  }
  if (/גימטר(?:יא|יה)\s+רגילה/u.test(text)) {
    add({ token: "רגיל", methodKey: "רגיל" });
  }
  return out;
}

export const SOURCE_BUNDLE_INVARIANT =
  "Source-group membership is not independent evidence. Findings stay independent; the header is source provenance, not child attribution.";

// Presentation order of the research move. Not a truth or rank order.
export const SOURCE_BUNDLE_MOVE = ["calculation", "fact", "relation", "observation", "interpretation", "other"];
const MOVE_BY_KIND = {
  fact: "fact",
  relation: "relation",
  observation: "observation",
  hypothesis: "interpretation",
  question: "interpretation",
};

// A generic fact is a calculation only when the Finding carries explicit method/calculation
// owner evidence. A numeric value alone is insufficient. Presentation only — never truth/rank.
function hasCalculationOwnerEvidence(finding) {
  const v = finding?.verification || {};
  const s = finding?.source || {};
  return Boolean(clean(v.claimed_method) || clean(v.engine_method_tested) || clean(s.engine) || clean(s.method));
}

export function sourceBundleMoveFor(finding) {
  const kind = clean(finding?.projection?.dimensions?.researchObjectKind);
  if (kind === "fact" && hasCalculationOwnerEvidence(finding)) return "calculation";
  return MOVE_BY_KIND[kind] || "other";
}

function safeMs(value) {
  const ms = Date.parse(value || "");
  return Number.isFinite(ms) ? ms : null;
}

// Header: source_author (from occurrence contributor) or source_work (publication family).
// Uploader / governance actors are deliberately not read.
function resolveHeader(occurrence) {
  if (!occurrence || typeof occurrence !== "object") return null;
  const contributorId = clean(occurrence.contributorId);
  const contributorName = clean(occurrence.contributorName);
  if (contributorId) {
    return {
      type: "source_author",
      contributorId,
      label: contributorName || null,
      attributionState: "resolved",
    };
  }
  if (contributorName) {
    return {
      type: "source_attribution_unresolved",
      contributorId: null,
      label: contributorName,
      attributionState: "unresolved",
      note: "זהות המחבר לא הוכרעה",
    };
  }
  const work = clean(occurrence.sourceWork);
  if (work) return { type: "source_work", contributorId: null, label: work, attributionState: "not_applicable" };
  return null;
}

// Source-work fallback: a Finding's own source.corpus is a human work label only when it is not
// a technical/internal token. Technical or unknown => null (UI fallback). Never author.
const TECHNICAL_CORPUS = /(^|[\s_:./-])(channel_updates|uploaded_docx|research_objects?|work_log|engine|adapter|internal|api|rpc|import|upload(ed)?|docx)([\s_:./-]|$)/i;
export function humanSourceCorpusLabel(corpus) {
  const text = clean(corpus);
  if (!text || text.length > 120) return null;
  if (/^[a-z]+:\/\//i.test(text) || /^(www\.)/i.test(text)) return null;
  if (!/\p{L}/u.test(text)) return null;
  if (TECHNICAL_CORPUS.test(text)) return null;
  if (/^[\w:.#/-]+$/.test(text) && /[_:./#]/.test(text)) return null; // single machine token
  return text;
}

function stableCorpusHeader(findings) {
  const labels = new Set();
  for (const f of findings) {
    const raw = clean(f?.source?.corpus);
    if (!raw) continue;
    const human = humanSourceCorpusLabel(raw);
    if (!human) return null;
    labels.add(human);
  }
  return labels.size === 1 ? { type: "source_work", contributorId: null, label: [...labels][0], attributionState: "not_applicable" } : null;
}

function summarize(finding) {
  const dims = finding.projection?.dimensions || {};
  const presentation = finding?.view?.rendererHints?.presentation || {};
  return {
    id: finding.id,
    kind: clean(dims.researchObjectKind) || null,
    move: sourceBundleMoveFor(finding),
    label: clean(finding.subject?.label) || null,
    value: finding.subject?.value ?? null,
    verificationState: finding.verification?.verification_state ?? null,
    status: finding.status ?? null,
    createdBy: finding.provenance?.createdBy ?? null,
    createdAt: finding.provenance?.createdAt ?? null,
    presentation: {
      title: clean(presentation.title) || clean(finding.subject?.label) || null,
      summary: clean(presentation.summary) || null,
      typeLabel: clean(presentation.typeLabel) || null,
      sourceLabel: clean(presentation.sourceLabel) || null,
      contextLine: clean(presentation.contextLine) || null,
      attributionLabel: clean(presentation.attributionLabel) || null,
      attributionState: clean(presentation.attributionState) || null,
      occurrenceLabel: clean(presentation.occurrenceLabel) || null,
      dateLabel: clean(presentation.dateLabel) || null,
      fallbackMode: clean(presentation.fallbackMode) || null,
    },
  };
}

/**
 * @param {Array} findings already access-filtered Universal Findings
 * @param {{occurrences?: Record<string, object>}} options occurrences keyed by sourceRef:
 *   { contributorId, contributorName, sourceWork, createdAt, ...bounded metadata }
 */
export function buildSourceBundles(findings, { occurrences = {} } = {}) {
  const seen = new Set();
  const groups = new Map();
  for (const finding of Array.isArray(findings) ? findings : []) {
    if (!finding?.id || seen.has(finding.id)) continue;
    seen.add(finding.id);
    const rawSourceRef = clean(finding.source?.sourceRef) || null;
    const sourceIdentityRef = canonicalResearchSourceRef(rawSourceRef);
    const sourceRef = researchSourceOccurrenceKey(rawSourceRef);
    const key = sourceRef || `finding:${finding.id}`;
    if (!groups.has(key)) groups.set(key, { key, sourceRef, sourceIdentityRefs: new Set(), rawSourceRefs: new Set(), findings: [] });
    if (sourceIdentityRef) groups.get(key).sourceIdentityRefs.add(sourceIdentityRef);
    if (rawSourceRef) groups.get(key).rawSourceRefs.add(rawSourceRef);
    groups.get(key).findings.push(finding);
  }

  return [...groups.values()].map((group) => {
    const occurrence = (group.sourceRef && occurrences?.[group.sourceRef])
      || [...(group.rawSourceRefs || [])].map((ref) => occurrences?.[ref]).find(Boolean)
      || null;
    const members = group.findings
      .map(summarize)
      .sort((a, b) => SOURCE_BUNDLE_MOVE.indexOf(a.move) - SOURCE_BUNDLE_MOVE.indexOf(b.move)
        || clean(a.createdAt).localeCompare(clean(b.createdAt)));
    const byKind = {};
    const byMove = {};
    for (const m of members) {
      byKind[m.kind || "unknown"] = (byKind[m.kind || "unknown"] || 0) + 1;
      byMove[m.move] = (byMove[m.move] || 0) + 1;
    }
    const values = [...new Set(members.map((m) => Number(m.value)).filter(Number.isFinite))].sort((a, b) => a - b);
    const terms = uniq(group.findings.flatMap((f) => (f.evidence?.facts || []).filter((x) => x?.type === "term").map((x) => x.value)));
    const times = group.findings.map((f) => safeMs(f.provenance?.createdAt)).filter((x) => x != null);
    const createdAt = clean(occurrence?.createdAt)
      || (times.length ? new Date(Math.max(...times)).toISOString() : null);
    const originalText = occurrence?.originalText != null
      ? String(occurrence.originalText)
      : occurrence?.text != null
        ? String(occurrence.text)
        : null;
    const displayTextNormalized = clean(occurrence?.displayTextNormalized)
      || normalizeResearchDisplayText(originalText);
    const methodMentions = Array.isArray(occurrence?.methodMentions) ? occurrence.methodMentions : [];

    return {
      id: group.key,
      sourceRef: group.sourceRef,
      sourceRefs: [...(group.rawSourceRefs || [])],
      sourceIdentityRefs: [...(group.sourceIdentityRefs || [])],
      isSingleton: members.length === 1,
      findingIds: members.map((m) => m.id),
      findings: members,
      count: members.length,
      byKind,
      byMove,
      values,
      terms,
      createdAt,
      occurrence: occurrence ? {
        channel: clean(occurrence.channel) || null,
        status: clean(occurrence.status) || null,
        createdAt: clean(occurrence.createdAt) || null,
        originalText,
        displayTextNormalized,
        methodMentions,
      } : null,
      header: resolveHeader(occurrence) || stableCorpusHeader(group.findings),
      presentation: {
        primaryTitle: members[0]?.presentation?.title || members[0]?.label || null,
        contextLine: members[0]?.presentation?.contextLine || null,
        sourceLabel: members[0]?.presentation?.sourceLabel || null,
        occurrenceLabel: members[0]?.presentation?.occurrenceLabel || null,
      },
      invariant: SOURCE_BUNDLE_INVARIANT,
    };
  });
}

export default buildSourceBundles;
