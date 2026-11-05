import { REVIEWED_TORAH_TAMIMA_LINK, reviewedCommunityAccountId, canonicalCommunityAuthorKey } from "./communityCanonicalIdentity2029.js";
import { supabase } from "../supabase.js";
import { PUBLIC_LAUNCH_READ_ONLY_PREVIEW } from "../publicLaunch2029.js";
import { getPublicResearchClient } from "../research/researchViewMode.js";
import { addContribution } from "../contributions.js";
import { COMMUNITY_THREAD_UUID as UUID_PATTERN, normalizeCommunityThreadFocus } from "./communityThreadFocus.js";
import { MESSAGE_FORMAT_PREFIX } from "./messageFormatting.js";
export { normalizeCommunityThreadFocus } from "./communityThreadFocus.js";

// Public reading never borrows the current account or admin session.
// Ordinary builds keep their existing client; explicit reader injection is retained.
const communityReadClient = () => PUBLIC_LAUNCH_READ_ONLY_PREVIEW ? getPublicResearchClient() : supabase;

export const COMMUNITY_PAGE_SIZE = 40;
export const COMMUNITY_REPLY_PAGE_SIZE = 20;
export const COMMUNITY_ARCHIVE_TOTAL = 41080;

export async function fetchCommunityThreadUpdates(cursors, { client = communityReadClient(), signal } = {}) {
  const ids = new Set(cursors.map(item => item.root_id));
  let query = client.rpc("community_thread_updates", { p_cursors: cursors }).select("root_id,new_count,first_reply_id,first_path");
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw error;
  if (!Array.isArray(data) || data.length !== ids.size) throw new Error("Invalid Community update projection");
  const output = {};
  for (const row of data) {
    const count = Number(row.new_count);
    const focus = count > 0 ? normalizeCommunityThreadFocus({ threadId: row.root_id, replyId: row.first_reply_id, path: Array.isArray(row.first_path) ? row.first_path.join(",") : "" }) : null;
    if (!ids.has(row.root_id) || output[row.root_id] || row.new_count == null || !Number.isSafeInteger(count) || count < 0 || count > 0 && !focus) throw new Error("Invalid Community update projection");
    output[row.root_id] = { count, path: focus?.path || null, message_id: focus?.replyId || null, root_id: row.root_id };
  }
  return output;
}
const COMMUNITY_ORIGINS = ["openweb", "community_2029"];
// Project at the API boundary. Older Community RPCs also expose joined dossier
// columns; this consumer requests only public message credit, never private
// Contributor account/avatar fields.
const COMMUNITY_RPC_FIELDS = "id,parent_id,author_name,author_user_id,author_contributor_id,title,body,reactions,origin,created_at,edited_at,is_deleted,total_count";
async function readCommunityRpc(name, args, client = communityReadClient()) {
  if (typeof client?.rpc !== "function") return null;
  const { data, error } = await client.rpc(name, args).select(COMMUNITY_RPC_FIELDS);
  if (error?.code === "PGRST202" || error?.code === "42883") return null;
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error("invalid public community response");
  return data;
}
const knownCount = value => value != null && Number.isSafeInteger(Number(value)) && Number(value) >= 0 ? Number(value) : null;

export const PROFILE_BASELINES = Object.freeze({
  "תורה תמימה": { handle: "torahtamima", likes: 648, likesLabel: "648", isPrivate: true },
  "גרין רז": { handle: "greenraz", likes: 427, likesLabel: "427", isPrivate: false },
  "אביזוהר בן חיים": { handle: "אביזוהר", likes: 2900, likesLabel: "2.9K", isPrivate: false },
  "אמילי": { handle: "amiliy120", likes: 22900, likesLabel: "22.9K", isPrivate: false },
  "שינשין": { handle: "שינשין", likes: 20300, likesLabel: "20.3K", isPrivate: true },
});

