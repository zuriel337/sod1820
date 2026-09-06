// 🧭 Bottom Bar — Experience Shell קבוע (SOD1820 BOTTOM BAR V1).
// מקור-אמת יחיד לאיפה הסרגל מוצג/מוסתר + גובה-הפינוי לתוכן שמתחתיו.
// הסרגל עצמו הוא launcher-shell בלבד — לא engine/store/ניווט מקביל. כל כפתור בו קורא
// לפונקציית-פתיחה גלובלית שכבר קיימת (numberDrawer.js / siteUpdates.js).
//
// V1 launchers: 🧮 מגירת-מספר (numberDrawer.js) · 📣 עדכוני-אתר/וואטסאפ (siteUpdates.js, בדפים שבהם
// LiveChannelFeed ממופה בפועל — ר' isSiteUpdatesRoute ב-lib/siteUpdates.js).
//
// Extension points (עדיין לא ממומשים — להוסיף ל-items ב-BottomBar.jsx רק כשהיכולת עצמה חיה,
// לא לפני): 🌳 עולם/עץ-אחד · 🧭 מסע/Research Context · 🔎 Universal Faceted Explorer/חיפוש ·
// 👤 אני/עוקב/התראות (research_workspace_law, platform_tiers_law).

// 📖 מוסתר בדף-הספר (חוויית-קריאה נקייה) — אותו רג'קס בדיוק כמו hideLauncher הקיים ב-Layout.jsx.
const HIDDEN_ROUTES = [/^\/book(\/|$)/];

export function isBottomBarRoute(pathname) {
  return !HIDDEN_ROUTES.some(re => re.test(pathname));
}

// גובה-פינוי לתוכן שמתחת לסרגל (padding-bottom של אזור-התוכן ב-Layout.jsx) — לעדכן יחד עם ה-CSS ב-BottomBar.jsx.
export const BOTTOM_BAR_CLEARANCE = "calc(64px + env(safe-area-inset-bottom, 0px))";
