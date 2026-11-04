import { publicPostHref } from "../publicPostUrls.js";
// World subject discovery: existing public Topic identities are not editorial
// categories or source works. Keep both kinds in the SAME World surface, with
// distinct links and no inferred joins. No new taxonomy, Topic, relation, store
// or research publication authority is created here.
import { fetchTopicCardList } from "./topicConvergence.js";
import { fetchCorpusPage, WORLD_SOURCE_CORPORA } from "./worldSourceCorpus.js";
import { buildPublicWorldContentProjectionV1 } from "./publicWorldContentProjectionV1.js";
import { adaptLegacyTopicsV1, adaptPublicSourceRowsV1 } from "./publicWorldContentAdaptersV1.js";
import { fetchGroupSourceArrivals } from "./worldGroupSource.js";
import { contributorSourceLocator, channelUpdateOccurrenceId } from "./worldContributorSourceLocator.js";
import { getPublicResearchClient } from "./researchViewMode.js";

const ZVI_CREATOR = "צבי (OPOC)";
const HASHMAL = WORLD_SOURCE_CORPORA.find((item) => item.key === "sod-hashmal");
const clean = (value) => String(value ?? "").trim();
const searchText = (value) => clean(value).normalize("NFD")
  .replace(/[\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7]/g, "")
  .replace(/\s+/g, " ").toLocaleLowerCase("he");
const TOPIC_BATCH = 60;
const MAX_TOPIC_ROWS = 1000;
const MAX_CORPUS_PAGES = 40;

export function canonicalSourceSubjectCards({ topics = [], hashmalPosts = [] } = {}) {
  const seenTopics = new Set();
  const seenSources = new Set();
  const approvedTopics = [];
  for (const row of topics) {
    const id = clean(row?.id), slug = clean(row?.slug);
    if (!id || !slug || seenTopics.has(id)) continue;
    seenTopics.add(id);
    approvedTopics.push({
      id: `topic:${id}`, type: "approved_topic",
      origin: clean(row?.created_by) === ZVI_CREATOR ? "zvi" : "topic",
      creator: clean(row.created_by),
      title: clean(row.title) || slug, description: clean(row.subtitle),
      searchTerms: Array.isArray(row.search_terms) ? row.search_terms.map(clean).filter(Boolean) : [],
      at: row.approved_at || row.created_at || null,
      values: Array.isArray(row.numbers) ? row.numbers : [],
      meterScore: Number.isFinite(Number(row.meter_score)) ? Number(row.meter_score) : null,
      href: `/topic/${encodeURIComponent(slug)}`,
    });
  }
  const sourceWorks = [];
  for (const row of hashmalPosts) {
    const id = clean(row?.id), slug = clean(row?.slug), title = clean(row?.title);
    if (!id || !slug || !title || seenSources.has(id)) continue;
    seenSources.add(id);
    sourceWorks.push({
      id: `posts:${id}`, type: "source_work", origin: "hashmal",
      title, description: clean(row.excerpt), at: row.date || null,
      values: [], href: publicPostHref(row),
      // Source title is NOT a new subject identity. No source-only post is
      // asserted to share a Topic without a verified source relation.
      linkedTopicSlugs: [],
    });
  }
  return [...approvedTopics, ...sourceWorks];
}

export function filterPublicSourceSubjects(cards = [], { origin = "all", query = "", creatorName = "" } = {}) {
  const q = searchText(query);
  const writerSlug = origin.startsWith("writer:") ? origin.slice("writer:".length) : "";
  return (Array.isArray(cards) ? cards : []).filter((card) =>
    (origin === "all" || origin === card.origin || (writerSlug && (card.creatorSlug === writerSlug || card.origin === `writer:${writerSlug}`
      || (creatorName && clean(card.creator) === creatorName))))
    && (!q || searchText([card.title, card.description, card.fullText, ...(card.searchTerms || []), ...(card.values || []).map(String)]
      .join(" ")).includes(q)));
}

// A single discovery list, alternating the existing kinds so a long topic
// catalogue cannot push every source below the fold. This is presentation
// only: different source/topic identities are not silently merged.
export function interleavePublicSubjectCards(cards = []) {
  const topics = [], sources = [];
  for (const card of Array.isArray(cards) ? cards : []) {
    (card?.type === "approved_topic" ? topics : sources).push(card);
  }
  const result = [];
  for (let index = 0; index < Math.max(topics.length, sources.length); index++) {
    if (topics[index]) result.push(topics[index]);
    if (sources[index]) result.push(sources[index]);
  }
  return result;
}

