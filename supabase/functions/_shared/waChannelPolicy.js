// Live-publication policy of a WhatsApp channel source, decided per MESSAGE (ZURIEL 11.11.2026, «הגילוי היומי»).
// Pure helpers shared by wa-channel-ingest (Deno) and its Node tests; no I/O, no clock.
//
// The registry row (channel_ingest_sources) carries the whole decision; deploying the code changes nothing by itself:
//   live_from    — the approved activation moment. A message whose PROVIDER time is at or after it is admitted from every member
//                  and published live. Any earlier message keeps the previous policy (admin_ids allowlist, private), also when it
//                  is processed later (backlog, outage recovery, targeted recovery). Null / invalid = never opened.
//   pin_writers  — [{ "jid": "9725…@c.us", "name": "…" }]: the writers pinned at the top of Now, by WhatsApp number only.
//   pin_hours    — pin length counted from the message time (default 24, max 168).
// Public attribution: a live row of a group that uses sender names never carries a regular member's name or contributor link;
// only a listed writer (proved by his number) is named, with the name from the private registry, never his display name.

export const WA_PIN_HOURS_DEFAULT = 24;
export const WA_PIN_HOURS_MAX = 168;
const WRITER_NAME_MAX = 80;

const clean = (value) => String(value == null ? "" : value).trim();
const isJid = (value) => /^\d{6,20}@c\.us$/.test(value);

/** The activation moment in epoch milliseconds, or null when the group is not opened. */
export function waLiveFrom(source) {
  const raw = source?.live_from;
  if (raw == null || raw === "") return null;
  const at = Date.parse(String(raw));
  return Number.isFinite(at) ? at : null;
}

/** True only for a message whose provider time (seconds) is at or after live_from. Processing time never matters. */
export function waGroupOpenAt(source, ts) {
  const from = waLiveFrom(source);
  const seconds = Number(ts);
  return from != null && Number.isFinite(seconds) && seconds > 0 && seconds * 1000 >= from;
}

/**
 * Admission of an INCOMING message by its sender (block lists are applied separately and always).
 * Before the activation moment the admin_ids allowlist is the gate — when admin_only is on, and also when the group has an
 * activation moment set (so opening admin_only for research trust never lets an earlier message of a non-admin in).
 * At or after the moment every member is admitted.
 */
export function waAllowlistAdmits(source, senderId, ts) {
  if (waGroupOpenAt(source, ts)) return true;
  const admins = Array.isArray(source?.admin_ids) ? source.admin_ids : [];
  const gated = admins.length > 0 && (source?.admin_only === true || waLiveFrom(source) != null);
  return !gated || admins.includes(clean(senderId));
}

/** Pin length in whole hours from the registry; a missing or invalid value is the 24-hour default, capped at 7 days. */
export function waPinHours(source) {
  const raw = Number(source?.pin_hours);
  if (!Number.isFinite(raw) || raw < 1) return WA_PIN_HOURS_DEFAULT;
  return Math.min(Math.round(raw), WA_PIN_HOURS_MAX);
}

/** The listed writer for this sender number ({ jid, name }), or null. A display name never matches. */
export function waPinWriter(source, senderId) {
  const sender = clean(senderId);
  if (!isJid(sender)) return null;
  const list = Array.isArray(source?.pin_writers) ? source.pin_writers : [];
  for (const entry of list) {
    const jid = clean(entry?.jid), name = clean(entry?.name).slice(0, WRITER_NAME_MAX);
    if (isJid(jid) && name && jid === sender) return { jid, name };
  }
  return null;
}

/**
 * The per-message row policy. `storyLive` is the channel's own permanent live state (Or HaGeula); every other channel is live
 * only for messages at or after its activation moment.
 * Returns { open, status, pinWriter, pinnedUntil, anonymousMember }:
 *   pinWriter/pinnedUntil — only for an incoming LIVE message of a listed number;
 *   anonymousMember       — a live incoming message of a sender-name group from anyone else: stored without name and without
 *                           contributor link (the public row is readable by anyone; hiding it in the UI is not enough).
 */
export function waRowPolicy(source, { ts, senderId, outgoing = false, storyLive = false }) {
  const open = waGroupOpenAt(source, ts);
  const status = storyLive || open ? "live" : "private";
  const writer = !outgoing && status === "live" ? waPinWriter(source, senderId) : null;
  const seconds = Number(ts);
  const pinnedUntil = writer && Number.isFinite(seconds) && seconds > 0
    ? new Date((seconds + waPinHours(source) * 3600) * 1000).toISOString() : null;
  const anonymousMember = status === "live" && !outgoing && !writer && source?.use_sender_name === true;
  return { open, status, pinWriter: writer, pinnedUntil, anonymousMember };
}
