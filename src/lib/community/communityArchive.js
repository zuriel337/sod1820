import { supabase } from "../supabase.js";
import { addContribution } from "../contributions.js";

export const COMMUNITY_PAGE_SIZE = 40;
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
  "4cd9c034-0464-4600-a35d-7156f0584d9b": { sourceUserId: "u_3knnZ5YC", name: "Sod1820", accountUserId: "36f5cb84-71c3-4977-a2c7-d6413e973443" },
  "19936860-6b35-4386-bc44-113289858ff0": { sourceUserId: "u_3kuB1woMg6wz", name: "Yosi Viner", handle: "YosiViner559", accountUserId: "b6ce542a-2b07-4749-8aba-532c886f6de7" },
});

// The owner explicitly confirmed both site accounts and both OpenWeb profiles.
// This is a public-history display group, not a Person merge or an ownership grant.
const VERIFIED_OWNER_ACCOUNT_IDS = Object.freeze([
  "36f5cb84-71c3-4977-a2c7-d6413e973443", // 444861
  "b6ce542a-2b07-4749-8aba-532c886f6de7", // yosiviner7
]);
const VERIFIED_OWNER_CONTRIBUTOR_IDS = Object.freeze([
  "4cd9c034-0464-4600-a35d-7156f0584d9b", // Sod1820
  "19936860-6b35-4386-bc44-113289858ff0", // YosiViner559
]);

export function communityAuthorIdentity(authorKey) {
  const isUser = authorKey?.startsWith("user:");
  const id = isUser ? authorKey.slice(5) : authorKey;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || "")) throw new Error("invalid author id");
  const isVerifiedOwner = isUser ? VERIFIED_OWNER_ACCOUNT_IDS.includes(id) : VERIFIED_OWNER_CONTRIBUTOR_IDS.includes(id);
  return isVerifiedOwner
    ? { accountIds: VERIFIED_OWNER_ACCOUNT_IDS, contributorIds: VERIFIED_OWNER_CONTRIBUTOR_IDS, verifiedOwner: true }
    : { accountIds: isUser ? [id] : [], contributorIds: isUser ? [] : [id], verifiedOwner: false };
}

function filterByAuthor(query, identity) {
  if (identity.verifiedOwner) return query.or(`author_user_id.in.(${identity.accountIds.join(",")}),author_contributor_id.in.(${identity.contributorIds.join(",")})`);
  return identity.accountIds.length ? query.eq("author_user_id", identity.accountIds[0]) : query.eq("author_contributor_id", identity.contributorIds[0]);
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
    avatarUrl: contributor?.avatar_url || null,
    body: decodeCommunityText(row.body || row.title || ""),
    reactions: row.reactions && typeof row.reactions === "object" ? row.reactions : {},
    origin: row.origin || null,
    createdAt: row.created_at,
  };
}

export function legacyLikeCount(reactions) {
  const legacy = Number(reactions?.likes);
  const modern = Array.isArray(reactions?.["👍"]) ? reactions["👍"].length : 0;
  return (Number.isFinite(legacy) && legacy > 0 ? legacy : 0) + modern;
}

export async function fetchCommunityArchivePage({ offset = 0, limit = COMMUNITY_PAGE_SIZE } = {}) {
  const safeOffset = Math.max(0, Math.trunc(offset));
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  const { data, error, count } = await supabase
    .from("research_contributions")
    .select("id,parent_id,author_name,author_user_id,title,body,reactions,origin,created_at,author_contributor_id,contributor:contributors!research_contributions_author_contributor_id_fkey(id,display_name,avatar_url)", { count: safeOffset === 0 ? "exact" : undefined })
    .eq("status", "approved")
    .in("origin", ["openweb", "community_2029"])
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(safeOffset, safeOffset + safeLimit - 1);
  if (error) throw error;
  return { rows: (data || []).map(normalizeCommunityRow).filter((row) => row.body), count: count ?? null, nextOffset: safeOffset + (data || []).length };
}

export async function fetchCommunityAuthorPage(authorKey, { offset = 0, limit = COMMUNITY_PAGE_SIZE } = {}) {
  const identity = communityAuthorIdentity(authorKey);
  const safeOffset = Math.max(0, Math.trunc(offset));
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  const base = supabase
    .from("research_contributions")
    .select("id,parent_id,author_name,author_user_id,title,body,reactions,origin,created_at,author_contributor_id,contributor:contributors!research_contributions_author_contributor_id_fkey(id,display_name,avatar_url)", { count: "exact" })
    .eq("status", "approved")
    .in("origin", ["openweb", "community_2029"]);
  const { data, error, count } = await filterByAuthor(base, identity)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(safeOffset, safeOffset + safeLimit - 1);
  if (error) throw error;
  return { rows: (data || []).map(normalizeCommunityRow).filter((row) => row.body), count: count ?? 0, nextOffset: safeOffset + (data || []).length };
}

export async function fetchCommunityAuthorSummary(authorKey) {
  const identity = communityAuthorIdentity(authorKey);
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

export async function fetchLinkedAccountProfiles() {
  const ids = Object.values(VERIFIED_ARCHIVE_PROFILES).map((profile) => profile.accountUserId).filter(Boolean);
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

