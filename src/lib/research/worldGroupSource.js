// Group source arrivals for World: ONE narrow sanitized reader (RPC), projected into the existing
// worldDiscoveryStream. A group message is a SOURCE occurrence: unverified, never research, never a Finding.
// Eligibility is proved server-side (private proof row: real group JID + incoming text + sender JID -> unique contributor phone,
// no human hold, editorial flag on the contributor). An image or video additionally needs its recorded public copy (proposal
// supabase/proposed/20261111234000_group_source_media_v1: media_kind / media_url / thumb_url on the same reader).
// This file is the second line: it never trusts a row without slug + group proof and re-redacts.
import { publicPageShareUrl } from "../publicPostUrls.js";
import { publicReadingPath } from "../publicReadingRelease2029.js";

const clean = (v) => v == null ? "" : String(v).trim();
export const APPROVED_GROUP_WRITERS = Object.freeze(['tzvi-opoc', 'yaniv-levi', 'shachar-kandro', 'shimon-haimov']);
export const GROUP_SOURCE_LABEL = "הודעת מקור · טרם נבדקה";
export const WORLD_GROUP_SOURCE_READER = "world_group_source_arrivals_v2";

// The public source groups that share ONE path (ZURIEL 5.11.2026). The group is the SOURCE of the publication and is always
// named on it. `group_channel` is returned by the reader once the extended v2 definition is applied; a row from the currently live
// definition carries no channel and keeps the neutral label. A channel that is not listed here (Or HaGeula, messages, site news ...)
// never enters this path: an unknown channel is dropped, never relabelled.
export const GROUP_SOURCE_CHANNELS = Object.freeze({
  "torat-haremez": "תורת הרמז",
  "ki-la-hamelucha-gematria": "כי לה׳ המלוכה — גימטריות",
  "gilui-yomi": "הגילוי היומי",
});
export const GROUP_SOURCE_NEUTRAL_LABEL = "קבוצת מקור";

// Writer pins in «עכשיו» (ZURIEL 11.11.2026): «הגילוי היומי» follows the Zvi / «תורת הרמז» model exactly — every member's message is
// research intake, and only an arrival the server proved (group proof + verified_phone_unique + an approved writer + editorial flag)
// is public. On top of that ONE path, an arrival by שחר יצחק קנדרו or יניב לוי in «הגילוי היומי» is pinned at the top of Now for
// 24 hours from its arrival. The pin is a display rule only: it never makes a row public, never changes its status, its source or its
// writer, and it ends by itself. A display name, a credit or a number typed in the text never pins; only the proved writer slug does.
export const GROUP_WRITER_PINS_2029 = Object.freeze({ "gilui-yomi": Object.freeze(["shachar-kandro", "yaniv-levi"]) });
export const GROUP_WRITER_PIN_HOURS_2029 = 24;
export const groupWriterPinListed = (channel, slug) => Object.hasOwn(GROUP_WRITER_PINS_2029, clean(channel))
  && GROUP_WRITER_PINS_2029[clean(channel)].includes(clean(slug)) && APPROVED_GROUP_WRITERS.includes(clean(slug));
export function groupWriterPin({ channel, slug, arrivalAt } = {}) {
  const at = Date.parse(clean(arrivalAt));
  if (!groupWriterPinListed(channel, slug) || !Number.isFinite(at)) return null;
  return { pinned: true, pinKind: "writer", pinUntil: new Date(at + GROUP_WRITER_PIN_HOURS_2029 * 3600000).toISOString() };
}

// Canonical member page of a contributor: only for a contributor the server already proved for this row
// (verified phone -> unique contributor -> approved writer). Never guessed from a display name.
export const groupWriterProfileHref = (slug) => APPROVED_GROUP_WRITERS.includes(clean(slug)) ? `/community/researcher/${encodeURIComponent(clean(slug))}` : null;

