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
// Which browser family the manual steps are for. Only families that really can install (add to the home screen / as an app)
// are named; anything else is null, so nothing is promised. iPadOS reports a Mac user agent; touch points tell it apart.
export function installBrowser(win = typeof window === "undefined" ? null : window) {
  const ua = String(win?.navigator?.userAgent || "");
  if (!ua) return null;
  const ipadAsMac = /Macintosh/.test(ua) && Number(win?.navigator?.maxTouchPoints || 0) > 1;
  if (isIosBrowser(ua) || ipadAsMac) return /CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua) ? "ios-other" : "ios-safari";
  if (isAndroidBrowser(ua)) {
    if (/; wv\)|FBAN|FBAV|Instagram|Line\//.test(ua)) return "android-inapp";
    if (/SamsungBrowser/.test(ua)) return "android-samsung";
    if (/Firefox\//.test(ua)) return "android-firefox";
    return /Chrome\//.test(ua) ? "android-chrome" : null;
  }
  if (/Edg\//.test(ua)) return "desktop-edge";
  if (/Chrome\//.test(ua) && !/OPR\/|Firefox\//.test(ua)) return "desktop-chrome";
  const safari = /Macintosh/.test(ua) && /Version\/(\d+)/.exec(ua);
  if (safari && !/Chrome|Firefox/.test(ua) && Number(safari[1]) >= 17) return "desktop-safari";
  return null; // e.g. Firefox on a computer: it cannot install a site, so no step is offered
}

// The real steps for each family, in the words of that browser's own menu. Steps, not promises: when an item is missing the
// last step says what to do instead.
export const INSTALL_MANUAL_STEPS = Object.freeze({
  "ios-safari": ["לחצו על כפתור השיתוף בסרגל של Safari.", "גללו ובחרו «הוסף למסך הבית».", "אשרו ב«הוסף» — סוד 1820 יופיע במסך הבית."],
  "ios-other": ["לחצו על כפתור השיתוף של הדפדפן (ב־Chrome הוא בשורת הכתובת).", "בחרו «הוספה למסך הבית».",
    "אם האפשרות לא מופיעה, פתחו את האתר ב־Safari והתקינו משם."],
  "android-chrome": ["פתחו את תפריט הדפדפן (שלוש הנקודות).", "בחרו «התקנת אפליקציה» או «הוספה למסך הבית», ואשרו.",
    "אם האתר נפתח בתוך אפליקציה אחרת (למשל מקישור בוואטסאפ), בחרו קודם «פתיחה ב־Chrome»."],
  "android-samsung": ["פתחו את תפריט הדפדפן (שלושת הקווים בתחתית המסך).", "בחרו «הוספת דף אל» ואז «מסך הבית», ואשרו."],
  "android-firefox": ["פתחו את תפריט הדפדפן (שלוש הנקודות).", "בחרו «התקנה» או «הוספה למסך הבית», ואשרו."],
  "android-inapp": ["האתר פתוח בתוך אפליקציה אחרת, וממנה אי אפשר להתקין.", "בתפריט שלה בחרו «פתיחה בדפדפן» (או «פתיחה ב־Chrome»).",
    "בדפדפן פתחו שוב את «עוד» ובחרו בהתקנה."],
  "desktop-chrome": ["לחצו על סמל ההתקנה בקצה שורת הכתובת.", "או: תפריט הדפדפן (שלוש הנקודות) ← «העברה, שמירה ושיתוף» ← «התקנת הדף כאפליקציה»."],
  "desktop-edge": ["פתחו את תפריט הדפדפן (שלוש הנקודות).", "בחרו «אפליקציות» ← «התקנת אתר זה כאפליקציה»."],
  "desktop-safari": ["בתפריט «קובץ» של Safari בחרו «הוספה ל־Dock».", "אשרו ב«הוספה» — סוד 1820 ייפתח כאפליקציה."],
});

// The explicit, person-initiated install action (the bottom bar's "עוד" panel). Unlike the automatic suggestion it ignores the
// 14-day dismissal: a person who said "not now" can still install on purpose. "installed" inside the installed app; "native" when the
// browser really holds an install offer (its own window opens); "ios-manual" on iPhone/iPad and "manual" in any other browser that can
// install, both with the real steps; otherwise null (a browser that cannot install is promised nothing).
export function installMenuKind(win = typeof window === "undefined" ? null : window) {
  if (!win) return null;
  if (standalone(win) || installedIn.has(win)) return "installed";
  if (deferred !== null) return "native";
  const browser = installBrowser(win);
  if (!browser) return null;
  return browser.startsWith("ios-") ? "ios-manual" : "manual";
}
export function installManualSteps(win = typeof window === "undefined" ? null : window) {
  return INSTALL_MANUAL_STEPS[installBrowser(win)] || [];
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

// The browser's offer is always kept (so the explicit menu action can use it, on a phone or a computer), but the browser's own
// default UI is only replaced where the automatic suggestion may appear (Android, no dismissal in force); elsewhere it is left alone.
export function listenForInstallOffer(win, storage = store) {
  if (!win || standalone(win) || installBrowser(win)?.startsWith("ios-")) return false;
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
