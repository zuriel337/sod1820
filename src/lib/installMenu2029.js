// The explicit install action of the "עוד" panel: which browser family this is and that browser's real menu steps. It loads with
// that panel, not with the code every page downloads (shell weight 8/8, SHELL_WEIGHT_REDUCTION_20261118). The browser's own install
// offer is still captured at entry by installOffer2029.js, whose state this module reads.
import { hasInstallOffer, installedHere, isAndroidBrowser, isInstalledApp, isIosFamily } from "./installOffer2029.js";

// Which browser family the manual steps are for. Only families that really can install (add to the home screen / as an app)
// are named; anything else is null, so nothing is promised. iPadOS reports a Mac user agent; touch points tell it apart.
export function installBrowser(win = typeof window === "undefined" ? null : window) {
  const ua = String(win?.navigator?.userAgent || "");
  if (!ua) return null;
  if (isIosFamily(win)) return /CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua) ? "ios-other" : "ios-safari";
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
  if (isInstalledApp(win) || installedHere(win)) return "installed";
  if (hasInstallOffer()) return "native";
  const browser = installBrowser(win);
  if (!browser) return null;
  return browser.startsWith("ios-") ? "ios-manual" : "manual";
}
export function installManualSteps(win = typeof window === "undefined" ? null : window) {
  return INSTALL_MANUAL_STEPS[installBrowser(win)] || [];
}