// Verified OpenWeb source IDs resolve to these existing contributor records.
// A screenshot/name alone never grants account ownership.
export const VERIFIED_ARCHIVE_PROFILES = Object.freeze({
  [REVIEWED_TORAH_TAMIMA_LINK.contributorId]: { sourceUserId: "U_QAu9LlY39eZZzLYi", name: "תורה תמימה", accountUserId: REVIEWED_TORAH_TAMIMA_LINK.accountId,
    ...PROFILE_BASELINES["תורה תמימה"] },
  [`user:${REVIEWED_TORAH_TAMIMA_LINK.accountId}`]: { name: "תורה תמימה", accountUserId: REVIEWED_TORAH_TAMIMA_LINK.accountId,
    ...PROFILE_BASELINES["תורה תמימה"] },
  "f499536a-e993-4a7d-8706-a2e69337c320": { sourceUserId: "u_zawiGiUO", name: "שינשין", ...PROFILE_BASELINES["שינשין"] },
  // ZURIEL explicitly approved this public historical bio on 2026-10-25.
  // It grants no account binding or platform permission; the source dossier remains private.
  "e7581ab5-8c15-4832-b602-f361e41ff373": { sourceUserId: "u_r6fetXIK", name: "אמילי", ...PROFILE_BASELINES["אמילי"],
    publicBio: "מנהלת ותיקה בקהילת סוד 1820, פעילה ומלווה את הקהילה מזה כעשור." },
  // ZURIEL explicitly identified Esther26; this is distinct from the source named אסתר.
  "99bcfb38-85be-4f38-89f0-7886f2f179e6": {
    name: "Esther26",
    publicBio: "מנהלת ותיקה בקהילת סוד 1820, פעילה ומלווה את הקהילה מזה כעשור." },
  "27c10d9a-14a6-4493-980b-2f5eda105ad7": { sourceUserId: "u_vtNX8TEGu5VV", name: "אביזוהר בן חיים", ...PROFILE_BASELINES["אביזוהר בן חיים"] },
  "4cd9c034-0464-4600-a35d-7156f0584d9b": { sourceUserId: "u_3knnZ5YC", name: "Sod1820", accountUserId: "02a0d207-0136-4beb-a34d-8ff57d10cd85" },
  "19936860-6b35-4386-bc44-113289858ff0": { sourceUserId: "u_3kuB1woMg6wz", name: "Yosi Viner", handle: "YosiViner559", accountUserId: "b6ce542a-2b07-4749-8aba-532c886f6de7" },
});

// ZURIEL confirmed on 2026-10-26: each source follows its own verified email.
// These display bridges mirror the reviewed server Person edges; they grant no
// account authority. Each reader keeps the two accounts and their activity separate.
const VERIFIED_OWNER_PAIRS = Object.freeze([
  { accountId: REVIEWED_TORAH_TAMIMA_LINK.accountId, contributorId: REVIEWED_TORAH_TAMIMA_LINK.contributorId }, // Human-gated exact OpenWeb source link, 2026-11-04.
  { accountId: "02a0d207-0136-4beb-a34d-8ff57d10cd85", contributorId: "4cd9c034-0464-4600-a35d-7156f0584d9b" }, // zyz997 ↔ Sod1820
  { accountId: "b6ce542a-2b07-4749-8aba-532c886f6de7", contributorId: "19936860-6b35-4386-bc44-113289858ff0" }, // כי לה׳ המלוכה ↔ YosiViner559
]);

export function communityAuthorIdentity(authorKey) {
  const isUser = authorKey?.startsWith("user:");
  const id = isUser ? authorKey.slice(5) : authorKey;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || "")) throw new Error("invalid author id");
  const pair = VERIFIED_OWNER_PAIRS.find((candidate) => isUser ? candidate.accountId === id : candidate.contributorId === id);
  return pair
    ? { accountIds: [pair.accountId], contributorIds: [pair.contributorId], verifiedOwner: true }
    : { accountIds: isUser ? [id] : [], contributorIds: isUser ? [] : [id], verifiedOwner: false };
}

function filterByAuthor(query, identity) {
  if (identity.accountIds.length && identity.contributorIds.length) return query.or(`author_user_id.in.(${identity.accountIds.join(",")}),author_contributor_id.in.(${identity.contributorIds.join(",")})`);
  if (identity.accountIds.length) return query.eq("author_user_id", identity.accountIds[0]);
  return identity.contributorIds.length === 1 ? query.eq("author_contributor_id", identity.contributorIds[0]) : query.in("author_contributor_id", identity.contributorIds);
}

