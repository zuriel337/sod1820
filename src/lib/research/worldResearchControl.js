// World 2029 research control-plane projection.
// EXTEND_EXISTING: consumes Universal Finding axes already owned by Research/Truth/Access.
// It never invents a publication state, processing state, verification, or access tier.

const clean = (value) => value == null ? "" : String(value).trim();

export const WORLD_RESEARCH_FILTER_DEFAULTS = Object.freeze({
  kind: "all",
  access: "all",
  governance: "all",
  verification: "all",
  attention: "all",
});

export const WORLD_RESEARCH_ATTENTION = Object.freeze({
  all: { label: "הכול" },
  needs_verification: { label: "דורש אימות" },
  candidate: { label: "מועמד" },
  public_candidate: { label: "מועמד לציבור" },
  private: { label: "פרטי" },
  approved: { label: "מאושר" },
  canonical: { label: "קנוני" },
});

export function researchFindingAxes(finding) {
  return {
    kind: clean(finding?.projection?.dimensions?.researchObjectKind) || null,
    access: clean(finding?.access?.tier) || null,
    governance: clean(finding?.status) || null,
    verification: clean(finding?.verification?.verification_state) || null,
  };
}

export function matchesResearchAttention(finding, attention = "all") {
  const axes = researchFindingAxes(finding);
  switch (attention) {
    case "needs_verification":
      return !axes.verification || axes.verification === "not_tested" || axes.verification === "unknown";
    case "candidate":
      return axes.governance === "candidate";
    case "public_candidate":
      return axes.access === "public_candidate";
    case "private":
      return axes.access === "private";
    case "approved":
      return axes.governance === "approved";
    case "canonical":
      return axes.governance === "canonical";
    default:
      return true;
  }
}

export function filterWorldResearchFindings(findings = [], filters = {}) {
  const f = { ...WORLD_RESEARCH_FILTER_DEFAULTS, ...(filters || {}) };
  return (Array.isArray(findings) ? findings : []).filter((finding) => {
    const axes = researchFindingAxes(finding);
    if (f.kind !== "all" && axes.kind !== f.kind) return false;
    if (f.access !== "all" && axes.access !== f.access) return false;
    if (f.governance !== "all" && axes.governance !== f.governance) return false;
    if (f.verification !== "all" && axes.verification !== f.verification) return false;
    return matchesResearchAttention(finding, f.attention);
  });
}

function countBy(findings, axis) {
  const out = {};
  for (const finding of findings) {
    const value = researchFindingAxes(finding)[axis] || "לא צוין";
    out[value] = (out[value] || 0) + 1;
  }
  return out;
}

export function buildWorldResearchControl(findings = []) {
  const rows = Array.isArray(findings) ? findings : [];
  const attention = {};
  for (const key of Object.keys(WORLD_RESEARCH_ATTENTION)) {
    attention[key] = rows.filter((finding) => matchesResearchAttention(finding, key)).length;
  }
  return {
    total: rows.length,
    byKind: countBy(rows, "kind"),
    byAccess: countBy(rows, "access"),
    byGovernance: countBy(rows, "governance"),
    byVerification: countBy(rows, "verification"),
    attention,
    capabilities: {
      processingState: false,
      publicationState: false,
      rawSource: rows.some((finding) => Boolean(finding?.source?.sourceRef || finding?.provenance?.inputRef)),
    },
    truthBoundary: "Projection only: kind/access/governance/verification remain independent source-owned axes.",
  };
}