/** Search one bounded page returned by the existing consent/proof/redaction RPC.
 * No raw channel table or contributor-specific reader is introduced here. */
export async function searchPublicGroupSourcePage(query, { before = null, reader = fetchGroupSourceArrivals,
  client = getPublicResearchClient(), peopleBySlug = {} } = {}) {
  const q = searchText(query);
  if (q.length < 2 || q.length > 160 || /[\u0000-\u001f]/.test(q)) throw new Error("invalid_group_search");
  const rows = await reader({ limit: 40, before });
  if (!Array.isArray(rows)) throw new Error("group_search_unavailable");
  const tail = rows.at(-1)?.arrivalAt || null;
  const beforeTime = before ? Date.parse(before) : null;
  const nextTime = tail ? Date.parse(tail) : null;
  const hasMore = rows.length === 40 && Number.isFinite(nextTime)
    && (beforeTime == null || (Number.isFinite(beforeTime) && nextTime < beforeTime));
  const matched = rows.filter((row) => searchText(row?.fullText).includes(q));
  const refs = (row) => [row.sourceRef, ...(Array.isArray(row.sourceRefs) ? row.sourceRefs : [])];
  const ids = [...new Set(matched.flatMap(refs)
    .map(channelUpdateOccurrenceId).filter(Boolean))];
  let admitted = new Map();
  if (ids.length && client) {
    try {
      const result = await client.from("channel_updates").select("id,status,contributor_id").in("id", ids).eq("status", "live");
      if (!result.error && Array.isArray(result.data)) admitted = new Map(result.data
        .filter((row) => row.status === "live").map((row) => [clean(row.id), clean(row.contributor_id)]));
    } catch { /* Text remains available from the proven group reader; no link is invented. */ }
  }
  return {
    rows: matched.map((row) => ({ ...row, linkableSourceRefs: refs(row)
      .filter((ref) => {
        const id = channelUpdateOccurrenceId(ref), expected = clean(peopleBySlug?.[row.creatorSlug]?.id);
        return id && expected && admitted.get(id) === expected;
      }) })),
    nextBefore: hasMore ? tail : null,
    hasMore,
    examined: rows.length,
  };
}

/** Group only identical *displayed* wording from the same source writer.
 * Occurrence links stay independently available; this does not merge claims. */
export function groupPublicSourceMessages(rows = []) {
  const groups = new Map(), seen = new Set();
  for (const row of Array.isArray(rows) ? rows : []) {
    const ref = clean(row?.sourceRef), text = clean(row?.fullText), slug = clean(row?.creatorSlug);
    if (!ref || !text || !slug || seen.has(ref)) continue;
    seen.add(ref);
    // A 1,200-character excerpt may have been cut; never group its unknown tail.
    const groupKey = text.length >= 1200 ? ref : JSON.stringify([slug, text]);
    const group = groups.get(groupKey) || {
      id: `message:${ref}`, type: "source_message", origin: slug === "tzvi-opoc" ? "zvi" : `writer:${slug}`,
      title: clean(row.label) || text, fullText: text, creator: clean(row.creator) || slug, creatorSlug: slug,
      at: row.arrivalAt || row.at || null, values: [], occurrences: [],
    };
    const occurrences = Array.isArray(row.occurrences) && row.occurrences.length
      ? row.occurrences : [{ sourceRef: ref, at: row.arrivalAt || row.at || null }];
    for (const occurrence of occurrences) {
      const occurrenceRef = clean(occurrence?.sourceRef);
      if (!occurrenceRef || group.occurrences.some((item) => item.ref === occurrenceRef)) continue;
      const linkable = Array.isArray(row.linkableSourceRefs) && row.linkableSourceRefs.includes(occurrenceRef);
      group.occurrences.push({ ref: occurrenceRef, at: occurrence.at || null,
        href: linkable ? contributorSourceLocator(occurrenceRef, { slug }).href : null });
    }
    groups.set(groupKey, group);
  }
  return [...groups.values()];
}

