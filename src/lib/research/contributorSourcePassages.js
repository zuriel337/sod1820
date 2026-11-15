import { publicPostHref } from "../publicPostUrls.js";
import { hasSuppressedPublicPostTag } from "./publicPostBoundary.js";

export const SIGNED_PASSAGE_REF = "signed_source_passage";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HASH = /^[0-9a-f]{64}$/;
const BLOCKS = "p,h1,h2,h3,h4,h5,h6,div,li,blockquote,td";
const HIDDEN = "script,style,template,pre,code,[hidden],[aria-hidden='true']";
const publishedChannelUpdate = (row, now) => row.status === "live" && row.page_only === false
  && (!row.expires_at || Date.parse(row.expires_at) > now);

export function signedPassageAnchor(id) {
  return UUID.test(id || "") ? `signed-passage-${id}` : null;
}

export function parseSignedPassage(row) {
  const anchor = signedPassageAnchor(row?.id);
  if (!anchor || row.ref_type !== SIGNED_PASSAGE_REF) return null;
  const match = /^(posts|channel_updates):([^#]+)#([^@]+)@([a-f0-9]{64})$/.exec(row.ref || "");
  if (!match) return null;
  const [, table, sourceId, locator, digest] = match;
  if (table === "posts" ? !/^[1-9]\d{0,14}$/.test(sourceId) || !HASH.test(locator)
    : !UUID.test(sourceId) || !/^[1-9]\d{0,3}$/.test(locator)) return null;
  return { id: row.id, table, sourceId, locator, digest, anchor, sourceRef: `${table}:${sourceId}` };
}

export async function sourcePassageDigest(value) {
  if (typeof value !== "string" || !globalThis.crypto?.subtle) return null;
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

const normalizeBlock = (value) => value.replace(/\s+/g, " ").trim();
export function signedPostBylines(root) {
  if (!root) return [];
  return Array.from(root.querySelectorAll(BLOCKS)).flatMap((node) => {
    if (node.closest(HIDDEN) || node.querySelector(BLOCKS)) return [];
    const witness = normalizeBlock(node.textContent);
    const credit = /^מאת\s*:?\s+([^:]+?)(?:\s*:\s*.*)?$/.exec(witness)?.[1]?.trim();
    return credit && credit.length <= 100 ? [{ node, witness, credit }] : [];
  });
}

export async function findSignedPostByline(root, locator) {
  const matches = (await Promise.all(signedPostBylines(root).map(async (entry) =>
    await sourcePassageDigest(entry.witness) === locator ? entry : null))).filter(Boolean);
  return matches.length === 1 ? matches[0] : null;
}

export function channelPassageBlocks(text) {
  if (typeof text !== "string") return [];
  return text.trim().split(/\r?\n[^\S\r\n]*─{4,}[^\S\r\n]*\r?\n/).map((part) => {
    const block = part.trim();
    const first = block.split(/\r?\n/, 1)[0];
    const credit = /^(.+?)\s+·\s+\d{2}\.\d{2}\.\d{4}(?:\s+·\s+\d{2}:\d{2})?$/.exec(first)?.[1];
    return { text: block, credit };
  });
}

export async function validateSignedPassage(ref, source, { document: doc = globalThis.document, now = Date.now() } = {}) {
  if (!ref || String(source?.id) !== ref.sourceId) return null;
  if (ref.table === "posts") {
    if (!source.slug || source.home_hidden === true || source._privateStage || source._previewSnapshot
      || hasSuppressedPublicPostTag(source) || ["gpt-draft", "web"].includes(String(source.source || "").trim().toLowerCase())
      || !doc?.createElement || await sourcePassageDigest(source.content) !== ref.digest) return null;
    const template = doc.createElement("template");
    template.innerHTML = source.content;
    const byline = await findSignedPostByline(template.content, ref.locator);
    return byline ? { ref, source, credit: byline.credit } : null;
  }
  if (!publishedChannelUpdate(source, now)
    || await sourcePassageDigest(source.text) !== ref.digest) return null;
  const blocks = channelPassageBlocks(source.text);
  const block = blocks[Number(ref.locator) - 1];
  return block?.credit ? { ref, source, credit: block.credit, blocks } : null;
}

const POST_FIELDS = "id,slug,title,date,modified,created_at,source,wp_id,link,tags,home_hidden,content";
const UPDATE_FIELDS = "id,seo_title,created_at,text,status,page_only,expires_at,channel";
const readRows = async (query) => {
  const { data, error } = await query;
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error("invalid_signed_passage_rows");
  return data;
};
const referenceQuery = (client) => client.from("contributor_content").select("id,contributor_id,ref,ref_type")
  .eq("kind", "link").eq("ref_type", SIGNED_PASSAGE_REF).eq("is_public", true).eq("is_personal", false);
const readSources = (client, table, ids) => ids.length
  ? readRows(client.from(table).select(table === "posts" ? POST_FIELDS : UPDATE_FIELDS).in("id", ids))
  : Promise.resolve([]);

export async function fetchContributorSourcePassages(identity, { client }) {
  const rows = await readRows(referenceQuery(client).eq("contributor_id", identity.id)
    .order("sort").order("id").limit(101));
  const refs = rows.slice(0, 100).map(parseSignedPassage).filter(Boolean);
  const uniqueIds = (table) => [...new Set(refs.filter((ref) => ref.table === table).map((ref) => ref.sourceId))];
  const [posts, updates] = await Promise.all([
    readSources(client, "posts", uniqueIds("posts")),
    readSources(client, "channel_updates", uniqueIds("channel_updates")),
  ]);
  const sources = new Map([
    ...posts.map((post) => [`posts:${post.id}`, post]),
    ...updates.map((update) => [`channel_updates:${update.id}`, update]),
  ]);
  const grouped = new Map();
  const seen = new Set();
  for (const passage of (await Promise.all(refs.map((ref) =>
    validateSignedPassage(ref, sources.get(ref.sourceRef))))).filter(Boolean)) {
    const { ref, source, credit } = passage;
    const key = `${ref.sourceRef}#${ref.locator}`;
    if (seen.has(key)) continue;
    const search = new URLSearchParams({ passage: ref.id });
    const href = ref.table === "posts" ? publicPostHref(source, { search: search.toString(), hash: ref.anchor })
      : `/world?view=sources&${search}#${ref.anchor}`;
    if (!href) continue;
    seen.add(key);
    const row = grouped.get(ref.sourceRef) || {
      sourceRef: ref.sourceRef, table: ref.table, sourceId: ref.sourceId,
      title: source.title || source.seo_title, date: source.date || source.created_at,
      links: [],
    };
    row.links.push({ href, credit });
    grouped.set(ref.sourceRef, row);
  }
  return { rows: [...grouped.values()], complete: rows.length <= 100 };
}

export async function fetchSignedSourcePassage(client, id, table) {
  if (!signedPassageAnchor(id)) return null;
  const [row] = await readRows(referenceQuery(client).eq("id", id).limit(1));
  const ref = parseSignedPassage(row);
  if (ref?.table !== table) return null;
  const [[source], [writer]] = await Promise.all([
    readSources(client, table, [ref.sourceId]),
    readRows(client.from("contributors").select("id,locked,building,public_visibility:dossier_settings->>visibility")
      .eq("id", row.contributor_id).eq("active", true).limit(1)),
  ]);
  if (!writer || writer.locked || writer.building || (writer.public_visibility && writer.public_visibility !== "public")) return null;
  return validateSignedPassage(ref, source);
}
