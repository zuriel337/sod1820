import { supabase } from "../supabase.js";
import { addContribution } from "../contributions.js";

export const COMMUNITY_PAGE_SIZE = 40;
export const COMMUNITY_REPLY_PAGE_SIZE = 20;
export const COMMUNITY_ARCHIVE_TOTAL = 41080;

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
  "f499536a-e993-4a7d-8706-a2e69337c320": { sourceUserId: "u_zawiGiUO", name: "שינשין", ...PROFILE_BASELINES["שינשין"] },
  "e7581ab5-8c15-4832-b602-f361e41ff373": { sourceUserId: "u_r6fetXIK", name: "אמילי", ...PROFILE_BASELINES["אמילי"] },
  "27c10d9a-14a6-4493-980b-2f5eda105ad7": { sourceUserId: "u_vtNX8TEGu5VV", name: "אביזוהר בן חיים", ...PROFILE_BASELINES["אביזוהר בן חיים"] },
  "4cd9c034-0464-4600-a35d-7156f0584d9b": { sourceUserId: "u_3knnZ5YC", name: "Sod1820", accountUserId: "b6ce542a-2b07-4749-8aba-532c886f6de7" },
  "19936860-6b35-4386-bc44-113289858ff0": { sourceUserId: "u_3kuB1woMg6wz", name: "Yosi Viner", handle: "YosiViner559", accountUserId: "36f5cb84-71c3-4977-a2c7-d6413e973443" },
});

