import { supabase } from "../supabase.js";
import { fetchTopicCardList } from "./topicConvergence.js";
import { researchObjectToUniversalFinding } from "./researchObjectFinding.js";
import { normalizeWorldAllResearchRow } from "./worldAllResearchProjection.js";

const PAGE = 500;
const MAX = 5000;
const TERM_CHUNK = 75;

const clean = (value) => value == null ? "" : String(value).trim();
const uniq = (values) => [...new Set((Array.isArray(values) ? values : []).map(clean).filter(Boolean))];

function safeDate(value) {
  const ms = Date.parse(value || "");
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

function chunk(values, size = TERM_CHUNK) {
  const out = [];
  for (let i = 0; i < values.length; i += size) out.push(values.slice(i, i + size));
  return out;
}

async function paged(loader, { pageSize = PAGE, max = MAX } = {}) {
  const rows = [];
  let offset = 0;
  let total = null;
  while (offset < max) {
    const end = Math.min(offset + pageSize - 1, max - 1);
    const result = await loader(offset, end, offset === 0);
    if (result?.error) throw result.error;
    if (offset === 0 && result?.count != null) total = Number(result.count);
    const page = Array.isArray(result?.data) ? result.data : [];
    rows.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }
  const knownTotal = Number.isFinite(total) ? total : rows.length;
  return { rows, total: knownTotal, truncated: knownTotal > rows.length };
}

export function deriveContributorGroupFacets(rows = [], sourceRow = null, topicLinks = []) {
  const facets = new Set(["source"]);
  const safeRows = Array.isArray(rows) ? rows : [];
  if (safeRows.some((row) => Number.isFinite(Number(row?.value)))) facets.add("number");
  if (safeRows.some((row) => Array.isArray(row?.terms) && row.terms.some(Boolean))) facets.add("phrase");
  if (safeRows.some((row) => clean(row?.kind) === "relation" || (Array.isArray(row?.relates) && row.relates.some(Boolean)))) facets.add("relation");
  const hasMedia = Boolean(
    clean(sourceRow?.image_url)
    || clean(sourceRow?.thumb_url)
    || safeRows.some((row) => clean(row?.meta?.ext?.wa_channel_intake?.media_ref))
  );
  if (hasMedia) facets.add("media");
  if (Array.isArray(topicLinks) && topicLinks.length) facets.add("topic");
  return [...facets];
}

function lexicalForTerms(terms, lexicalIndex) {
  const worlds = [];
  const tags = [];
  for (const term of uniq(terms)) {
    const row = lexicalIndex?.[term];
    if (!row) continue;
    if (clean(row.world)) worlds.push(clean(row.world));
    if (Array.isArray(row.tags)) tags.push(...row.tags.map(clean).filter(Boolean));
  }
  return { worlds: uniq(worlds), tags: uniq(tags) };
}

function sourceMeta(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    sourceRef: `channel_updates:${row.id}`,
    createdAt: row.created_at || null,
    status: clean(row.status) || null,
    channel: clean(row.channel) || null,
    source: clean(row.source) || null,
    credit: clean(row.credit || row.speaker) || null,
    text: clean(row.text) || null,
    imageUrl: clean(row.image_url) || null,
    thumbUrl: clean(row.thumb_url) || null,
    linkUrl: clean(row.link_url) || null,
  };
}

function groupTitle(group) {
  const sourceText = clean(group?.source?.text);
  if (sourceText && sourceText !== "📷 עדכון") {
    const first = sourceText.split(/\n+/).map(clean).find(Boolean);
    if (first) return first.slice(0, 110);
  }
  const first = (group?.rows || []).find((row) => clean(row?.statement));
  return clean(first?.statement).slice(0, 110) || "ממצא מחקר";
}

function topicKey(topic) {
  return clean(topic?.slug) || clean(topic?.id);
}

