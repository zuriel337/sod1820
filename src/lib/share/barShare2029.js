// One share window (ZURIEL 19.11.2026): a share button inside a page opens the bar's "שיתוף" expansion with exactly what it shares,
// instead of drawing its own row. The page passes the same props it gave ShareActions (url, title, type, subtype, telemetry fields),
// so the bar renders the same canonical ShareActions with the same channels and the same telemetry (canonical_ui_components_law v13).
// No store, no persistence: one DOM event that the System Frame answers. When no frame is mounted (an embed, a test page) the event is
// not taken and the caller keeps its own inline ShareActions, so nothing is lost.

export const BAR_SHARE_EVENT = "sod29:share";

export function registerMobilePostShare(pathname, getShare) {
  const request = event => {
    if (event.detail === pathname && window.matchMedia("(max-width: 768px)").matches
      && openBarShare(getShare())) event.preventDefault();
  };
  window.addEventListener("sod29:share-mobile-post", request);
  return () => window.removeEventListener("sod29:share-mobile-post", request);
}

/**
 * Ask the bar to open its share window for one subject.
 * @param {object} share  { url, title, type, label, ...ShareActions props }  `label` names the kind of thing ("הממצא", "התמונה", "ההודעה").
 * @returns {boolean} true when the bar took it.
 */
export function openBarShare(share) {
  if (typeof window === "undefined" || !share || typeof share !== "object") return false;
  const event = new CustomEvent(BAR_SHARE_EVENT, { detail: { ...share }, cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

/** The subject the bar shows for a shared item: its own words, never an invented title. */
export function barShareSubject(share) {
  const label = String(share?.label || "").trim();
  const title = String(share?.title || "").trim();
  return { label: label || (share?.type === "post" ? "הפוסט" : "העמוד"), title };
}
