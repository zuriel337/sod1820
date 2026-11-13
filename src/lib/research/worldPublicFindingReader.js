import { CONTRIBUTOR_RESEARCH_VIEW_FALLBACK, readContributorResearchView } from "./contributorResearchView.js";
import { publicPostHref } from "../publicPostUrls.js";
import { getPublicResearchClient } from "./researchViewMode.js";
import { publicResearchPresentationEligible, projectPublicResearchFinding,
  ZVI_SOURCE_CONTRIBUTOR_ID } from "./worldZviApprovedFindings2029.js";
import { contributorSourceLocator } from "./worldContributorSourceLocator.js";
import { worldPreviewMaterialExclusion } from "./worldPreviewMaterialScope.js";
import {
  buildWorldAllResearchProjection,
  findWorldPublicResearchFinding,
} from "./worldAllResearchProjection.js";

import { RESEARCH_PUBLIC_VISIBLE_STATUSES, RESEARCH_VERIFIED_PUBLIC_STATUSES } from "./researchObjectPresentation.js";

// ZURIEL 12.11.2026: an exact public finding is viewable whatever its stored status;
// candidates keep that status and are presented as "טרם אומת" (never promoted here).
const PUBLIC_RESEARCH_STATUSES = RESEARCH_PUBLIC_VISIBLE_STATUSES;
const MAX_TOPIC_TARGETS = 24;
// topic_cards.id/node_id are UUID columns, while documented number/entity tree
// keys can also be numeric or namespaced (e.g. 476, gw:...). Never put those
// values into a UUID PostgREST filter: that fails the entire public finding.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const findingPromiseCache = new Map();
const clean = (value) => value == null ? "" : String(value).trim();

