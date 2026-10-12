import { fetchTopicCardList } from "./topicConvergence.js";
import { canonicalResearchPublicLabel } from "../presentation/canonicalPresentation.js";
import { stripHtml } from "../format.js";
import { researchSourceOccurrenceKey } from "./sourceBundleProjection.js";
import { fetchGroupSourceArrivals, GROUP_ARRIVALS_CONNECTED } from "./worldGroupSource.js";

const clean = (value) => value == null ? "" : String(value).trim();
export const GROUP_ARRIVALS_AVAILABILITY = Object.freeze({
  state: "not_connected",
  message: "עדכוני תורת הרמז והגילוי היומי אינם זמינים כרגע. מוצגים כאן עדכוני האתר בלבד.",
});

const CONVERGENCE = canonicalResearchPublicLabel("convergence");

function publicPersonForName(name, publicPeople = []) {
  const creator = clean(name);
  if (!creator) return null;
  for (const person of Array.isArray(publicPeople) ? publicPeople : []) {
    const names = [clean(person?.displayName), ...(Array.isArray(person?.aliases) ? person.aliases.map(clean) : [])].filter(Boolean);
    if (names.includes(creator)) return person;
  }
  return null;
}

function publicCreatorLabel(value, publicPeople = []) {
  const creator = clean(value);
  if (!creator) return "מקור ציבורי";
  const lower = creator.toLowerCase();
  if (lower === "ai") return "AI";
  if (lower.startsWith("מנוע")) return creator;
  if (lower === "sod1820" || lower === "sod 1820" || lower === "agent:sod1820") return "SOD1820";

  const person = publicPersonForName(creator, publicPeople);
  if (person) return clean(person.displayName) || "חוקר";
  return "מקור ציבורי";
}

