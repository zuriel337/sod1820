import { supabase } from "../supabase.js";
import { stripHtml } from "../format.js";

// ONE reusable corpus/source selector for World: a corpus is a bounded, paginated READ over the existing
// public `posts` boundary, selected by exact category OR title phrase. It is not a Topic, taxonomy or store.
// "Recent updates" (the discovery feed) are the last N items and are NOT the library; this reader is the library.

const clean = (value) => value == null ? "" : String(value).trim();
export const CORPUS_PAGE_SIZE = 24;
const DRAFT_TAGS = ["טיוטה", "פורום"];

export const WORLD_SOURCE_CORPORA = Object.freeze([
  Object.freeze({ key: "sod-hashmal", label: "סוד החשמל", category: "סוד החשמל", titlePhrase: "סוד החשמל", authorLabel: "סוד החשמל" }),
]);

export function corpusForCreator(label) {
  const wanted = clean(label);
  return WORLD_SOURCE_CORPORA.find((spec) => spec.authorLabel === wanted || spec.label === wanted) || null;
}

// PostgREST `or` filter for: exact category member OR title containing the phrase. Values are quoted/escaped.
export function corpusOrFilter(spec) {
  const category = clean(spec?.category).replace(/["\\]/g, "");
  const phrase = clean(spec?.titlePhrase).replace(/[%,()*\\"]/g, "");
  const parts = [];
  if (category) parts.push(`categories.cs.{"${category}"}`);
  if (phrase) parts.push(`title.ilike.*${phrase}*`);
  return parts.join(",");
}

// Server-side suppression of draft/forum rows: the browser never receives them. NULL tags are public.
export function publicOnlyFilter() {
  return `tags.is.null,tags.not.ov.{${DRAFT_TAGS.join(",")}}`;
}

function isDraft(row) {
  return (Array.isArray(row?.tags) ? row.tags : []).some((tag) => DRAFT_TAGS.includes(clean(tag)));
}

// Rows are never silently dropped: excluded rows are counted and keep their reason.
export function classifyCorpusRows(rows = []) {
  const items = [];
  const excluded = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!clean(row?.slug)) { excluded.push({ id: row?.id ?? null, reason: "no_slug" }); continue; }
    if (isDraft(row)) { excluded.push({ id: row.id, reason: "draft_or_forum" }); continue; }
    const title = stripHtml(clean(row.title));
    if (!title) { excluded.push({ id: row.id, reason: "no_title" }); continue; } // never invent a title from a raw slug
    const excerpt = stripHtml(clean(row.excerpt));
    items.push({
      id: String(row.id),
      slug: clean(row.slug),
      title,
      excerpt: excerpt || null,
      date: row.date || null,
      homeHidden: row.home_hidden === true,
      href: `/post/${encodeURIComponent(clean(row.slug))}`,
    });
  }
  return { items, excluded };
}

export async function fetchCorpusPage(spec, page = 0, { client = supabase } = {}) {
  const filter = corpusOrFilter(spec);
  if (!client || !filter) return { items: [], excluded: [], total: null, hasMore: false };
  const from = page * CORPUS_PAGE_SIZE;
  const { data, error, count } = await client
    .from("posts")
    .select("id,slug,title,excerpt,date,home_hidden,tags", { count: "exact" })
    .or(filter)
    .or(publicOnlyFilter())
    .order("date", { ascending: false, nullsFirst: false })
    .order("id", { ascending: true })
    .range(from, from + CORPUS_PAGE_SIZE - 1);
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  const { items, excluded } = classifyCorpusRows(rows);
  const total = count != null && Number.isFinite(Number(count)) ? Number(count) : null;
  return {
    items,
    excluded,
    total, // exact PUBLIC count (drafts/forum suppressed by the server query), not the raw mapped total
    hasMore: total != null ? from + rows.length < total : rows.length === CORPUS_PAGE_SIZE,
  };
}
