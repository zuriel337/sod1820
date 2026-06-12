// ===== מפת הניווט המרכזית =====
// מקור אמת יחיד: ממנו נגזרים גם התפריט/פוטר וגם ה-SEO לכל route.

export const NAV = [
  { label: "בית", emoji: "🏠", to: "/" },
  { label: "כאן מתחילים", emoji: "🚀", to: "/start", highlight: true },
  { label: "מרכז הניווט", emoji: "🏛", to: "/map" },
  { label: "ציר ההתגלות", emoji: "🌅", to: "/timeline" },
  { label: "עץ המספרים", emoji: "🌳", to: "/numbers" },
  {
    label: "בית המדרש", emoji: "📚", to: "/beit-midrash", children: [
      { label: "מבוא", to: "/beit-midrash/intro" },
      { label: "גימטריה רגילה", to: "/beit-midrash/gematria" },
      { label: "מילוי", to: "/beit-midrash/milui" },
      { label: "קדמי", to: "/beit-midrash/kidmi" },
      { label: "מסתתר", to: "/beit-midrash/nistar" },
      { label: 'אלב"ם', to: "/beit-midrash/albam" },
      { label: 'אתב"ש', to: "/beit-midrash/atbash" },
      { label: "מספרי אם", to: "/beit-midrash/em" },
      { label: "דילוגי אותיות", to: "/code" },
      { label: "שיעורים", to: "/beit-midrash/lessons" },
      { label: "קורסים", to: "/beit-midrash/courses" },
    ],
  },
  { label: "פוסטים", emoji: "📖", to: "/post" },
  { label: "ארכיון ההתגלות", emoji: "🖼", to: "/archive" },
  { label: 'הצופן התנ"כי', emoji: "🔍", to: "/code" },
  {
    label: "קהילה", emoji: "💬", to: "/community", children: [
      { label: "צ'אט", to: "/community/chat" },
      { label: "מחשבון קהילתי", to: "/community/calculator" },
      { label: "תגובות", to: "/community/comments" },
      { label: "צור קשר", to: "/contact" },
    ],
  },
  { label: "בני ההיכל", emoji: "👑", to: "/members" },
  { label: "אודות", emoji: "ℹ️", to: "/about" },
];

// פריטים שמוצגים בשורת התפריט הראשית (השאר נגישים דרך מרכז הניווט / המבורגר)
export const PRIMARY_KEYS = [
  "/", "/start", "/timeline", "/numbers", "/beit-midrash", "/post",
  "/code", "/community", "/members",
];

// SEO לכל route. דפי תוכן דינמיים (פוסט/קטגוריה/תגית/מספר) מגדירים SEO משלהם.
export const ROUTE_META = {
  "/":              { title: "כי לה' המלוכה", description: "SOD1820 — צוריאל פולייס. גימטריה, ציר ההתגלות, עץ המספרים והצופן התנ\"כי — מפה חיה של שפת המספרים." },
  "/start":         { title: "כאן מתחילים", description: "מה זה SOD1820 ואיך מתחילים — גימטריה, ציר ההתגלות, עץ המספרים והצופן התנ\"כי בשתי דקות." },
  "/map":           { title: "מרכז הניווט", description: "מפת האתר החיה — כל מערכות SOD1820 במקום אחד." },
  "/timeline":      { title: "ציר ההתגלות", description: "ציר הזמן של אירועי הגאולה — כל תחנה מחוברת לפוסט המתעד ולתמונות הממצאים." },
  "/numbers":       { title: "עץ המספרים", description: "עץ המספרים האינטראקטיבי — קשרים בין מספרים, מושגים ואירועים." },
  "/beit-midrash":  { title: "בית המדרש", description: "לימוד שיטות הגימטריה — מסתתר, קדמי, מילוי, אלב\"ם, אתב\"ש ועוד." },
  "/post":          { title: "פוסטים אחרונים", description: "כל הפוסטים והתיעודים באתר SOD1820 — חיפוש, גימטריה וסינון." },
  "/archive":       { title: "ארכיון ההתגלות", description: "כל התמונות, הצפנים והממצאים במקום אחד — עם סינון וחיבור לעץ המספרים." },
  "/code":          { title: "הצופן התנ\"כי", description: "דילוגי אותיות (ELS) בטקסט התורה — חיפוש, אשכולות וניתוח." },
  "/community":     { title: "קהילה", description: "מרכז הפעילות של SOD1820 — צ'אט, תגובות, מחשבון קהילתי ופעילות אחרונה." },
  "/members":       { title: "בני ההיכל", description: "אזור המנויים — שיעורים, קורסים, עץ מתקדם וצפנים בלעדיים.", noindex: true },
  "/about":         { title: "אודות", description: "אודות צוריאל פולייס — חוקר גימטריה ושפת המספרים." },
  "/contact":       { title: "צור קשר", description: "יצירת קשר עם צוריאל פולייס ו-SOD1820." },
  "/theme-preview": { title: "תצוגת צבעים", description: "עמוד תצוגה זמני לבחירת פלטת הצבעים.", noindex: true },
};

// שיטוח כל הקישורים (כולל ילדים) לרשימה אחת
export function flattenNav(nav = NAV) {
  const out = [];
  for (const item of nav) {
    out.push(item);
    if (item.children) for (const c of item.children) out.push(c);
  }
  return out;
}
