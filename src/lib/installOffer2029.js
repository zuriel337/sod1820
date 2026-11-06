// Android install suggestion: browser-local state only.
//
// Captures Chrome's own install offer (beforeinstallprompt) at entry time so a
// small, dismissible suggestion can offer it later. No network request, no
// telemetry, no identity, no storage other than one dismissal hint. Desktop,
// iOS and an already-installed app are never touched: the browser's default
// behaviour is left alone there, and also while a dismissal is in force.
const UNTIL_KEY = "sod2029:install-suggestion-until";
export const INSTALL_DISMISS_DAYS = 14;
export const INSTALL_ACCEPTED_DAYS = 365;

export const isAndroidBrowser = (userAgent) => /android/i.test(String(userAgent || ""));
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

function standalone() {
  try { return window.matchMedia("(display-mode: standalone)").matches; } catch { return false; }
}

if (typeof window !== "undefined" && isAndroidBrowser(window.navigator?.userAgent) && !standalone()) {
  window.addEventListener("beforeinstallprompt", (event) => {
    if (installSuggestionSuppressed()) return;
    event.preventDefault();
    deferred = event;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    suppressInstallSuggestion(INSTALL_ACCEPTED_DAYS);
    notify();
  });
}
