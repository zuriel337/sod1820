// World 2029 · Thematic Universe projection (presentation only).
// One World, one thematic lens set. Source works (posts) and public Convergences (topic_cards)
// stay DISTINCT item kinds; writer/source identity is an attribution lens, never a separate world.
// Access: this module only classifies rows ALREADY returned by the existing anon/RLS readers
// (posts_anon_read, topic_cards_public). It never changes privacy_scope/RLS, never publishes
// research_objects, and never treats "open to visitors" as verification or canonicalization.
import { topicRowToWorldUpdate } from "./worldDiscoveryStream.js";

const clean = (value) => (value == null ? "" : String(value).trim());

export const WORLD_THEME_ALL = "all";

// Themes group existing post categories (owner: posts.categories). They are lenses, not new stores.
export const WORLD_THEMES = Object.freeze([
  { key: "redemption", label: "רמזי גאולה", hint: "רמזים, עלוני גאולה ומשיח",
    categories: ["רמזים חזקים", "רמזים מצדיקים", "עלוני גאולה", "משיח בתשע\"ו", "בית המקדש השלישי", "עשרה בטבת", "שבעים שנה"] },
  { key: "timeless", label: "סיפורים על־זמניים", hint: "אירועים, מסרים והתחזקות",
    categories: ["תיעוד אירועים", "מסרים", "התחזקות", "אסונות/תופעות טבע", "ארה\"ב", "הרצאות"] },
  { key: "source_works", label: "יצירות מקור", hint: "סוד החשמל, אותיות ומספרים, צפונות בתורה",
    categories: ["סוד החשמל", "סוד האותיות והמספרים", "צפונות בתורה", "חכמת החיבור", "גימטריות", "גלריות גימטריה", "מימד חמש", "סוד 1820"] },
]);

// posts.source values that are original authored/imported source works.
const SOURCE_WORK_ORIGINS = new Set(["wordpress", "sod1820"]);
// AI analyses stay distinct from sources; the rest need Human Gate / rights review before opening.
const ANALYSIS_ORIGINS = new Set(["ai", "gpt-draft"]);
const PRIVATE_MARKERS = /(^|[^a-z])(private|off|person_only|whatsapp|confidential)([^a-z]|$)|וואטסאפ|פרטי/i;

export function classifyWorldSourceAccess(post) {
  if (!post || !clean(post.slug) || !clean(post.title)) return { eligible: false, reason: "missing_identity" };
  const origin = clean(post.source).toLowerCase();
  if (ANALYSIS_ORIGINS.has(origin)) return { eligible: false, reason: "ai_analysis_not_source" };
  if (!SOURCE_WORK_ORIGINS.has(origin)) return { eligible: false, reason: "origin_needs_human_gate" };
  const markers = [post.privacy_scope, post.access, ...(Array.isArray(post.tags) ? post.tags : [])].map(clean).join(" ");
  if (PRIVATE_MARKERS.test(markers)) return { eligible: false, reason: "private_marker" };
  return { eligible: true, reason: "public_source_work" };
}

function themeKeysForCategories(categories) {
  const set = new Set((Array.isArray(categories) ? categories : []).map(clean));
  return WORLD_THEMES.filter((theme) => theme.categories.some((cat) => set.has(cat))).map((theme) => theme.key);
}

