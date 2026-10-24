import { getPublicResearchClient } from "./researchViewMode.js";
import {
  buildWorldAllResearchProjection,
  findWorldPublicResearchFinding,
} from "./worldAllResearchProjection.js";

const PUBLIC_RESEARCH_STATUSES = Object.freeze(["approved", "canonical"]);
const MAX_TOPIC_TARGETS = 24;
const findingPromiseCache = new Map();
const clean = (value) => value == null ? "" : String(value).trim();

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
      if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(key)) add(ids, key);
      else add(slugs, key);
    } else if (type === "entity" || type === "number") add(nodeIds, key);
  }
  add(nodeIds, row?.promoted_node_id);
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
  if (!id) return { row: null, excludedRefs: [] };
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
  const { data, error } = await client.from("topic_cards")
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
  const sourceHref = verifiedWebUrl(source.row?.link_url) || verifiedWebUrl(source.row?.text);
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
