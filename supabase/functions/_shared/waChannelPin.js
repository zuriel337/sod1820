// Writer pins for WhatsApp channel sources (ZURIEL 11.11.2026: «הגילוי היומי» — שחר יצחק קנדרו ויניב לוי נעוצים בראש).
// Pure helper shared by wa-channel-ingest (Deno) and its Node tests; no I/O.
// The registry row (channel_ingest_sources) lists the pinned senders by WhatsApp number (pin_ids, e.g. "9725xxxxxxx@c.us")
// and the pin length (pin_hours). Identity is the sender number only — a display name never pins anything.
// Only an incoming message that is published live is pinned; outgoing, private and unlisted senders stay unpinned.

export const WA_PIN_HOURS_DEFAULT = 24;
export const WA_PIN_HOURS_MAX = 168;

const clean = (value) => String(value == null ? "" : value).trim();

/** Pin length in whole hours from the registry; a missing or invalid value is the 24-hour default, capped at 7 days. */
export function waPinHours(source) {
  const raw = Number(source?.pin_hours);
  if (!Number.isFinite(raw) || raw < 1) return WA_PIN_HOURS_DEFAULT;
  return Math.min(Math.round(raw), WA_PIN_HOURS_MAX);
}

/**
 * ISO time until which the message stays pinned, or null when it is not pinned.
 * `ts` is the provider message time in seconds; the pin window is counted from the message itself, not from the poll.
 */
export function waPinUntil(source, { senderId, outgoing = false, ts, status }) {
  if (outgoing || status !== "live") return null;
  const sender = clean(senderId);
  if (!sender.endsWith("@c.us")) return null;
  const ids = (Array.isArray(source?.pin_ids) ? source.pin_ids : []).map(clean).filter(Boolean);
  if (!ids.includes(sender)) return null;
  const seconds = Number(ts);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date((seconds + waPinHours(source) * 3600) * 1000).toISOString();
}
