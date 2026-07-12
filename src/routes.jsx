// ===== מפת הניווט המרכזית =====
// מקור אמת יחיד: ממנו נגזרים גם התפריט/פוטר וגם ה-SEO לכל route.

export const NAV = [
  { label: "בית", emoji: "🏠", to: "/" },
  { label: "כאן מתחילים", emoji: "🚀", to: "/start", highlight: true },
  { label: "מרכז הניווט", emoji: "🏛", to: "/map" },
  { label: "ציר ההתגלות", emoji: "🌅", to: "/timeline" },
  { label: "עץ ההתכנסויות", emoji: "🌳", to: "/numbers" },
  { label: "בית המדרש", emoji: "📚", to: "/beit-midrash" },
  { label: "פוסטים", emoji: "📖", to: "/post" },
  { label: "זרם המציאות", emoji: "🌊", to: "/archive?tab=reality" },
  { label: "מרכז השידורים", emoji: "📡", to: "/broadcasts" },
  { label: "ארכיון ההתגלות", emoji: "🖼", to: "/archive?tab=galleries" },
  { label: "דילוגי אותיות", emoji: "🔠", to: "/code" },
  {
    label: "קהילה", emoji: "💬", to: "/community", children: [
      { label: "צ'אט", to: "/community/chat" },
      { label: "הכתבים והחוקרים", to: "/community/researchers" },
      { label: "מחשבון קהילתי", to: "/community/calculator" },
      { label: "מחשבון מקצועי", to: "/research?tool=gematria" },
      { label: "תגובות", to: "/community/comments" },
      { label: "אודות וצור קשר", to: "/contact" },
    ],
  },
  { label: "בני ההיכל", emoji: "👑", to: "/members" },
  { label: "ניסויים · תלת-מימד", emoji: "🧪", to: "/lab" },
];

// שורת התפריט הראשית = מוצרים בלבד (דף עצמאי שראוי לחיפוש-גוגל משלו).
// כלים חיים בתוך «היכל»; תוכן/קהילה נגישים דרך «עוד ▾» / מרכז הניווט.
export const PRIMARY_KEYS = [
  "/", "/number", "/code", "/beit-midrash", "/research", "/community",
];

// SEO לכל route. דפי תוכן דינמיים (פוסט/קטגוריה/תגית/מספר) מגדירים SEO משלהם.
export const ROUTE_META = {
  "/":              { fullTitle: "כי לה' המלוכה – SOD1820 | רמזי הגאולה, דילוגי אותיות ומחשבון גימטריה", title: "כי לה' המלוכה", description: "אתר כי לה' המלוכה – רמזי הגאולה הגדול בעולם. 14 שנות מחקר, תוכנת דילוגי אותיות, מחשבון גימטריה, עץ המספרים, מאגר חי של צפנים, חידושי AI וכלים לקריאת המציאות בשפת המספרים." },
  "/start":         { title: "כאן מתחילים", description: "מה זה SOD1820 ואיך מתחילים — גימטריה, ציר ההתגלות, עץ המספרים והצופן התנ\"כי בשתי דקות." },
  "/map":           { title: "מרכז הניווט", description: "מפת האתר החיה — כל מערכות SOD1820 במקום אחד." },
  "/timeline":      { title: "ציר ההתגלות", description: "ציר הזמן של אירועי הגאולה — כל תחנה מחוברת לפוסט המתעד ולתמונות הממצאים." },
  "/numbers":       { title: "עץ ההתכנסויות", description: "עץ ההתכנסויות האינטראקטיבי — קשרים בין מספרים, מושגים ואירועים." },
  "/beit-midrash":  { title: "בית המדרש", description: "לימוד שיטות הגימטריה — מסתתר, קדמי, מילוי, אלב\"ם, אתב\"ש ועוד." },
  "/post":          { title: "פוסטים אחרונים", description: "כל הפוסטים והתיעודים באתר SOD1820 — חיפוש, גימטריה וסינון." },
  "/archive":       { title: "ארכיון ההתגלות", description: "כל התמונות, הצפנים והממצאים במקום אחד — עם סינון וחיבור לעץ המספרים." },
  "/gallery-updates": { title: "עדכוני גלריה", description: "עדכוני הגלריה האחרונים — תצלומי חדשות וממצאים טריים, כל אחד מחובר למספר ולגימטריה שלו." },
  "/cross":         { title: "הצלבת שיטות", description: "המסר המצטרף שמאחורי מספר — כל הביטויים המאומתים שנופלים על אותו ערך בכל שיטות הגימטריה." },
  "/code":          { title: "חיפוש בצופן התנ\"כי עם AI — דילוגי אותיות בתורה ובתנ\"ך", description: "חיפוש בצופן התנ\"כי בעזרת בינה מלאכותית — דילוגי אותיות (ELS), חישוב בתורה וחיפוש תבניות נסתרות בתנ\"ך. מנוע ה-AI של SOD1820 חושף רמזים, צירופים וקודים חבויים בכתבי הקודש. (בטא — נפתח בקרוב.)" },
  "/community":     { title: "קהילה", description: "מרכז הפעילות של SOD1820 — צ'אט, תגובות, מחשבון קהילתי ופעילות אחרונה." },
  "/members":       { title: "בני ההיכל", description: "אזור המנויים — שיעורים, קורסים, עץ מתקדם וצפנים בלעדיים.", noindex: true },
  "/about":         { title: "אודות", description: "אודות SOD1820 — גימטריה, צפנים בתורה ושפת המספרים." },
  "/contact":       { title: "צור קשר", description: "יצירת קשר עם SOD1820." },
  "/community/chat":       { title: "צ'אט הקהילה", description: "צ'אט הקהילה של SOD1820 — שיחה חיה בין חברי הקהילה." },
  "/community/calculator": { title: "מחשבון קהילתי", description: "מחשבון הגימטריה הקהילתי של SOD1820." },
  "/community/comments":   { title: "תגובות הקהילה", description: "כל התגובות האחרונות בקהילת SOD1820." },
  "/verified":      { title: "פוסטים מאומתים", description: "פוסטים מאומתים באתר SOD1820." },
  "/sulamot":       { title: "סולמות", description: "סולמות הגימטריה — מבט מדורג על המספרים." },
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
