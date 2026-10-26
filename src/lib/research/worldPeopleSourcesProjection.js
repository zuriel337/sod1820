import { humanContentTitle } from "../presentation/contentTitle.js";
import { fetchContributorFindingsProjection, CONTRIBUTOR_LOAD_PROFILE } from "./contributorFindingsProjection.js";
import {
  fetchContributorPublicationCatalog,
  contributorPublicationRecordTime,
  contributorPublicationRecordTimeKind,
} from "./contributorPublicationCatalog.js";
import { fetchContributorSourceCatalogProjection } from "./contributorSourceCatalogProjection.js";
import { getPublicResearchClient, PROJECTOR_MODE } from "./researchViewMode.js";
import { isWorldPublicContributor } from "./worldPublicPeopleIndex.js";

const clean = (value) => value == null ? "" : String(value).trim();
export const WORLD_SOURCE_ITEMS_PAGE_SIZE = 12;
export const WORLD_SOURCE_FILTERS = Object.freeze([
  ["all", "הכול"],
  ["people", "אנשים"],
  ["writings", "כתבים ופוסטים"],
  ["sources", "מקורות ועדכונים"],
  ["ciphers", "צפנים"],
  ["topics", "נושאים"],
]);

function safePublicUrl(value) {
  const text = clean(value);
  if (!text || /[\\\u0000-\u0020]/.test(text) || text.startsWith("//")) return null;
  if (text.startsWith("/")) return text;
  try {
    const url = new URL(text);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}
function item({ id, sourceRef, type, label, title, summary = null, date = null, dateKind = null, href = null, number = null, mediaUrl = null, meta = null }) {
  const safeId = clean(id || sourceRef);
  const safeSourceRef = clean(sourceRef);
  const numericValue = clean(number) && Number.isFinite(Number(number)) ? Number(number) : null;
  if (!safeId || !safeSourceRef || !clean(title)) return null;
  return Object.freeze({
    id: safeId,
    sourceRef: safeSourceRef,
    type,
    label,
    title: clean(title),
    summary: clean(summary) || null,
    date: date || null,
    dateKind,
    href: safePublicUrl(href),
    number: numericValue,
    mediaUrl: safePublicUrl(mediaUrl),
    meta,
  });
}

export function buildWorldContributorPublicMaterial({ identity, findings, sourceCatalog, publications } = {}) {
  if (!identity?.slug || !findings || findings.mode !== PROJECTOR_MODE.PUBLIC_VIEW) return null;
  const items = new Map();
  const put = (row) => {
    if (!row || items.has(row.sourceRef)) return;
    items.set(row.sourceRef, row);
  };

  for (const row of sourceCatalog?.items || []) put(item({
    id: `source:${row.id}`, sourceRef: row.sourceRef, type: "sources", label: "מקור ועדכון",
    title: row.title, summary: row.text, date: row.createdAt, href: row.href,
    mediaUrl: row.media?.url, meta: { sourceRecordCount: row.sourceRecordCount, researchFacets: row.researchFacets },
  }));

  const projectedInsights = new Set();
  for (const row of publications?.contributions?.rows || []) {
    if (!["approved", "published"].includes(clean(row.status).toLowerCase())) continue;
    if (row.projected_insight_id) projectedInsights.add(String(row.projected_insight_id));
    put(item({
      id: `contribution:${row.id}`, sourceRef: `research_contributions:${row.id}`, type: "sources", label: "תרומה מאושרת",
      title: row.title || row.body || "תרומה", summary: row.body, date: row.created_at,
      href: row.convergence_slug ? `/topic/${encodeURIComponent(row.convergence_slug)}` : null,
      number: row?.gematria_claim?.value, mediaUrl: row.image_url || row?.media?.[0]?.url,
    }));
  }
  for (const row of publications?.posts?.rows || []) put(item({
    id: `post:${row.id}`, sourceRef: `posts:${row.id}`, type: "writings", label: "כתב או פוסט",
    title: humanContentTitle(row.title, { max: 0 }), date: contributorPublicationRecordTime(row),
    dateKind: contributorPublicationRecordTimeKind(row),
    href: row.slug ? `/${encodeURIComponent(row.slug)}` : null, mediaUrl: row.thumb_url || row.image_url,
  }));
  for (const row of publications?.ciphers?.rows || []) {
    if (row.status !== "published" || row.visibility !== "public") continue;
    put(item({
      id: `els:${row.id}`, sourceRef: `els_records:${row.id}`, type: "ciphers", label: "צופן ELS ציבורי",
      title: row.title || row.search_term, date: row.created_at,
      href: row.slug ? `/codes/${encodeURIComponent(row.slug)}` : null, mediaUrl: row.image_url,
    }));
  }
  for (const row of publications?.insights?.rows || []) {
    if (!row.is_active || row.space === "private" || projectedInsights.has(String(row.id))) continue;
    put(item({
      id: `insight:${row.id}`, sourceRef: `insights:${row.id}`, type: "writings", label: "חידוש פעיל",
      title: row.title, date: row.created_at,
      href: `/research?${new URLSearchParams({ tool: "midrash", tab: "community", insight: row.id })}`,
    }));
  }
  for (const row of publications?.events?.rows || []) put(item({
    id: `event:${row.id}`, sourceRef: `nodes:${row.id}`, type: "sources", label: "אירוע ציבורי",
    title: row.label, date: row.created_at, href: `/timeline#ev-${encodeURIComponent(row.id)}`,
  }));
  for (const row of publications?.topics?.rows || []) {
    if (row.status !== "approved") continue;
    put(item({
      id: `topic:${row.slug}`, sourceRef: `topic_cards:${row.slug}`, type: "topics", label: "נושא מאושר",
      title: row.title, summary: row.subtitle, date: row.approved_at,
      href: row.slug ? `/topic/${encodeURIComponent(row.slug)}` : null,
    }));
  }

  const rows = [...items.values()].sort((left, right) => clean(right.date).localeCompare(clean(left.date)) || left.id.localeCompare(right.id));
  const availability = Object.fromEntries(Object.entries(publications || {}).map(([key, value]) => [key, {
    count: value?.complete ? value.rows.length : null,
    complete: value?.complete === true,
    availability: value?.availability || "unavailable",
  }]));
  return Object.freeze({
    identity,
    findings,
    sourceCatalog,
    items: Object.freeze(rows),
    total: rows.length,
    availability: Object.freeze(availability),
    partial: Object.values(availability).some((value) => !value.complete)
      || Object.values(findings.availability || {}).some((value) => value === "unavailable"),
    truthBoundary: "A research finding remains attached to its existing source_ref and is never counted as another source.",
  });
}

export async function fetchWorldContributorPublicMaterial(identity, {
  client = getPublicResearchClient(),
  findingsReader = fetchContributorFindingsProjection,
  sourceCatalogReader = fetchContributorSourceCatalogProjection,
  publicationReader = fetchContributorPublicationCatalog,
} = {}) {
  if (!isWorldPublicContributor({
    ...identity,
    display_name: identity?.displayName,
    active: true,
    locked: false,
    building: false,
    public_visibility: "public",
  })) throw new Error("public_contributor_identity_required");
  const canonicalIdentity = {
    id: identity.id,
    slug: identity.slug,
    code: identity.code,
    display_name: identity.displayName,
  };
  const findingsPromise = findingsReader(identity.slug, {
    mode: PROJECTOR_MODE.PUBLIC_VIEW,
    publicClient: () => client,
    loadProfile: CONTRIBUTOR_LOAD_PROFILE.SOURCE_LIBRARY,
    topicsReader: async () => [],
  });
  const [findings, publications] = await Promise.all([
    findingsPromise,
    publicationReader(canonicalIdentity, { client }),
  ]);
  const sourceCatalog = await sourceCatalogReader(identity.slug, {
    mode: PROJECTOR_MODE.PUBLIC_VIEW,
    publicClient: () => client,
    findingsReader: async () => findings,
    recentLimit: 20,
  });
  return buildWorldContributorPublicMaterial({ identity, findings, sourceCatalog, publications });
}

export function filterWorldPeopleAndSources({ people = [], items = [] } = {}, { query = "", filter = "all" } = {}) {
  const needle = clean(query).toLocaleLowerCase("he");
  const match = (values) => !needle || values.filter((value) => value != null).join(" ").toLocaleLowerCase("he").includes(needle);
  return {
    people: filter !== "all" && filter !== "people" ? [] : people.filter((person) => match([person.displayName, person.slug, person.code])),
    items: filter === "people" ? [] : items.filter((row) => (filter === "all" || row.type === filter)
      && match([row.title, row.summary, row.number, row.label])),
  };
}