export async function resolveCommunityAuthorIdentity(authorKey, client = communityReadClient()) {
  const identity = communityAuthorIdentity(authorKey);
  if (identity.verifiedOwner) return identity;
  if (authorKey.startsWith("user:")) {
    const { data, error } = await client.from("contributors").select("id").eq("user_id", identity.accountIds[0]).limit(100);
    if (error) throw error;
    return { ...identity, contributorIds: (data || []).map((row) => row.id) };
  }
  const { data, error } = await client.from("contributors").select("user_id").eq("id", identity.contributorIds[0]).maybeSingle();
  if (error) throw error;
  return { ...identity, accountIds: data?.user_id ? [data.user_id] : [] };
}

const entityDecoder = typeof document === "undefined" ? null : document.createElement("textarea");

export function decodeCommunityText(value) {
  const text = String(value || "");
  if (text.startsWith(MESSAGE_FORMAT_PREFIX)) return text;
  if (!entityDecoder || !text.includes("&")) return text;
  entityDecoder.innerHTML = text;
  return entityDecoder.value;
}

export function normalizeCommunityRow(row) {
  if (row.is_deleted === true || row.deleted_at) return {
    id: row.id, parentId: row.parent_id || null, authorName: "", authorKey: null,
    authorUserId: null, linkedUserId: null, avatarUrl: null, title: null, body: "",
    reactions: {}, origin: row.origin || null, targetType: null, targetId: null,
    createdAt: row.created_at, editedAt: null, isDeleted: true,
  };
  const contributor = Array.isArray(row?.contributor) ? row.contributor[0] : row?.contributor;
  const contributorId = contributor?.id || row.author_contributor_id || null;
  const authorName = String(VERIFIED_ARCHIVE_PROFILES[contributorId]?.name || row?.author_name || contributor?.display_name || "חבר הקהילה").trim();
  return {
    id: row.id,
    parentId: row.parent_id || null,
    authorName,
    authorKey: row.author_user_id ? `user:${row.author_user_id}` : canonicalCommunityAuthorKey(contributorId),
    authorUserId: row.author_user_id || null,
    linkedUserId: contributor?.user_id || reviewedCommunityAccountId(contributorId),
    avatarUrl: contributor?.avatar_url || null,
    title: row.title || null,
    body: decodeCommunityText(row.body || row.title || ""),
    reactions: row.reactions && typeof row.reactions === "object" ? row.reactions : {},
    origin: row.origin || null,
    targetType: row.target_type || null,
    targetId: row.target_id || null,
    createdAt: row.created_at,
    editedAt: row.edited_at || null,
    isDeleted: false,
  };
}

export function legacyLikeCount(reactions) {
  const legacy = Number(reactions?.likes);
  const modern = Array.isArray(reactions?.["👍"]) ? reactions["👍"].length : 0;
  const added = Number(reactions?.community_likes);
  return (Number.isFinite(legacy) && legacy > 0 ? legacy : 0) + modern + (Number.isFinite(added) && added > 0 ? added : 0);
}

// View ordering for already-loaded public roots only. Use the same historical
// and current thumbs-up count that the existing Community row displays.
export function compareCommunityLikedRows(a, b) {
  const likes = row => row.isDeleted ? 0 : legacyLikeCount(row.reactions);
  return likes(b) - likes(a)
    || String(b.createdAt).localeCompare(String(a.createdAt))
    || String(b.id).localeCompare(String(a.id));
}

export async function fetchCommunityArchivePage({ offset = 0, limit = COMMUNITY_PAGE_SIZE, sort = "newest", client = communityReadClient() } = {}) {
  const safeOffset = Math.max(0, Math.trunc(offset));
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  const projected = await readCommunityRpc("community_feed_page", { p_offset: safeOffset, p_limit: safeLimit, p_sort: sort === "oldest" ? "oldest" : "newest" }, client);
  if (projected) return { rows: projected.map(normalizeCommunityRow), count: safeOffset === 0 ? projected.length ? knownCount(projected[0].total_count) : 0 : null, nextOffset: safeOffset + projected.length };
  const { data, error, count } = await client
    .from("research_contributions")
    .select("id,parent_id,author_name,author_user_id,title,body,reactions,origin,created_at,author_contributor_id,contributor:contributors!research_contributions_author_contributor_id_fkey(id,user_id,display_name,avatar_url)", { count: safeOffset === 0 ? "exact" : undefined })
    .eq("status", "approved")
    .in("origin", COMMUNITY_ORIGINS)
    .is("parent_id", null)
    .order("created_at", { ascending: sort === "oldest" })
    .order("id", { ascending: sort === "oldest" })
    .range(safeOffset, safeOffset + safeLimit - 1);
  if (error) throw error;
  return { rows: (data || []).map(normalizeCommunityRow), count: count ?? null, nextOffset: safeOffset + (data || []).length };
}

