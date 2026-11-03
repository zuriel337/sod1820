// Bounded public continuations over the existing els_records / nodes owners.
// No engine, publication action, authenticated fallback or private research read.
import { getBookReaderManifest } from "../../data/bookReader2029.js";
import { hasExactSavedMatrix } from "../elsSavedMatrix.js";
import { publicAuthorName } from "../publicIdentity.js";
import { publicNowMediaHref } from "./systemFeedPublicSources2029.js";

const CIPHER_FIELDS = "id,slug,title,search_term,scope,skip_distance,direction,start_index,corpus_id,image_url,description,author_name,source,created_at,status,visibility";
const BOOK_FIELDS = "id,type,label,description,identity_key,is_active,book_slug:metadata->>slug,source_ref_prefixes:metadata->source_ref_prefixes,identity_tiers:metadata->identity_tiers";
const clean = value => typeof value === "string" ? value.trim() : "";
const slugValue = value => {
  const slug = clean(value);
  return slug && slug.length <= 250 && !/[\u0000-\u001f\u007f/\\?#]/.test(slug) && !/%(?:2f|5c)/i.test(slug) ? slug : null;
};
const integer = (value, fallback, min, max) => Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Math.trunc(Number(value)))) : fallback;
const canceled = signal => { if (signal?.aborted) throw new DOMException("Library reading canceled", "AbortError"); };
const searchTerm = value => clean(value).replace(/[%,_()."\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);

// This specification can also be consumed by the existing HTTP metadata owner.
// PUBLIC nodes are admitted by canonical graph RLS, never a duplicated space rule.
export function publicLibraryQuery2029({ kind = "codes", slug = null, collection = "published", q = "", offset = 0, limit = 24 } = {}) {
  if (!["books", "codes"].includes(kind)) throw new Error("unknown_public_library");
  const size = integer(limit, 24, 1, 48), start = integer(offset, 0, 0, 100_000);
  const term = searchTerm(q), exactSlug = slug == null ? null : slugValue(slug);
  if (slug != null && !exactSlug) return null;
  if (kind === "books") return {
    table: "nodes", select: BOOK_FIELDS,
    eq: { type: "book", is_active: true, ...(exactSlug ? { "metadata->>slug": exactSlug } : {}) },
    ilike: !exactSlug && term ? { label: `%${term}%` } : {},
    order: [["label", true], ["id", true]], offset: exactSlug ? 0 : start, limit: exactSlug ? 2 : size + 1, pageSize: size,
  };
  return {
    table: "els_records", select: `${CIPHER_FIELDS}${exactSlug ? ",saved_shape:positions->>shapeUrl,saved_findings:positions->findings" : ""}`,
    eq: { status: "published", visibility: "public", ...(exactSlug ? { slug: exactSlug } : collection === "research" ? { source: "research" } : {}) },
    or: [!exactSlug && collection !== "research" ? "source.is.null,source.neq.research" : null,
      !exactSlug && term ? `search_term.ilike.%${term}%,title.ilike.%${term}%` : null].filter(Boolean),
    order: [["created_at", false], ["id", false]], offset: exactSlug ? 0 : start, limit: exactSlug ? 2 : size + 1, pageSize: size,
  };
}

export async function readPublicLibraryRows2029(spec, { signal } = {}) {
  canceled(signal);
  const { getPublicResearchClient } = await import("./researchViewMode.js");
  let query = getPublicResearchClient().from(spec.table).select(spec.select);
  for (const [field, value] of Object.entries(spec.eq || {})) query = query.eq(field, value);
  for (const [field, value] of Object.entries(spec.ilike || {})) query = query.ilike(field, value);
  for (const value of spec.or || []) query = query.or(value);
  for (const [field, ascending] of spec.order || []) query = query.order(field, { ascending });
  query = query.range(spec.offset, spec.offset + spec.limit - 1);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  canceled(signal);
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error("invalid_public_library_response");
  return data;
}

export function projectPublicCipher2029(row, { detail = false } = {}) {
  const slug = slugValue(row?.slug), id = clean(row?.id);
  if (!slug || !id || row.status !== "published" || row.visibility !== "public") return null;
  const title = clean(row.title) || clean(row.search_term);
  if (!title) return null;
  const exact = hasExactSavedMatrix(row);
  const image = publicNowMediaHref(row.image_url);
  const result = {
    kind: "codes", id, slug, title, href: `/codes/${encodeURIComponent(slug)}`,
    sourceRef: `els_records:${id}`, sourceKind: "published_saved_cipher", sourceCollection: row.source === "research" ? "research" : "published",
    description: clean(row.description), author: publicAuthorName(row.author_name), createdAt: clean(row.created_at) || null,
    term: clean(row.search_term), scope: ["torah", "tanakh"].includes(row.scope) ? row.scope : null,
    skip: Number.isSafeInteger(row.skip_distance) ? row.skip_distance : null,
    direction: ["fwd", "back"].includes(row.direction) ? row.direction : null,
    image, exactLocator: exact ? { corpusId: row.corpus_id, startIndex: row.start_index, skip: row.skip_distance, direction: row.direction } : null,
  };
  if (detail) {
    result.matrixImage = publicNowMediaHref(row.saved_shape);
    // These are saved calculation annotations, never additional independent sources.
    const seen = new Set();
    result.annotations = (Array.isArray(row.saved_findings) ? row.saved_findings : []).flatMap(finding => {
      const term = clean(finding?.t);
      if (!term || seen.has(term)) return [];
      seen.add(term);
      return [{ term }];
    }).slice(0, 80);
    result.matrixState = result.matrixImage ? "saved_image" : "saved_matrix_image_unavailable";
  }
  return result;
}

// A current anonymous node response admits only its public identity. A static
// manifest is a reader configuration; it cannot grant access to a source file.
export function projectPublicBook2029(row) {
  const slug = slugValue(row?.book_slug), id = clean(row?.id), title = clean(row?.label);
  if (!slug || !id || !title || row.type !== "book" || row.is_active !== true) return null;
  const manifest = getBookReaderManifest(slug), digitalObject = row.identity_tiers?.digital_object;
  const sourceRefs = [...new Set((Array.isArray(row.source_ref_prefixes) ? row.source_ref_prefixes : []).filter(ref => typeof ref === "string" && /^book:[^\s?#]+$/.test(ref)))];
  let sourceUrl = null;
  if (digitalObject?.mime === "application/pdf") {
    if (digitalObject.bucket === "gallery" && typeof digitalObject.path === "string"
      && digitalObject.path.startsWith("Book/") && !/[\\?#\u0000-\u001f]/.test(digitalObject.path)
      && digitalObject.path.split("/").every(part => part && part !== "." && part !== "..")) {
      sourceUrl = publicNowMediaHref(`https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/${digitalObject.path.split("/").map(encodeURIComponent).join("/")}`);
    } else if (digitalObject.url) {
      try {
        const url = new URL(digitalObject.url);
        if (url.protocol === "https:" && !url.search && !url.hash && !url.username && !url.password) sourceUrl = url.href;
      } catch { /* unresolved source */ }
    }
  }
  // Exact URL + current source identity binding; a label/slug match is insufficient.
  const bound = manifest && sourceRefs.length === 1 && sourceUrl === manifest.pdfUrl
    && (!manifest.pdfSha256 || !digitalObject.sha256 || manifest.pdfSha256 === digitalObject.sha256)
    && (!manifest.pdfBytes || !digitalObject.size_bytes || manifest.pdfBytes === Number(digitalObject.size_bytes));
  const publicManifest = bound ? {
    slug, title, introduction: clean(row.description), author: manifest.author, language: manifest.language,
    pdfUrl: sourceUrl, pdfPages: manifest.pdfPages, pdfRenderer: manifest.pdfRenderer,
    pdfSha256: manifest.pdfSha256, pdfBytes: manifest.pdfBytes,
    sourceIdentity: sourceRefs[0], pageTextUrl: manifest.pageTextUrl,
    chapters: manifest.chapters.map(({ id, title, from, to }) => ({ id, title, from, to })), readingKeys: [],
  } : null;
  return {
    kind: "books", id, slug, title, description: clean(row.description), href: `/book/${encodeURIComponent(slug)}`,
    identityKey: clean(row.identity_key), sourceRef: bound ? sourceRefs[0] : null, sourceHref: bound ? sourceUrl : null, manifest: publicManifest,
    readerState: bound ? "source_bound" : "public_source_binding_unavailable",
  };
}

export async function publicBookSourceAvailable2029(manifest, { signal, fetchImpl = fetch } = {}) {
  canceled(signal);
  const response = await fetchImpl(manifest.pdfUrl, { method: "HEAD", credentials: "omit", cache: "no-store", redirect: "error", signal });
  canceled(signal);
  // Browser and HTTP metadata callers agree: an external file without CORS
  // cannot pass the existing in-page reader's current-file check.
  if (!publicNowMediaHref(manifest.pdfUrl) && !["*", "https://sod1820.co.il"].includes(response.headers.get("access-control-allow-origin"))) return false;
  return response.ok && /^application\/pdf(?:\s*;|$)/i.test(response.headers.get("content-type") || "")
    && (!response.url || response.url === manifest.pdfUrl);
}

async function rowsFor(spec, options) {
  canceled(options.signal);
  const rows = await (options.readRows || readPublicLibraryRows2029)(spec, { signal: options.signal });
  canceled(options.signal);
  if (!Array.isArray(rows)) throw new Error("invalid_public_library_response");
  return rows;
}

export async function fetchPublicLibrary2029(options = {}) {
  const spec = publicLibraryQuery2029(options);
  if (!spec) throw new Error("invalid_public_library_query");
  const rows = await rowsFor(spec, options), page = rows.slice(0, spec.pageSize), seen = new Set();
  const items = page.flatMap(row => {
    const item = options.kind === "books" ? projectPublicBook2029(row) : projectPublicCipher2029(row);
    if (!item || seen.has(item.id) || options.kind !== "books" && item.sourceCollection !== (options.collection === "research" ? "research" : "published")) return [];
    seen.add(item.id);
    return [item];
  });
  return { items, more: rows.length > spec.pageSize, nextOffset: spec.offset + page.length };
}

export async function fetchPublicLibraryItem2029(kind, slug, options = {}) {
  const spec = publicLibraryQuery2029({ kind, slug });
  if (!spec) return null;
  const rows = await rowsFor(spec, options);
  // An ambiguous identity is not resolved by choosing the first response row.
  if (rows.length !== 1) return null;
  const item = kind === "books" ? projectPublicBook2029(rows[0]) : projectPublicCipher2029(rows[0], { detail: true });
  if (item?.slug !== slugValue(slug)) return null;
  // Existing launch decision: the approved Ahavat prototype can be read while
  // incomplete. Other unfinished books keep their identity and preparation
  // card; entering one must not load a closed source reader/PDF in the background.
  if (kind === "books" && item.slug !== "ahavat-torah") return { ...item, readerState:"preparation_closed", manifest:null };
  if (kind === "books" && item.readerState === "source_bound") {
    let available = false;
    try { available = await (options.checkBookSource || publicBookSourceAvailable2029)(item.manifest, { signal: options.signal }); }
    catch { canceled(options.signal); }
    canceled(options.signal);
    const external = !publicNowMediaHref(item.sourceHref);
    return { ...item, readerState: available ? "ready" : external ? "external_source_reader_unavailable" : "public_source_file_unavailable", manifest: available || external ? item.manifest : null };
  }
  return item;
}

export function publicLibraryMetadata2029({ kind = "codes", item = null, detail = false, loading = false, failed = false, collection = "published" } = {}) {
  const title = kind === "books" ? "ספרים ומקורות" : collection === "research" ? "פרסומי מחקר בצפנים" : "ספריית הצפנים";
  const known = !loading && !failed && (!detail || item);
  return {
    title: known && item ? item.title : detail ? loading ? "פותח את המקור" : failed ? "המקור לא נטען" : "הפריט אינו זמין לציבור" : title,
    description: known && item ? item.readerState === "preparation_closed" ? "הספר בהכנה. המקור והעבודה הקיימת נשמרים; הקריאה תיפתח בנפרד." : item.description || (kind === "books" ? "קריאה במקור הספר." : "פרסום צופן שמור. החישוב והפרשנות מוצגים בנפרד מן המקור.") : `${title} · קריאה במקורות ציבוריים.`,
    image: known ? item?.image || undefined : undefined,
    noindex: !known || collection === "research" || item?.sourceCollection === "research" || kind === "books" && detail && item?.readerState !== "ready",
  };
}