function safeDate(value) {
  const raw = clean(value);
  const time = raw ? Date.parse(raw) : NaN;
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

export function postToWorldSourceWork(post) {
  const access = classifyWorldSourceAccess(post);
  if (!access.eligible) return null;
  const slug = clean(post.slug);
  const categories = (Array.isArray(post.categories) ? post.categories : []).map(clean).filter(Boolean);
  return {
    id: `post:${post.id ?? slug}`,
    kind: "source_work",
    label: clean(post.title),
    summary: clean(post.excerpt) || null,
    writer: clean(post.author) || null, // attribution lens only; null stays null
    at: safeDate(post.date) || safeDate(post.created_at),
    themes: themeKeysForCategories(categories),
    categories,
    href: `/post/${encodeURIComponent(slug)}`,
    sourceRef: `posts:${post.id ?? slug}`,
    imageUrl: clean(post.thumb_url) || null,
  };
}

export function topicToWorldConvergence(row) {
  const update = topicRowToWorldUpdate(row);
  if (!update || !update.slug) return null;
  return {
    id: update.id,
    kind: "convergence",
    slug: update.slug,
    label: update.label,
    summary: update.summary,
    writer: update.creator,
    at: update.at,
    value: update.value, // null stays null — never Number(null) -> 0
    href: `/topic/${encodeURIComponent(update.slug)}`,
    sourceRef: update.sourceRef,
  };
}

export function categoriesForTheme(theme) {
  const found = WORLD_THEMES.find((t) => t.key === theme);
  return found ? [...found.categories] : WORLD_THEMES.flatMap((t) => t.categories);
}

// Topic <-> theme relations must be source-attested/owner-backed ({ themeKey, topicSlug, attestedBy }).
// No such owner field exists on topic_cards_public today, so by default NO topic is linked to a theme:
// a post category never manufactures topic identity or a topic relationship.
export function attestedTopicsForTheme(topics, relations, theme) {
  if (theme === WORLD_THEME_ALL || !WORLD_THEMES.some((t) => t.key === theme)) return { linked: topics, attested: false };
  const slugs = new Set((Array.isArray(relations) ? relations : [])
    .filter((r) => r && r.themeKey === theme && clean(r.topicSlug) && clean(r.attestedBy))
    .map((r) => clean(r.topicSlug)));
  return { linked: topics.filter((t) => t.slug && slugs.has(t.slug)), attested: slugs.size > 0 };
}

// Pure projection over rows ALREADY loaded for the focused theme (source-side paginated).
// `page` carries honest bounds: total (server count or null when unknown) and hasMore.
export function buildWorldThematicUniverse({ posts = [], topics = [], page = {}, relations = [] } = {}, { theme = WORLD_THEME_ALL, writer = WORLD_THEME_ALL } = {}) {
  const rows = Array.isArray(posts) ? posts : [];
  const themeValid = WORLD_THEMES.some((t) => t.key === theme);
  const allWorks = rows.map(postToWorldSourceWork).filter(Boolean);
  const excluded = rows.reduce((acc, post) => {
    const { eligible, reason } = classifyWorldSourceAccess(post);
    if (!eligible) acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {});
  const convergences = (Array.isArray(topics) ? topics : []).map(topicToWorldConvergence).filter(Boolean);
  const byTime = (a, b) => (Date.parse(b.at || 0) || 0) - (Date.parse(a.at || 0) || 0) || a.id.localeCompare(b.id);
  const works = allWorks
    .filter((w) => !themeValid || w.themes.includes(theme))
    .filter((w) => writer === WORLD_THEME_ALL || w.writer === writer)
    .sort(byTime);
  const { linked, attested } = attestedTopicsForTheme(convergences.sort(byTime), relations, theme);
  const total = page.total != null && Number.isFinite(Number(page.total)) ? Number(page.total) : null;
  return {
    writers: [...new Set(allWorks.map((w) => w.writer).filter(Boolean))].sort(),
    sourceWorks: works,
    convergences: linked,
    topicRelation: theme === WORLD_THEME_ALL ? "all" : attested ? "attested" : "none_attested",
    bounds: { total, loaded: rows.length, hasMore: Boolean(page.hasMore), totalKnown: total != null },
    excluded,
    note: "Open to visitors ≠ verified. Source works, AI analyses and Convergences are distinct kinds; order is time, never truth rank.",
  };
}

const SOURCE_ORIGIN_LIST = [...SOURCE_WORK_ORIGINS];
const POST_FIELDS = "id,title,slug,date,created_at,excerpt,categories,author,source,tags,thumb_url";
export const WORLD_THEME_PAGE_SIZE = 24;

// Source-side, category-specific, bounded pagination (no global LIMIT). Origin filter is applied
// server-side so the count reflects source works; private markers are still screened client-side
// and reported in `excluded`.
export async function fetchWorldThemePosts({ theme = WORLD_THEME_ALL, offset = 0, limit = WORLD_THEME_PAGE_SIZE } = {}) {
  const { supabase } = await import("../supabase.js");
  const size = Math.max(1, Math.min(Number(limit) || WORLD_THEME_PAGE_SIZE, 48));
  const start = Math.max(0, Number(offset) || 0);
  const { data, error, count } = await supabase.from("posts")
    .select(POST_FIELDS, { count: "exact" })
    .not("slug", "is", null)
    .in("source", SOURCE_ORIGIN_LIST)
    .overlaps("categories", categoriesForTheme(theme))
    .order("date", { ascending: false })
    .order("id", { ascending: true })
    .range(start, start + size - 1);
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  const total = count != null && Number.isFinite(Number(count)) ? Number(count) : null;
  return { posts: rows, total, hasMore: total != null ? start + rows.length < total : rows.length === size };
}

export async function fetchWorldThemeCounts() {
  const { supabase } = await import("../supabase.js");
  const entries = await Promise.all(WORLD_THEMES.map(async (t) => {
    const { count, error } = await supabase.from("posts")
      .select("id", { count: "exact", head: true })
      .not("slug", "is", null)
      .in("source", SOURCE_ORIGIN_LIST)
      .overlaps("categories", t.categories);
    return [t.key, error || count == null ? null : Number(count)]; // unknown stays null, never 0
  }));
  return Object.fromEntries(entries);
}

export async function fetchWorldThemeTopics({ limit = 12 } = {}) {
  const { fetchTopicCardList } = await import("./topicConvergence.js");
  const result = await fetchTopicCardList({ limit, offset: 0 });
  return result?.rows || [];
}
