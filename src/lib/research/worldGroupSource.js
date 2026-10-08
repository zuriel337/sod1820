// Group source arrivals for World: ONE narrow sanitized reader (RPC), projected into the existing
// worldDiscoveryStream. A group message is a SOURCE occurrence: unverified, never research, never a Finding.
// Eligibility is proved server-side (group JID, source auto, ext_msg_id, status live, editorial flag on the
// contributor). This file is the second line: it never trusts a row without slug + group proof and re-redacts.

const clean = (v) => v == null ? "" : String(v).trim();
export const GROUP_SOURCE_LABEL = "הודעת מקור · טרם נבדקה";

export function redactGroupText(text) {
  return clean(text)
    .replace(/(https?:\/\/|www\.)\S+/gi, "[קישור]")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[דוא״ל]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[מספר]")
    .slice(0, 1200);
}

export function groupRowToWorldUpdate(row) {
  if (!row?.id || row.group_proof !== true || !clean(row.contributor_slug)) return null; // unknown author => excluded
  const body = redactGroupText(row.body);
  if (!body) return null;
  const at = Date.parse(clean(row.created_at));
  return {
    id: `group:${row.id}`,
    kind: "source",
    sourceKind: "group_message",
    label: body.length > 140 ? `${body.slice(0, 140)}…` : body,
    fullText: body,
    summary: null,
    stateLabel: GROUP_SOURCE_LABEL,
    creator: clean(row.contributor_name) || clean(row.contributor_slug),
    creatorSlug: clean(row.contributor_slug),
    at: Number.isFinite(at) ? new Date(at).toISOString() : null,
    sourceRef: `channel_updates:${row.id}`,
    href: "/world",
    value: null,
    numbers: [],
    researchCount: 0,
    publicState: "group_source_message_unverified",
  };
}

export async function fetchGroupSourceArrivals({ limit = 12, rpc } = {}) {
  const call = rpc || (await import("../supabase.js")).supabase.rpc.bind((await import("../supabase.js")).supabase);
  const { data, error } = await call("world_group_source_arrivals_v1", { p_limit: limit });
  if (error) throw error;
  return (Array.isArray(data) ? data : []).map(groupRowToWorldUpdate).filter(Boolean);
}

export const GROUP_ARRIVALS_CONNECTED = Object.freeze({
  state: "connected",
  message: "מוצגות הודעות מקור מארבעה כותבים שאושרו לעריכה, כפי שנשמרו. הודעה אינה ממצא מאומת, ואין טענה שהגיעו הודעות היום.",
});
