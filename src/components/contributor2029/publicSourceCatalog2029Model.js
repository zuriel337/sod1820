import { safePublicUrl } from "./publicContributor2029Model.js";
import { contributorSourceLibraryHref } from "../../lib/research/worldContributorSourceLocator.js";

const PUBLISHED = new Set(["live", "on", "approved", "published", "public"]);
export const CATALOG_FORMATS = Object.freeze([["all", "הכול"], ["text", "טקסטים"], ["image", "תמונות וגלריה"],
  ["video", "וידאו"], ["external_link", "קישורים"], ["explicit_topics", "נושאים מפורשים"], ["uncatalogued", "טרם קוטלג"]]);
const SECTIONS = new Set(["recent", "all", "media", "topics", "community"]);

// A bounded public rendering model. Catalog identities/links/categories remain reader-owned.
export function publicSourceCatalog2029(catalog, { profile, canonicalHref, community = [], communityAvailable = false } = {}) {
  if (!catalog?.contributor?.slug) throw new Error("source_catalog_identity_missing");
  const project = (item) => {
    if (!PUBLISHED.has(item.publicationState)) return null;
    const mediaUrl = safePublicUrl(item.media?.url);
    const sourceTopics = item.evidence?.categoryBasis === "channel_updates.topics" ? item.sourceTopics || [] : [];
    const href = safePublicUrl(item.href);
    // The catalog marks unresolved locators explicitly. Never turn its library fallback into an exact occurrence.
    const exactHref = item.exactLocator === true && href?.startsWith("/world?") ? href : null;
    return { id: item.id, sourceRef: item.sourceRef, linkedSourceRefs: item.linkedSourceRefs,
      title: item.title || "פרסום ללא כותרת", createdAt: item.createdAt, publicationState: item.publicationState,
      formats: item.formats, sourceTopics, categoryBasis: sourceTopics.length ? "channel_updates.topics" : null,
      media: mediaUrl ? { url: mediaUrl, type: item.media.type, thumbUrl: safePublicUrl(item.media.thumbUrl) } : null,
      href: exactHref, paired: item.formats.includes("paired_media"),
      sourceRecordCount: item.sourceRecordCount };
  };
  const items = catalog.items.map(project).filter(Boolean);
  const byId = new Map(items.map((item) => [item.id, item]));
  return {
    kind: "source_catalog", profile, canonicalHref, communityAuthorKey: catalog.contributor.id,
    catalog: { items, recentItems: catalog.recentItems.slice(0, 20).map((item) => byId.get(item.id)).filter(Boolean),
      sourcesAvailable: catalog.availability?.sources === "ok",
      truncated: catalog.loadState?.sourceMessagesTruncated === true,
      researchDeferred: catalog.researchState === "deferred_until_exact_occurrence" },
    community: { items: community, available: communityAvailable },
    worldHref: contributorSourceLibraryHref(catalog.contributor.slug),
  };
}

export function selectSourceCatalog2029(view, search) {
  const params = new URLSearchParams(search);
  const section = SECTIONS.has(params.get("section")) ? params.get("section") : "recent";
  const format = CATALOG_FORMATS.some(([key]) => key === params.get("format")) ? params.get("format") : "all";
  let items = section === "recent" ? view.catalog.recentItems : view.catalog.items;
  if (section === "media") items = items.filter((item) => item.formats.some((value) => ["image", "video"].includes(value)));
  if (section === "topics") items = items.filter((item) => item.sourceTopics.length);
  if (format === "explicit_topics") items = items.filter((item) => item.sourceTopics.length);
  else if (format === "uncatalogued") items = items.filter((item) => !item.sourceTopics.length);
  else if (format !== "all") items = items.filter((item) => item.formats.includes(format));
  const item = params.get("item");
  const itemIndex = items.findIndex((entry) => entry.id === item);
  const pages = Math.max(1, Math.ceil(items.length / 20));
  const requestedPage = itemIndex >= 0 ? Math.floor(itemIndex / 20) + 1 : Number(params.get("page")) || 1;
  const page = Math.max(1, Math.min(pages, Math.floor(requestedPage)));
  return { section, format, page, pages, total: items.length, item, rows: items.slice((page - 1) * 20, page * 20) };
}