async function exactDisplayedTextFingerprint(value) {
  const text = clean(value).replace(/\s+/g, " ");
  if (!text || !globalThis.crypto?.subtle || typeof TextEncoder === "undefined") return null;
  try {
    const bytes = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch { return null; }
}

function verifiedWebUrl(value) {
  const text = clean(value);
  if (!/^https?:\/\//i.test(text)) return null;
  try {
    const url = new URL(text);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
function channelUpdateId(sourceRef) {
  const match = /^channel_updates:([^#]+)(?:#.*)?$/i.exec(clean(sourceRef));
  return match && match[1] ? match[1] : null;
}

function documentedTopicTargets(row) {
  const matches = Array.isArray(row?.meta?.ext?.wa_channel_intake?.tree_matches)
    ? row.meta.ext.wa_channel_intake.tree_matches
    : [];
  const ids = [];
  const slugs = [];
  const nodeIds = [];
  const add = (list, value) => {
    const key = clean(value);
    if (key && !list.includes(key) && ids.length + slugs.length + nodeIds.length < MAX_TOPIC_TARGETS) list.push(key);
  };
  for (const match of matches) {
    const type = clean(match?.type).toLowerCase();
    const key = clean(match?.key);
    if (!key) continue;
    if (type === "topic") {
      if (UUID.test(key)) add(ids, key);
      else add(slugs, key);
    } else if ((type === "entity" || type === "number") && UUID.test(key)) add(nodeIds, key);
  }
  if (UUID.test(clean(row?.promoted_node_id))) add(nodeIds, row?.promoted_node_id);
  return { ids, slugs, nodeIds };
}

function postgrestValue(value) {
  return `"${clean(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function topicTargetFilter(targets) {
  return [
    targets.ids.length ? `id.in.(${targets.ids.map(postgrestValue).join(",")})` : null,
    targets.slugs.length ? `slug.in.(${targets.slugs.map(postgrestValue).join(",")})` : null,
    targets.nodeIds.length ? `node_id.in.(${targets.nodeIds.map(postgrestValue).join(",")})` : null,
  ].filter(Boolean).join(",");
}

async function readExactSource(client, sourceRef) {
  const id = channelUpdateId(sourceRef);
  if (!id) {
    const source = exactPublicSource(sourceRef);
    if (source && ["gallery_images", "posts"].includes(source.family)) {
      const admitted = (await publicDiscoverySources(client, [{ source_ref: sourceRef }])).get(source.ref);
      if (!admitted) throw new Error("public_finding_source_unavailable");
      return { row: null, excludedRefs: [], sourceHref: admitted.sourceHref };
    }
    return { row: null, excludedRefs: [] };
  }
  const { data, error } = await client.from("channel_updates")
    .select("id,channel,status,link_url,text")
    .eq("id", id)
    .eq("status", "live")
    .maybeSingle();
  if (error) throw error;
  if (!data || clean(data.id) !== id) throw new Error("public_finding_source_unavailable");
  const isOrGeula = clean(data.channel).toLowerCase() === "or-geula";
  return {
    row: data,
    excludedRefs: isOrGeula ? [`channel_updates:${id}`] : [],
  };
}

async function readDocumentedTopics(client, row) {
  const filter = topicTargetFilter(documentedTopicTargets(row));
  if (!filter) return [];
  // Published Topic view only: a do-not-publish card would link to a Topic that cannot open.
  const { data, error } = await client.from("topic_cards_public")
    .select("id,created_at,approved_at,slug,title,subtitle,image_ids,numbers,highlight_numbers,status,quality,meter_score,created_by,node_id")
    .eq("status", "approved")
    .or(filter)
    .limit(MAX_TOPIC_TARGETS);
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

async function readWorldPublicFindingById(id, publicClient) {
  const wanted = clean(id);
  if (!wanted) return null;
  const client = publicClient();
  const { data: researchObject, error } = await client.from("research_objects")
    .select("id,created_at,kind,statement,terms,value,relates,source,source_ref,contributor,confidence,engine_verified,engine_detail,evidence,status,privacy_scope,promoted_node_id,parent_id,meta")
    .eq("id", wanted)
    .eq("privacy_scope", "public")
    .in("status", PUBLIC_RESEARCH_STATUSES)
    .maybeSingle();
  if (error) throw error;
  if (!researchObject || clean(researchObject.id) !== wanted) return null;
  // Extraction fix (13.11.2026): a candidate has not passed the Human Gate, so it opens by id only when it would also be listed
  // (research role, no contact details, no owner mention, no excluded material), exactly the admission of the finding pages.
  if (clean(researchObject.status).toLowerCase() === "candidate" && !await publicResearchPresentationEligible(researchObject)) return null;

  const [source, topics] = await Promise.all([
    readExactSource(client, researchObject.source_ref),
    readDocumentedTopics(client, researchObject),
  ]);
  const projection = buildWorldAllResearchProjection({
    researchObjects: [researchObject],
    topics,
    excludedChannelSourceRefs: source.excludedRefs,
  });
  const finding = findWorldPublicResearchFinding(projection, wanted);
  if (!finding) return null;
  const sourceHref = source.sourceHref || verifiedWebUrl(source.row?.link_url) || verifiedWebUrl(source.row?.text);
  return sourceHref ? { ...finding, sourceHref } : finding;
}

/**
 * One exact anonymous World finding read. It performs one research-object request and at most
 * two bounded enrichments (the exact channel source and documented Topic targets). A rejected
 * request is evicted so retry is real; no admin/session payload is ever cached.
 */
export function fetchWorldPublicFindingById(id, {
  publicClient = getPublicResearchClient,
  cache = publicClient === getPublicResearchClient,
} = {}) {
  const wanted = clean(id);
  if (!wanted) return Promise.resolve(null);
  if (!cache) return readWorldPublicFindingById(wanted, publicClient);
  if (findingPromiseCache.has(wanted)) return findingPromiseCache.get(wanted);
  const request = readWorldPublicFindingById(wanted, publicClient)
    .catch((error) => {
      findingPromiseCache.delete(wanted);
      throw error;
    });
  findingPromiseCache.set(wanted, request);
  return request;
}

export function clearWorldPublicFindingCache() {
  findingPromiseCache.clear();
}

const DISCOVERY_FIELDS = "id,created_at,kind,statement,contributor,source,source_ref,source_contributor_id,status,privacy_scope,meta,engine_verified,engine_detail,promoted_node_id,value";
// research_objects has no source join; the contributor is resolved only from the admitted live source.
const DISCOVERY_TABLE_FIELDS = DISCOVERY_FIELDS.replace(",source_contributor_id", "");
const TIME = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}(?::?\d{2})?)$/;
function exactPublicSource(ref) {
  const value = clean(ref);
  const match = /^(channel_updates|gallery_images):([0-9a-f-]{36})(?:#.*)?$/i.exec(value);
  if (match && UUID.test(match[2])) return { family: match[1].toLowerCase(), id: match[2], ref: `${match[1].toLowerCase()}:${match[2]}` };
  const post = /^posts:([1-9]\d*)(?:#.*)?$/.exec(value);
  return post && Number.isSafeInteger(Number(post[1])) ? { family: "posts", id: Number(post[1]), ref: `posts:${post[1]}` } : null;
}

// Re-admit exact sources anonymously using their existing owners. Bot logs and
// unknown families do NOT become public merely because a finding is approved.
async function publicDiscoverySources(client, rows) {
  const sources = new Map(rows.map((row) => exactPublicSource(row.source_ref)).filter(Boolean).map((source) => [source.ref, source]));
  const admitted = new Map();
  const channels = [...sources.values()].filter((source) => source.family === "channel_updates");
  if (channels.length) {
    const result = await client.from("channel_updates").select("id,status,channel,contributor_id")
      .in("id", channels.map((source) => source.id)).eq("status", "live");
    if (result.error || !Array.isArray(result.data)) throw result.error || new Error("public_sources_unavailable");
    for (const row of result.data) {
      const ref = `channel_updates:${row.id}`;
      // contributorId is an internal provenance join (the view's source_contributor_id); never output.
      if (sources.has(ref) && row.status === "live" && !worldPreviewMaterialExclusion(row, "source_message")) admitted.set(ref, { sourceRef: ref, sourceHref: null, contributorId: clean(row.contributor_id) || null });
    }
  }
  const media = [...sources.values()].filter((source) => source.family === "gallery_images");
  const posts = [...sources.values()].filter((source) => source.family === "posts");
  if (media.length || posts.length) {
    const { fetchGallerySourceContext, fetchPublicWorldPostSource } = await import("./entityHubProjection.js");
    const { gallerySourceHref2029 } = await import("./topicSourceContext.js");
    for (let offset = 0; offset < media.length; offset += 12) {
      const batch = media.slice(offset, offset + 12);
      const context = await fetchGallerySourceContext({ imageIds: batch.map((source) => source.id), client });
      for (const source of batch) {
        const occurrence = context.items?.flatMap((item) => item.occurrences || [])
          .find((entry) => entry.provenance?.sourceRef === source.ref && entry.legacyPlacement?.galleryImageId === source.id);
        const href = occurrence && gallerySourceHref2029(occurrence.legacyPlacement.wpGalleryId, source.id);
        if (href) admitted.set(source.ref, { sourceRef: source.ref, sourceHref: href });
      }
    }
    // Bound concurrency as well as page size; no source-content/engine requests.
    for (let offset = 0; offset < posts.length; offset += 4) {
      await Promise.all(posts.slice(offset, offset + 4).map(async (source) => {
        const post = await fetchPublicWorldPostSource({ postId: source.id, includeContent: false, client });
        if (post?.id === source.id && clean(post.slug)) admitted.set(source.ref, { sourceRef: source.ref, sourceHref: publicPostHref(post) });
      }));
    }
  }
  return admitted;
}

/**
 * Admission of UNREVIEWED public candidates for a surface that lists them outside a finding page (the World feed).
 * Extraction fix (13.11.2026): a candidate has not passed the Human Gate, so before it is listed it must pass the SAME
 * admission as a row on a finding page: research role, no contact details, no owner mention, no excluded material
 * (publicResearchPresentationEligible), the same text rules for its evidence line, and an exact, LIVE, allowed source
 * (publicDiscoverySources). Anything unclear is dropped; a failing source read throws and the caller lists nothing.
 */
export async function admitPublicCandidateRows(client, rows) {
  const eligible = (await Promise.all((Array.isArray(rows) ? rows : []).map(async (row) => {
    if (!await publicResearchPresentationEligible(row)) return null;
    // The feed card also shows the evidence line: it must pass the same text rules as the statement.
    if (clean(row.evidence) && !await publicResearchPresentationEligible({ ...row, statement: row.evidence })) return null;
    return row;
  }))).filter(Boolean);
  if (!eligible.length) return [];
  const sources = await publicDiscoverySources(client, eligible);
  return eligible.filter((row) => sources.has(exactPublicSource(row.source_ref)?.ref));
}

/** One paginated discovery lens over existing finding/source identities.
 * Number/text/source/contributor are filters, never graph relations or verification.
 * No contributor filter is imposed unless explicitly requested by a source home.
 * Two stable tiers (ZURIEL 12.11.2026): Human-Gate verified findings in their existing
 * newest-first order, then public candidates ("טרם אומת") in the same order. A candidate
 * page never precedes the end of the verified tier, so candidates cannot displace it.
 */
export async function fetchWorldPublicFindingsPage({ client = getPublicResearchClient(),
  value = null, query = "", sourceRef = null, contributorId = null, cursor = null, pageSize = 25,
  groupByExactText = false,
} = {}) {
  const q = clean(query).replace(/\s+/g, " ");
  const source = sourceRef == null ? null : exactPublicSource(sourceRef);
  const scope = JSON.stringify([value, q, source?.ref || null, contributorId]);
  const phase = cursor?.phase == null ? "verified" : cursor.phase;
  const tierStart = cursor?.start === true;
  if (!client || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 50
    || (value != null && (!Number.isSafeInteger(value) || value < 0))
    || q.length > 160 || /[\u0000-\u001f]/.test(q)
    || (sourceRef != null && (!source || source.ref !== sourceRef))
    || (contributorId != null && !UUID.test(contributorId))
    || !["verified", "candidate"].includes(phase)
    || (cursor && cursor.scope !== scope)
    || (cursor && tierStart && phase !== "candidate")
    || (cursor && !tierStart && (!UUID.test(cursor.id) || !TIME.test(cursor.createdAt)))) {
    throw new Error("invalid_public_discovery_page");
  }
  // Verified tier: the existing contributor view, unchanged. Candidate tier: the same view when a
  // contributor scope needs its source join; otherwise research_objects under the same public RLS
  // (privacy_scope='public', person_only excluded by ro_public_read and again by the filter below).
  const readTier = async (tier, tierCursor, limit) => {
    const fromView = tier === "verified" || Boolean(contributorId);
    // Verified tier: v1, unchanged. Candidate tier inside a contributor scope: v2 (v1 + public candidates), falling back to v1
    // while v2 does not exist yet - v1 has no public candidates, so the tier is then simply empty.
    const run = (table) => {
      let request = client.from(table)
        .select(fromView ? DISCOVERY_FIELDS : DISCOVERY_TABLE_FIELDS).eq("privacy_scope", "public");
      request = tier === "verified" ? request.in("status", RESEARCH_VERIFIED_PUBLIC_STATUSES) : request.eq("status", "candidate");
      if (!fromView) request = request.or("meta->ext->personal_scope->>scope.is.null,meta->ext->personal_scope->>scope.neq.person_only");
      if (value != null) request = request.eq("value", value);
      if (contributorId) request = request.eq("source_contributor_id", contributorId);
      // User text is a literal substring, never an interpolated PostgREST .or().
      if (q) request = request.ilike("statement", `%${q.replace(/[\\%_*]/g, "\\$&")}%`);
      if (source) request = request.or(`source_ref.eq.${source.ref},source_ref.like.${source.ref}#%`);
      if (tierCursor) request = request.or(`created_at.lt."${tierCursor.createdAt}",and(created_at.eq."${tierCursor.createdAt}",id.lt.${tierCursor.id})`);
      return request.order("created_at", { ascending: false }).order("id", { ascending: false }).limit(limit + 1);
    };
    const result = !fromView ? await run("research_objects")
      : tier === "verified" ? await run(CONTRIBUTOR_RESEARCH_VIEW_FALLBACK)
      : await readContributorResearchView(run);
    if (result.error || !Array.isArray(result.data)) throw result.error || new Error("public_discovery_unavailable");
    return result.data.filter((row) => (tier === "verified"
      ? RESEARCH_VERIFIED_PUBLIC_STATUSES.includes(clean(row?.status).toLowerCase())
      : clean(row?.status).toLowerCase() === "candidate"));
  };
  const tierCursor = (rows) => {
    const last = rows.at(-1);
    if (!UUID.test(clean(last?.id)) || !TIME.test(clean(last?.created_at))) throw new Error("public_discovery_cursor_unavailable");
    return { id: last.id, createdAt: last.created_at };
  };
  let page = [];
  let nextCursor = null;
  if (phase === "verified") {
    const verified = await readTier("verified", cursor, pageSize);
    page = verified.slice(0, pageSize);
    if (verified.length > pageSize) nextCursor = { ...tierCursor(page), scope, phase: "verified" };
  }
  if (!nextCursor && page.length <= pageSize) {
    const remaining = pageSize - page.length;
    const startCursor = phase === "candidate" && !tierStart ? cursor : null;
    const candidates = await readTier("candidate", startCursor, remaining);
    const taken = candidates.slice(0, remaining);
    page = [...page, ...taken];
    if (candidates.length > remaining) {
      nextCursor = taken.length ? { ...tierCursor(taken), scope, phase: "candidate" } : { scope, phase: "candidate", start: true };
    }
  }
  const checked = (await Promise.all(page.map(async (row) => {
    if (contributorId && row.source_contributor_id !== contributorId) return null;
    if (value != null && (row.value == null || !["number", "string"].includes(typeof row.value)
      || !String(row.value).trim() || Number(row.value) !== value)) return null;
    if (q && !clean(row.statement).replace(/\s+/g, " ").toLocaleLowerCase("he").includes(q.toLocaleLowerCase("he"))) return null;
    if (source && exactPublicSource(row.source_ref)?.ref !== source.ref) return null;
    return await publicResearchPresentationEligible(row) ? row : null;
  }))).filter(Boolean);
  const sources = await publicDiscoverySources(client, checked);
  const rows = [];
  const seen = new Set();
  let omittedUnavailable = false;
  for (const row of checked) {
    const source = sources.get(exactPublicSource(row.source_ref)?.ref);
    if (!source) { omittedUnavailable = true; continue; }
    const sourceContributorId = row.source_contributor_id ?? source.contributorId ?? null;
    const sourceHref = source.sourceHref || (sourceContributorId === ZVI_SOURCE_CONTRIBUTOR_ID
      && source.sourceRef.startsWith("channel_updates:") ? contributorSourceLocator(source.sourceRef, { slug: "tzvi-opoc" }).href : null);
    const finding = projectPublicResearchFinding(row, { sourceRef: source.sourceRef, sourceHref });
    if (!finding || seen.has(finding.id)) continue;
    seen.add(finding.id);
    const exactTextFingerprint = groupByExactText ? await exactDisplayedTextFingerprint(row.statement) : null;
    rows.push(Object.freeze({ ...finding, ...(value == null ? {} : { claimedNumber: value }),
      ...(exactTextFingerprint ? { exactTextFingerprint } : {}),
      sourceOccurrenceRef: clean(row.source_ref),
      sourceRoutePrecision: source.sourceRef.startsWith("posts:") ? "post_only_with_stored_source_locator"
        : source.sourceRef.startsWith("gallery_images:") ? "exact_gallery_occurrence"
          : sourceHref ? "exact_channel_occurrence" : "finding_details_only",
      discoveryPath: value == null ? "source-or-text-match" : "via-stored-number-not-direct-topic-edge" }));
  }
  const hasMore = Boolean(nextCursor);
  return Object.freeze({ rows, hasMore, nextCursor,
    omittedForReview: checked.length < page.length, omittedUnavailable,
    coverage: { scope: "existing-public-finding-view", sourceFamilies: ["channel_updates", "gallery_images", "posts"],
      exhaustiveCorpus: false, examined: page.length, returned: rows.length, partial: hasMore || omittedUnavailable || checked.length < page.length },
  });
}
