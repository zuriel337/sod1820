// 🧭 Bottom Bar — Experience Shell קבוע (SOD1820 BOTTOM BAR — FINAL RECONCILIATION V1).
// מקור-אמת יחיד לאיפה הסרגל מוצג/מוסתר + גובה-הפינוי לתוכן שמתחתיו.
// הסרגל עצמו הוא launcher-shell בלבד — לא engine/store/ניווט מקביל. כל כפתור בו קורא
// לפונקציה/הקשר גלובלי שכבר קיים (numberDrawer.js / siteUpdates.js / ResearchProvider / UserCenter).
//
// 5 ה-slots (working names — לא Naming Contract חדש, ר' דיון-מוצר פתוח ב-work_log):
// ⌖ כאן (Research Context הקיים) · 123 מספר (numberDrawer.js) · ◉ עכשיו (siteUpdates.js/LiveChannelFeed)
// · ✦ רזיאל (מנווט ל-/research הציבורי, שם RazielChat כבר חי — אין קריאת-AI חדשה כאן) · ⋯ עוד
// (Sheet ← UserCenter הקיים).

// 📖 מוסתר בדף-הספר (חוויית-קריאה נקייה) — אותו רג'קס בדיוק כמו hideLauncher הקיים ב-Layout.jsx.
const HIDDEN_ROUTES = [/^\/book(\/|$)/];

export function isBottomBarRoute(pathname) {
  return !HIDDEN_ROUTES.some(re => re.test(pathname));
}

// גובה-פינוי לתוכן שמתחת לסרגל (padding-bottom של אזור-התוכן ב-Layout.jsx) — לעדכן יחד עם ה-CSS ב-BottomBar.jsx.
export const BOTTOM_BAR_CLEARANCE = "calc(74px + env(safe-area-inset-bottom, 0px))";
