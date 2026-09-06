import { useSyncExternalStore } from "react";

// 📣 חנות גלובלית קטנה ל"חלון העדכונים" (LiveChannelFeed — עדכוני-אתר/וואטסאפ) —
// אותו דפוס בדיוק כמו src/lib/numberDrawer.js, כדי שגם ה-Bottom Bar (ובעתיד כל מקום אחר)
// יוכל לפתוח/לסגור את אותו חלון קיים בלי ליצור state/panel/מערכת-עדכונים מקבילה.
let state = { open: false };
const subs = new Set();
const emit = () => subs.forEach(f => f());

export function openSiteUpdates() {
  state = { open: true };
  emit();
}
export function closeSiteUpdates() {
  state = { open: false };
  emit();
}
export function toggleSiteUpdates() {
  state = { open: !state.open };
  emit();
}
export function useSiteUpdates() {
  return useSyncExternalStore(
    cb => { subs.add(cb); return () => subs.delete(cb); },
    () => state, () => state
  );
}

// 📍 מקור-אמת יחיד למסלולים שבהם LiveChannelFeed (חלון העדכונים) ממופה בפועל (Layout.jsx) —
// כדי שה-Bottom Bar ידע איפה יש כפתור אמיתי בלי לשכפל את הרג'קס liveChrome.
const SITE_UPDATES_ROUTES = [/^\/$/, /^\/home-new$/, /^\/בית-חדש$/, /^\/community\/chat$/];
export function isSiteUpdatesRoute(pathname) {
  return SITE_UPDATES_ROUTES.some(re => re.test(pathname));
}