// Corpus-wide text search over every public message and reply. The server
// (`community_search`) applies the same visibility chain as the feed, so a hit
// is never returned for hidden, deleted or unapproved content. Results are
// newest-first; `count` is the total number of matches and is only known for
// the first page. Returns null when the server function is not deployed so the
// caller can fall back to filtering the already-loaded messages.
export const COMMUNITY_SEARCH_MIN_LENGTH = 2;
export const COMMUNITY_SEARCH_MAX_LENGTH = 80;
export const COMMUNITY_SEARCH_PAGE_SIZE = 20;
export async function searchCommunityMessages(query, { offset = 0, limit = COMMUNITY_SEARCH_PAGE_SIZE, client = communityReadClient() } = {}) {
  const text = String(query ?? "").trim();
  const safeOffset = Math.max(0, Math.trunc(offset) || 0);
  const safeLimit = Math.max(1, Math.min(50, Math.trunc(limit) || COMMUNITY_SEARCH_PAGE_SIZE));
  if ([...text].length < COMMUNITY_SEARCH_MIN_LENGTH || [...text].length > COMMUNITY_SEARCH_MAX_LENGTH) return { rows: [], count: 0, nextOffset: safeOffset };
  const projected = await readCommunityRpc("community_search", { p_query: text, p_offset: safeOffset, p_limit: safeLimit }, client);
  if (!projected) return null;
  const rows = projected.map(normalizeCommunityRow).filter(row => !row.isDeleted && row.body);
  return { rows, count: safeOffset === 0 ? (projected.length ? knownCount(projected[0].total_count) : 0) : null, nextOffset: safeOffset + projected.length };
}

// Ids from the thread root down to `messageId`, using the same public context
// reader as the "Replies to me" links. Returns null unless the whole chain is
// public, so a search hit can only open a thread the visitor may already read.
export async function fetchCommunityMessagePath(messageId, { client = communityReadClient() } = {}) {
  if (!UUID_PATTERN.test(messageId || "")) return null;
  const chain = await readCommunityRpc("community_message_context", { p_id: messageId }, client);
  if (!chain?.length || chain[0].parent_id != null || chain[chain.length - 1].id !== messageId) return null;
  const path = chain.map(row => row.id);
  return path.every((id, index) => index === 0 || chain[index].parent_id === path[index - 1]) ? path : null;
}

// Exact public root reader for links from the private "Replies to me" inbox.
// It does not search by text/name and never widens visibility: only an approved
// root from one of the two public community origins can be returned.
export async function fetchCommunityThread(threadId, { client = communityReadClient() } = {}) {
  if (!UUID_PATTERN.test(threadId || "")) throw new Error("invalid thread id");
  const projected = await readCommunityRpc("community_message_context", { p_id: threadId }, client);
  if (projected) {
    const root = projected.find(row => row.id === threadId && row.parent_id == null && COMMUNITY_ORIGINS.includes(row.origin));
    return root ? normalizeCommunityRow(root) : null;
  }
  const { data, error } = await client
    .from("research_contributions")
    .select("id,parent_id,author_name,author_user_id,title,body,reactions,origin,created_at,author_contributor_id,contributor:contributors!research_contributions_author_contributor_id_fkey(id,user_id,display_name,avatar_url)")
    .eq("id", threadId)
    .eq("status", "approved")
    .in("origin", COMMUNITY_ORIGINS)
    .is("parent_id", null)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeCommunityRow(data) : null;
}