export function buildContributorFindingsProjection({
  contributor,
  researchObjects = [],
  sourceMessages = [],
  contributions = [],
  topics = [],
  lexicalRows = [],
} = {}) {
  if (!contributor?.id) return null;

  const aliases = uniq([contributor.display_name, ...(Array.isArray(contributor.wa_names) ? contributor.wa_names : [])]);
  const lexicalIndex = Object.fromEntries(
    (Array.isArray(lexicalRows) ? lexicalRows : [])
      .filter((row) => clean(row?.phrase))
      .map((row) => [clean(row.phrase), row])
  );
  const sourceIndex = Object.fromEntries(
    (Array.isArray(sourceMessages) ? sourceMessages : [])
      .filter((row) => row?.id)
      .map((row) => [`channel_updates:${row.id}`, sourceMeta(row)])
  );

  const topicRows = (Array.isArray(topics) ? topics : []).map((row) => ({
    ...normalizeWorldAllResearchRow(row, "topic"),
    slug: row.slug || null,
    title: row.title || null,
    approvedAt: row.approved_at || null,
    createdBy: row.created_by || null,
  })).filter(Boolean);
  const topicBySlug = Object.fromEntries(topicRows.map((row) => [clean(row.slug), row]).filter(([key]) => key));

  const contributionRows = (Array.isArray(contributions) ? contributions : []).map((row) => ({
    ...normalizeWorldAllResearchRow(row, "contribution"),
    convergenceSlug: clean(row.convergence_slug) || null,
    researchState: clean(row.research_state) || null,
  })).filter(Boolean);

  const exactTopicLinks = contributionRows
    .filter((row) => row.convergenceSlug && topicBySlug[row.convergenceSlug])
    .map((row) => topicBySlug[row.convergenceSlug]);
  const exactTopicSlugs = new Set(exactTopicLinks.map((row) => clean(row.slug)));

  const groups = new Map();
  for (const row of Array.isArray(researchObjects) ? researchObjects : []) {
    if (!row?.id) continue;
    const sourceRef = clean(row.source_ref) || `research_objects:${row.id}`;
    if (!groups.has(sourceRef)) groups.set(sourceRef, { sourceRef, rows: [] });
    groups.get(sourceRef).rows.push(row);
  }

  const sourceGroups = [...groups.values()].map((group) => {
    group.rows.sort((a, b) => clean(a.created_at).localeCompare(clean(b.created_at)));
    const source = sourceIndex[group.sourceRef] || null;
    const terms = uniq(group.rows.flatMap((row) => Array.isArray(row.terms) ? row.terms : []));
    const values = [...new Set(group.rows.map((row) => Number(row.value)).filter(Number.isFinite))].sort((a, b) => a - b);
    const relates = uniq(group.rows.flatMap((row) => Array.isArray(row.relates) ? row.relates : []));
    const lexical = lexicalForTerms(terms, lexicalIndex);
    const topicLinks = [];
    const facets = deriveContributorGroupFacets(group.rows, source, topicLinks);
    const createdAt = source?.createdAt
      || group.rows.map((row) => safeDate(row.created_at)).filter(Boolean).sort().at(-1)
      || null;
    const universalFindings = group.rows
      .map((row) => researchObjectToUniversalFinding(row, { locale: "he" }))
      .filter(Boolean);
    const byKind = {};
    for (const row of group.rows) {
      const key = clean(row.kind) || "unknown";
      byKind[key] = (byKind[key] || 0) + 1;
    }
    const verifiedCount = group.rows.filter((row) => row.engine_verified === true).length;
    const mediaRefs = uniq(group.rows.map((row) => row?.meta?.ext?.wa_channel_intake?.media_ref));

    const model = {
      id: group.sourceRef,
      sourceRef: group.sourceRef,
      createdAt,
      source,
      title: null,
      rows: group.rows,
      universalFindings,
      byKind,
      findingCount: group.rows.length,
      verifiedCount,
      terms,
      values,
      relates,
      mediaRefs,
      facets,
      lexicalWorlds: lexical.worlds,
      lexicalTags: lexical.tags,
      topicLinks,
      topicState: topicLinks.length ? "linked_topic" : "finding_only",
      publicationState: source?.status || null,
    };
    model.title = groupTitle(model);
    return model;
  }).sort((a, b) => clean(b.createdAt).localeCompare(clean(a.createdAt)));

  const worldCounts = {};
  const tagCounts = {};
  const facetCounts = {};
  for (const group of sourceGroups) {
    for (const world of group.lexicalWorlds) worldCounts[world] = (worldCounts[world] || 0) + 1;
    for (const tag of group.lexicalTags) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    for (const facet of group.facets) facetCounts[facet] = (facetCounts[facet] || 0) + 1;
  }

  const allTerms = uniq(sourceGroups.flatMap((group) => group.terms));
  const allValues = [...new Set(sourceGroups.flatMap((group) => group.values))].sort((a, b) => a - b);
  const latestAt = sourceGroups.map((group) => safeDate(group.createdAt)).filter(Boolean).sort().at(-1) || null;
  const firstAt = sourceGroups.map((group) => safeDate(group.createdAt)).filter(Boolean).sort().at(0) || null;

  return {
    contributor: {
      id: String(contributor.id),
      slug: contributor.slug,
      displayName: contributor.display_name,
      role: contributor.role || null,
      aliases,
    },
    sourceGroups,
    topics: topicRows,
    contributions: contributionRows,
    linkedTopicSlugs: [...exactTopicSlugs],
    counts: {
      researchObjects: researchObjects.length,
      sourceGroups: sourceGroups.length,
      engineVerified: sourceGroups.reduce((sum, group) => sum + group.verifiedCount, 0),
      topics: topicRows.length,
      contributions: contributionRows.length,
      exactLinkedTopics: exactTopicSlugs.size,
      uniqueTerms: allTerms.length,
      uniqueValues: allValues.length,
    },
    worldCounts,
    tagCounts,
    facetCounts,
    allTerms,
    allValues,
    latestAt,
    firstAt,
    truthBoundary: "Contributor is provenance/lens only. Source, extracted research object, verification, Topic admission, canonicality and publication remain distinct axes.",
    topicAdmission: "Finding-first. A source message or isolated equality does not become a Topic unless the governed convergence/admission criteria are met.",
  };
}

