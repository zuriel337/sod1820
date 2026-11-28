// Navigation and opening moments (S4, 27.11.2026), through the existing emit() path and the closed nav_2029 / content families (tokens and bounded integers only).
// Lazy: loaded after the first page is measured, or on the first panel open / item view. No listener, timer or storage runs until then, and nothing is queued.
import { emit } from "./events.js";
import { registerNavSpec2029 } from "./publicReadingNavSpec2029.js";
registerNavSpec2029();

const TOKEN = /^[a-z0-9][a-z0-9_:.-]{0,47}$/i;
const token = value => typeof value === "string" && TOKEN.test(value) ? value.toLowerCase() : null;
const CAP = 120;            // events of this module per page load, so a script that clicks in a loop cannot flood the pipeline
let sent = 0;
const seenItems = new Set();

export function resetNavMeasureForTest() { sent = 0; seenItems.clear(); installed = false; shownPanel = null; }

// The first path segment, as a token: where the person was when it happened. Never the address itself.
export function surfaceToken(pathname = globalThis.location?.pathname || "/") {
  const first = String(pathname).split("/").filter(Boolean)[0] || "home";
  const seg = first === "2029" ? String(pathname).split("/").filter(Boolean)[1] || "home" : first;
  return token(seg) || "other";
}

function send(event, props) {
  if (sent >= CAP) return false;
  sent += 1;
  try { emit("nav_2029", event, { props }); return true; } catch { return false; }
}

export function panelOpen(kind) { const panel = token(kind); return panel ? send("panel_open", { panel, from_surface: surfaceToken() }) : false; }
export function panelClose(kind) { const panel = token(kind); return panel ? send("panel_close", { panel, from_surface: surfaceToken() }) : false; }
// One call per change of the open panel (the frame loads this module only when a panel opens): closes the previous one, opens the next.
let shownPanel = null;
export function panelKind(kind) {
  const next = token(kind);
  if (next === shownPanel) return false;
  const previous = shownPanel;
  shownPanel = next;
  if (previous) panelClose(previous);
  return next ? panelOpen(next) : false;
}
export function searchSubmit(section, outcome) { const s = token(section); return s ? send("search_submit", { section: s, outcome: token(outcome) || undefined }) : false; }
export function shareBarOpen(section) { const s = token(section); return s ? send("share_bar_open", { section: s }) : false; }
export function mediaPlay(provider) { const p = token(provider); return p ? send("media_play", { provider: p, from_surface: surfaceToken() }) : false; }
export function galleryOpen() { return send("gallery_open", { from_surface: surfaceToken() }); }

// A public item opened: once per session per item, through the closed item_2029 family (the cipher is named by the first 12 characters of its public id, as a token).
export function itemView(kind, id) {
  const k = token(kind), ref = typeof id === "string" ? id.replace(/-/g, "").toLowerCase().slice(0, 12) : "";
  if (!k || !/^[0-9a-f]{12}$/.test(ref)) return false;
  const key = k + ":" + ref;
  if (seenItems.has(key)) return false;
  seenItems.add(key);
  // Once per session per item (the in-memory set above still bounds one page load when storage is unavailable).
  try { if (sessionStorage.getItem("iv29-" + key)) return false; sessionStorage.setItem("iv29-" + key, "1"); } catch { /* count anyway */ }
  try { emit("item_2029", "view", { props: { kind: k, item_ref: ref } }); return true; } catch { return false; }
}

export function studyAction(control) { const c = token(control); return send("study_action", { section: "beit_midrash", ...(c ? { panel: c } : {}) }); }

// Delegated listeners, installed once after the first page is measured (lazy; capture + passive; nothing is queued, nothing is stored):
//  * a click on a link to a number page: the moment a person moves from one number to another (the landing is only a page view);
//  * a click on the share entry that opens the share bar (the completion is measured separately by the share family);
//  * a click on a control inside the study house (beit midrash): which control, as a token, never its text;
//  * the first play of a native <video> element (bare iframes cannot be observed; the shared external player has its own family);
//  * a submit of a search form (role="search"): that a search was run, never what was typed.
let installed = false;
const played = new WeakSet();
export function installNavMeasure2029(doc = globalThis.document) {
  if (installed || !doc?.addEventListener) return false;
  installed = true;
  globalThis.sodPanelNav = panelKind; // the frame calls this on every change of the open panel (it carries no import of this module)
  doc.addEventListener("click", event => {
    const el = event.target?.closest?.('a[href^="/number/"], a[href^="/2029/number/"], [data-share-entry="bar"], [data-experience-surface="beit-midrash"] :is(button, a)');
    if (!el) return;
    if (el.matches('[data-share-entry="bar"]')) shareBarOpen(surfaceToken());
    else if (el.matches('a[href^="/number/"], a[href^="/2029/number/"]')) send("number_link_open", { from_surface: surfaceToken(), target_surface: "number" });
    else studyAction(el.getAttribute("data-action") || el.getAttribute("data-method") || el.id);
  }, { capture: true, passive: true });
  doc.addEventListener("play", event => {
    const v = event.target;
    if (v?.tagName === "VIDEO" && !played.has(v)) { played.add(v); mediaPlay("native"); }
  }, { capture: true, passive: true });
  doc.addEventListener("submit", event => {
    if (event.target?.matches?.('form[role="search"]')) searchSubmit(surfaceToken(), undefined);
  }, { capture: true, passive: true });
  return true;
}
export const installNumberLinkMeasure2029 = installNavMeasure2029;
