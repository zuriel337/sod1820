import { supabase } from "../supabase.js";

export const MY_ACTIVITY_PAGE_SIZE = 30;

// Exact source/account pairings confirmed by the account owner. These are display
// bindings until the Person identity edge is reviewed and stored canonically.
export const VERIFIED_LEGACY_ACCOUNT_LINKS = Object.freeze({
  "36f5cb84-71c3-4977-a2c7-d6413e973443": "4cd9c034-0464-4600-a35d-7156f0584d9b", // 444861 ↔ Sod1820
  "b6ce542a-2b07-4749-8aba-532c886f6de7": "19936860-6b35-4386-bc44-113289858ff0", // yosiviner7 ↔ YosiViner559
});

export function activityKind(row) {
  return row?.origin === "openweb" || row?.origin === "community_2029" ? "chat" : "contribution";
}

export function activitySourceLabel(row) {
  if (row?.origin === "openweb") return "צ׳אט ישן · OpenWeb";
  if (row?.origin === "community_2029") return "צ׳אט הקהילה";
  if (row?.origin === "forum") return "דיון";
  if (row?.origin === "number") return "דף מספר";
  if (row?.origin === "els") return "צופן";
  return "תרומה לאתר";
}

export async function fetchMyActivity2029(userId, { offset = 0, limit = MY_ACTIVITY_PAGE_SIZE, filter = "all" } = {}) {
  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) throw new Error("missing_account");
  const safeOffset = Math.max(0, Math.floor(Number(offset) || 0));
  const safeLimit = Math.max(1, Math.min(50, Math.floor(Number(limit) || MY_ACTIVITY_PAGE_SIZE)));
  const legacyId = VERIFIED_LEGACY_ACCOUNT_LINKS[userId];
  // RLS is the authority: signed-in users can read their own rows; archive
  // rows are included only when approved and tied to an exact confirmed ID.
  const own = `and(author_user_id.eq.${userId},status.in.(approved,published,pending))`;
  const legacy = legacyId
    ? `,and(author_contributor_id.eq.${legacyId},origin.eq.openweb,status.eq.approved)`
    : "";
  let query = supabase.from("research_contributions")
    .select("id,parent_id,author_name,title,body,intent,origin,status,target_type,target_id,created_at", { count: "exact" })
    .or(`${own}${legacy}`);
  if (filter === "chat") query = query.in("origin", ["openweb", "community_2029"]);
  if (filter === "contribution") query = query.not("origin", "in", '("openweb","community_2029")');
  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(safeOffset, safeOffset + safeLimit - 1);
  if (error) throw error;
  return { rows: data || [], count: count || 0, nextOffset: safeOffset + (data?.length || 0) };
}
