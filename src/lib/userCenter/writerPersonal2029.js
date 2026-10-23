import { supabase, contributorHref } from "../supabase.js";
import { getPublicResearchClient } from "../research/researchViewMode.js";
import { safePublicUrl } from "../../components/contributor2029/publicContributor2029Model.js";

export const WRITER_PERSONAL_MODULES = Object.freeze([
  ["public-page", "הדף שלי"], ["page-editor", "עורך הדף"], ["profile", "פרופיל ותמונה"],
  ["messages", "הודעות"], ["notifications", "מעקב ועדכונים"], ["progress", "ההתקדמות שלי"],
]);
export function personalReturnHref(value) {
  if (typeof value !== "string" || value.length > 2500 || !value.startsWith("/") || /[\\\u0000-\u0020]/.test(value) || value.startsWith("//")) return null;
  try {
    const url = new URL(value, "https://local.invalid");
    const path = decodeURIComponent(url.pathname);
    if (url.origin !== "https://local.invalid" || /[\\%\u0000-\u0020]/.test(path) || path.includes("//") || !/^\/(?:2029|community|world|number|post|topic|book|els|heichal|profile)(?:\/|$)/.test(path)) return null;
    return url.pathname + url.search + url.hash;
  } catch { return null; }
}
export function writerPersonalHref(module, { returnTo, writer, dm } = {}) {
  const allowed = WRITER_PERSONAL_MODULES.some(([id]) => id === module);
  const params = new URLSearchParams();
  if (personalReturnHref(returnTo)) params.set("returnTo", returnTo);
  if (module === "messages" && typeof writer === "string" && /^[\p{L}\p{N}_-]{1,160}$/u.test(writer)) params.set("writer", writer);
  if (module === "messages" && typeof dm === "string" && /^[0-9a-f-]{36}$/i.test(dm)) params.set("dm", dm);
  return `/2029/me/${allowed ? module : "public-page"}${params.size ? `?${params}` : ""}`;
}
export function publicWriterVisible(row) {
  return !!row && row.active !== false && !row.locked && !row.building && (!row.visibility || row.visibility === "public");
}
export async function loadOwnWriterIdentity(userId, { client = supabase } = {}) {
  if (!userId) return { state: "login_required" };
  const { data, error } = await client.from("contributors")
    .select("slug,code,display_name,bio,avatar_url,active,locked,building,visibility:dossier_settings->>visibility")
    .eq("user_id", userId).limit(2);
  if (error || !Array.isArray(data)) return { state: "unavailable" };
  if (data.length > 1) return { state: "ambiguous" };
  if (!data.length) return { state: "unlinked" };
  return { state: "ready", name: data[0].display_name, bio: data[0].bio,
    href: contributorHref(data[0]), publicVisible: publicWriterVisible(data[0]) };
}

export async function writerSelfRequest({ action, payload, signal, userId, fetcher = fetch, auth = supabase.auth, query = {} } = {}) {
  try {
    const { data, error } = await auth.getSession();
    if (error || !userId || data?.session?.user?.id !== userId || !data.session.access_token) return { state: "login_required" };
    const params = new URLSearchParams(query);
    const response = await fetcher(`/api/contributor-self${params.size ? `?${params}` : ""}`, {
      method: action ? "POST" : "GET", credentials: "omit", signal: signal || AbortSignal.timeout(12000),
      headers: { Authorization: `Bearer ${data.session.access_token}`, ...(action ? { "Content-Type": "application/json" } : {}) },
      ...(action ? { body: JSON.stringify({ action, ...payload }) } : {}),
    });
    const result = await response.json();
    return response.ok ? result : { state: result.state === "login_required" ? "login_required" : "unavailable" };
  } catch { return { state: "unavailable" }; }
}

// Compatibility author:<canonical display_name> is an existing follow key, not fuzzy attribution.
// Resolve a link only when that exact key names one anonymous-visible canonical contributor.
export async function publicWriterFollowLinks(topics, { client = getPublicResearchClient() } = {}) {
  const names = [...new Set((topics || []).filter((topic) => typeof topic === "string" && topic.startsWith("author:")).map((topic) => topic.slice(7)))];
  if (!names.length) return {};
  const { data, error } = await client.from("contributors")
    .select("display_name,slug,code,active,locked,building,visibility:dossier_settings->>visibility").in("display_name", names).eq("active", true);
  if (error || !Array.isArray(data)) return {};
  const groups = new Map();
  for (const row of data.filter(publicWriterVisible)) groups.set(row.display_name, [...(groups.get(row.display_name) || []), row]);
  return Object.fromEntries([...groups].filter(([, rows]) => rows.length === 1).map(([name, rows]) => [`author:${name}`, safePublicUrl(contributorHref(rows[0]))]));
}
