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
    label: update.label,
    summary: update.summary,
    writer: update.creator,
    at: update.at,
    value: update.value, // null stays null — never Number(null) -> 0
    href: `/topic/${encodeURIComponent(update.slug)}`,
    sourceRef: update.sourceRef,
  };
}

export function buildWorldThematicUniverse({ posts = [], topics = [] } = {}, { theme = WORLD_THEME_ALL, writer = WORLD_THEME_ALL } = {}) {
  const allWorks = (Array.isArray(posts) ? posts : []).map(postToWorldSourceWork).filter(Boolean);
  const excluded = (Array.isArray(posts) ? posts : []).reduce((acc, post) => {
    const { eligible, reason } = classifyWorldSourceAccess(post);
    if (!eligible) acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {});
  const convergences = (Array.isArray(topics) ? topics : []).map(topicToWorldConvergence).filter(Boolean);
  const byTime = (a, b) => (Date.parse(b.at || 0) || 0) - (Date.parse(a.at || 0) || 0) || a.id.localeCompare(b.id);
  const themeValid = WORLD_THEMES.some((t) => t.key === theme);
  const works = allWorks
    .filter((w) => !themeValid || w.themes.includes(theme))
    .filter((w) => writer === WORLD_THEME_ALL || w.writer === writer)
    .sort(byTime);
  return {
    themes: WORLD_THEMES.map((t) => ({ key: t.key, label: t.label, hint: t.hint, count: allWorks.filter((w) => w.themes.includes(t.key)).length })),
    writers: [...new Set(allWorks.map((w) => w.writer).filter(Boolean))].sort(),
    sourceWorks: works,
    convergences: convergences.sort(byTime),
    excluded,
    note: "Open to visitors ≠ verified. Source works, AI analyses and Convergences are distinct kinds; order is time, never truth rank.",
  };
}

export async function fetchWorldThematicSources({ postLimit = 120 } = {}) {
  const [{ supabase }, { fetchTopicCardList }] = await Promise.all([import("../supabase.js"), import("./topicConvergence.js")]);
  const [postsRes, topicsRes] = await Promise.all([
    supabase.from("posts")
      .select("id,title,slug,date,created_at,excerpt,categories,author,source,tags,thumb_url")
      .not("slug", "is", null)
      .order("date", { ascending: false })
      .limit(Math.max(1, Math.min(Number(postLimit) || 120, 300))),
    fetchTopicCardList({ limit: 24, offset: 0 }),
  ]);
  if (postsRes.error) throw postsRes.error;
  return { posts: postsRes.data || [], topics: topicsRes?.rows || [] };
}
