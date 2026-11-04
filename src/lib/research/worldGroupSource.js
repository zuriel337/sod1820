// Group source arrivals for World: ONE narrow sanitized reader (RPC), projected into the existing
// worldDiscoveryStream. A group message is a SOURCE occurrence: unverified, never research, never a Finding.
// Eligibility is proved server-side (private proof row: real group JID + incoming text + sender JID -> unique contributor phone,
// no human hold, editorial flag on the contributor). This file is the second line: it never trusts a row without slug + group proof and re-redacts.
import { publicPageShareUrl } from "../publicPostUrls.js";
import { publicReadingPath } from "../publicReadingRelease2029.js";

const clean = (v) => v == null ? "" : String(v).trim();
export const APPROVED_GROUP_WRITERS = Object.freeze(['tzvi-opoc', 'yaniv-levi', 'shachar-kandro', 'shimon-haimov']);
export const GROUP_SOURCE_LABEL = "הודעת מקור · טרם נבדקה";
export const WORLD_GROUP_SOURCE_READER = "world_group_source_arrivals_v2";

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
  const body = redactGroupText(row.body);
  if (!body) return null;
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
  return {
    id: `group:${row.id}`,
    kind: "source",
    sourceKind: "group_message",
    sourceLabel: "הודעה מקבוצת מקור",
    label: body.length > 140 ? `${body.slice(0, 140)}…` : body,
    fullText: body,
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

export const GROUP_ARRIVALS_CONNECTED = Object.freeze({
  state: "connected",
  message: "מוצגות הודעות מקור מארבעה כותבים שאושרו לעריכה, כפי שנשמרו. הודעה אינה ממצא מאומת, ואין טענה שהגיעו הודעות היום.",
});