export async function fetchCommunityReply(parentId, replyId, { client = communityReadClient() } = {}) {
  if (!UUID_PATTERN.test(parentId || "") || !UUID_PATTERN.test(replyId || "")) throw new Error("invalid reply context");
  const projected = await readCommunityRpc("community_message_context", { p_id: replyId }, client);
  if (projected) {
    const reply = projected.find(row => row.id === replyId && row.parent_id === parentId && COMMUNITY_ORIGINS.includes(row.origin));
    return reply ? normalizeCommunityRow(reply) : null;
  }
  const { data, error } = await client
    .from("research_contributions")
    .select("id,parent_id,author_name,author_user_id,title,body,reactions,origin,created_at,author_contributor_id,contributor:contributors!research_contributions_author_contributor_id_fkey(id,user_id,display_name,avatar_url)")
    .eq("id", replyId)
    .eq("parent_id", parentId)
    .eq("status", "approved")
    .in("origin", COMMUNITY_ORIGINS)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeCommunityRow(data) : null;
}

// The feed pages roots only. Replies are read from the same RLS-protected source
// when a thread opens, so an approved reply never appears detached from its parent.
export async function fetchCommunityReplies(parentId, { offset = 0, limit = COMMUNITY_REPLY_PAGE_SIZE, client = communityReadClient() } = {}) {
  if (!UUID_PATTERN.test(parentId || "")) throw new Error("invalid parent id");
  const safeOffset = Math.max(0, Math.trunc(offset));
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  const projected = await readCommunityRpc("community_replies_page", { p_parent: parentId, p_offset: safeOffset, p_limit: safeLimit }, client);
  if (projected) return { rows: projected.map(normalizeCommunityRow), count: projected.length ? knownCount(projected[0].total_count) : safeOffset, nextOffset: safeOffset + projected.length };
  const { data, error, count } = await client
    .from("research_contributions")
    .select("id,parent_id,author_name,author_user_id,title,body,reactions,origin,created_at,author_contributor_id,contributor:contributors!research_contributions_author_contributor_id_fkey(id,user_id,display_name,avatar_url)", { count: "exact" })
    .eq("status", "approved")
    .in("origin", COMMUNITY_ORIGINS)
    .eq("parent_id", parentId)
    .not("body", "is", null)
    .neq("body", "")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .range(safeOffset, safeOffset + safeLimit - 1);
  if (error) throw error;
  return { rows: (data || []).map(normalizeCommunityRow).filter((row) => row.body), count: count ?? 0, nextOffset: safeOffset + (data || []).length };
}

export async function fetchCommunityReplyCounts(parentIds, { client = communityReadClient() } = {}) {
  // The public release admits replies only after checking their public context.
  // Its transport intentionally blocks the separate counts RPC. Keep counts
  // unknown until the approved replies page loads instead of sending a denied read.
  if (PUBLIC_LAUNCH_READ_ONLY_PREVIEW) return {};
  const ids = [...new Set(parentIds)].filter((id) => UUID_PATTERN.test(id || ""));
  if (!ids.length) return {};
  const counts = Object.fromEntries(ids.map((id) => [id, 0]));
  const { data: projected, error: rpcError } = await client.rpc("community_reply_counts", { p_ids: ids.slice(0, 200) });
  if (!rpcError) {
    if (!Array.isArray(projected)) throw new Error("invalid reply counts");
    for (const row of projected) if (ids.includes(row.parent_id)) {
      const count = knownCount(row.reply_count);
      if (count == null) throw new Error("unknown reply count");
      counts[row.parent_id] = count;
    }
    if (ids.length > 200) Object.assign(counts, await fetchCommunityReplyCounts(ids.slice(200), { client }));
    return counts;
  }
  if (rpcError.code !== "PGRST202" && rpcError.code !== "42883") throw rpcError;
  for (let offset = 0; offset < 25000; offset += 1000) {
    const { data, error } = await client.from("research_contributions")
      .select("id,parent_id")
      .eq("status", "approved")
      .in("origin", COMMUNITY_ORIGINS)
      .in("parent_id", ids)
      .not("body", "is", null)
      .neq("body", "")
      .order("parent_id", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + 999);
    if (error) throw error;
    for (const row of data || []) counts[row.parent_id] += 1;
    if ((data || []).length < 1000) return counts;
  }
  throw new Error("reply count limit exceeded");
}

