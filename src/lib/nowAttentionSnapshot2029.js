// NOW attention foundation: a bounded, public-only projection over the existing
// nowModels(feed.expandedRows). This file owns NO reader, subscription, storage,
// ranking, truth state, follow state or UI. It never accesses the raw source body.
//
// The numbers describe only records currently loaded by the shared feed.
// They are NOT total site activity, independent evidence, research strength or
// the user's personal research state (Doc37 NOW-01/02, METER-01).
export const NOW_ATTENTION_SCOPE = "loaded_public_feed_window";

const GOOD_READ_STATES = new Set(["read", "measured_empty"]);
const BAD_READ_STATES = new Set(["failed", "access_filtered"]);

function validDate(value) {
  if (!value) return null;
  const at = new Date(value);
  return Number.isFinite(at.getTime()) ? at : null;
}

function localDay(date, formatter) {
  const parts = formatter.formatToParts(date);
  const field = name => parts.find(part => part.type === name)?.value;
  return [field("year"), field("month"), field("day")].join("-");
}

/**
 * @param {Array} models - Authorized PUBLIC output of nowModels(), never a raw DB table.
 * @param {object} options - Reader states from the same already-open Now feed.
 * @returns {object} Sample-only activity and publication-time grouping, never a truth score.
 */
export function projectNowAttention(models, {
  sourceStates = [],
  unavailableSources = [],
  detailsRequested = false,
  loading = false,
  error = false,
  timeZone = "Asia/Jerusalem",
  maxDays = 14,
} = {}) {
  const input = Array.isArray(models) ? models : [];
  const seenIds = new Set();
  const items = input.filter(model => {
    if (!model || typeof model.id !== "string" || !model.id || seenIds.has(model.id)) return false;
    // Defense in depth: the caller is still responsible for canonical public ACL filtering.
    if (model.item?.privacy_scope === "private" || model.item?.visibility === "private") return false;
    seenIds.add(model.id);
    return true;
  });

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  });
  const groups = new Map();
  const sources = new Set();
  const media = { video: 0, image: 0, text: 0 };
  let untimedEntries = 0;
  let unverifiedSourceEntries = 0;

  for (const model of items) {
    const type = model.media === "video" || model.media === "image" ? model.media : "text";
    media[type] += 1;
    if (model.unverified === true) unverifiedSourceEntries += 1;
    if (typeof model.sourceName === "string" && model.sourceName.trim()) sources.add(model.sourceName.trim());

    // Only the publication/source-arrival time supplied by the canonical reader is used.
    // This is NOT the date on which a historical event happened.
    const at = validDate(model.at);
    if (!at) { untimedEntries += 1; continue; }
    const day = localDay(at, formatter);
    if (!groups.has(day)) groups.set(day, { day, entries: 0, unverifiedSourceEntries: 0, publicIds: [] });
    const group = groups.get(day);
    group.entries += 1;
    group.publicIds.push(model.id);
    if (model.unverified === true) group.unverifiedSourceEntries += 1;
  }

  const states = Array.isArray(sourceStates) ? sourceStates : [];
  const unavailable = Array.isArray(unavailableSources) ? unavailableSources.length : 0;
  const failedReaderCount = states.filter(state => BAD_READ_STATES.has(state?.status)).length;
  const measuredReaderCount = states.filter(state => GOOD_READ_STATES.has(state?.status)).length;
  let readState = "unknown";
  if (error || failedReaderCount || unavailable) readState = items.length ? "partial" : "unavailable";
  else if (loading) readState = "loading";
  else if (!detailsRequested) readState = "not_requested";
  else if (states.length > 0 && measuredReaderCount === states.length) readState = "measured_window";
  // "measured_window" means only that these finite readers answered. It never
  // means complete site coverage or that any research claim was verified.

  const orderedDays = [...groups.values()].sort((a, b) => b.day.localeCompare(a.day));
  const safeMaxDays = Number.isInteger(maxDays) && maxDays > 0 ? Math.min(maxDays, 366) : 14;
  return {
    scope: NOW_ATTENTION_SCOPE,
    activity: {
      sampledPublicEntries: items.length,
      datedEntries: items.length - untimedEntries,
      untimedEntries,
      unverifiedSourceEntries,
      namedPublicSources: sources.size,
      media,
    },
    readerCoverage: {
      state: readState,
      measuredReaders: measuredReaderCount,
      failedOrFilteredReaders: failedReaderCount,
      unavailableStreamSources: unavailable,
      countedReaders: states.length,
      sitewideCoverageKnown: false,
    },
    publicationTimeline: {
      timeZone,
      dayCount: orderedDays.length,
      omittedDayCount: Math.max(0, orderedDays.length - safeMaxDays),
      days: orderedDays.slice(0, safeMaxDays),
      meaning: "publication_or_source_arrival_time_only",
    },
    // The existing owner of approved connection strength and the authorized
    // personal/Follow owners must supply their own bounded projections later.
    connectionStrength: null,
    personalizedAttention: null,
  };
}
