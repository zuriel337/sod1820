// Install suggestion state: browser-local only.
//
// Android: captures Chrome's own install offer (beforeinstallprompt) at entry
// time so a small, dismissible suggestion can offer it. iOS has no such event,
// so there the suggestion shows the manual "add to home screen" steps. No
// network request, no telemetry, no identity, no storage other than one
// dismissal hint. Desktop and an already-installed app are never touched, and
// the browser's default behaviour is left alone while a dismissal is in force.
const UNTIL_KEY = "sod2029:install-suggestion-until";
export const INSTALL_DISMISS_DAYS = 14;
export const INSTALL_ACCEPTED_DAYS = 365;

export const isAndroidBrowser = (userAgent) => /android/i.test(String(userAgent || ""));
export const isIosBrowser = (userAgent) => /iphone|ipad|ipod/i.test(String(userAgent || ""));
const store = () => { try { return localStorage; } catch { return null; } };

export function installSuggestionSuppressed(storage = store(), now = Date.now()) {
  try { return Number(storage?.getItem(UNTIL_KEY) || 0) > now; } catch { return false; }
}
export function suppressInstallSuggestion(days, storage = store(), now = Date.now()) {
  try { storage?.setItem(UNTIL_KEY, String(now + days * 86400000)); } catch { /* optional browser hint */ }
}

let deferred = null;
const subscribers = new Set();
const notify = () => subscribers.forEach(listener => listener());
export const hasInstallOffer = () => deferred !== null;
// "native" = the browser offers installation; "ios-manual" = iOS, show the steps;
// null = nothing to suggest. A primitive, so it is a stable useSyncExternalStore snapshot.
export function installOfferKind() {
  if (typeof window === "undefined" || standalone()) return null;
  if (deferred !== null) return installSuggestionSuppressed() ? null : "native";
  if (isIosBrowser(window.navigator?.userAgent) && !installSuggestionSuppressed()) return "ios-manual";
  return null;
}
// The explicit, person-initiated install action (the bottom bar's "עוד" panel). Unlike the automatic suggestion it ignores the
// 14-day dismissal: a person who said "not now" can still install on purpose. "native" only when the browser really holds an
// install offer, "ios-manual" on iOS (the steps), "installed" inside the installed app, otherwise null (nothing is promised).
export function installMenuKind(win = typeof window === "undefined" ? null : window) {
  if (!win) return null;
  if (standalone(win)) return "installed";
  if (deferred !== null) return "native";
  if (isIosBrowser(win.navigator?.userAgent)) return "ios-manual";
  return null;
}
export function subscribeInstallOffer(listener) {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

// Resolves to the browser's outcome ("accepted" | "dismissed") or null when no
// offer was available. The event can be used once; the browser re-offers later.
export async function requestInstall() {
  const offer = deferred;
  if (!offer) return null;
  deferred = null;
  notify();
  try {
    await offer.prompt();
    const choice = await offer.userChoice;
    return choice?.outcome ?? null;
  } catch { return null; }
}

function standalone(win = window) {
  try { if (win.matchMedia("(display-mode: standalone)").matches) return true; } catch { /* no matchMedia */ }
  return win.navigator?.standalone === true; // iOS Safari
}

// The browser's offer is always kept (so the explicit menu action can use it), but the browser's own default UI is only
// replaced while the automatic suggestion may appear; during a dismissal the default behaviour is left alone, as before.
export function listenForInstallOffer(win, storage = store) {
  if (!win || !isAndroidBrowser(win.navigator?.userAgent) || standalone(win)) return false;
  win.addEventListener("beforeinstallprompt", (event) => {
    if (!installSuggestionSuppressed(storage())) event.preventDefault();
    deferred = event;
    notify();
  });
  win.addEventListener("appinstalled", () => {
    deferred = null;
    suppressInstallSuggestion(INSTALL_ACCEPTED_DAYS, storage());
    notify();
  });
  return true;
}
if (typeof window !== "undefined") listenForInstallOffer(window);