async function readAllTopics(reader) {
  const rows = [];
  let total = null, hasMore = true;
  for (let offset = 0; offset < MAX_TOPIC_ROWS && hasMore; offset += TOPIC_BATCH) {
    const page = await reader({ limit: TOPIC_BATCH, offset, includeTotal: true, rankByMeterScore: true, includeSearchTerms: true });
    if (!page || !Array.isArray(page.rows)) throw new Error("topic_index_unavailable");
    rows.push(...page.rows);
    if (Number.isFinite(page.total)) total = page.total;
    hasMore = Boolean(page.hasMore);
  }
  return { rows, total: total ?? rows.length, incomplete: hasMore };
}

async function readHashmalSources(reader) {
  const rows = [];
  let total = null, hasMore = true;
  for (let page = 0; page < MAX_CORPUS_PAGES && hasMore; page++) {
    const result = await reader(HASHMAL, page);
    if (!result || !Array.isArray(result.items)) throw new Error("source_index_unavailable");
    rows.push(...result.items);
    if (Number.isFinite(result.total)) total = result.total;
    hasMore = Boolean(result.hasMore);
  }
  return { rows, total: total ?? rows.length, incomplete: hasMore };
}

function legacySourceSubjectContentProjection({ topics = [], hashmalPosts = [], topicsAvailable = false, hashmalAvailable = false } = {}) {
  // Topics are compatibility identities regardless of creator; Hashmal posts
  // are source rows. Neither count can inflate the other.
  const legacyTopics = adaptLegacyTopicsV1(topics.map((row) => ({
    topicRef: row?.id ? `topic_cards:${row.id}` : null,
    slug: row?.slug,
    href: row?.slug ? `/topic/${encodeURIComponent(row.slug)}` : null,
    title: row?.title,
  })));
  const sourceRows = adaptPublicSourceRowsV1(hashmalPosts.map((row) => ({
    sourceRef: row?.id == null ? null : `posts:${row.id}`,
    occurrenceRef: row?.id == null ? null : `legacy-source-subject:posts:${row.id}`,
    title: row?.title,
    sourceHref: row?.slug ? publicPostHref(row) : null,
    occurrenceHref: row?.slug ? publicPostHref(row) : null,
    publisher: { key: "sod-hashmal", label: "סוד החשמל" },
    times: { occurredAt: null, publishedAt: row?.date || null, updatedAt: row?.modified || null },
  })));
  return buildPublicWorldContentProjectionV1({
    ...sourceRows,
    seriesCategories: [{
      key: "sod-hashmal-publications",
      kind: "series",
      label: "פרסומי סוד החשמל",
      sourceRefs: sourceRows.sources.map((row) => row.sourceRef),
    }],
    compatibility: { legacyTopics },
    coverage: {
      sources: { available: hashmalAvailable },
      occurrences: { available: hashmalAvailable },
      clusters: { available: false },
      seriesCategories: { available: hashmalAvailable },
      findings: { available: false },
      treeRelations: { available: false },
      legacyTopics: { available: topicsAvailable },
    },
  });
}

export async function fetchPublicSourceSubjectIndex({
  topicReader = fetchTopicCardList,
  corpusReader = fetchCorpusPage,
} = {}) {
  if (!HASHMAL) throw new Error("source_corpus_missing");
  const [topicResult, corpusResult] = await Promise.allSettled([
    readAllTopics(topicReader), readHashmalSources(corpusReader),
  ]);
  if (topicResult.status === "rejected" && corpusResult.status === "rejected") {
    throw new Error("public_subject_readers_unavailable");
  }
  const topics = topicResult.status === "fulfilled" ? topicResult.value : null;
  const hashmal = corpusResult.status === "fulfilled" ? corpusResult.value : null;
  const contentProjection = legacySourceSubjectContentProjection({
    topics: topics?.rows || [],
    hashmalPosts: hashmal?.rows || [],
    topicsAvailable: Boolean(topics),
    hashmalAvailable: Boolean(hashmal),
  });
  return {
    cards: canonicalSourceSubjectCards({
      topics: topics?.rows || [],
      hashmalPosts: hashmal?.rows || [],
    }),
    totals: {
      allTopics: topics?.total ?? null,
      zvi: topics ? topics.rows.filter((row) => clean(row?.created_by) === ZVI_CREATOR).length : null,
      hashmal: hashmal?.total ?? null,
    },
    available: {
      allTopics: Boolean(topics),
      zvi: Boolean(topics),
      hashmal: Boolean(hashmal),
    },
    incomplete: Boolean(topics?.incomplete || hashmal?.incomplete),
    // Additive migration field. Existing cards/totals keep their historical
    // behavior while consumers can adopt the shared public content contract.
    contentProjection,
  };
}
