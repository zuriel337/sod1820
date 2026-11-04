// NOW / channel-ingest coverage: a PURE admin-report adapter over canonical
// aggregate rows from channel_ingest_sources + channel_updates.
// It is NOT a public API, authorization check, new ingest pipeline, reader,
// media release, notification system, or publication owner.
//
// Caller MUST enforce admin rights at the server, aggregate the DB results,
// and send no sender IDs, addresses, message body, storage object IDs or URLs.
// Missing measurements stay unknown; a private row is NOT published.
// Source display names are data, not evidence of editorial series membership.

export const NOW_CHANNEL_COVERAGE_SCOPE = "admin_ingest_aggregate_only";
export const KNOWN_INGEST_MEDIA = Object.freeze([
  "text", "image", "video", "audio", "restricted_unknown", "other",
]);

const finiteCount = value =>
  Number.isSafeInteger(value) && value >= 0 ? value : null;
const isDate = value =>
  typeof value === "string" && Number.isFinite(Date.parse(value));
const val = value => typeof value === "string" ? value.trim() : "";
const categories = new Set(KNOWN_INGEST_MEDIA);
const state = value => ["live", "private", "hidden", "off", "published"].includes(value) ? value : "other";

// Media type classification is descriptive only. The returned kind is NEVER
// permission to display/download the underlying attachment.
export function classifyStoredChannelMedia({ url = null, mime = null } = {}) {
  const raw = val(url);
  if (!raw) return { kind: "text", publicDisplayAuthorized: false };
  if (/^storage-object:/i.test(raw)) return { kind: "restricted_unknown", publicDisplayAuthorized: false };
  const type = val(mime).toLowerCase();
  let extension = "";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:") return { kind: "other", publicDisplayAuthorized: false };
    extension = parsed.pathname.split(".").at(-1)?.toLowerCase() || "";
  } catch {
    return { kind: "other", publicDisplayAuthorized: false };
  }
  const kind = type.startsWith("audio/") || ["mp3", "m4a", "aac", "ogg", "opus", "wav", "flac"].includes(extension) ? "audio"
    : type.startsWith("video/") || ["mp4", "webm", "mov", "m4v"].includes(extension) ? "video"
    : type.startsWith("image/") || ["jpeg", "jpg", "png", "webp", "gif", "avif"].includes(extension) ? "image"
    : "other";
  return { kind, publicDisplayAuthorized: false };
}

// Models a snapshot of existing, ALREADY AGGREGATED and ADMIN-AUTHORIZED input.
// No raw rows, no private attachment URLs, no identity or source body returned.
// One channel can have several status rows from different ingest periods.
// Counts are sums of measured rows only; null means the period was not measured.
export function projectNowChannelIntakeCoverage({
  sources = [], statusCounts = [], mediaCounts = [], nowReaderChannels = [],
  asOf = null, audioIngestCapability = "not_verified",
} = {}) {
  const statusByChannel = new Map();
  const mediaByChannel = new Map();
  for (const row of Array.isArray(statusCounts) ? statusCounts : []) {
    const ch = val(row?.channel);
    if (!ch) continue;
    const n7 = finiteCount(row?.last7);
    const n30 = finiteCount(row?.last30);
    const s = state(row?.status);
    if (!statusByChannel.has(ch)) statusByChannel.set(ch, new Map());
    const current = statusByChannel.get(ch).get(s) || { status: s, last7: null, last30: null };
    for (const [key, amount] of [["last7", n7], ["last30", n30]]) {
      if (amount !== null) current[key] = (current[key] || 0) + amount;
    }
    statusByChannel.get(ch).set(s, current);
  }
  for (const row of Array.isArray(mediaCounts) ? mediaCounts : []) {
    const ch = val(row?.channel);
    if (!ch || !categories.has(row?.mediaKind)) continue;
    const n30 = finiteCount(row?.last30);
    if (n30 === null) continue;
    if (!mediaByChannel.has(ch)) mediaByChannel.set(ch, new Map());
    const map = mediaByChannel.get(ch);
    map.set(row.mediaKind, (map.get(row.mediaKind) || 0) + n30);
  }

  // The admitted reader list must come from the existing 2029 reader owner,
  // not from guessing based on the channel's status or a title.
  const admitted = new Set((Array.isArray(nowReaderChannels) ? nowReaderChannels : []).map(val).filter(Boolean));
  const normalized = (Array.isArray(sources) ? sources : [])
    .filter(src => val(src?.channel))
    .map(src => {
      const channel = val(src.channel);
      const records = statusByChannel.get(channel);
      const total = period => {
        if (!records) return null;
        const nums = [...records.values()].map(x => x[period]).filter(x => x !== null);
        return nums.length ? nums.reduce((sum, amount) => sum + amount, 0) : null;
      };
      const count = (s, period) => records?.get(s)?.[period] ?? null;
      const countTypes = mediaByChannel.get(channel);
      return {
        channel,
        displayName: val(src.display_name || src.displayName || src.label) || channel,
        enabled: typeof src.enabled === "boolean" ? src.enabled : null,
        intakeMode: val(src.intake_mode || src.intakeMode) || "unknown",
        lastPollAt: isDate(src.last_run_at || src.lastPollAt) ? (src.last_run_at || src.lastPollAt) : null,
        nowReaderAdmitted: admitted.has(channel),
        last7: {
          measuredTotal: total("last7"),
          publicStatusLive: count("live", "last7"),
          privateStatus: count("private", "last7"),
        },
        last30: {
          measuredTotal: total("last30"),
          publicStatusLive: count("live", "last30"),
          privateStatus: count("private", "last30"),
        },
        mediaLast30: countTypes
          ? Object.fromEntries(KNOWN_INGEST_MEDIA.map(key => [key, countTypes.get(key) ?? null]))
          : null,
        // A "live" DB status is not itself evidence of a current 2029
        // appearance; published series approval is a separate domain.
        last7PublicAppearanceVerified: false,
        approvedSeriesMembershipCount: null,
        sourceMediaPublicPermissionChanged: false,
      };
    }).sort((a, b) => a.displayName.localeCompare(b.displayName, "he"));
  return {
    scope: NOW_CHANNEL_COVERAGE_SCOPE,
    asOf: isDate(asOf) ? asOf : null,
    countsMeaning: "aggregated_channel_updates_rows_only_not_whatsapp_delivery_truth",
    audioIngestCapability, // e.g. unsupported_in_current_wa_channel_ingest: descriptive, NOT activation
    channelCount: normalized.length,
    channels: normalized,
    unpublishedMediaAutomaticallyAuthorized: false,
    privateSourceContentIncluded: false,
  };
}
