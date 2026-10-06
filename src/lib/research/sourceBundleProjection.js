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
  if (contributorId || contributorName) {
    return { type: "source_author", contributorId: contributorId || null, label: contributorName || null };
  }
  const work = clean(occurrence.sourceWork);
  if (work) return { type: "source_work", contributorId: null, label: work };
  return null;
}

function summarize(finding) {
  const dims = finding.projection?.dimensions || {};
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
    const sourceRef = clean(finding.source?.sourceRef) || null;
    const key = sourceRef || `finding:${finding.id}`;
    if (!groups.has(key)) groups.set(key, { key, sourceRef, findings: [] });
    groups.get(key).findings.push(finding);
  }

  return [...groups.values()].map((group) => {
    const occurrence = (group.sourceRef && occurrences?.[group.sourceRef]) || null;
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
    return {
      id: group.key,
      sourceRef: group.sourceRef,
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
      } : null,
      header: resolveHeader(occurrence),
      invariant: SOURCE_BUNDLE_INVARIANT,
    };
  });
}

export default buildSourceBundles;
