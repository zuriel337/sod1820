import { humanContentTitle } from "./contentTitle.js";

const clean = (value) => value == null ? "" : String(value).trim();

function worldLabel(row) {
  const raw = typeof row === "string"
    ? row
    : row?.label || row?.name || row?.title || row?.world || row?.topic || row?.slug;
  return humanContentTitle(raw, { max: 82 });
}

function worldSummary(row) {
  if (typeof row === "string") return "";
  return clean(row?.summary || row?.subtitle || row?.description || row?.reason);
}

const LIVE_EVIDENCE_KEYS = ["items", "evidence", "sources", "relations", "findings", "members"];

export function liveEvidenceCount(row) {
  if (!row || typeof row === "string") return 0;
  const counted = Number(row.count || row.items_count || row.connections_count || 0) || 0;
  if (counted > 0) return counted;
  return LIVE_EVIDENCE_KEYS.reduce((sum, key) => sum + (Array.isArray(row[key]) ? row[key].length : 0), 0);
}

// Live-only: numberWorlds are the current projection; topic rows count only with attached live evidence.
export function buildWorldCards(worlds, topics) {
  const seen = new Set();
  const rows = [];
  const add = (row, requireEvidence) => {
    const label = worldLabel(row);
    if (!label || seen.has(label)) return;
    const evidence = liveEvidenceCount(row);
    if (requireEvidence && evidence <= 0) return;
    seen.add(label);
    rows.push({
      id: clean(row?.id || row?.slug) || label,
      label,
      summary: worldSummary(row),
      count: evidence || null,
      raw: row,
    });
  };
  for (const row of worlds || []) add(row, false);
  for (const row of topics || []) add(row, true);
  return rows.slice(0, 12);
}

