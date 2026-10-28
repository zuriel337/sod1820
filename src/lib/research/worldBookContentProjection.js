// Public Books → World Content Projection.
//
// This is an adapter over the canonical Book reader. A Book node is retained
// for browsing even when it has no documented source_ref prefix; only a
// documented prefix becomes a source identity in the shared World contract.

import { fetchBookEntities } from "./bookResearchProjection.js";
import { buildPublicWorldContentProjectionV1 } from "./publicWorldContentProjectionV1.js";

const clean = (value) => value == null ? "" : String(value).trim();
const unique = (values) => [...new Set(values.map(clean).filter(Boolean))];

function bookSlug(book) {
  return clean(book?.metadata?.slug) || null;
}

function bookHref(book) {
  const slug = bookSlug(book);
  return slug ? `/book/${encodeURIComponent(slug)}` : "/book";
}

function sourcePrefixes(book) {
  return unique(Array.isArray(book?.metadata?.source_ref_prefixes)
    ? book.metadata.source_ref_prefixes
    : []);
}

export function buildPublicBookContentProjection(books = []) {
  const sources = [];
  const occurrences = [];
  const cards = [];
  for (const book of Array.isArray(books) ? books : []) {
    const id = clean(book?.id);
    const title = clean(book?.label) || "ספר";
    const href = bookHref(book);
    const prefixes = sourcePrefixes(book);
    cards.push({
      id: id || bookSlug(book) || title,
      facet: "book",
      label: title,
      sub: clean(book?.description) || (prefixes.length ? "מקור מתועד זמין לעיון" : "זהות ספר בעץ; מקור מפורט טרם תועד"),
      href,
      refId: bookSlug(book) || id || title,
      sourceCount: prefixes.length,
    });
    for (const sourceRef of prefixes) {
      if (!sources.some((row) => row.sourceRef === sourceRef)) {
        sources.push({
          sourceRef,
          title,
          sourceHref: href,
          publisher: { key: "books", label: "ספרים ומקורות" },
        });
      }
      occurrences.push({
        occurrenceRef: `book-identity:${id || bookSlug(book) || title}:${sourceRef}`,
        sourceRef,
        locator: clean(book?.identity_key) || null,
        href,
        times: { occurredAt: null, publishedAt: null, updatedAt: book?.created_at || null },
      });
    }
  }
  return Object.freeze({
    cards: Object.freeze(cards),
    contentProjection: buildPublicWorldContentProjectionV1({
      sources,
      occurrences,
      seriesCategories: sources.length ? [{
        key: "books-and-sources", kind: "category", label: "ספרים ומקורות", sourceRefs: sources.map((row) => row.sourceRef),
      }] : [],
      coverage: {
        sources: { available: true }, occurrences: { available: true }, clusters: { available: false },
        seriesCategories: { available: true }, findings: { available: false }, treeRelations: { available: false }, legacyTopics: { available: false },
      },
    }),
  });
}

export async function fetchWorldPublicBookContent({ reader = fetchBookEntities, limit = 12 } = {}) {
  const rows = await reader({ limit });
  return buildPublicBookContentProjection(rows);
}
