// VIDEO_SEMANTIC_TREE_PROJECTOR_V1
// Read-only projection helpers over research_objects.meta.ext.video_semantic_map.
//
// OWNER: Research Intake / Reality Graph / Experience projection.
// This module never scans media, computes Gematria, promotes truth, widens access or persists data.
// It only reads a mapping that was produced once at intake and selects the already-mapped source
// segment that best matches the CURRENT context.

const clean = (value) => value == null ? "" : String(value).replace(/\s+/g, " ").trim();

function finiteOrNull(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function normalizeLabels(value) {
  return [...new Set((Array.isArray(value) ? value : []).map(clean).filter(Boolean))].slice(0, 24);
}

function normalizeAnchor(anchor, index) {
  if (!anchor || typeof anchor !== "object" || Array.isArray(anchor)) return null;
  const labels = normalizeLabels(anchor.labels);
  if (!labels.length) return null;
  const startSec = finiteOrNull(anchor.start_sec ?? anchor.startSec);
  const endSec = finiteOrNull(anchor.end_sec ?? anchor.endSec);
  return {
    id: clean(anchor.id) || `anchor-${index + 1}`,
    kind: clean(anchor.kind) || "source_mention",
    labels,
    note: clean(anchor.note) || null,
    startSec,
    endSec: endSec != null && (startSec == null || endSec >= startSec) ? endSec : null,
    ordinal: Number.isFinite(Number(anchor.ordinal)) ? Number(anchor.ordinal) : index + 1,
  };
}

export function readVideoSemanticMap(row) {
  const raw = row?.meta?.ext?.video_semantic_map;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const mediaUrl = clean(raw.media_url);
  if (!mediaUrl) return null;

  const anchors = (Array.isArray(raw.anchors) ? raw.anchors : [])
    .map(normalizeAnchor)
    .filter(Boolean)
    .slice(0, 48);

  return {
    researchObjectId: row?.id ? String(row.id) : null,
    sourceRef: clean(row?.source_ref) || null,
    mapKey: clean(raw.map_key) || null,
    version: Number(raw.version) || 1,
    videoPublicId: clean(raw.video_public_id) || null,
    videoKey: clean(raw.video_key) || null,
    mediaUrl,
    posterUrl: clean(raw.poster_url) || null,
    mappingBasis: clean(raw.mapping_basis) || null,
    timecodeQuality: clean(raw.timecode_quality) || null,
    sourceRole: clean(raw.source_role) || "representation",
    independentEvidence: raw.independent_evidence === true,
    durationSec: finiteOrNull(raw.duration_sec),
    anchors,
  };
}

function contextTokens(context) {
  const focus = context?.dimensions?.surfaceFocus
    || context?.dimensions?.readingFocus
    || context?.selection
    || context?.subject
    || {};
  const tokens = new Set();
  const add = (value) => {
    const v = clean(value);
    if (v) tokens.add(v);
  };
  add(focus.number);
  add(focus.resultValue);
  add(focus.id);
  add(focus.label);
  add(focus.primary);
  add(focus.expression);
  add(focus.sectionLabel);
  for (const signal of Array.isArray(focus.signals) ? focus.signals : []) add(signal);
  return [...tokens];
}

function matchAnchor(anchor, tokens) {
  let score = 0;
  const why = [];
  for (const token of tokens) {
    for (const label of anchor.labels) {
      if (label === token) {
        score += /^\d+$/.test(token) ? 8 : 6;
        why.push(label);
      } else if (token.length >= 3 && label.length >= 3 && (label.includes(token) || token.includes(label))) {
        score += 2;
        why.push(label);
      }
    }
  }
  return { score, why: [...new Set(why)] };
}

export function resolveVideoSemanticMap(map, context) {
  if (!map?.mediaUrl) return null;
  const tokens = contextTokens(context);
  const ranked = map.anchors
    .map((anchor) => ({ anchor, ...matchAnchor(anchor, tokens) }))
    .sort((a, b) => b.score - a.score || a.anchor.ordinal - b.anchor.ordinal);

  const hit = ranked[0]?.score > 0 ? ranked[0] : null;
  const identity = map.videoPublicId || map.videoKey || map.mapKey || map.mediaUrl;
  return {
    id: `video-map:${identity}`,
    researchObjectId: map.researchObjectId,
    videoPublicId: map.videoPublicId,
    videoKey: map.videoKey,
    mediaUrl: map.mediaUrl,
    posterUrl: map.posterUrl,
    mappingBasis: map.mappingBasis,
    timecodeQuality: map.timecodeQuality,
    sourceRole: map.sourceRole,
    independentEvidence: map.independentEvidence,
    durationSec: map.durationSec,
    matched: Boolean(hit),
    score: hit?.score || 0,
    matchedLabels: hit?.why || [],
    anchor: hit?.anchor || null,
  };
}

export function resolveVideoForResearchRow(row, context) {
  const map = readVideoSemanticMap(row);
  return map ? resolveVideoSemanticMap(map, context) : null;
}

export function contextualVideosFromMaps(maps, context, { limit = 3 } = {}) {
  const byVideo = new Map();
  for (const map of Array.isArray(maps) ? maps : []) {
    const item = resolveVideoSemanticMap(map, context);
    if (!item) continue;
    const key = item.videoPublicId || item.videoKey || item.mediaUrl;
    const prev = byVideo.get(key);
    if (!prev || item.score > prev.score) byVideo.set(key, item);
  }
  return [...byVideo.values()]
    .filter((item) => item.matched)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(6, Number(limit) || 3)));
}

export function contextualVideosFromResearchRows(rows, context, options = {}) {
  const maps = (Array.isArray(rows) ? rows : []).map(readVideoSemanticMap).filter(Boolean);
  return contextualVideosFromMaps(maps, context, options);
}

export function videoUrlForAnchor(item) {
  const url = clean(item?.mediaUrl);
  if (!url) return null;
  const start = finiteOrNull(item?.anchor?.startSec);
  const end = finiteOrNull(item?.anchor?.endSec);
  if (start == null) return url;
  const fragment = end != null ? `#t=${start},${end}` : `#t=${start}`;
  return url.replace(/#.*$/, "") + fragment;
}

export function describeVideoMatch(item) {
  if (!item?.anchor) return "הסרטון כולו";
  const labels = (item.matchedLabels?.length ? item.matchedLabels : item.anchor.labels).slice(0, 4).join(" · ");
  if (item.anchor.startSec == null) return labels || "הסרטון כולו";
  const start = Math.floor(item.anchor.startSec);
  const mm = String(Math.floor(start / 60)).padStart(2, "0");
  const ss = String(start % 60).padStart(2, "0");
  return `${labels || "קטע רלוונטי"} · ${mm}:${ss}`;
}
