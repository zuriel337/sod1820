// Install suggestion state: browser-local only.
//
// Android: captures Chrome's own install offer (beforeinstallprompt) at entry
// time so a small, dismissible suggestion can offer it. iOS has no such event,
// so there the suggestion shows the manual "add to home screen" steps. No
// network request, no telemetry, no identity, no storage other than one
// dismissal hint. The automatic suggestion never appears on a computer or in the
// installed app, and the browser's default behaviour is left alone while a
// dismissal is in force. The explicit "עוד" action (installMenuKind) also serves
// computers and browsers that have no offer, with their real menu steps.
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
const installedIn = new WeakSet(); // windows where "appinstalled" fired: say so, never offer the steps again
const subscribers = new Set();
const notify = () => subscribers.forEach(listener => listener());
export const hasInstallOffer = () => deferred !== null;
// "native" = the browser offers installation; "ios-manual" = iOS, show the steps;
// null = nothing to suggest. A primitive, so it is a stable useSyncExternalStore snapshot.
export function installOfferKind() {
  if (typeof window === "undefined" || standalone()) return null;
  if (deferred !== null) return installSuggestionSuppressed() || !isAndroidBrowser(window.navigator?.userAgent) ? null : "native";
  if (isIosBrowser(window.navigator?.userAgent) && !installSuggestionSuppressed()) return "ios-manual";
  return null;
}
// iPhone/iPad, including iPadOS, which reports a Mac user agent (touch points tell it apart). There the browser has no install
// event, so the offer is never listened for; the menu module (installMenu2029.js) names the iOS family from this same test.
export function isIosFamily(win = typeof window === "undefined" ? null : window) {
  const ua = String(win?.navigator?.userAgent || "");
  if (!ua) return false;
  return isIosBrowser(ua) || (/Macintosh/.test(ua) && Number(win?.navigator?.maxTouchPoints || 0) > 1);
}
// For the explicit install action (installMenu2029.js): inside the installed app, or "appinstalled" already fired in this window.
export const isInstalledApp = (win) => standalone(win);
export const installedHere = (win) => installedIn.has(win);

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

// The browser's offer is always kept (so the explicit menu action can use it, on a phone or a computer), but the browser's own
// default UI is only replaced where the automatic suggestion may appear (Android, no dismissal in force); elsewhere it is left alone.
export function listenForInstallOffer(win, storage = store) {
  if (!win || standalone(win) || isIosFamily(win)) return false;
  const android = isAndroidBrowser(win.navigator?.userAgent);
  win.addEventListener("beforeinstallprompt", (event) => {
    if (android && !installSuggestionSuppressed(storage())) event.preventDefault();
    deferred = event;
    notify();
  });
  win.addEventListener("appinstalled", () => {
    deferred = null;
    installedIn.add(win);
    suppressInstallSuggestion(INSTALL_ACCEPTED_DAYS, storage());
    notify();
  });
  return true;
}
if (typeof window !== "undefined") listenForInstallOffer(window);