async function fetchContributor(slug) {
  const safeSlug = clean(slug);
  if (!safeSlug) return null;
  const { data, error } = await supabase
    .from("contributors")
    .select("id,slug,display_name,role,kind,wa_names")
    .eq("slug", safeSlug)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function fetchResearchObjects(aliases) {
  return paged((start, end, first) => {
    let q = supabase
      .from("research_objects")
      .select(
        "id,created_at,kind,statement,terms,value,relates,source,source_ref,contributor,confidence,engine_verified,engine_detail,evidence,status,promoted_node_id,parent_id,meta,privacy_scope",
        first ? { count: "exact" } : undefined
      )
      .in("contributor", aliases)
      .order("created_at", { ascending: false })
      .range(start, end);
    return q;
  });
}

async function fetchContributorContributions(contributorId) {
  return paged((start, end, first) => supabase
    .from("research_contributions")
    .select(
      "id,created_at,author_contributor_id,author_name,intent,origin,research_state,status,target_type,target_id,title,body,gematria_claim,image_url,media,convergence_slug",
      first ? { count: "exact" } : undefined
    )
    .eq("author_contributor_id", contributorId)
    .order("created_at", { ascending: false })
    .range(start, end)
  );
}

async function fetchSourceMessages(aliases) {
  const byId = new Map();
  for (const column of ["credit", "speaker"]) {
    const result = await paged((start, end) => supabase
      .from("channel_updates")
      .select("id,created_at,text,image_url,thumb_url,source,status,credit,channel,link_url,speaker")
      .in(column, aliases)
      .order("created_at", { ascending: false })
      .range(start, end)
    );
    for (const row of result.rows) byId.set(String(row.id), row);
  }
  return [...byId.values()].sort((a, b) => clean(b.created_at).localeCompare(clean(a.created_at)));
}

async function fetchContributorTopics(aliases) {
  const byKey = new Map();
  for (const creator of aliases) {
    let offset = 0;
    while (offset < 1000) {
      const result = await fetchTopicCardList({ creator, limit: 100, offset });
      for (const row of result?.rows || []) byKey.set(topicKey(row), row);
      if (!result?.hasMore) break;
      offset += 100;
    }
  }
  return [...byKey.values()];
}

async function fetchLexicalRows(terms) {
  const safeTerms = uniq(terms).filter((term) => term.length <= 180);
  const rows = [];
  for (const batch of chunk(safeTerms)) {
    const { data, error } = await supabase
      .from("gematria_words")
      .select("phrase,world,tags,is_verified,is_published")
      .in("phrase", batch)
      .eq("is_verified", true);
    if (error) throw error;
    rows.push(...(data || []));
  }
  const byPhrase = new Map();
  for (const row of rows) {
    const phrase = clean(row.phrase);
    if (!phrase) continue;
    const prior = byPhrase.get(phrase) || { phrase, world: null, tags: [], is_verified: true, is_published: false };
    if (!prior.world && clean(row.world)) prior.world = clean(row.world);
    prior.tags = uniq([...(prior.tags || []), ...(Array.isArray(row.tags) ? row.tags : [])]);
    prior.is_published = Boolean(prior.is_published || row.is_published);
    byPhrase.set(phrase, prior);
  }
  return [...byPhrase.values()];
}

export async function fetchContributorFindingsProjection(slug) {
  const contributor = await fetchContributor(slug);
  if (!contributor) return null;
  const aliases = uniq([contributor.display_name, ...(Array.isArray(contributor.wa_names) ? contributor.wa_names : [])]);

  const [research, sourceMessages, contributions, topics] = await Promise.all([
    fetchResearchObjects(aliases),
    fetchSourceMessages(aliases),
    fetchContributorContributions(contributor.id),
    fetchContributorTopics(aliases),
  ]);

  const terms = uniq(research.rows.flatMap((row) => Array.isArray(row.terms) ? row.terms : []));
  let lexicalRows = [];
  try {
    lexicalRows = await fetchLexicalRows(terms);
  } catch (_) {
    lexicalRows = [];
  }

  const projection = buildContributorFindingsProjection({
    contributor,
    researchObjects: research.rows,
    sourceMessages,
    contributions: contributions.rows,
    topics,
    lexicalRows,
  });

  return {
    ...projection,
    loadState: {
      researchObjectsTotal: research.total,
      researchObjectsTruncated: research.truncated,
      contributionsTotal: contributions.total,
      contributionsTruncated: contributions.truncated,
      sourceMessagesLoaded: sourceMessages.length,
      topicsLoaded: topics.length,
    },
  };
}

export default fetchContributorFindingsProjection;
