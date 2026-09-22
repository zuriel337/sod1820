// Topic Golden presentation projection.
//
// Pure presentation model over the existing Topic projection + EntityHub + World contextual
// prominence. EXTEND_EXISTING only: no Topic store, rank engine, graph, truth or publication owner.

const clean = (value) => value == null ? "" : String(value).trim();
const asArray = (value) => Array.isArray(value) ? value : [];

const SYSTEM_ATTRIBUTION = /^(ai|system|sod1820|agent:|מנוע\s*·|מערכת\s)/i;
const TECHNICAL_SOURCE = /^(chat:|channel_updates:|wa_bot_log:|work_log:|research-cue:|topic_cards:|nodes:|research_objects:|gallery_images:|book:|https?:\/\/)/i;

function normalizedAttribution(value) {
  const text = clean(value).replace(/^contribution:/i, "").trim();
  if (!text || SYSTEM_ATTRIBUTION.test(text)) return null;
  return text;
}

function targetHref(target) {
  if (!target) return null;
  const type = clean(target.type);
  const label = clean(target.label);
  if (type === "number" && /^\d+$/.test(label)) return `/2029/number/${label}`;
  return null;
}

function graphRows(hub) {
  const self = clean(hub?.identity?.nodeId);
  return asArray(hub?.graph?.relations).flatMap((finding, index) => {
    const relation = finding?.projection?.relations?.[0] || null;
    if (!relation) return [];
    const from = relation.from || null;
    const to = relation.to || null;
    const target = clean(from?.id) === self ? to : clean(to?.id) === self ? from : to || from;
    const label = clean(target?.label) || clean(finding?.subject?.label);
    if (!label) return [];
    return [{
      id: clean(finding?.id) || `graph-${index}`,
      relationType: clean(relation.relationType || relation.relation_type) || "related",
      label,
      targetType: clean(target?.type) || null,
      href: targetHref(target),
      sourceRef: clean(finding?.source?.sourceRef) || null,
    }];
  });
}

function sourceRows(hub) {
  const seen = new Set();
  return asArray(hub?.sources).flatMap((row, index) => {
    const label = clean(row?.label);
    if (!label || TECHNICAL_SOURCE.test(label) || seen.has(label)) return [];
    seen.add(label);
    return [{
      id: clean(row?.ref) || `source-${index}`,
      label,
      type: clean(row?.type) || "source",
      ref: clean(row?.ref) || null,
    }];
  });
}

function rankSummary(prominence) {
  const items = asArray(prominence?.items);
  const hasSignal = (item, signal) => asArray(item?.explainWhy?.researchStrengthSignals).includes(signal);
  const tier = (item) => clean(item?.explainWhy?.humanCuration?.tier).toLowerCase();
  return {
    candidateCount: Number.isFinite(Number(prominence?.candidateCount)) ? Number(prominence.candidateCount) : items.length,
    engineMatches: items.filter((item) => hasSignal(item, "engine_match")).length,
    provenancePresent: items.filter((item) => hasSignal(item, "provenance_present")).length,
    decisionChanging: items.filter((item) => hasSignal(item, "decision_changing_negative_or_control")).length,
    gold: items.filter((item) => tier(item) === "gold").length,
    silver: items.filter((item) => tier(item) === "silver").length,
    uncertain: items.filter((item) => item?.explainWhy?.uncertainty).length,
    attentionPolicy: "human_gate_only",
  };
}

export function topicDensity(authoredFactsCount = 0) {
  const n = Math.max(0, Number(authoredFactsCount) || 0);
  if (n <= 2) return "sparse";
  if (n <= 5) return "medium";
  return "rich";
}

export function buildTopicGoldenProjection(projection, { hub = null, prominence = null } = {}) {
  if (!projection) return null;

  const people = [...new Set([
    normalizedAttribution(projection.createdBy),
    ...asArray(projection.attribution).map(normalizedAttribution),
  ].filter(Boolean))];

  const media = asArray(hub?.media?.items).slice(0, 8).map((row, index) => ({
    id: clean(row?.galleryImageId || row?.nodeId) || `media-${index}`,
    label: clean(row?.label) || "מדיה",
    description: clean(row?.description) || null,
    imageUrl: clean(row?.thumbUrl || row?.imageUrl) || null,
  })).filter((row) => row.imageUrl);

  const prominenceItems = asArray(prominence?.items).map((item) => ({
    id: clean(item?.id),
    kind: clean(item?.kind),
    type: clean(item?.type),
    label: clean(item?.label) || "ממצא",
    summary: clean(item?.summary) || null,
    sourceRef: clean(item?.sourceRef) || null,
    explainWhy: item?.explainWhy || null,
  }));

  return {
    density: topicDensity(projection.authoredFactsCount),
    graphConnections: graphRows(hub),
    sources: sourceRows(hub),
    people,
    media,
    prominenceItems,
    rank: rankSummary(prominence),
    researchCount: asArray(hub?.research?.findings).length,
    relationCount: asArray(hub?.graph?.relations).length,
    mediaCount: media.length,
    sourceCount: sourceRows(hub).length,
    rankContract: {
      owner: "research_gold_hints_law v3",
      researchStrength: "public_safe_explain_why_signals",
      attention: "human_gate_only",
      humanCuration: "explicit_tier_only",
      universalScore: false,
    },
  };
}

export default buildTopicGoldenProjection;
