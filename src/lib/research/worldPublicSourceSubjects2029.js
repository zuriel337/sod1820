// World subject discovery: existing public Topic identities are not editorial
// categories or source works. Keep both kinds in the SAME World surface, with
// distinct links and no inferred joins. No new taxonomy, Topic, relation, store
// or research publication authority is created here.
import { fetchTopicCardList } from "./topicConvergence.js";
import { fetchCorpusPage, WORLD_SOURCE_CORPORA } from "./worldSourceCorpus.js";
import { buildPublicWorldContentProjectionV1 } from "./publicWorldContentProjectionV1.js";
import { adaptLegacyTopicsV1, adaptPublicSourceRowsV1 } from "./publicWorldContentAdaptersV1.js";

const ZVI_CREATOR = "צבי (OPOC)";
const HASHMAL = WORLD_SOURCE_CORPORA.find((item) => item.key === "sod-hashmal");
const TOPIC_BATCH = 60;
const MAX_TOPIC_ROWS = 1000;
const MAX_CORPUS_PAGES = 40;
const clean = (value) => String(value ?? "").trim();

export function canonicalSourceSubjectCards({ zviTopics = [], hashmalPosts = [] } = {}) {
  const seenTopics = new Set();
  const seenSources = new Set();
  const approvedTopics = [];
  for (const row of zviTopics) {
    const id = clean(row?.id), slug = clean(row?.slug);
    if (!id || !slug || seenTopics.has(id)) continue;
    seenTopics.add(id);
    approvedTopics.push({
      id: `topic:${id}`, type: "approved_topic", origin: "zvi",
      title: clean(row.title) || slug, description: clean(row.subtitle),
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
      values: [], href: `/post/${encodeURIComponent(slug)}`,
      // Source title is NOT a new subject identity. No source-only post is
      // asserted to share a Topic without a verified source relation.
      linkedTopicSlugs: [],
    });
  }
  return [...approvedTopics, ...sourceWorks];
}

export function filterPublicSourceSubjects(cards = [], { origin = "all", query = "" } = {}) {
  const q = clean(query).toLocaleLowerCase("he");
  return (Array.isArray(cards) ? cards : []).filter((card) =>
    (origin === "all" || origin === card.origin)
    && (!q || [card.title, card.description, ...(card.values || []).map(String)]
      .join(" ").toLocaleLowerCase("he").includes(q)));
}

async function readZviTopics(reader) {
  const rows = [];
  let total = null, hasMore = true;
  for (let offset = 0; offset < MAX_TOPIC_ROWS && hasMore; offset += TOPIC_BATCH) {
    const page = await reader({ creator: ZVI_CREATOR, limit: TOPIC_BATCH, offset, includeTotal: true, rankByMeterScore: true });
    if (!page || !Array.isArray(page.rows)) throw new Error("topic_index_unavailable");
    rows.push(...page.rows);
    if (Number.isFinite(page.total)) total = page.total;
    hasMore = Boolean(page.hasMore);
  }
  return { rows, total: total ?? rows.length, incomplete: hasMore };
}

async function readAllTopicTotal(reader) {
  const page = await reader({ limit: 1, offset: 0, includeTotal: true, rankByMeterScore: true });
  if (!page || !Array.isArray(page.rows) || !Number.isFinite(Number(page.total))) {
    throw new Error("topic_total_unavailable");
  }
  return Number(page.total);
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

function legacySourceSubjectContentProjection({ zviTopics = [], hashmalPosts = [], zviAvailable = false, hashmalAvailable = false } = {}) {
  // The old lens has two different historical inputs. Keep that fact visible:
  // Zvi Topic cards are compatibility-only; Hashmal posts are source rows.
  // This bridge does not claim it is the eventual full all-writer corpus reader.
  const legacyTopics = adaptLegacyTopicsV1(zviTopics.map((row) => ({
    topicRef: row?.id ? `topic_cards:${row.id}` : null,
    slug: row?.slug,
    href: row?.slug ? `/topic/${encodeURIComponent(row.slug)}` : null,
    title: row?.title,
  })));
  const sourceRows = adaptPublicSourceRowsV1(hashmalPosts.map((row) => ({
    sourceRef: row?.id == null ? null : `posts:${row.id}`,
    occurrenceRef: row?.id == null ? null : `legacy-source-subject:posts:${row.id}`,
    title: row?.title,
    sourceHref: row?.slug ? `/post/${encodeURIComponent(row.slug)}` : null,
    occurrenceHref: row?.slug ? `/post/${encodeURIComponent(row.slug)}` : null,
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
      legacyTopics: { available: zviAvailable },
    },
  });
}

export async function fetchPublicSourceSubjectIndex({
  topicReader = fetchTopicCardList,
  corpusReader = fetchCorpusPage,
} = {}) {
  if (!HASHMAL) throw new Error("source_corpus_missing");
  const [topicResult, totalResult, corpusResult] = await Promise.allSettled([
    readZviTopics(topicReader), readAllTopicTotal(topicReader), readHashmalSources(corpusReader),
  ]);
  if (topicResult.status === "rejected" && corpusResult.status === "rejected") {
    throw new Error("public_subject_readers_unavailable");
  }
  const zvi = topicResult.status === "fulfilled" ? topicResult.value : null;
  const hashmal = corpusResult.status === "fulfilled" ? corpusResult.value : null;
  const contentProjection = legacySourceSubjectContentProjection({
    zviTopics: zvi?.rows || [],
    hashmalPosts: hashmal?.rows || [],
    zviAvailable: Boolean(zvi),
    hashmalAvailable: Boolean(hashmal),
  });
  return {
    cards: canonicalSourceSubjectCards({
      zviTopics: zvi?.rows || [],
      hashmalPosts: hashmal?.rows || [],
    }),
    totals: {
      allTopics: totalResult.status === "fulfilled" ? totalResult.value : null,
      zvi: zvi?.total ?? null,
      hashmal: hashmal?.total ?? null,
    },
    available: {
      allTopics: totalResult.status === "fulfilled",
      zvi: Boolean(zvi),
      hashmal: Boolean(hashmal),
    },
    incomplete: Boolean(zvi?.incomplete || hashmal?.incomplete),
    // Additive migration field. Existing cards/totals keep their historical
    // behavior while consumers can adopt the shared public content contract.
    contentProjection,
  };
}
