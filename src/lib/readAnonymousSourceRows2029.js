import { SUPABASE_ANON, SUPABASE_URL } from "./supabase.js";

// Both public collection readers build their own PostgREST paths and always read as a guest.
export async function readAnonymousSourceRows2029(path, signal) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
    credentials: "omit",
    signal,
  });
  if (!response.ok) throw new Error("public_source_unavailable");
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error("invalid_public_source");
  return rows;
}
