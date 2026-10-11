// Selective continuation of PR #997 on current main. Category lenses consume published
// posts; they do not create Topics, graph relationships, publication or verification.
import { getPublicResearchClient } from "./researchViewMode.js";
import { classifyCorpusRows, publicOnlyFilter } from "./worldSourceCorpus.js";
import { WORLD_PUBLIC_POST_ORIGINS } from "./worldDiscoveryStream.js";

export const WORLD_THEME_ALL = "all";
export const WORLD_THEME_PAGE_SIZE = 24;
// Presentation groupings from the existing PR; exact posts.categories membership only.
export const WORLD_THEMES = Object.freeze([
  { key: "redemption", label: "רמזי גאולה", categories: ["רמזים חזקים", "רמזים מצדיקים", "עלוני גאולה", "משיח בתשע\"ו", "בית המקדש השלישי", "עשרה בטבת", "שבעים שנה"] },
  { key: "timeless", label: "סיפורים על־זמניים", categories: ["תיעוד אירועים", "מסרים", "התחזקות", "אסונות/תופעות טבע", "ארה\"ב", "הרצאות"] },
  { key: "source_works", label: "יצירות מקור", categories: ["סוד החשמל", "סוד האותיות והמספרים", "צפונות בתורה", "חכמת החיבור", "גימטריות", "גלריות גימטריה", "מימד חמש", "סוד 1820"] },
]);
const clean = (value) => String(value ?? "").trim();
const POST_FIELDS = "id,slug,title,excerpt,date,author,source,tags,home_hidden";

export function readWorldThemeSearch(search) {
  const params = new URLSearchParams(search);
  const theme = params.get("theme");
  const page = Number(params.get("sourcePage") ?? 0);
  return {
    theme: WORLD_THEMES.some((item) => item.key === theme) ? theme : WORLD_THEME_ALL,
    writer: clean(params.get("writer")) || WORLD_THEME_ALL,
    page: Number.isSafeInteger(page) && page >= 0 ? Math.min(page, 1000000) : 0,
  };
}

// Counts and pages use the SAME anonymous publication boundary, even in an admin session.
function publicThemeQuery(client, { theme = WORLD_THEME_ALL, writer = WORLD_THEME_ALL } = {}, head = false) {
  let query = client.from("posts")
    .select(head ? "id" : POST_FIELDS, { count: "exact", head })
    .not("slug", "is", null)
    .in("source", WORLD_PUBLIC_POST_ORIGINS)
    .or(publicOnlyFilter());
  const selected = WORLD_THEMES.find((item) => item.key === theme);
  if (selected) {
    // Supabase's array shorthand joins values without escaping embedded quotes (ארה"ב,
    // משיח בתשע"ו). A quoted PostgreSQL array literal preserves the exact category names.
    const literal = `{${selected.categories.map((value) => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",")}}`;
    query = query.overlaps("categories", literal);
  }
  if (writer !== WORLD_THEME_ALL) query = query.eq("author", writer);
  return query;
}

export async function fetchWorldThemePosts({ theme = WORLD_THEME_ALL, writer = WORLD_THEME_ALL, page = 0 } = {}, client = getPublicResearchClient()) {
  const start = page * WORLD_THEME_PAGE_SIZE;
  const { data, count, error } = await publicThemeQuery(client, { theme, writer })
    .order("date", { ascending: false, nullsFirst: false })
    .order("id", { ascending: true })
    .range(start, start + WORLD_THEME_PAGE_SIZE - 1);
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  const { items, excluded } = classifyCorpusRows(rows);
  const byId = new Map(rows.map((row) => [String(row.id), row]));
  const total = count == null ? null : count;
  return {
    items: items.map((item) => ({ ...item, writer: clean(byId.get(item.id)?.author), origin: byId.get(item.id)?.source })),
    excluded, total, start, read: rows.length,
    hasMore: total == null ? rows.length === WORLD_THEME_PAGE_SIZE : start + rows.length < total,
  };
}

export async function fetchWorldThemeCounts(client = getPublicResearchClient()) {
  return Object.fromEntries(await Promise.all([WORLD_THEME_ALL, ...WORLD_THEMES.map((item) => item.key)].map(async (theme) => {
    const { count, error } = await publicThemeQuery(client, { theme }, true);
    return [theme, error || count == null ? null : count];
  })));
}
