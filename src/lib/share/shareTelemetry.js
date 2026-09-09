// 🔗 Share telemetry — W1 Slice 2 (Scope C).
//
// ONE place that turns a Share Intent into (a) the canonical share event and (b) the
// attributed outbound URL, so every share surface produces identical attribution evidence.
//
// ⛔ BOUNDARY — SHARE_ATTRIBUTION_CONTRACT_SYNC (work_log 1edf4edd):
// the SHARE workstream produces telemetry; the ANALYTICS workstream owns its
// interpretation. Therefore every field analytics reads today is emitted BYTE-IDENTICALLY:
//   event_type = "share" · section = "share" · slug = canonical landing key
//   meta.platform · meta.content_type · meta.url · meta.image
// Nothing above is renamed, reordered in meaning, or given new values by this module.
//
// Richer evidence (source surface, entity identity, resolved modality, locale) is carried
// ADDITIVELY under the single namespaced key `meta.share_object`, which no current reader
// consumes. It is therefore incapable of changing existing analytics interpretation.
// That key is NON-CANONICAL pending Analytics reconciliation — see the sync memo.
//
// Known existing semantics left deliberately UNCHANGED: an image share emits
// meta.platform="image", i.e. the legacy producer conflates channel with modality.
// Correcting that would change analytics interpretation and is the Analytics owner's
// decision, not ours. `share_object.channel`/`share_object.modality` record the truth
// separately without touching meta.platform.

import { track } from "../tracking.js";
import { taggedShareUrl, landingKey } from "../propagation.js";
import { SHARE_SITE } from "../share.js";
import { shareEvidence, buildShareMeta } from "./shareObject.js";

/**
 * Canonical landing key for a shared URL.
 * Content != destination: `slug` must be the real landing path (normalized identically to
 * captureArrival) so share.slug joins to arrival.meta.landing. An off-site URL has no
 * on-site landing to measure, so it keeps the content type as slug — this is the
 * 2026-09-05 Sharing Foundation repair, preserved exactly.
 */
export function shareSlug(fullUrl, fallbackType) {
  try {
    const u = new URL(fullUrl, typeof window !== "undefined" ? window.location.origin : SHARE_SITE);
    const site = new URL(SHARE_SITE);
    if (u.hostname !== site.hostname) return String(fallbackType);
    return landingKey(u.pathname);
  } catch { return String(fallbackType); }
}

/** The attributed outbound URL — always through the existing rid+src owner. */
export function attributedShareUrl(url, channel) {
  return taggedShareUrl(url, channel);
}

/**
 * Emit the canonical share event.
 * `legacy` carries the exact fields the existing producer emitted; they pass through
 * untouched. `intent`/`resolved` are optional and only add the namespaced evidence key.
 */
export function emitShare({ channel, slug, url, image = null, contentType = null, contentId, intent = null, resolved = null } = {}) {
  const evidence = intent ? shareEvidence({ ...intent, channel: intent.channel || channel }, resolved) : null;
  try {
    track("share", slug, "share", buildShareMeta({ channel, url, image, contentType, contentId, evidence }));
  } catch { /* telemetry must never break a share */ }
}
