import { supabase } from "../supabase.js";

export const TANACH_ORDINAL_SCOPE = Object.freeze({
  TORAH: "torah",
  TANAKH: "tanakh",
  BOOK: "book",
});

export const TANACH_ORDINAL_SCHEME = "technical_tanach_verses_order_v1";

function clean(value) {
  return value == null ? "" : String(value).trim();
}

function safeOrdinal(value) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export function technicalOrdinalRequest(ordinal, { scope = TANACH_ORDINAL_SCOPE.TORAH, book = null } = {}) {
  const normalizedOrdinal = safeOrdinal(ordinal);
  if (normalizedOrdinal == null) {
    return { ok: false, status: "invalid_ordinal", ordinal: null, scope: null, book: null };
  }

  const normalizedScope = clean(scope).toLowerCase();
  if (!Object.values(TANACH_ORDINAL_SCOPE).includes(normalizedScope)) {
    return { ok: false, status: "invalid_scope", ordinal: normalizedOrdinal, scope: normalizedScope, book: null };
  }

  const normalizedBook = normalizedScope === TANACH_ORDINAL_SCOPE.BOOK ? clean(book) : null;
  if (normalizedScope === TANACH_ORDINAL_SCOPE.BOOK && !normalizedBook) {
    return { ok: false, status: "book_required", ordinal: normalizedOrdinal, scope: normalizedScope, book: null };
  }

  return {
    ok: true,
    status: "ready",
    ordinal: normalizedOrdinal,
    offset: normalizedOrdinal - 1,
    scope: normalizedScope,
    book: normalizedBook,
    countingScheme: TANACH_ORDINAL_SCHEME,
  };
}

async function queryTechnicalOrdinal(request) {
  let query = supabase
    .from("tanach_verses")
    .select("book_idx,book,chapter,verse,text", { count: "exact" });

  if (request.scope === TANACH_ORDINAL_SCOPE.TORAH) {
    // The canonical Torah corpus is the first five ordered corpus parts (book_idx 0..4).
    // This is the same boundary used by the existing canonical ELS/Torah stream owner.
    query = query.lte("book_idx", 4);
  } else if (request.scope === TANACH_ORDINAL_SCOPE.BOOK) {
    query = query.eq("book", request.book);
  }

  const { data, error, count } = await query
    .order("book_idx", { ascending: true })
    .order("chapter", { ascending: true })
    .order("verse", { ascending: true })
    .range(request.offset, request.offset);

  if (error) throw error;
  return {
    count: Number.isFinite(Number(count)) ? Number(count) : null,
    row: Array.isArray(data) && data.length ? data[0] : null,
  };
}

/**
 * Returns the Nth verse in the CURRENT canonical tanach_verses ordering.
 *
 * This is deliberately a technical corpus projection. It does not reproduce or infer
 * historical/source-specific counting conventions such as the SOD 5845 convention.
 * Comparing a source-attested ordinal to this result is research evidence, not automatic
 * equivalence or contradiction resolution.
 */
export async function fetchTanachVerseByOrdinal(ordinal, {
  scope = TANACH_ORDINAL_SCOPE.TORAH,
  book = null,
  fetchRow = queryTechnicalOrdinal,
} = {}) {
  const request = technicalOrdinalRequest(ordinal, { scope, book });
  if (!request.ok) {
    return {
      ...request,
      verse: null,
      totalInScope: null,
      governance: {
        technicalProjection: true,
        sourceCountingSchemeInferred: false,
        semanticProof: false,
        truthPromotion: false,
      },
    };
  }

  const found = await fetchRow(request);
  const row = found?.row || null;
  const totalInScope = Number.isFinite(Number(found?.count)) ? Number(found.count) : null;

  if (!row) {
    return {
      ...request,
      status: "out_of_range",
      verse: null,
      totalInScope,
      governance: {
        technicalProjection: true,
        sourceCountingSchemeInferred: false,
        semanticProof: false,
        truthPromotion: false,
      },
    };
  }

  return {
    ...request,
    status: "ready",
    totalInScope,
    verse: {
      type: "verse",
      bookIdx: Number(row.book_idx),
      book: clean(row.book),
      chapter: Number(row.chapter),
      verse: Number(row.verse),
      ref: `${clean(row.book)} ${Number(row.chapter)}:${Number(row.verse)}`,
      text: clean(row.text),
    },
    governance: {
      technicalProjection: true,
      sourceCountingSchemeInferred: false,
      semanticProof: false,
      truthPromotion: false,
      note: "Current corpus ordinal only; source-specific counting conventions remain separate evidence.",
    },
  };
}

export default fetchTanachVerseByOrdinal;
