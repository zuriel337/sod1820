// Extra public Now lenses over EXISTING sources, admitted only on opening Now.
// No Legacy WhatsApp endpoint, private intake, model, RPC, writer or new store.
import { stripHtml } from "../format.js";
import { redactGroupText } from "./worldGroupSource.js";
import { gallerySourceHref2029 } from "./topicSourceContext.js";

export const NOW_PUBLIC_CHANNELS_2029 = Object.freeze({
  "gilui-yomi": "הגילוי היומי", "site-news": "עדכוני האתר", "reality-code": "קוד המציאות",
  "sod-hachashmal": "סוד החשמל", "or-geula": "אור הגאולה",
});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const date = value => Number.isFinite(Date.parse(value || "")) ? new Date(value).toISOString() : null;
const text = value => redactGroupText(stripHtml(String(value || "")));

// URL syntax is not publication proof: destinations re-enter their existing
// public readers. Unmapped Legacy landings stay readable as text, not fake links.
export function publicNowSourceHref(value) {
  if (!value || /[\\]/.test(value)) return null;
  try {
    const u = new URL(value, "https://sod1820.co.il");
    if (u.origin !== "https://sod1820.co.il" || u.username || u.password
      || [...u.searchParams.keys()].some(k => /token|signed|signature|email|phone|birth|name|return|redirect|next/i.test(k))) return null;
    if (u.pathname === "/" && /^\d+$/.test(u.searchParams.get("p") || "")) return u.pathname + u.search + u.hash;
    if (/^\/(?:post|topic|number)\/[^/]+\/?$/.test(u.pathname) && !/%(?:2f|5c)/i.test(u.pathname)) return u.pathname + u.search + u.hash;
    return null;
  } catch { return null; }
}
export function publicNowMediaHref(value) {
  try {
    const u = new URL(value);
    return u.origin === "https://linswmnnkjxvweumprav.supabase.co" && /^\/storage\/v1\/object\/public\/(?:media|gallery|magar)\//.test(u.pathname)
      && !u.search && !u.hash && !u.username && !u.password ? u.href : null;
  } catch { return null; }
}
export function publicChannelToSystemItem(row, { now = Date.now() } = {}) {
  if (!UUID.test(row?.id || "") || !NOW_PUBLIC_CHANNELS_2029[row.channel] || row.status !== "live" || row.page_only !== false
    || row.expires_at && (!date(row.expires_at) || Date.parse(row.expires_at) <= now)) return null;
  const body = text(row.text), at = date(row.created_at), mediaHref = publicNowMediaHref(row.image_url);
  if (!at || !body && !mediaHref) return null;
  const label = body || `${/\.(?:mp4|webm|mov)$/i.test(mediaHref) ? "סרטון" : "תמונה"} · ${NOW_PUBLIC_CHANNELS_2029[row.channel]}`;
  return { id: `channel:${row.id}`, kind: "source", sourceKind: "channel_update", channel: row.channel,
    sourceLabel: NOW_PUBLIC_CHANNELS_2029[row.channel], label: label.slice(0, 160), fullText: body, mediaHref,
    fullTextTruncated: body.length === 1200,
    creator: NOW_PUBLIC_CHANNELS_2029[row.channel], at, arrivalAt: at, recordedAt: at,
    sourceRef: `channel_updates:${row.id}`, publicState: "published_channel_update",
    href: publicNowSourceHref(row.link_url), researchCount: 0, numbers: [] };
}
export function publicGalleryToSystemItem(row) {
  if (!UUID.test(row?.id || "") || row.source !== "update" || row.min_tier == null || Number(row.min_tier) !== 0 || Number(row.published) !== 1 || row.curator_hidden === true) return null;
  const label = text(row.name || row.description), at = date(row.stream_at) || date(row.created_at);
  if (!label || !at) return null;
  return { id: `gallery:${row.id}`, kind: "source", sourceKind: "gallery_update", sourceLabel: "זרם המציאות",
    label: label.slice(0, 160), fullText: text(row.description || row.name), mediaHref: publicNowMediaHref(row.image_url), creator: "זרם המציאות", at,
    arrivalAt: at, recordedAt: date(row.created_at), occurredAt: date(row.occurred_at),
    sourceRef: `gallery_images:${row.id}`, publicState: "published_gallery_update",
    href: gallerySourceHref2029(Number(row.wp_gallery_id), row.id), researchCount: 0, numbers: [] };
}
export async function fetchSystemFeedPublicSources2029({ client = null, signal = null } = {}) {
  const api = client || (await import("./researchViewMode.js")).getPublicResearchClient();
  const read = async query => { if (signal) query = query.abortSignal(signal); const { data, error } = await query; if (error) throw error; return Array.isArray(data) ? data : []; };
  const now = Date.now(), keys = Object.keys(NOW_PUBLIC_CHANNELS_2029);
  const results = await Promise.allSettled([
    ...keys.map(channel => read(api.from("channel_updates")
      .select("id,text,image_url,channel,status,page_only,expires_at,created_at,link_url")
      .eq("status", "live").eq("page_only", false).eq("channel", channel)
      .or(`expires_at.is.null,expires_at.gt.${new Date(now).toISOString()}`)
      .order("created_at", { ascending: false }).limit(12))),
    read(api.from("gallery_images").select("id,image_url,name,description,source,published,min_tier,curator_hidden,stream_at,created_at,occurred_at,wp_gallery_id")
      .eq("source", "update").eq("published", 1).eq("min_tier", 0).not("curator_hidden", "is", true)
      .order("stream_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).limit(10)),
  ]);
  if (signal?.aborted) throw new DOMException("Now source read canceled", "AbortError");
  const sourceStates = results.map((r, i) => ({ source: i < keys.length ? keys[i] : "gallery",
    status: r.status === "rejected" ? String(r.reason?.code) === "42501" ? "access_filtered" : "failed"
      : r.value.length ? "read" : "measured_empty" }));
  return { items: results.flatMap((r, i) => r.status === "fulfilled" ? r.value.map(row => i < keys.length ? publicChannelToSystemItem(row, { now }) : publicGalleryToSystemItem(row)).filter(Boolean) : []), sourceStates };
}