// These are two separately owned accounts. Each public reader joins only its
// exact account and source contributor; ownership of both never merges them.
const VERIFIED_OWNER_PAIRS = Object.freeze([
  { accountId: "b6ce542a-2b07-4749-8aba-532c886f6de7", contributorId: "4cd9c034-0464-4600-a35d-7156f0584d9b" }, // yosiviner7 ↔ Sod1820
  { accountId: "36f5cb84-71c3-4977-a2c7-d6413e973443", contributorId: "19936860-6b35-4386-bc44-113289858ff0" }, // 444861 ↔ YosiViner559
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

async function resolveCommunityAuthorIdentity(authorKey) {
  const identity = communityAuthorIdentity(authorKey);
  if (identity.verifiedOwner) return identity;
  if (authorKey.startsWith("user:")) {
    const { data, error } = await supabase.from("contributors").select("id").eq("user_id", identity.accountIds[0]).limit(100);
    if (error) throw error;
    return { ...identity, contributorIds: (data || []).map((row) => row.id) };
  }
  const { data, error } = await supabase.from("contributors").select("user_id").eq("id", identity.contributorIds[0]).maybeSingle();
  if (error) throw error;
  return { ...identity, accountIds: data?.user_id ? [data.user_id] : [] };
}

const entityDecoder = typeof document === "undefined" ? null : document.createElement("textarea");

export function decodeCommunityText(value) {
  const text = String(value || "");
  if (!entityDecoder || !text.includes("&")) return text;
  entityDecoder.innerHTML = text;
  return entityDecoder.value;
}

export function normalizeCommunityRow(row) {
  const contributor = Array.isArray(row?.contributor) ? row.contributor[0] : row?.contributor;
  const contributorId = contributor?.id || row.author_contributor_id || null;
  const authorName = String(VERIFIED_ARCHIVE_PROFILES[contributorId]?.name || row?.author_name || contributor?.display_name || "חבר הקהילה").trim();
  return {
    id: row.id,
    parentId: row.parent_id || null,
    authorName,
    authorKey: row.author_user_id ? `user:${row.author_user_id}` : contributorId,
    authorUserId: row.author_user_id || null,
    linkedUserId: contributor?.user_id || null,
    avatarUrl: contributor?.avatar_url || null,
    title: row.title || null,
    body: decodeCommunityText(row.body || row.title || ""),
    reactions: row.reactions && typeof row.reactions === "object" ? row.reactions : {},
    origin: row.origin || null,
    targetType: row.target_type || null,
    targetId: row.target_id || null,
    createdAt: row.created_at,
    editedAt: row.edited_at || null,
    isDeleted: Boolean(row.is_deleted),
  };
}

// The community_* functions come from the soft-delete migration. Until it is applied
// they do not exist, and every reader below falls back to the original table reads.
// rpcState: null = not probed yet, true = available, false = missing.
let rpcState = null;
let feedV2State = null;
const isMissingRpc = (error) => error && (error.code === "PGRST202" || error.code === "42883" || /could not find the function|function .* does not exist/i.test(error.message || ""));
export const communityActionsAvailable = () => rpcState === true;
export function resetCommunityRpcProbe() { rpcState = null; feedV2State = null; }

function rpcRow(row) {
  return {
    ...row,
    contributor: row.contributor_id ? { id: row.contributor_id, user_id: row.contributor_user_id, display_name: row.contributor_display_name, avatar_url: row.contributor_avatar_url } : null,
  };
}

async function tryRpc(name, args) {
  if (rpcState === false) return null;
  const { data, error } = await supabase.rpc(name, args);
  if (isMissingRpc(error)) { rpcState = false; return null; }
  if (error) throw error;
  rpcState = true;
  return data || [];
}

async function tryFeedV2(args) {
  if (feedV2State === false) return null;
  const { data, error } = await supabase.rpc("community_feed_page_v2", args);
  if (isMissingRpc(error)) { feedV2State = false; return null; }
  if (error) throw error;
  feedV2State = true;
  rpcState = true;
  return data || [];
}

export function legacyLikeCount(reactions) {
  const legacy = Number(reactions?.likes);
  const modern = Array.isArray(reactions?.["👍"]) ? reactions["👍"].length : 0;
  return (Number.isFinite(legacy) && legacy > 0 ? legacy : 0) + modern;
}

export async function fetchCommunityArchivePage({ offset = 0, limit = COMMUNITY_PAGE_SIZE, sort = "newest", filter = "all", window = "month" } = {}) {
  const safeOffset = Math.max(0, Math.trunc(offset));
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  const safeSort = ["newest", "active", "discussed", "liked", "oldest"].includes(sort) ? sort : "newest";
  const safeFilter = ["all", "unanswered", "media", "mine", "community", "legacy"].includes(filter) ? filter : "all";
  const safeWindow = ["week", "month", "all"].includes(window) ? window : "month";
  const viaV2 = await tryFeedV2({ p_offset: safeOffset, p_limit: safeLimit, p_sort: safeSort, p_filter: safeFilter, p_window: safeWindow });
  if (viaV2) {
    const total = viaV2[0]?.total_count;
    return { rows: viaV2.map((row) => normalizeCommunityRow(rpcRow(row))), count: safeOffset === 0 ? (total == null ? 0 : Number(total)) : null, nextOffset: safeOffset + viaV2.length, actions: true, filtersAvailable: true };
  }
  const viaRpc = await tryRpc("community_feed_page", { p_offset: safeOffset, p_limit: safeLimit, p_sort: sort === "oldest" ? "oldest" : "newest" });
  if (viaRpc) {
    const total = viaRpc[0]?.total_count;
    return { rows: viaRpc.map((row) => normalizeCommunityRow(rpcRow(row))), count: safeOffset === 0 ? (total == null ? 0 : Number(total)) : null, nextOffset: safeOffset + viaRpc.length, actions: true, filtersAvailable: false };
  }
  const { data, error, count } = await supabase
    .from("research_contributions")
    .select("id,parent_id,author_name,author_user_id,title,body,reactions,origin,created_at,author_contributor_id,contributor:contributors!research_contributions_author_contributor_id_fkey(id,user_id,display_name,avatar_url)", { count: safeOffset === 0 ? "exact" : undefined })
    .eq("status", "approved")
    .in("origin", ["openweb", "community_2029"])
    .is("parent_id", null)
    .order("created_at", { ascending: sort === "oldest" })
    .order("id", { ascending: sort === "oldest" })
    .range(safeOffset, safeOffset + safeLimit - 1);
  if (error) throw error;
  return { rows: (data || []).map(normalizeCommunityRow), count: count ?? null, nextOffset: safeOffset + (data || []).length, actions: false, filtersAvailable: false };
}

export async function fetchCommunityMessageTotal() {
  const { count, error } = await supabase
    .from("research_contributions")
    .select("id", { count: "exact" })
    .eq("status", "approved")
    .in("origin", ["openweb", "community_2029"])
    .not("body", "is", null)
    .neq("body", "")
    .range(0, 0);
  if (error) throw error;
  return Number(count || 0);
}

// The feed pages roots only. Replies are read from the same RLS-protected source
// when a thread opens, so an approved reply never appears detached from its parent.
export async function fetchCommunityReplies(parentId, { offset = 0, limit = COMMUNITY_REPLY_PAGE_SIZE } = {}) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parentId || "")) throw new Error("invalid parent id");
  const safeOffset = Math.max(0, Math.trunc(offset));
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  const viaRpc = await tryRpc("community_replies_page", { p_parent: parentId, p_offset: safeOffset, p_limit: safeLimit });
  if (viaRpc) {
    const total = viaRpc[0]?.total_count;
    return { rows: viaRpc.map((row) => normalizeCommunityRow(rpcRow(row))), count: total == null ? safeOffset : Number(total), nextOffset: safeOffset + viaRpc.length };
  }
  const { data, error, count } = await supabase
    .from("research_contributions")
    .select("id,parent_id,author_name,author_user_id,title,body,reactions,origin,created_at,author_contributor_id,contributor:contributors!research_contributions_author_contributor_id_fkey(id,user_id,display_name,avatar_url)", { count: "exact" })
    .eq("status", "approved")
    .in("origin", ["openweb", "community_2029"])
    .eq("parent_id", parentId)
    .not("body", "is", null)
    .neq("body", "")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .range(safeOffset, safeOffset + safeLimit - 1);
  if (error) throw error;
  return { rows: (data || []).map(normalizeCommunityRow).filter((row) => row.body), count: count ?? 0, nextOffset: safeOffset + (data || []).length };
}