function safeDate(value) {
  const raw = clean(value);
  if (!raw) return null;
  const time = Date.parse(raw);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function finite(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// A public post is a source occurrence, even when no research Finding exists yet.
// Source authorship is display provenance; it never creates a Contributor identity.
export function postRowToWorldUpdate(row, { publicPeople = [] } = {}) {
  if (row?.id == null || !clean(row.slug) || row.home_hidden === true) return null;
  if ((Array.isArray(row.tags) ? row.tags : []).some((tag) => ["טיוטה", "פורום"].includes(clean(tag)))) return null;
  // Ingestion origin is NOT publication authority: published posts may have "ai"
  // or "uploaded_file" origin (including the public Golden airplane post).
  // Only explicit internal draft/import origins remain excluded in this bounded reader.
  if (["gpt-draft", "web"].includes(clean(row.source).toLowerCase())) return null;
  const label = stripHtml(clean(row.title));
  if (!label) return null;
  const author = clean(row.author);
  const person = publicPersonForName(author, publicPeople);
  const summary = stripHtml(clean(row.excerpt));
  const arrivalAt = safeDate(row.date) || safeDate(row.created_at);
  return {
    id: `post:${row.id}`,
    kind: "source",
    sourceKind: "post",
    sourceLabel: "פוסט מקור באתר",
    label,
    summary: summary ? summary.slice(0, 240) : null,
    creator: person?.displayName || author || "יצירה באתר",
    creatorSlug: person?.slug || null,
    at: arrivalAt,
    arrivalAt,
    sourcePublishedAt: safeDate(row.date),
    recordedAt: safeDate(row.created_at),
    discoveredAt: null,
    sourceUpdatedAt: safeDate(row.modified),
    researchUpdatedAt: null,
    sourceRef: `posts:${row.id}`,
    href: `/post/${encodeURIComponent(clean(row.slug))}`,
    value: null,
    numbers: [],
    researchCount: 0,
    publicState: "published_source_representation",
  };
}

export function topicRowToWorldUpdate(row, { publicPeople = [] } = {}) {
  if (!row?.id) return null;
  const approvedAt = safeDate(row.approved_at);
  const createdAt = safeDate(row.created_at);
  return {
    id: `topic:${row.id}`,
    kind: "convergence",
    label: clean(row.title) || CONVERGENCE,
    summary: clean(row.subtitle) || null,
    creator: publicCreatorLabel(row.created_by, publicPeople),
    at: approvedAt || createdAt,
    approvedAt,
    createdAt,
    slug: clean(row.slug) || null,
    value: Array.isArray(row.highlight_numbers) && row.highlight_numbers.length
      ? finite(row.highlight_numbers[0])
      : (Array.isArray(row.numbers) && row.numbers.length ? finite(row.numbers[0]) : null),
    numbers: Array.isArray(row.numbers) ? row.numbers.map(finite).filter((value) => value != null) : [],
    sourceRef: `topic_cards:${row.id}`,
    publicState: "approved_public_projection",
  };
}

export function researchRowToWorldUpdate(row, { publicPeople = [] } = {}) {
  if (!row?.id) return null;
  const status = clean(row.status).toLowerCase();
  if (!["approved", "canonical"].includes(status)) return null;
  const createdAt = safeDate(row.created_at);
  const value = finite(row.value);
  const contributor = clean(row.contributor);
  const person = publicPersonForName(contributor, publicPeople);
  return {
    id: `research:${row.id}`,
    kind: "finding",
    findingKind: clean(row.kind) || "observation",
    label: clean(row.statement) || "ממצא מחקר חדש",
    summary: clean(row.evidence) || null,
    creator: publicCreatorLabel(contributor, publicPeople),
    creatorSlug: person?.slug || null,
    at: createdAt,
    approvedAt: null,
    createdAt,
    slug: null,
    value,
    numbers: value == null ? [] : [value],
    sourceRef: clean(row.source_ref) || `research_objects:${row.id}`,
    publicState: "authorized_research_projection",
  };
}

export function buildWorldDiscoveryStream(input = [], { creator = "all", limit = 18, publicPeople = [] } = {}) {
  const safeCreator = clean(creator);
  const topicRows = Array.isArray(input) ? input : (Array.isArray(input?.topics) ? input.topics : []);
  const researchRows = Array.isArray(input) ? [] : (Array.isArray(input?.research) ? input.research : []);
  const postRows = Array.isArray(input) ? [] : (Array.isArray(input?.posts) ? input.posts : []);
  const groupItems = Array.isArray(input?.groupItems) ? input.groupItems : [];
  const sourceByOccurrence = new Map();
  for (const item of [...postRows.map((row) => postRowToWorldUpdate(row, { publicPeople })).filter(Boolean), ...groupItems]) {
    if (item?.kind === "source" && item.sourceRef && !sourceByOccurrence.has(item.sourceRef)) {
      sourceByOccurrence.set(item.sourceRef, { ...item });
    }
  }
  const sourceItems = [...sourceByOccurrence.values()];
  // Collapse authorized research on the SAME source occurrence; do not multiply arrivals
  // or treat repeated findings as independent sources. Unrelated findings keep their identities.
  const findingItems = researchRows.map((row) => researchRowToWorldUpdate(row, { publicPeople }))
    .filter(Boolean)
    .filter((item) => {
      const source = sourceByOccurrence.get(researchSourceOccurrenceKey(item.sourceRef));
      if (!source) return true;
      source.researchCount += 1;
      if (item.at && (!source.researchUpdatedAt || Date.parse(item.at) > Date.parse(source.researchUpdatedAt))) {
        source.researchUpdatedAt = item.at;
      }
      return false;
    });

  const candidates = [
    ...sourceItems,
    ...topicRows.map((row) => topicRowToWorldUpdate(row, { publicPeople })),
    ...findingItems,
  ].filter(Boolean);

  const max = Math.max(1, Math.min(Number(limit) || 18, 40));
  const byTime = (a, b) => {
    const atA = a.at ? Date.parse(a.at) : 0;
    const atB = b.at ? Date.parse(b.at) : 0;
    return atB - atA || a.id.localeCompare(b.id);
  };
  const items = candidates
    .filter((item) => safeCreator === "all" || item.creator === safeCreator)
    .sort(byTime)
    .slice(0, max);

  const creators = [...new Set(candidates.map((item) => item.creator).filter(Boolean))];
  // Creator chips come from every candidate, but the visible list is only the last N. Expose how many of each
  // creator are in the recent window so a chip with 0 is shown as "none in recent", never as an empty library.
  const recentWindow = [...candidates].sort(byTime).slice(0, max);
  const recentCounts = {};
  for (const item of recentWindow) if (item.creator) recentCounts[item.creator] = (recentCounts[item.creator] || 0) + 1;

  return {
    items,
    // Source movement stays available even when a burst of research fills the mixed window.
    // This is the same bounded public set, not another feed or reader.
    arrivals: sourceItems.filter(item => safeCreator === "all" || item.creator === safeCreator).sort(byTime).slice(0, 40),
    creators,
    recentCounts,
    total: items.length,
    sourceCounts: {
      sources: candidates.filter((item) => item.kind === "source").length,
      findings: candidates.filter((item) => item.kind === "finding").length,
      convergences: candidates.filter((item) => item.kind === "convergence").length,
    },
    note: "Latest authorized source posts + Research Findings + approved public Convergences. Source arrival is not research verification; order is time, never truth rank.",
  };
}

export async function fetchWorldDiscoveryStream({ limit = 18, publicPeople = [], includeResearch = false } = {}) {
  const requested = Math.max(1, Math.min(Number(limit) || 18, 40));
  const topicPromise = fetchTopicCardList({
    limit: Math.min(40, Math.max(requested, 24)),
    offset: 0,
    rankByMeterScore: false,
  });
  const researchPromise = includeResearch
    ? import("../supabase.js").then(async ({ supabase }) => {
        const { data, error } = await supabase
          .from("research_objects")
          .select("id,created_at,kind,statement,evidence,value,source_ref,contributor,status")
          .in("status", ["approved", "canonical"])
          .order("created_at", { ascending: false })
          .limit(Math.min(80, Math.max(requested * 2, 40)));
        if (error) throw error;
        return Array.isArray(data) ? data : [];
      })
    : Promise.resolve([]);

  // Public Source is read from the existing posts RLS boundary, never a privileged
  // legacy WhatsApp endpoint. Group messages require a separately verified source reader.
  const postsPromise = import("../supabase.js").then(async ({ supabase }) => {
    const { data, error } = await supabase
      .from("posts")
      .select("id,slug,title,excerpt,author,source,tags,home_hidden,date,modified,created_at")
      .eq("home_hidden", false)
      .not("tags", "cs", "{טיוטה}")
      .not("tags", "cs", "{פורום}")
      .in("source", ["wordpress", "SOD1820", "sod1820", "source_document", "ai", "uploaded_file"])
      .order("date", { ascending: false, nullsFirst: false })
      .limit(Math.min(80, Math.max(requested * 2, 32)));
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  });

  // Failed/restricted research access must not erase otherwise-readable source posts.
  const [topicResult, researchResult, postsResult, groupResult] = await Promise.allSettled([
    topicPromise, researchPromise, postsPromise, fetchGroupSourceArrivals({ limit: requested }),
  ]);
  if (topicResult.status === "rejected" && postsResult.status === "rejected" && groupResult.status === "rejected") {
    throw new Error("world_public_arrivals_unavailable");
  }
  const topics = topicResult.status === "fulfilled" && Array.isArray(topicResult.value?.rows) ? topicResult.value.rows : [];
  const research = researchResult.status === "fulfilled" ? researchResult.value : [];
  const posts = postsResult.status === "fulfilled" ? postsResult.value : [];
  const groupItems = groupResult.status === "fulfilled" ? groupResult.value : [];
  return {
    ...buildWorldDiscoveryStream({ topics, research, posts, groupItems }, { limit: requested, publicPeople }),
    // Reader unavailable (not applied / error) => honest not_connected; never a fake "connected".
    groupArrivals: groupResult.status === "fulfilled" ? GROUP_ARRIVALS_CONNECTED : GROUP_ARRIVALS_AVAILABILITY,
    unavailableSources: [
      ...(topicResult.status === "rejected" ? ["topics"] : []),
      ...(researchResult.status === "rejected" && includeResearch ? ["research"] : []),
      ...(postsResult.status === "rejected" ? ["posts"] : []),
    ],
  };
}

// Visibility-bound refresh of the existing reader. No feed cache/store or private bundle sharing.
export function watchWorldDiscoveryStream({ onResult, onError, immediate = true, intervalMs = 60000, ...options } = {}) {
  let active = true;
  let pending = false;
  const refresh = async () => {
    if (!active || pending || document.visibilityState === "hidden") return;
    pending = true;
    try {
      const result = await fetchWorldDiscoveryStream(options);
      if (active) onResult?.(result);
    } catch (error) {
      if (active) onError?.(error);
    } finally { pending = false; }
  };
  const timer = window.setInterval(refresh, Math.max(60000, intervalMs));
  document.addEventListener("visibilitychange", refresh);
  window.addEventListener("focus", refresh);
  if (immediate) refresh();
  return () => {
    active = false;
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", refresh);
    window.removeEventListener("focus", refresh);
  };
}