// Public media of a group source: exactly the project's public Storage, https, no signed/query credentials.
const PUBLIC_MEDIA_ORIGIN = "https://linswmnnkjxvweumprav.supabase.co";
const PUBLIC_MEDIA_PATH = /^\/storage\/v1\/(?:object|render\/image)\/public\/(?:media|gallery)\/[^?#]+$/;
export function publicGroupMediaUrl(raw) {
  const value = clean(raw);
  if (!value) return null;
  try {
    const u = new URL(value);
    if (u.origin !== PUBLIC_MEDIA_ORIGIN || u.username || u.password || u.hash || [...u.searchParams.keys()].some((k) => PRIVATE_QUERY_KEY.test(k))) return null;
    if (!PUBLIC_MEDIA_PATH.test(u.pathname) || u.pathname.includes("..") || u.pathname.includes("//")) return null;
    return u.href;
  } catch { return null; }
}
// Supported group media: image and video only. Audio is NOT ingested by the intake today, so it is never projected here.
export function groupMediaFromRow(row) {
  const kind = clean(row?.media_kind);
  if (kind !== "image" && kind !== "video") return null;
  const url = publicGroupMediaUrl(row?.media_url);
  if (!url) return null;
  const thumbUrl = publicGroupMediaUrl(row?.thumb_url) || (kind === "image" ? url : null);
  return Object.freeze({ kind, url, thumbUrl });
}

// Public site/video links and calendar dates are NOT private data. Everything else keeps the original conservative
// redaction: other URLs, e-mail addresses and phone-like numbers. Allow-lists are exact hosts, never wildcards.
const PUBLIC_LINK_HOSTS = Object.freeze(["sod1820.co.il", "www.sod1820.co.il", "youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);
const PRIVATE_QUERY_KEY = /token|signed|signature|key|secret|auth|email|phone|birth|name|session|invite|code|return|redirect|next/i;
function publicLinkOrNull(raw) {
  const trimmed = raw.replace(/[.,;:!?)\]]+$/, "");
  try {
    const u = new URL(trimmed);
    if (!/^https?:$/.test(u.protocol) || u.username || u.password || u.port || !PUBLIC_LINK_HOSTS.includes(u.hostname.toLowerCase())
      || [...u.searchParams.keys()].some(k => PRIVATE_QUERY_KEY.test(k) && !(k === "v" || k === "t"))) return null;
    // Holding a URL before text redaction must not preserve credentials or
    // contact details embedded in query values/fragments. Use existing route
    // and share admission for site destinations; do not publish private links.
    const decoded = decodeURIComponent(u.pathname + u.search + u.hash);
    if (PRIVATE_QUERY_KEY.test(u.hash) || /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(decoded)
      || /\+?\d[\d\s().-]{7,}\d/.test(decoded.replace(DATE_TOKEN, ""))) return null;
    if (u.hostname === "sod1820.co.il" || u.hostname === "www.sod1820.co.il") {
      if (!["public", "post-lookup", "continuation"].includes(publicReadingPath(u.pathname))) return null;
      const shared = publicPageShareUrl({ pathname: u.pathname, search: u.search, hash: u.hash });
      if (!shared || new URL(shared).searchParams.toString() !== u.searchParams.toString() || new URL(shared).hash !== u.hash) return null;
    }
    return { url: trimmed, tail: raw.slice(trimmed.length) };
  } catch { return null; }
}
const DATE_TOKEN = /(?<![\d./]|\d-)(?:(?:0?[1-9]|[12]\d|3[01])[./-](?:0?[1-9]|1[0-2])[./-](?:19|20)\d{2}|(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])|(?:0?[1-9]|[12]\d|3[01])[./](?:0?[1-9]|1[0-2])(?![\d./-]))(?![\d])/g;

export function redactGroupText(text) {
  const keep = [];
  const hold = (value) => { keep.push(value); return `\u0000${keep.length - 1}\u0000`; };
  return clean(text)
    .replace(/(https?:\/\/|www\.)\S+/gi, (match) => { const link = publicLinkOrNull(/^www\./i.test(match) ? `https://${match}` : match); return link && !/^www\./i.test(match) ? hold(link.url) + link.tail : "[קישור]"; })
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[דוא״ל]")
    .replace(DATE_TOKEN, hold)
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[מספר]")
    .replace(/\u0000(\d+)\u0000/g, (_, index) => keep[Number(index)])
    .slice(0, 1200);
}

