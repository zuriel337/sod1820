// World 2029 presentation helpers.
// This module does NOT rank truth, evidence, importance, canonicality or access.
// It only helps render an honest contextual projection over material already returned
// by the governed Reality/Research readers.

const size = (value) => Array.isArray(value) ? value.length : 0;

export function worldProjectionCounts(data) {
  return Object.freeze({
    relations: size(data?.graph?.relations),
    findings: size(data?.research?.findings),
    sources: size(data?.sources),
    worlds: size(data?.numberWorlds),
    timeline: size(data?.timeline),
  });
}

// A resolved Reality Graph identity contributes one provenance timestamp to the
// timeline even when there is no surrounding research material at all. That
// baseline identity event must not make an otherwise-empty anchor look medium.
export function worldDensityCounts(data) {
  const counts = worldProjectionCounts(data);
  return Object.freeze({
    ...counts,
    timeline: Math.max(0, counts.timeline - (data?.identity ? 1 : 0)),
  });
}

export function classifyWorldPresentationDensity(data) {
  if (!data?.identity) return "unavailable";
  const counts = worldDensityCounts(data);
  const values = Object.values(counts);
  const populatedChannels = values.filter((count) => count > 0).length;
  const boundedItems = values.reduce((sum, count) => sum + Math.min(count, 24), 0);
  if (populatedChannels >= 3 || boundedItems >= 24) return "rich";
  if (populatedChannels >= 1) return "medium";
  return "sparse";
}

export function worldHasAnyMaterial(data) {
  const counts = worldDensityCounts(data);
  return Object.values(counts).some((count) => count > 0);
}

function relationOf(finding) {
  return finding?.projection?.relations?.[0] || null;
}

export function worldRelationCounterpart(finding, currentNodeId) {
  const relation = relationOf(finding);
  if (!relation) return null;
  const current = String(currentNodeId || "");
  const from = relation.from || null;
  const to = relation.to || null;
  if (String(relation.fromNodeId || "") === current) return to;
  if (String(relation.toNodeId || "") === current) return from;
  return to || from;
}

export function worldRelationFacets(findings = [], currentNodeId = null) {
  const counts = new Map();
  for (const finding of findings || []) {
    const counterpart = worldRelationCounterpart(finding, currentNodeId);
    if (!counterpart?.type) continue;
    counts.set(counterpart.type, (counts.get(counterpart.type) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([type, count]) => Object.freeze({ type, count }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
}

export function filterWorldRelations(findings = [], { currentNodeId = null, filter = "all" } = {}) {
  if (!filter || filter === "all") return [...(findings || [])];
  return (findings || []).filter((finding) => worldRelationCounterpart(finding, currentNodeId)?.type === filter);
}

function numericLabel(counterpart) {
  if (counterpart?.type !== "number") return null;
  const value = Number(counterpart.label);
  return Number.isFinite(value) ? value : null;
}

function curationPriority(counterpart) {
  const tier = String(counterpart?.curation?.tier || "").toLowerCase();
  if (tier === "gold") return 0;
  if (tier === "silver") return 1;
  return 2;
}

export function orderWorldRelations(findings = [], { currentNodeId = null, sort = "recommended" } = {}) {
  const rows = (findings || []).map((finding, index) => ({ finding, index, counterpart: worldRelationCounterpart(finding, currentNodeId) }));

  if (sort === "newest") {
    rows.sort((a, b) => String(b.finding?.provenance?.createdAt || "").localeCompare(String(a.finding?.provenance?.createdAt || "")) || a.index - b.index);
  } else if (sort === "relation") {
    rows.sort((a, b) => String(relationOf(a.finding)?.relationType || "").localeCompare(String(relationOf(b.finding)?.relationType || "")) || a.index - b.index);
  } else if (sort === "number_asc" || sort === "number_desc") {
    const direction = sort === "number_asc" ? 1 : -1;
    rows.sort((a, b) => {
      const av = numericLabel(a.counterpart);
      const bv = numericLabel(b.counterpart);
      if (av == null && bv == null) return a.index - b.index;
      if (av == null) return 1;
      if (bv == null) return -1;
      return direction * (av - bv) || a.index - b.index;
    });
  } else {
    // Canonical World prominence contract: preserve visible access to relevant Human curation,
    // then preserve the deterministic governed reader order. No opaque universal score.
    rows.sort((a, b) => curationPriority(a.counterpart) - curationPriority(b.counterpart) || a.index - b.index);
  }

  return rows.map((row) => row.finding);
}

export function explainWorldRelation(finding, currentNodeId = null) {
  const relation = relationOf(finding);
  const counterpart = worldRelationCounterpart(finding, currentNodeId);
  if (!relation || !counterpart) return Object.freeze({ counterpart: null, reasons: [], disclaimer: "סדר התצוגה אינו דירוג אמת." });

  const reasons = [
    `קשר ישיר מסוג ${relation.relationType || "related"} לעוגן הנוכחי`,
  ];
  if (counterpart.curation?.tier) reasons.push(`אוצרות אנושי: ${counterpart.curation.tier}`);
  if (Number.isFinite(Number(counterpart.signal?.meter))) reasons.push(`Signal קיים: ${Number(counterpart.signal.meter)}`);
  if (Number.isFinite(Number(counterpart.signal?.importance))) reasons.push(`עדיפות תצוגה קיימת: ${Number(counterpart.signal.importance)}`);
  return Object.freeze({
    counterpart,
    reasons: Object.freeze(reasons),
    disclaimer: "סדר התצוגה מסביר רלוונטיות ואוצרות בהקשר הזה; הוא אינו דירוג אמת, אימות או קנוניות.",
  });
}