export async function fetchCommunityAuthorPage(authorKey, { offset = 0, limit = COMMUNITY_PAGE_SIZE, sort = "newest", client = communityReadClient() } = {}) {
  return fetchPublicAuthorActivityPage(authorKey, { offset, limit, filter: "chat", sort, client });
}

export async function fetchPublicAuthorActivityPage(authorKey, { offset = 0, limit = COMMUNITY_PAGE_SIZE, filter = "all", sort = "newest", client = communityReadClient() } = {}) {
  const identity = await resolveCommunityAuthorIdentity(authorKey, client);
  const safeOffset = Math.max(0, Math.trunc(offset));
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  let base = client
    .from("research_contributions")
    .select("id,parent_id,author_name,author_user_id,title,body,reactions,origin,target_type,target_id,created_at,edited_at,author_contributor_id,contributor:contributors!research_contributions_author_contributor_id_fkey(id,user_id,display_name,avatar_url)", { count: "exact" })
    .eq("status", "approved")
    .not("body", "is", null)
    .neq("body", "");
  if (filter === "chat") base = base.in("origin", COMMUNITY_ORIGINS);
  else if (filter === "contributions") base = base.not("origin", "in", '("openweb","community_2029")');
  const { data, error, count } = await filterByAuthor(base, identity)
    .order("created_at", { ascending: sort === "oldest" })
    .order("id", { ascending: sort === "oldest" })
    .range(safeOffset, safeOffset + safeLimit - 1);
  if (error) throw error;
  return { rows: (data || []).map(normalizeCommunityRow).filter((row) => row.body),
    count: Number.isSafeInteger(count) && count >= 0 ? count : null, nextOffset: safeOffset + (data || []).length };
}

export async function fetchCommunityAuthorSummary(authorKey, { client = communityReadClient() } = {}) {
  const identity = await resolveCommunityAuthorIdentity(authorKey, client);
  const base = () => filterByAuthor(client.from("research_contributions")
    .select("id,created_at,reactions")
    .eq("status", "approved")
    .in("origin", COMMUNITY_ORIGINS).not("body", "is", null).neq("body", ""), identity);
  const { data: first, error: firstError } = await base().order("created_at", { ascending: true }).limit(1);
  if (firstError) throw firstError;
  if (!identity.verifiedOwner) return { firstAt: first?.[0]?.created_at || null, archiveLikes: null };
  let archiveLikes = 0, datesValid = true, lastPublicActivityAt = null;
  const activeDates = new Set();
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" });
  for (let offset = 0; offset < 5000; offset += 500) {
    const { data, error } = await base().order("created_at", { ascending: true }).order("id", { ascending: true }).range(offset, offset + 499);
    if (error) throw error;
    for (const row of data || []) {
      archiveLikes += legacyLikeCount(row.reactions);
      const time = row.created_at ? Date.parse(row.created_at) : NaN;
      if (!Number.isFinite(time)) { datesValid = false; continue; }
      activeDates.add(day.format(new Date(time)));
      if (!lastPublicActivityAt || time > Date.parse(lastPublicActivityAt)) lastPublicActivityAt = row.created_at;
    }
    if ((data || []).length < 500) return { firstAt: first?.[0]?.created_at || null, archiveLikes,
      publicActivity: { version: "public-chat-summary-v1", scope: "public_chat_only", complete: datesValid,
        activeDays: datesValid ? activeDates.size : null, lastPublicActivityAt: datesValid ? lastPublicActivityAt : null } };
  }
  return { firstAt: first?.[0]?.created_at || null, archiveLikes: null };
}

export async function fetchLinkedAccountProfiles(extraIds = [], { client = communityReadClient() } = {}) {
  const ids = [...new Set([...Object.values(VERIFIED_ARCHIVE_PROFILES).map((profile) => profile.accountUserId), ...extraIds].filter(Boolean))];
  const { data, error } = await client.from("users").select("id,display_name,username,avatar_url").in("id", ids);
  if (error) throw error;
  return Object.fromEntries((data || []).map((account) => [account.id, account]));
}

export async function publishCommunityMessage({ body, parentId = null, authorName = null }) {
  return addContribution({
    intent: "תגובה",
    origin: "community_2029",
    body,
    targetType: "home",
    targetId: "community",
    parentId,
    authorName,
  });
}