export async function fetchCommunityReplyCounts(parentIds) {
  const ids = [...new Set(parentIds)].filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || ""));
  if (!ids.length) return {};
  const counts = Object.fromEntries(ids.map((id) => [id, 0]));
  // One aggregated read per 200 ids; direct replies only (nested replies count under their own parent).
  const viaRpc = rpcState === false ? null : await tryRpc("community_reply_counts", { p_ids: ids.slice(0, 200) });
  if (viaRpc) {
    for (const row of viaRpc) counts[row.parent_id] = Number(row.reply_count);
    if (ids.length > 200) Object.assign(counts, await fetchCommunityReplyCounts(ids.slice(200)));
    return counts;
  }
  for (let offset = 0; offset < 25000; offset += 1000) {
    const { data, error } = await supabase.from("research_contributions")
      .select("id,parent_id")
      .eq("status", "approved")
      .in("origin", ["openweb", "community_2029"])
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

export async function fetchCommunityAuthorPage(authorKey, { offset = 0, limit = COMMUNITY_PAGE_SIZE, sort = "newest" } = {}) {
  return fetchPublicAuthorActivityPage(authorKey, { offset, limit, filter: "chat", sort });
}

export async function fetchPublicAuthorActivityPage(authorKey, { offset = 0, limit = COMMUNITY_PAGE_SIZE, filter = "all", sort = "newest" } = {}) {
  const identity = await resolveCommunityAuthorIdentity(authorKey);
  const safeOffset = Math.max(0, Math.trunc(offset));
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  let base = supabase
    .from("research_contributions")
    .select("id,parent_id,author_name,author_user_id,title,body,reactions,origin,target_type,target_id,created_at,author_contributor_id,contributor:contributors!research_contributions_author_contributor_id_fkey(id,user_id,display_name,avatar_url)", { count: "exact" })
    .eq("status", "approved")
    .not("body", "is", null)
    .neq("body", "");
  if (filter === "chat") base = base.in("origin", ["openweb", "community_2029"]);
  else if (filter === "contributions") base = base.not("origin", "in", '("openweb","community_2029")');
  const { data, error, count } = await filterByAuthor(base, identity)
    .order("created_at", { ascending: sort === "oldest" })
    .order("id", { ascending: sort === "oldest" })
    .range(safeOffset, safeOffset + safeLimit - 1);
  if (error) throw error;
  return { rows: (data || []).map(normalizeCommunityRow).filter((row) => row.body), count: count ?? 0, nextOffset: safeOffset + (data || []).length };
}

export async function fetchCommunityAuthorSummary(authorKey) {
  const identity = await resolveCommunityAuthorIdentity(authorKey);
  const base = () => filterByAuthor(supabase.from("research_contributions")
    .select("created_at,reactions")
    .eq("status", "approved")
    .in("origin", ["openweb", "community_2029"]), identity);
  const { data: first, error: firstError } = await base().order("created_at", { ascending: true }).limit(1);
  if (firstError) throw firstError;
  if (!identity.verifiedOwner) return { firstAt: first?.[0]?.created_at || null, archiveLikes: null };
  let archiveLikes = 0;
  for (let offset = 0; offset < 5000; offset += 500) {
    const { data, error } = await base().order("created_at", { ascending: true }).range(offset, offset + 499);
    if (error) throw error;
    for (const row of data || []) archiveLikes += legacyLikeCount(row.reactions);
    if ((data || []).length < 500) return { firstAt: first?.[0]?.created_at || null, archiveLikes };
  }
  return { firstAt: first?.[0]?.created_at || null, archiveLikes: null };
}

export async function fetchLinkedAccountProfiles(extraIds = []) {
  const ids = [...new Set([...Object.values(VERIFIED_ARCHIVE_PROFILES).map((profile) => profile.accountUserId), ...extraIds].filter(Boolean))];
  const { data, error } = await supabase.from("users").select("id,display_name,username,avatar_url").in("id", ids);
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


// Server-authorized actions. The database checks the signed-in user on every call;
// the UI only decides whether to show the control.
export async function editCommunityMessage(id, body) {
  const { data, error } = await supabase.rpc("community_edit_message", { p_id: id, p_body: body });
  if (error) throw error;
  return data;
}

export async function deleteCommunityMessage(id) {
  const { data, error } = await supabase.rpc("community_delete_message", { p_id: id });
  if (error) throw error;
  return data;
}

export async function hideCommunityThread(id) {
  const { data, error } = await supabase.rpc("community_hide_thread", { p_root: id });
  if (error) throw error;
  return data;
}

export function describeCommunityActionError(error) {
  const text = String(error?.message || "");
  if (/auth required/.test(text)) return "צריך להתחבר כדי לבצע את הפעולה.";
  if (/not authorized/.test(text)) return "אין לך הרשאה לבצע את הפעולה הזאת, או שחלון הביטול כבר נסגר.";
  if (/not editable|not deletable/.test(text)) return "אי אפשר לשנות את ההודעה הזאת יותר.";
  if (/not found/.test(text)) return "ההודעה כבר לא קיימת.";
  if (/empty body/.test(text)) return "אי אפשר לשמור הודעה ריקה.";
  if (/rate_limited/.test(text)) return "שלחת הרבה דיווחים היום. נסו שוב מחר.";
  if (/own message/.test(text)) return "אי אפשר לדווח על הודעה שלך.";
  if (/nothing to restore/.test(text)) return "אין מה לשחזר.";
  return "הפעולה לא הושלמה. נסו שוב בעוד רגע.";
}

// ── second step: restore, history, deep link context, archive search, reports ──
async function rpcWrite(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}

export const restoreCommunityMessage = (id) => rpcWrite("community_restore", { p_id: id });
export const resolveCommunityReport = (reportId, action) => rpcWrite("community_resolve_report", { p_report: reportId, p_action: action });
export const reportCommunityMessage = (id, reason, note = "") => rpcWrite("community_report_message", { p_id: id, p_reason: reason, p_note: note || null });

export async function fetchCommunityEditHistory(id) {
  const data = await rpcWrite("community_edit_history", { p_id: id });
  return (data || []).map((row) => ({ body: decodeCommunityText(row.body || ""), editedBy: row.edited_by_name, editedAt: row.edited_at }));
}

export async function fetchCommunityRemoved(limit = 50) {
  const data = await rpcWrite("community_admin_removed", { p_limit: limit });
  return (data || []).map((row) => ({ kind: row.kind, id: row.id, parentId: row.parent_id, authorName: row.author_name || "חבר הקהילה", body: decodeCommunityText(row.body || ""), at: row.at }));
}

export async function fetchCommunityReports(limit = 50) {
  const data = await rpcWrite("community_admin_reports", { p_limit: limit });
  return (data || []).map((row) => ({ reportId: row.report_id, messageId: row.message_id, parentId: row.parent_id, reason: row.reason, note: row.note || "", body: decodeCommunityText(row.body || ""), authorName: row.author_name || "חבר הקהילה", reporterName: row.reporter_name, at: row.created_at, count: Number(row.report_count) || 1 }));
}

// Message with its visible ancestors, root first. null when the reads are unavailable (migration not applied);
// an empty list when the message is not visible.
export async function fetchCommunityMessageContext(id) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || "")) return [];
  const data = await tryRpc("community_message_context", { p_id: id });
  return data ? data.map((row) => normalizeCommunityRow(rpcRow(row))) : null;
}

export async function searchCommunityArchive(query, { offset = 0, limit = 20 } = {}) {
  const data = await tryRpc("community_search", { p_query: String(query || "").trim(), p_offset: Math.max(0, Math.trunc(offset)), p_limit: limit });
  if (!data) return null;
  const rows = data.map((row) => normalizeCommunityRow(rpcRow(row)));
  return { rows, count: offset === 0 ? (data[0]?.total_count == null ? 0 : Number(data[0].total_count)) : null, nextOffset: offset + rows.length };
}
