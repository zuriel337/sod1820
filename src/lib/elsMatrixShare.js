import { captureElsResearchReturn } from "./research/elsResearchReturnSnapshot.js";
import { buildJourneyRestore, parseElsHitKey } from "./elsJourney.js";

// Portable presentation snapshot, not a saved record or a claim of verification.
// The recipient replays through the existing canonical load/verification path.
const PREFIX = "#els-matrix=";
const LIMIT = 16384;
const integer = (n, min, max) => Number.isSafeInteger(n) && n >= min && n <= max;
const text = (s, max) => typeof s === "string" && s.trim().length > 0 && s.length <= max;
const anchor = key => {
  const a = parseElsHitKey(key);
  return a && integer(a.start, 0, 2000000) && integer(a.skip, 1, 2000000)
    && key === `${a.skip}_${a.dir}_${a.start}` ? a : null;
};

function sanitize(value) {
  const a = anchor(value?.axis?.hitId);
  if (value?.v !== 1 || !a || a.skip < 2 || !text(value.term, 100)
    || !["torah", "tanakh"].includes(value.scope) || !text(value.corpusId, 100)
    || !Array.isArray(value.findings) || value.findings.length > 12) return null;
  const findings = [];
  for (const f of value.findings) {
    if (!text(f?.t, 100) || !/^#[\da-f]{6}$/i.test(f.color)
      || !Array.isArray(f.shown) || !Array.isArray(f.sourceShown)
      || f.shown.length + f.sourceShown.length > 4096
      || [...f.shown, ...f.sourceShown].some(key => !anchor(key))) return null;
    findings.push({ t: f.t, color: f.color, shown: [...f.shown], sourceShown: [...f.sourceShown] });
  }
  const view = {}, searchWindow = {}, inputView = value.view || {}, inputWindow = value.searchWindow || {};
  for (const key of ["fit", "heat", "niqqud"]) if (typeof inputView[key] === "boolean") view[key] = inputView[key];
  if (Number.isFinite(inputView.zoom) && inputView.zoom >= 0.2 && inputView.zoom <= 4) view.zoom = inputView.zoom;
  if (integer(inputView.showN, 1, 15)) view.showN = inputView.showN;
  if (inputView.findingRadius === null || integer(inputView.findingRadius, 0, 100)) view.findingRadius = inputView.findingRadius;
  if (integer(inputWindow.ctxR, 1, 8)) searchWindow.ctxR = inputWindow.ctxR;
  if (integer(inputWindow.windowColumns, 1, 80)) searchWindow.windowColumns = inputWindow.windowColumns;
  for (const key of ["windowSize", "windowRequested"]) if (["small", "medium", "large", "legacy"].includes(inputWindow[key])) searchWindow[key] = inputWindow[key];
  return { v: 1, term: value.term, scope: value.scope, corpusId: value.corpusId,
    axis: { hitId: a.hitId }, findings, view, searchWindow, hideMain: value.hideMain === true };
}

export function buildElsMatrixShareUrl(state, origin) {
  const snapshot = captureElsResearchReturn(state);
  const value = snapshot && sanitize({ ...snapshot, v: 1,
    findings: snapshot.findings.filter(f => f.shown.length || f.sourceShown.length) });
  if (!value) return null;
  try {
    const url = new URL("/code?mode=classic", origin);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    if (bytes.length > LIMIT) return null;
    const encoded = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    if (encoded.length > LIMIT) return null;
    // Fragment is not sent to the web server. Sharing is always an explicit action.
    url.hash = PREFIX + encoded;
    return url.href;
  } catch { return null; }
}

export function readElsMatrixShare(hash) {
  if (!hash?.startsWith(PREFIX)) return { present: false, loadItem: null };
  try {
    const encoded = hash.slice(PREFIX.length);
    if (!encoded.length || encoded.length > LIMIT || !/^[\w-]+$/.test(encoded)) throw new Error("invalid-share");
    const json = new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(atob(encoded.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)));
    const value = sanitize(JSON.parse(json));
    if (!value) throw new Error("invalid-share");
    const restored = buildJourneyRestore(value);
    if (!restored.ok) throw new Error("invalid-share");
    return { present: true, loadItem: { ...restored.loadItem, corpusId: value.corpusId,
      view: value.view, searchWindow: value.searchWindow, hideMain: value.hideMain,
      words: restored.loadItem.words.map((word, i) => ({ ...word, sourceShown: value.findings[i].sourceShown })) } };
  } catch { return { present: true, loadItem: null }; }
}
