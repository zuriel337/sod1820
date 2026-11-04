import { makeEntity } from "../../lib/research/entity.js";
import { safePublicUrl } from "./publicContributor2029Model.js";

export function writerReadingItems(view) {
  return (view?.kind === "source_catalog" ? view.catalog.items : view?.items || [])
    .filter((item) => item?.id && safePublicUrl(item.href) && !["findings", "topics"].includes(item.type));
}
export function writerReadingEntity(item, canonicalHref) {
  const href = safePublicUrl(item?.href);
  const ref = item?.sourceRef || item?.group?.sourceRef || item?.id;
  if (!href || !ref || !canonicalHref || ["findings", "topics"].includes(item.type)) return null;
  const type = item.type === "community" || item.label === "תרומה" ? "contribution" : "source";
  return makeEntity({ type, ref, title: item.title, link: href,
    metadata: { contributorHref: canonicalHref, sourceRef: item.sourceRef || item.group?.sourceRef || null,
      linkedSourceRefs: Array.isArray(item.linkedSourceRefs) ? [...item.linkedSourceRefs] : [] } });
}
export function writerReadingProjection(view, research = {}) {
  const items = writerReadingItems(view);
  const byHref = new Map(items.map((item) => [item.href, item]));
  const belongs = (entity) => entity?.metadata?.contributorHref === view?.canonicalHref && byHref.has(entity.link);
  const recent = (research.history || []).find(belongs);
  return { savedCount: (research.saved || []).filter(belongs).length,
    resume: recent ? { href: recent.link, title: byHref.get(recent.link).title } : null,
    localOnly: research.syncStatus === "local_only" };
}
export function writerFeaturedItems(view, studioItems = []) {
  const publicItems = new Map(writerReadingItems(view).map((item) => [item.href, item]));
  const seen = new Set();
  return studioItems.filter((entry) => entry.kind === "pin" && entry.refType === "source" && entry.ref === entry.href
    && !entry.body && !entry.imageUrl && entry.value == null && !entry.media?.length && publicItems.has(entry.href))
    .filter((entry) => !seen.has(entry.href) && seen.add(entry.href)).slice(0, 3)
    .map((entry) => ({ ...publicItems.get(entry.href), studioId: entry.id }));
}
