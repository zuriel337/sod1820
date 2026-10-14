import { useSyncExternalStore } from "react";

// 📣 חנות גלובלית קטנה ל"חלון העדכונים" (LiveChannelFeed — עדכוני-אתר/וואטסאפ) —
// אותו דפוס בדיוק כמו src/lib/numberDrawer.js, כדי שגם ה-Bottom Bar (ובכל מקום אחר)
// יוכל לפתוח/לסגור את אותו חלון קיים בלי ליצור state/panel/מערכת-עדכונים מקבילה.
// `unseen` הוא סיגנל-אמת בלבד: LiveChannelFeed הוא היצרן היחיד שלו (setSiteUpdatesUnseen)
// לפי מה שהוא כבר מחשב בעצמו — כאן רק משדרים אותו הלאה, לא מחשבים/שולפים דבר בעצמנו.
let state = { open: false, unseen: 0 };
const subs = new Set();
const emit = () => subs.forEach(f => f());

export function openSiteUpdates() {
  state = { ...state, open: true };
  emit();
}
export function closeSiteUpdates() {
  state = { ...state, open: false };
  emit();
}
export function toggleSiteUpdates() {
  state = { ...state, open: !state.open };
  emit();
}
export function setSiteUpdatesUnseen(unseen) {
  const n = Math.max(0, Number(unseen) || 0);
  if (n !== state.unseen) { state = { ...state, unseen: n }; emit(); }
}
export function useSiteUpdates() {
  return useSyncExternalStore(
    cb => { subs.add(cb); return () => subs.delete(cb); },
    () => state, () => state
  );
}

// The existing Legacy updates window lives once at App's router root.
// Greenfield surfaces retain their own shell; no Legacy UI enters 2029.
const GREENFIELD_ROUTES = [
  /^\/2029(?:\/|$)/, /^\/(?:world|els|heichal|היכל)(?:\/|$)/,
  /^\/books?(?:\/|$)/,
  /^\/(?:entity-hub-preview|explorer-preview|community-shadow-preview-2029)(?:\/|$)/,
];
export function isSiteUpdatesRoute(pathname) {
  return typeof pathname === "string" && pathname.startsWith("/") && !GREENFIELD_ROUTES.some(re => re.test(pathname));
}

// These existing App routes bypass Layout and therefore have no admin BottomBar.
// Keep the public launcher available there even for an authenticated admin.
const STANDALONE_LEGACY_ROUTES = [
  /^\/(?:enter|stream|ניסיון|experience|חישוב|reveal|galaxy|research|meaning-lab|מעבדת-משמעות|research-viewer|cheder)(?:\/|$)/,
  /^\/sulamot(?:5|6|7|8|9|10|11)(?:\/|$)/,
];
export function isLegacyLayoutUpdatesRoute(pathname) {
  return isSiteUpdatesRoute(pathname) && !STANDALONE_LEGACY_ROUTES.some(re => re.test(pathname));
}

