// "עולם הגילויים והתרומות": the one public reader pair behind the Home section and the /stats block (ZURIEL 26.11.2026).
// It does not count anything itself: two server readers (discovery_center_feed_v1: fast, the featured discovery, the new discoveries and contributions and the
// active writers; discovery_center_stats_v1: the totals by type) are read once and shared by both surfaces through the same client cache. A reader that is not
// available yet (or fails) yields null and the surface draws nothing: no zero is ever invented and no old wall is used as a fallback.
// Counts are by type and never summed; a writer appears (name, link, credit) only when the server says the profile is public.
import { supabase } from "../supabase.js";

export const DISCOVERY_FEED_TTL_MS = 60 * 1000;
export const DISCOVERY_STATS_TTL_MS = 10 * 60 * 1000;

// Content sources are labelled as sources, never as people (ZURIEL 26.11.2026): a source name has no writer page.
export const CONTENT_SOURCES_2029 = Object.freeze({
  "בדרך לנצח": "מקור תוכן",
  "אור הגאולה": "מקור תוכן",
  "SOD1820": "תוכן האתר",
});

const entries = new Map();

/**
 * One reader call, settled. A reader that is not applied yet answers PGRST202 / HTTP 404 ("function not found"): that is the expected state until the SQL is applied
 * (deploy-order contract: the code may ship first), so it is not an error: the surface draws nothing. Any other failure also yields null; nothing is ever invented.
 */
export async function readThrough(load) {
  try {
    const { data, error } = await load();
    if (error) return null;   // includes error.code === "PGRST202" (function not found) and status 404
    return data && typeof data === "object" ? data : null;
  } catch { return null; }
}

function cached(key, ttl, load, now = Date.now()) {
  const hit = entries.get(key);
  if (hit && now - hit.at < ttl) return hit.promise;
  const promise = readThrough(load).then((data) => { if (data == null && entries.get(key)?.promise === promise) entries.delete(key); return data; });
  entries.set(key, { at: now, promise });
  return promise;
}

export function readDiscoveryFeed() { return cached("feed", DISCOVERY_FEED_TTL_MS, () => supabase.rpc("discovery_center_feed_v1")); }
export function readDiscoveryStats() { return cached("stats", DISCOVERY_STATS_TTL_MS, () => supabase.rpc("discovery_center_stats_v1")); }
export function forgetDiscoveryReads() { entries.clear(); }

const count = value => Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;

/** Totals by type, in the order the surfaces draw them. A type without a real number is left out (never drawn as zero). */
export function discoveryTotals(stats) {
  if (!stats) return [];
  return [
    { key: "gematria", label: "גימטריות ציבוריות", value: count(stats.gematria_public), to: "/gematria" },
    { key: "research", label: "רשומות מחקר", value: count(stats.research_public) },
    { key: "contributions", label: "תרומות", value: count(stats.contributions) },
    { key: "replies", label: "תגובות", value: count(stats.replies) },
    { key: "updates", label: "עדכוני מקור", value: count(stats.updates_live) },
    { key: "ciphers", label: "צפנים", value: count(stats.ciphers_public), to: "/codes" },
    { key: "writers", label: "כותבים", value: count(stats.writers_with_public_material), to: "/community/researchers" },
  ].filter(item => item.value);
}

const discovery = row => row && row.phrase && Number.isFinite(Number(row.value)) ? {
  id: String(row.id), phrase: String(row.phrase), value: Number(row.value), createdAt: row.created_at || null,
  // The identity of a discovery is phrase + method + value (ZURIEL 26.11.2026): the method and its value come from the engine through the reader, never always "regular".
  method: row.method || "רגיל", methodLabel: row.method_label || row.method || "רגיל",
  creditName: row.credit_name || null, creditSlug: row.credit_slug || null,
} : null;

/** The feed as the surfaces use it. Credit is shown only with a public writer (the server sends none otherwise). */
export function discoveryModel(feed) {
  if (!feed) return null;
  const featured = discovery(feed.featured);
  const featuredWith = (Array.isArray(feed.featured_with) ? feed.featured_with : []).map(discovery).filter(Boolean).slice(0, 2);
  const latest = (Array.isArray(feed.latest_discoveries) ? feed.latest_discoveries : []).map(discovery).filter(Boolean);
  const contributions = (Array.isArray(feed.latest_contributions) ? feed.latest_contributions : []).filter(row => row && row.excerpt).map(row => ({
    id: String(row.id), excerpt: String(row.excerpt), createdAt: row.created_at || null, authorName: row.author_name || null, authorSlug: row.author_slug || null,
  }));
  const writers = (Array.isArray(feed.active_writers) ? feed.active_writers : []).filter(row => row && row.display_name).map(row => ({
    slug: row.slug || null, name: String(row.display_name), siteAccount: row.is_site_account === true,
    contributions: count(row.contributions), gematria: count(row.gematria), research: count(row.research),
  }));
  if (!featured && !latest.length && !contributions.length && !writers.length) return null;
  return { featured, featuredWith, latest, contributions, writers };
}

/** The writer's page, the number's page: exact links, no search. A source or an unnamed credit has no page. */
export const writerHref = slug => slug ? `/community/researcher/${encodeURIComponent(slug)}` : null;
export const numberHref = value => Number.isSafeInteger(Number(value)) && Number(value) > 0 ? `/number/${Number(value)}` : null;

/** One short line for a writer's activity in the window the feed measures (the last 30 days), by type. */
export function writerActivityLine(writer) {
  const parts = [];
  if (writer.research) parts.push(`${writer.research.toLocaleString("he-IL")} רשומות מחקר`);
  if (writer.contributions) parts.push(`${writer.contributions.toLocaleString("he-IL")} תרומות`);
  if (writer.gematria) parts.push(`${writer.gematria.toLocaleString("he-IL")} גימטריות`);
  return parts.join(" · ");
}

/** Admin only (the server refuses anyone else): choose the featured discovery and up to two beside it. Each pick is { id, method }; only a discovery the feed lists can be chosen. */
export async function setFeaturedDiscovery(picks) {
  const { error } = await supabase.rpc("admin_set_home_featured_discovery_v1", { p_picks: picks.slice(0, 3).map(pick => ({ id: pick.id, method: pick.method })) });
  if (error) throw error;
  forgetDiscoveryReads();
}