export function groupRowToWorldUpdate(row) {
  if (!row?.id || row.group_proof !== true || row.proof_basis !== "verified_phone_unique" || !APPROVED_GROUP_WRITERS.includes(clean(row.contributor_slug))) return null; // unproved / unverified author => excluded
  const channel = clean(row.group_channel);
  if (channel && !Object.hasOwn(GROUP_SOURCE_CHANNELS, channel)) return null; // not a public source group
  const group = channel ? { key: channel, label: GROUP_SOURCE_CHANNELS[channel] } : { key: null, label: GROUP_SOURCE_NEUTRAL_LABEL };
  const media = groupMediaFromRow(row);
  // A row that declared media which failed public validation is dropped entirely, never shown as plain text.
  if (clean(row.media_kind) && !media) return null;
  const body = redactGroupText(row.body);
  if (!body && !media) return null;
  const slug = clean(row.contributor_slug);
  const seen = new Set();
  const occurrences = (Array.isArray(row.occurrences) ? row.occurrences : [{ id: row.id, created_at: row.created_at }])
    .filter((event) => {
      const id = clean(event?.id);
      if (!id || seen.has(id)) return false;
      if (!Number.isFinite(Date.parse(clean(event?.created_at)))) return false;
      seen.add(id);
      return true;
    })
    .slice(0, 40)
    .map((event) => ({ id: clean(event.id), at: new Date(event.created_at).toISOString(), sourceRef: `channel_updates:${clean(event.id)}` }));
  if (!occurrences.some((event) => event.id === clean(row.id))) return null;
  const at = Date.parse(clean(row.created_at));
  const arrivalAt = Number.isFinite(at) ? new Date(at).toISOString() : null;
  // Only a row that already passed every gate above can carry a writer pin; the pin window is checked again when Now renders.
  const pin = groupWriterPin({ channel, slug, arrivalAt });
  return {
    ...(pin || {}),
    id: `group:${row.id}`,
    kind: "source",
    sourceKind: "group_message",
    sourceLabel: "הודעה מקבוצת מקור",
    label: body ? (body.length > 140 ? `${body.slice(0, 140)}…` : body) : (media?.kind === "video" ? "סרטון מהקבוצה" : "תמונה מהקבוצה"),
    fullText: body,
    sourceGroup: group,
    sourceGroupLabel: group.label,
    media,
    mediaHref: media?.url || null,
    thumbUrl: media?.thumbUrl || null,
    creatorHref: groupWriterProfileHref(slug),
    summary: null,
    stateLabel: GROUP_SOURCE_LABEL,
    creator: clean(row.contributor_name) || clean(row.contributor_slug),
    creatorSlug: clean(row.contributor_slug),
    at: arrivalAt,
    arrivalAt,
    recordedAt: arrivalAt,
    sourcePublishedAt: null,
    discoveredAt: null,
    researchUpdatedAt: null,
    sourceRef: `channel_updates:${row.id}`,
    sourceRefs: occurrences.map((event) => event.sourceRef),
    occurrences,
    occurrenceCount: occurrences.length,
    href: `/world#group-source-${encodeURIComponent(row.id)}`,
    value: null,
    numbers: [],
    researchCount: 0,
    publicState: "group_source_message_unverified",
  };
}

export async function fetchGroupSourceArrivals({ limit = 12, before = null, rpc } = {}) {
  const client = rpc ? null : (await import("../supabase.js")).supabase;
  const call = rpc || client.rpc.bind(client);
  const args = { p_limit: Math.min(40, Math.max(1, Number(limit) || 12)), p_before: before };
  const { data, error } = await call(WORLD_GROUP_SOURCE_READER, args);
  if (error) throw error;
  return (Array.isArray(data) ? data : []).map(groupRowToWorldUpdate).filter(Boolean);
}

// Index projected group messages by every `channel_updates:<id>` ref they carry (first row wins).
export function indexGroupMessagesByRef(rows) {
  const byRef = {};
  for (const row of Array.isArray(rows) ? rows : []) {
    for (const ref of (row?.sourceRefs?.length ? row.sourceRefs : [row?.sourceRef])) {
      if (ref && !byRef[ref]) byRef[ref] = row;
    }
  }
  return byRef;
}

// Card context for a World source row: present only when the row's ref matches a loaded group message.
// A row without a match returns null so the caller renders it exactly as before. Never produces an interpretation.
export function groupSourceCardContext(source, byRef, { formatDate = (iso) => iso || "" } = {}) {
  const message = byRef?.[String(source?.ref || "")] || null;
  if (!message) return null;
  const full = message.fullText || "";
  return {
    message,
    groupLabel: message.sourceGroupLabel || null,
    stateLabel: message.stateLabel || GROUP_SOURCE_LABEL,
    meta: [message.creator, formatDate(message.arrivalAt)].filter(Boolean).join(" · "),
    excerpt: full.length > 160 ? `${full.slice(0, 160)}…` : full,
  };
}

export const GROUP_ARRIVALS_CONNECTED = Object.freeze({
  state: "connected",
  message: "מוצגות הודעות מקור מארבעה כותבים שאושרו לעריכה, כפי שנשמרו. הודעה אינה ממצא מאומת, ואין טענה שהגיעו הודעות היום.",
});
