import { supabase, contributorHref } from "../supabase.js";
import { getPublicResearchClient } from "../research/researchViewMode.js";
import { safePublicUrl } from "../../components/contributor2029/publicContributor2029Model.js";

export const WRITER_PERSONAL_MODULES = Object.freeze([
  ["public-page", "הדף שלי"], ["page-editor", "עורך הדף"], ["profile", "פרופיל ותמונה"],
  ["messages", "הודעות"], ["notifications", "מעקב ועדכונים"], ["progress", "ההתקדמות שלי"],
]);
export function personalReturnHref(value, { native2029 = false } = {}) {
  if (typeof value !== "string" || value.length > 2500 || !value.startsWith("/") || /[\\\u0000-\u0020]/.test(value) || value.startsWith("//")) return null;
  try {
    const url = new URL(value, "https://local.invalid");
    const path = decodeURIComponent(url.pathname);
    const allowedPath = native2029
      // App2029 owns these canonical paths even when they have no /2029 prefix.
      // Keep the compatibility callers' existing return policy unchanged.
      ? /^\/(?:2029(?:\/|$)|(?:world|code|els|heichal|היכל|early-access)\/?$|(?:post|topic|book|researcher|video)\/[^/]+\/?$|(?:books|beit-midrash)(?:\/[^/]+)?\/?$|community\/(?:chat|researcher\/[^/]+)\/?$|melech-hamisparim\/718\/?$|entity-hub-preview\/[^/]+\/[^/]+\/?$)/.test(path)
      : /^\/(?:2029|community|world|number|post|topic|book|els|heichal|profile)(?:\/|$)/.test(path);
    if (url.origin !== "https://local.invalid" || /[\\%\u0000-\u0020]/.test(path) || path.includes("//") || !allowedPath) return null;
    return url.pathname + url.search + url.hash;
  } catch { return null; }
}
const REPLY_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function personalMessagesState(search = "") {
  const params = new URLSearchParams(search);
  const pages = Number(params.get("replyPages") || 1);
  const offset = Number(params.get("replyOffset") || 0);
  return {
    tab: !params.has("dm") && !params.has("writer") && params.get("tab") === "replies" ? "replies" : "dm",
    replyPages: Number.isInteger(pages) && pages >= 1 && pages <= 20 ? pages : 1,
    replyAnchor: REPLY_UUID.test(params.get("replyAnchor") || "") ? params.get("replyAnchor") : null,
    replyOffset: Number.isInteger(offset) && Math.abs(offset) <= 2000 ? offset : 0,
  };
}
// Only the existing private messages route can be a community-thread return.
// No person identity, reply text, timestamp cursor or private payload in the URL.
export function personalMessagesReturnHref(value) {
  const safe = personalReturnHref(value);
  if (!safe) return null;
  const url = new URL(safe, "https://local.invalid");
  const allowed = new Set(["returnTo", "tab", "replyPages", "replyAnchor", "replyOffset"]);
  if (url.pathname !== "/2029/me/messages" || url.hash
      || [...url.searchParams.keys()].some(key => !allowed.has(key) || url.searchParams.getAll(key).length !== 1)
      || url.searchParams.has("returnTo") && !personalReturnHref(url.searchParams.get("returnTo"))) return null;
  return writerPersonalHref("messages", { returnTo: url.searchParams.get("returnTo"), ...personalMessagesState(url.search) });
}
export function writerPersonalHref(module, { returnTo, writer, dm, tab, replyPages, replyAnchor, replyOffset } = {}) {
  const allowed = WRITER_PERSONAL_MODULES.some(([id]) => id === module);
  const params = new URLSearchParams();
  if (personalReturnHref(returnTo)) params.set("returnTo", returnTo);
  if (module === "messages" && typeof writer === "string" && /^[\p{L}\p{N}_-]{1,160}$/u.test(writer)) params.set("writer", writer);
  if (module === "messages" && typeof dm === "string" && /^[0-9a-f-]{36}$/i.test(dm)) params.set("dm", dm);
  if (module === "messages" && tab === "replies" && !params.has("writer") && !params.has("dm")) {
    params.set("tab", "replies");
    if (Number.isInteger(replyPages) && replyPages > 1 && replyPages <= 20) params.set("replyPages", String(replyPages));
    if (REPLY_UUID.test(replyAnchor || "")) {
      params.set("replyAnchor", replyAnchor);
      if (Number.isInteger(replyOffset) && Math.abs(replyOffset) <= 2000) params.set("replyOffset", String(replyOffset));
    }
  }
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
    // Preserve same-origin Preview access cookies; account identity still requires the verified Bearer token.
    const response = await fetcher(`/api/contributor-self${params.size ? `?${params}` : ""}`, {
      method: action ? "POST" : "GET", credentials: "same-origin", signal: signal || AbortSignal.timeout(12000),
      headers: { Authorization: `Bearer ${data.session.access_token}`, ...(action ? { "Content-Type": "application/json" } : {}) },
      ...(action ? { body: JSON.stringify({ action, ...payload }) } : {}),
    });
    const result = await response.json();
    return response.ok ? result : { state: ["login_required", "name_taken"].includes(result.state) ? result.state : "unavailable" };
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
