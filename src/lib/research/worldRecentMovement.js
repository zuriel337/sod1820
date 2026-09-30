import { supabase } from "../supabase.js";
import { fetchBookEntities } from "./bookResearchProjection.js";

const clean = (value) => value == null ? "" : String(value).trim();

function safeDate(value) {
  const raw = clean(value);
  if (!raw) return null;
  const time = Date.parse(raw);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

export function postRowToWorldMovement(row) {
  if (!row?.id || !clean(row.slug)) return null;
  const slug = clean(row.slug);
  return {
    id: "post:" + row.id,
    kind: "post",
    label: clean(row.title) || "Post",
    summary: clean(row.excerpt) || null,
    creator: "SOD1820",
    at: safeDate(row.modified) || safeDate(row.date),
    createdAt: safeDate(row.date),
    href: "/post/" + slug,
    slug,
    sourceRef: "posts:" + row.id,
    publicState: "published_post",
  };
}

export function bookRowToWorldMovement(row) {
  if (!row?.id) return null;
  const slug = clean(row?.metadata?.slug);
  if (!slug) return null;
  return {
    id: "book:" + row.id,
    kind: "book",
    label: clean(row.label) || "Book",
    summary: clean(row.description) || null,
    creator: "SOD1820",
    at: safeDate(row.created_at),
    createdAt: safeDate(row.created_at),
    href: "/book/" + slug,
    slug,
    sourceRef: "nodes:" + row.id,
    publicState: "active_book",
  };
}

export async function fetchWorldRecentMovement({ postLimit = 12, bookLimit = 12 } = {}) {
  const postCap = Math.max(1, Math.min(Number(postLimit) || 12, 24));
  const bookCap = Math.max(1, Math.min(Number(bookLimit) || 12, 24));
  const postsPromise = supabase
    .from("posts")
    .select("id,title,slug,excerpt,modified,date,space,home_hidden")
    .eq("space", "core")
    .eq("home_hidden", false)
    .not("slug", "is", null)
    .order("modified", { ascending: false, nullsFirst: false })
    .limit(postCap);
  const booksPromise = fetchBookEntities({ limit: bookCap, offset: 0 });
  const [postResult, books] = await Promise.all([postsPromise, booksPromise]);
  if (postResult.error) throw postResult.error;
  return {
    posts: (postResult.data || []).map(postRowToWorldMovement).filter(Boolean),
    books: (books || []).map(bookRowToWorldMovement).filter(Boolean),
  };
}
