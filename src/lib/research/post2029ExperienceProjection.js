const clean = (value) => value == null ? "" : String(value).trim();

const asArray = (value) => Array.isArray(value) ? value : [];

function normalizeMedia(raw = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const highlight = source.highlight && typeof source.highlight === "object" ? source.highlight : null;
  const fullSource = source.fullSource && typeof source.fullSource === "object" ? source.fullSource : null;
  if (!highlight && !fullSource) return null;
  return {
    highlight: highlight ? {
      src: clean(highlight.src),
      poster: clean(highlight.poster) || null,
      label: clean(highlight.label) || "רגע המקור",
      startSeconds: Number.isFinite(Number(highlight.startSeconds)) ? Number(highlight.startSeconds) : null,
      endSeconds: Number.isFinite(Number(highlight.endSeconds)) ? Number(highlight.endSeconds) : null,
      sourceIdentity: clean(highlight.sourceIdentity) || null,
    } : null,
    fullSource: fullSource ? {
      href: clean(fullSource.href),
      label: clean(fullSource.label) || "לצפייה בסרטון המלא",
      sourceUrl: clean(fullSource.sourceUrl) || null,
      platformId: clean(fullSource.platformId) || null,
    } : null,
  };
}

function normalizeConnection(item, index) {
  if (!item || typeof item !== "object") return null;
  const label = clean(item.label);
  if (!label) return null;
  return {
    id: clean(item.id) || `connection-${index + 1}`,
    label,
    kind: clean(item.kind) || "connection",
    value: item.value == null ? null : String(item.value),
    href: clean(item.href) || null,
    reason: clean(item.reason) || null,
    provenanceLabel: clean(item.provenanceLabel) || null,
    truthState: clean(item.truthState) || null,
  };
}

function normalizeTimelineItem(item, index) {
  if (!item || typeof item !== "object") return null;
  const label = clean(item.label);
  const date = clean(item.date);
  if (!label || !date) return null;
  const temporalRole = ["occurred", "published", "discovered", "admitted"].includes(item.temporalRole)
    ? item.temporalRole
    : "occurred";
  return {
    id: clean(item.id) || `timeline-${index + 1}`,
    label,
    date,
    temporalRole,
    href: clean(item.href) || null,
    sourceLabel: clean(item.sourceLabel) || null,
    note: clean(item.note) || null,
  };
}

function normalizeTrailItem(item, index) {
  if (!item || typeof item !== "object") return null;
  const label = clean(item.label);
  if (!label) return null;
  return {
    id: clean(item.id) || `trail-${index + 1}`,
    label,
    href: clean(item.href) || null,
    kind: clean(item.kind) || "context",
    active: item.active === true,
  };
}

/**
 * Presentation-only envelope for Post 2029.
 *
 * This is NOT a store and does not own truth. It normalizes an already-resolved
 * post experience supplied by canonical tree/media/time owners. Until a reader
 * supplies those fields, every family stays empty and the existing Post view is
 * unchanged.
 *
 * Expected upstream shape:
 * post._experience = {
 *   media, connections, timeline, trail
 * }
 */
export function projectPost2029Experience(post) {
  const raw = post?._experience && typeof post._experience === "object"
    ? post._experience
    : {};

  return {
    version: "post-2029-experience-v1",
    media: normalizeMedia(raw.media),
    connections: asArray(raw.connections).map(normalizeConnection).filter(Boolean),
    timeline: asArray(raw.timeline).map(normalizeTimelineItem).filter(Boolean),
    trail: asArray(raw.trail).map(normalizeTrailItem).filter(Boolean),
  };
}

export const post2029ExperienceInternals = {
  normalizeMedia,
  normalizeConnection,
  normalizeTimelineItem,
  normalizeTrailItem,
};
