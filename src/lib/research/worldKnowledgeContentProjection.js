// Knowledge-kind → shared World public-content adapter.
// Existing canonical readers decide access. This module only adapts the rows
// they already admitted; a knowledge kind is not a new corpus or tree.

import { buildPublicWorldContentProjectionV1 } from "./publicWorldContentProjectionV1.js";

const list = (value) => Array.isArray(value) ? value : [];
const clean = (value) => value == null ? "" : String(value).trim();

export function buildPublicCipherContentProjection(rows = []) {
  const sources = list(rows).flatMap((row) => {
    const id = clean(row?.id);
    if (!id) return [];
    const slug = clean(row?.slug);
    return [{
      sourceRef: `els_records:${id}`,
      title: clean(row?.title) || clean(row?.search_term) || "צופן ללא כותרת",
      sourceHref: slug ? `/codes/${encodeURIComponent(slug)}` : null,
      publisher: { key: "els", label: "צפני ELS" },
    }];
  });
  return buildPublicWorldContentProjectionV1({
    sources,
    occurrences: sources.map((source) => ({
      occurrenceRef: `public-cipher:${source.sourceRef}`,
      sourceRef: source.sourceRef,
      href: source.sourceHref,
      times: { occurredAt: null, publishedAt: null, updatedAt: null },
    })),
    seriesCategories: [{ key: "public-ciphers", kind: "category", label: "צפנים ציבוריים", sourceRefs: sources.map((row) => row.sourceRef) }],
    coverage: {
      sources: { available: true }, occurrences: { available: true }, clusters: { available: false },
      seriesCategories: { available: true }, findings: { available: false }, treeRelations: { available: false }, legacyTopics: { available: false },
    },
  });
}

export function buildPublicMediaContentProjection(items = []) {
  const sources = list(items).flatMap((item) => {
    const sourceRef = clean(item?.provenance?.sourceRef || item?.sourceRef);
    if (!sourceRef) return [];
    return [{
      sourceRef,
      title: clean(item?.presentation?.label || item?.label) || "פריט מדיה",
      sourceHref: item?.reopen?.galleries?.[0]?.href || null,
      publisher: { key: "public-media", label: "מדיה ציבורית" },
      media: item?.imageUrl ? [{ mediaRef: clean(item?.mediaId) || sourceRef, kind: "image", href: item.imageUrl, alt: clean(item?.presentation?.label || item?.label) || null, provenance: sourceRef }] : [],
    }];
  });
  return buildPublicWorldContentProjectionV1({
    sources,
    occurrences: sources.map((source) => ({
      occurrenceRef: `public-media:${source.sourceRef}`,
      sourceRef: source.sourceRef,
      href: source.sourceHref,
      times: { occurredAt: null, publishedAt: null, updatedAt: null },
    })),
    seriesCategories: [{ key: "public-media", kind: "category", label: "תמונות ומדיה", sourceRefs: sources.map((row) => row.sourceRef) }],
    coverage: {
      sources: { available: true }, occurrences: { available: true }, clusters: { available: false },
      seriesCategories: { available: true }, findings: { available: false }, treeRelations: { available: false }, legacyTopics: { available: false },
    },
  });
}

// language_links is already admitted by the canonical language RPC. A source
// citation and human verification remain explicit states; neither is inferred
// from a shared spelling or gematria value.
export function buildPublicLanguageContentProjection(rows = []) {
  const sources = list(rows).flatMap((row) => {
    const id = clean(row?.id);
    if (!id || clean(row?.status) !== "approved") return [];
    return [{
      sourceRef: `language_links:${id}`,
      title: [clean(row?.hebrew), clean(row?.foreignWord)].filter(Boolean).join(" · ") || "קישור שפה",
      sourceHref: null,
      publisher: { key: "language-links", label: "גשרי שפה" },
    }];
  });
  return buildPublicWorldContentProjectionV1({
    sources,
    occurrences: sources.map((source) => ({
      occurrenceRef: `language-bridge:${source.sourceRef}`,
      sourceRef: source.sourceRef,
      href: null,
      times: { occurredAt: null, publishedAt: null, updatedAt: null },
    })),
    seriesCategories: [{ key: "language-bridges", kind: "category", label: "גשרי שפה", sourceRefs: sources.map((row) => row.sourceRef) }],
    coverage: {
      sources: { available: true }, occurrences: { available: true }, clusters: { available: false },
      seriesCategories: { available: true }, findings: { available: false }, treeRelations: { available: false }, legacyTopics: { available: false },
    },
  });
}
