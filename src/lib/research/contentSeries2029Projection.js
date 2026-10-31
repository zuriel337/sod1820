import { stripHtml } from "../format.js";
import { getPublicResearchClient } from "./researchViewMode.js";
import { hasSuppressedPublicPostTag, publicPostOnlyFilter } from "./publicPostBoundary.js";

const clean = (value) => value == null ? "" : String(value).trim();

// Adopted from 780db978a9dce428aef31d9b68cf5437170b1677; shared exact compatibility descriptors keep Home/World and Follow in step.
import { CONTENT_SERIES_2029, contentSeriesMembershipFilter, hasExactMembership, hasExactSeriesPublisher2029, seriesPublisherFilter2029 } from "./contentSeries2029Identity.js";
export { CONTENT_SERIES_2029, contentSeriesMembershipFilter } from "./contentSeries2029Identity.js";

function isSuppressedPost(row) {
  return hasSuppressedPublicPostTag(row);
}

export function projectContentSeriesItems(rows = [], spec = {}) {
  const items = [];
  const excluded = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!hasExactMembership(row, spec)) {
      excluded.push({ id: row?.id == null ? null : String(row.id), reason: "membership_not_exact" });
      continue;
    }
    if (!hasExactSeriesPublisher2029(row, spec)) {
      excluded.push({ id: row?.id == null ? null : String(row.id), reason: "author_not_mapped" });
      continue;
    }
    if (isSuppressedPost(row)) {
      excluded.push({ id: row?.id == null ? null : String(row.id), reason: "draft_or_forum" });
      continue;
    }
    const slug = clean(row?.slug);
    const title = stripHtml(clean(row?.title));
    if (!slug || !title) {
      excluded.push({ id: row?.id == null ? null : String(row.id), reason: !slug ? "no_slug" : "no_title" });
      continue;
    }
    items.push({
      id: String(row.id),
      slug,
      title,
      excerpt: stripHtml(clean(row?.excerpt)) || null,
      author: clean(row?.author) || null,
      imageUrl: clean(row?.thumb_url || row?.image_url) || null,
      publishedAt: row?.date || null,
      updatedAt: row?.modified || row?.date || null,
      href: `/post/${encodeURIComponent(slug)}`,
    });
  }
  return { items, excluded };
}

export function buildContentSeriesCatalog2029(results = [], { homeOnly = false } = {}) {
  const byKey = new Map((Array.isArray(results) ? results : []).map((result) => [result?.key, result]));
  const series = CONTENT_SERIES_2029.map((spec) => {
    const result = byKey.get(spec.key) || {};
    const projected = projectContentSeriesItems(result.rows, spec);
    const total = result.total != null && Number.isFinite(Number(result.total)) ? Number(result.total) : null;
    return {
      key: spec.key,
      label: spec.label,
      entityKind: "series",
      decisionId: spec.decisionId,
      writerLabel: spec.writerLabel,
      publisherLabel: spec.publisherLabel,
      priorityLane: spec.priorityLane,
      relationNote: spec.relationNote,
      mappingState: "approved_identity_partial_membership",
      homeOnly,
      total,
      items: projected.items,
      excluded: projected.excluded,
    };
  });
  return {
    series,
    byKey: Object.fromEntries(series.map((item) => [item.key, item])),
    note: "One shared Home/World series projection. Series, topic, writer, publisher, post and media remain distinct identities; exact tags/categories are compatibility evidence, not truth authority.",
  };
}

async function fetchSeriesPreview(spec, { client, limit, homeOnly }) {
  const filter = contentSeriesMembershipFilter(spec);
  if (!client || !filter) return { key: spec.key, rows: [], total: null };
  let query = client
    .from("posts")
    .select("id,slug,title,excerpt,author,categories,tags,image_url,thumb_url,date,modified,home_hidden", { count: "exact" })
    .or(filter)
    .or(publicPostOnlyFilter());
  if (spec.exactAuthor) {
    const publisherFilter = seriesPublisherFilter2029(spec);
    query = publisherFilter ? query.or(publisherFilter) : query.eq("author", spec.exactAuthor);
  }
  if (homeOnly) query = query.eq("home_hidden", false);
  const { data, error, count } = await query
    .order("modified", { ascending: false, nullsFirst: false })
    .order("id", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return {
    key: spec.key,
    rows: Array.isArray(data) ? data : [],
    total: count != null && Number.isFinite(Number(count)) ? Number(count) : null,
  };
}

export async function fetchContentSeriesCatalog2029({
  client = getPublicResearchClient(),
  limitPerSeries = 4,
  homeOnly = false,
} = {}) {
  const limit = Math.max(1, Math.min(Number(limitPerSeries) || 4, 12));
  const results = await Promise.all(CONTENT_SERIES_2029.map((spec) => (
    fetchSeriesPreview(spec, { client, limit, homeOnly })
  )));
  return buildContentSeriesCatalog2029(results, { homeOnly });
}
