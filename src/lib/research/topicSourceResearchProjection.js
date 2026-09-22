import { supabase } from "../supabase.js";

export const GOLDEN_TOPIC_SOURCE_RESEARCH = Object.freeze({
  "tzvi-conv-620": Object.freeze({
    cluster: "620 כתר · עשרימון",
    contributor: "צבי (OPOC)",
    label: "620 · כתר ועשרימון",
  }),
});

const clean = (value) => value == null ? "" : String(value).trim();
const SOURCE_ID_RE = /channel_updates:([0-9a-fA-F-]{36})/;
const IMAGE_MARKER_RE = /\[Image\s+\d+\.(?:jpe?g|png|webp)\]/gi;

function sourceIdFromRef(value) {
  const match = clean(value).match(SOURCE_ID_RE);
  return match?.[1] || null;
}

function sourceDisplayText(value) {
  return clean(value).replace(IMAGE_MARKER_RE, "").replace(/\n{3,}/g, "\n\n").trim();
}

function narrativeKey(value) {
  return sourceDisplayText(value).replace(/\s+/g, " ").toLowerCase();
}

function analysisState(row) {
  return clean(row?.meta?.ext?.wa_channel_intake?.analysis_state);
}

function isSourcePreservationRow(row) {
  return analysisState(row).startsWith("source_preserved");
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

export function buildTopicSourceResearchProjection({
  slug,
  researchRows = [],
  sourceRows = [],
} = {}) {
  const config = GOLDEN_TOPIC_SOURCE_RESEARCH[clean(slug)];
  if (!config) return null;

  const rows = Array.isArray(researchRows) ? researchRows : [];
  const sources = Array.isArray(sourceRows) ? sourceRows : [];
  if (!rows.length || !sources.length) return null;

  const sourceById = new Map(sources.map((row) => [clean(row?.id), row]));
  const grouped = new Map();

  for (const row of rows) {
    const sourceId = sourceIdFromRef(row?.source_ref);
    const source = sourceId ? sourceById.get(sourceId) : null;
    if (!source) continue;

    const key = narrativeKey(source.text) || sourceId;
    const existing = grouped.get(key) || {
      text: sourceDisplayText(source.text),
      sourceRefs: [],
      sourceIds: [],
      media: [],
      createdAt: source.created_at || null,
      contributor: clean(source.credit || row?.contributor) || config.contributor,
      channel: clean(source.channel) || null,
    };

    existing.sourceRefs.push(`channel_updates:${sourceId}`);
    existing.sourceIds.push(sourceId);
    if (source.image_url) existing.media.push(source.image_url);
    if (!existing.text || sourceDisplayText(source.text).length > existing.text.length) {
      existing.text = sourceDisplayText(source.text);
    }
    if (source.created_at && (!existing.createdAt || source.created_at < existing.createdAt)) {
      existing.createdAt = source.created_at;
    }
    grouped.set(key, existing);
  }

  const sourceGroups = [...grouped.values()]
    .map((group) => ({
      ...group,
      sourceRefs: unique(group.sourceRefs),
      sourceIds: unique(group.sourceIds),
      media: unique(group.media),
    }))
    .filter((group) => group.text || group.media.length)
    .sort((a, b) => clean(a.createdAt).localeCompare(clean(b.createdAt)));

  const analysis = rows
    .filter((row) => !isSourcePreservationRow(row))
    .map((row) => ({
      id: clean(row?.id),
      kind: clean(row?.kind) || "observation",
      statement: clean(row?.statement),
      evidence: clean(row?.evidence),
      sourceRef: clean(row?.source_ref),
      engineVerified: row?.engine_verified === true,
      status: clean(row?.status) || null,
      privacyScope: clean(row?.privacy_scope) || null,
      createdAt: row?.created_at || null,
    }))
    .filter((row) => row.statement)
    .sort((a, b) => clean(a.createdAt).localeCompare(clean(b.createdAt)));

  const preservedOnlyCount = rows.filter(isSourcePreservationRow).length;
  const directMedia = unique(sourceGroups.flatMap((group) => group.media));

  return {
    slug: clean(slug),
    label: config.label,
    cluster: config.cluster,
    contributor: config.contributor,
    sourceGroups,
    analysis,
    counts: {
      researchRows: rows.length,
      sourceOccurrences: unique(sourceGroups.flatMap((group) => group.sourceIds)).length,
      sourceNarratives: sourceGroups.length,
      directMedia: directMedia.length,
      verifiedAnalysis: analysis.filter((row) => row.engineVerified).length,
      pendingStructuralAnalysis: preservedOnlyCount,
    },
    truthBoundary: "מקור, חילוץ וניתוח נשארים שכבות נפרדות; candidate/private אינו פרסום או קנוניזציה.",
  };
}

export async function fetchTopicSourceResearchProjection(slug) {
  const config = GOLDEN_TOPIC_SOURCE_RESEARCH[clean(slug)];
  if (!config) return null;

  const { data: researchRows, error: researchError } = await supabase
    .from("research_objects")
    .select("id,created_at,kind,statement,evidence,source_ref,contributor,engine_verified,status,privacy_scope,meta")
    .eq("contributor", config.contributor)
    .contains("meta", { ext: { spatial_research: { cluster: config.cluster } } })
    .order("created_at", { ascending: true });
  if (researchError) throw researchError;
  if (!researchRows?.length) return null;

  const sourceIds = unique(researchRows.map((row) => sourceIdFromRef(row.source_ref)));
  if (!sourceIds.length) return null;

  const { data: sourceRows, error: sourceError } = await supabase
    .from("channel_updates")
    .select("id,created_at,text,image_url,credit,channel,status")
    .in("id", sourceIds)
    .order("created_at", { ascending: true });
  if (sourceError) throw sourceError;

  return buildTopicSourceResearchProjection({
    slug,
    researchRows,
    sourceRows: sourceRows || [],
  });
}
