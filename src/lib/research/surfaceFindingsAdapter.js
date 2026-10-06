// Surface Findings adapter v1 — pure, bounded projection of ALREADY-GOVERNED surface outputs
// (Universal Findings, existing experience connections, World/Entity prominence items) into the
// Research Context `surfaceFindings` navigation list rendered by the existing Contextual Sidecar.
//
// No DB access. Research Context is navigation/selection only, never a Truth payload: no child
// findings array, no raw evidence, no authorization object. Verification/prominence hints are
// transported from the owner output only — never inferred.

import { buildSourceBundles } from "./sourceBundleProjection.js";

export const SURFACE_FINDINGS_MAX = 8;

const clean = (v) => (v == null ? "" : String(v).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
const cap = (v, n) => clean(v).slice(0, n);
const MOVE_LABEL = { calculation: "חישובים", relation: "יחסים", observation: "תצפיות", interpretation: "פרשנויות", other: "אחר" };
const MOVE_ORDER = ["calculation", "relation", "observation", "interpretation", "other"];

function moveSummary(byMove) {
  return MOVE_ORDER.filter((k) => byMove?.[k]).map((k) => `${MOVE_LABEL[k]} ${byMove[k]}`).join(" · ");
}

function fromConnection(c) {
  const id = clean(c?.id);
  const label = cap(c?.label, 80);
  if (!id || !label) return null;
  return {
    id,
    label,
    value: c.value != null ? cap(c.value, 40) : undefined,
    kind: cap(c.kind, 40) || undefined,
    reason: cap(c.reason, 200) || undefined,
    href: clean(c.href) || undefined,
    sourceLabel: cap(c.provenanceLabel || c.sourceLabel || c.kind, 80) || undefined,
  };
}

function fromProminence(item) {
  const id = clean(item?.id);
  const label = cap(item?.label, 80);
  if (!id || !label) return null;
  const tier = item?.explainWhy?.humanCuration?.tier;
  return {
    id,
    label,
    kind: cap(item.type || item.kind, 40) || undefined,
    reason: cap(item.summary, 200) || undefined,
    href: clean(item.href) || undefined,
    sourceRef: cap(item.sourceRef, 120) || undefined,
    // Gold/Silver is contextual prominence from the curation owner — NOT verification.
    prominence: tier === "gold" || tier === "silver" ? tier : undefined,
  };
}

function fromBundle(bundle) {
  const header = bundle.header;
  if (bundle.isSingleton) {
    const f = bundle.findings[0];
    const label = cap(f.label, 80);
    if (!label) return null;
    return {
      id: f.id,
      label,
      value: f.value != null ? cap(f.value, 40) : undefined,
      kind: f.kind || undefined,
      focusKind: "finding",
      sourceRef: cap(bundle.sourceRef, 120) || undefined,
      sourceLabel: cap(header?.label, 80) || undefined,
      // Transported from the Finding's own verification axis; absent when unknown.
      verification: f.verificationState || undefined,
    };
  }
  return {
    id: `bundle:${bundle.id}`,
    label: cap(header?.label, 80) || "מקור משותף",
    kind: "source_bundle",
    focusKind: "source_bundle",
    reason: moveSummary(bundle.byMove) || undefined,
    sourceRef: cap(bundle.sourceRef, 120) || undefined,
    sourceLabel: cap(header?.label, 80) || undefined,
    bundleCount: bundle.count,
  };
}

/**
 * @param {object} input
 * @param {Array} [input.findings] already access-filtered Universal Findings
 * @param {Record<string,object>} [input.occurrences] source occurrence metadata keyed by sourceRef
 * @param {Array} [input.connections] existing experience connections
 * @param {Array} [input.prominenceItems] existing World/Entity contextual prominence items
 * @param {(item:object)=>boolean} [input.exclude] drop items that merely repeat the active focus
 * @param {(item:object)=>boolean} [input.prefer] contextual rank only (never truth)
 * @param {number} [input.max]
 */
export function buildSurfaceFindings({
  findings = [], occurrences = {}, connections = [], prominenceItems = [], exclude = null, prefer = null, max = SURFACE_FINDINGS_MAX,
} = {}) {
  const rows = [
    ...(Array.isArray(connections) ? connections : []).map(fromConnection),
    ...buildSourceBundles(findings, { occurrences }).map(fromBundle),
    ...(Array.isArray(prominenceItems) ? prominenceItems : []).map(fromProminence),
  ].filter(Boolean);

  const seen = new Set();
  const out = [];
  for (const row of rows) {
    if (seen.has(row.id) || (exclude && exclude(row))) continue;
    seen.add(row.id);
    out.push(Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined)));
  }
  if (prefer) out.sort((a, b) => Number(Boolean(prefer(b))) - Number(Boolean(prefer(a))));
  return out.slice(0, Math.max(0, Math.min(Number(max) || SURFACE_FINDINGS_MAX, SURFACE_FINDINGS_MAX)));
}

export default buildSurfaceFindings;
