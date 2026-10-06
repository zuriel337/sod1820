import { canonicalFollowTopic } from "../followIdentity.js";

const clean = (value) => value == null ? "" : String(value).trim();

const asArray = (value) => Array.isArray(value) ? value : [];

function normalizeMedia(raw = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const highlight = source.highlight && typeof source.highlight === "object" ? source.highlight : null;
  const fullSource = source.fullSource && typeof source.fullSource === "object" ? source.fullSource : null;
  const card = source.sourceCard && typeof source.sourceCard === "object" ? source.sourceCard : null;
  if (!highlight && !fullSource) return null;
  return {
    sourceCard: card && clean(card.href) ? {
      href: clean(card.href),
      outlet: clean(card.outlet) || null,
      title: clean(card.title) || null,
      date: clean(card.date) || null,
    } : null,
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
    // Identity for the shared video_transcripts path (all published languages); never per-post tracks.
    videoKey: clean(source.videoKey) || null,
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
    relation: clean(item.relation) || null,
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
    : null;
  if (!temporalRole) return null;
  return {
    id: clean(item.id) || `timeline-${index + 1}`,
    label,
    date,
    temporalRole,
    href: clean(item.href) || null,
    sourceLabel: clean(item.sourceLabel) || null,
    note: clean(item.note) || null,
    current: item.current === true,
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
// Follow choices must resolve through the existing server resolver (canonical_follow_subject).
// Only entity types it already knows are accepted; the topic is re-derived, never trusted from input.
const FOLLOW_ENTITY_TYPES = ["number", "author", "category", "cipher_feed", "reality_stream", "media_channel", "channel"];
function normalizeFollow(item, index) {
  if (!item || typeof item !== "object") return null;
  const entityType = clean(item.entityType);
  const stableId = clean(item.stableId);
  if (!FOLLOW_ENTITY_TYPES.includes(entityType) || !stableId) return null;
  const topic = canonicalFollowTopic(entityType === "number" ? "number:" + stableId : clean(item.topic));
  if (!topic) return null;
  return {
    id: clean(item.id) || `follow-${index + 1}`,
    label: clean(item.label) || topic,
    entityType,
    stableId,
    topic,
    explainer: clean(item.explainer) || "",
  };
}

export function projectPost2029Experience(post) {
  const raw = post?._experience && typeof post._experience === "object"
    ? post._experience
    : {};

  const follow = asArray(raw.follow).map(normalizeFollow).filter(Boolean);
  const followGaps = asArray(raw.followGaps).map((g) => ({ kind: clean(g?.kind), reason: clean(g?.reason) })).filter((g) => g.kind);

  return {
    version: "post-2029-experience-v1",
    media: normalizeMedia(raw.media),
    connections: asArray(raw.connections).map(normalizeConnection).filter(Boolean),
    timeline: asArray(raw.timeline).map(normalizeTimelineItem).filter(Boolean),
    trail: asArray(raw.trail).map(normalizeTrailItem).filter(Boolean),
    ...(follow.length ? { follow, followGaps } : {}),
  };
}

export const post2029ExperienceInternals = {
  normalizeMedia,
  normalizeConnection,
  normalizeTimelineItem,
  normalizeTrailItem,
};


export function buildPost2029ArchitectureWireframe() {
  return {
    version: "post-2029-wireframe-v1",
    wireframe: true,
    media: {
      wireframe: true,
      highlight: {
        src: "",
        poster: null,
        label: "HIGHLIGHT · רגע הראיה",
        startSeconds: null,
        endSeconds: null,
        sourceIdentity: "wireframe-source",
      },
      fullSource: {
        href: "",
        label: "SOURCE · הסרטון המלא",
        sourceUrl: null,
        platformId: null,
      },
    },
    connections: [
      { id: "wf-person", label: "אדם / נושא", kind: "PERSON", value: null, href: null, reason: "למה זה קשור לכאן" },
      { id: "wf-number", label: "מספר / ביטוי", kind: "NUMBER", value: "###", href: null, reason: "חיבור מספרי" },
      { id: "wf-source", label: "מקור / פסוק", kind: "SOURCE", value: null, href: null, reason: "מקור שמעמיק את הקשר" },
      { id: "wf-event", label: "אירוע קשור", kind: "EVENT", value: null, href: null, reason: "קשר בזמן/מציאות" },
    ],
    timeline: [
      { id: "wf-published", label: "הפוסט פורסם", date: "YYYY-MM-DD", temporalRole: "published", href: null, sourceLabel: "POST", note: "תאריך פרסום אמיתי יגיע מבעל הזמן הקנוני." },
      { id: "wf-occurred", label: "אירוע במציאות", date: "YYYY-MM-DD", temporalRole: "occurred", href: null, sourceLabel: "EVENT", note: "אין טענת סיבתיות — רק סדר כרונולוגי." },
    ],
    trail: [
      { id: "wf-root", label: "פוסט", href: null, kind: "post", active: false },
      { id: "wf-person", label: "אדם", href: null, kind: "person", active: false },
      { id: "wf-number", label: "מספר", href: null, kind: "number", active: false },
      { id: "wf-focus", label: "הקשר נוכחי", href: null, kind: "context", active: true },
    ],
  };
}
