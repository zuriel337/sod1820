import { supabase } from "../supabase.js";

// "Online now" — a heartbeat, not a realtime socket channel. A signed-in member
// pings while this page is open and visible; a member counts as online for ~2
// minutes after their last ping (server-enforced in community_presence_online).
export const COMMUNITY_PRESENCE_PING_MS = 45000;

export async function pingCommunityPresence(client = supabase) {
  const { error } = await client.rpc("community_presence_ping");
  if (error) throw error;
}

export async function fetchCommunityPresenceOnline({ limit = 24 } = {}, client = supabase) {
  const { data, error } = await client.rpc("community_presence_online", { p_limit: limit });
  if (error) throw error;
  return normalizeCommunityPresence(data);
}

export function normalizeCommunityPresence(data) {
  if (!Array.isArray(data)) return [];
  const seen = new Set();
  const people = [];
  for (const item of data) {
    const id = typeof item?.id === "string" ? item.id : "";
    if (!id || seen.has(id)) continue;
    const name = (typeof item.display_name === "string" && item.display_name.trim())
      || (typeof item.username === "string" && item.username.trim()) || "";
    if (!name) continue;
    seen.add(id);
    people.push({ id, name, avatarUrl: typeof item.avatar_url === "string" ? item.avatar_url : null });
  }
  return people;
}
