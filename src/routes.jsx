// ===== מפת הניווט המרכזית =====
// מקור אמת יחיד: ממנו נגזרים גם התפריט/פוטר וגם ה-SEO לכל route.

export const NAV = [
  { label: "בית", emoji: "🏠", to: "/" },
  { label: "כאן מתחילים", emoji: "🚀", to: "/start", highlight: true },
  { label: "מרכז הניווט", emoji: "🗺️", to: "/map" },
  { label: "ציר ההתגלות", emoji: "🌅", to: "/timeline" },
  { label: "עץ ההתכנסויות", emoji: "🌳", to: "/numbers" },
  { label: "בית המדרש", emoji: "📚", to: "/beit-midrash" },
  { label: "פוסטים", emoji: "📖", to: "/post" },
  { label: "זרם המציאות", emoji: "🌊", to: "/archive?tab=reality" },
  { label: "מרכז השידורים", emoji: "📡", to: "/broadcasts" },
  { label: "גלריות", emoji: "🖼️", to: "/archive?tab=galleries" },
  { label: "דילוגי אותיות", emoji: "🔠", to: "/code" },
  { label: "פורום המחקר", emoji: "🌐", to: "/forum" },
  {
    label: "קהילה", emoji: "💬", to: "/community", children: [
      { label: "🌐 פורום המחקר", to: "/forum" },
      { label: "צ'אט", to: "/community/chat" },
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
  // ⛔ SEO_BRAND_HOMEPAGE_IDENTITY_ADDENDUM (Human Gate ZURIEL, 2026-09-07) — זהות-מותג מאושרת.
  // אל תשנה fullTitle/title/description כאן בלי Human Gate חדש. SOD1820 (לטיני) נשאר הזהות
  // הטכנית/הבין-לאומית בכל מקום אחר (SITE_NAME קבוע ב-seo.js, og:site_name, Organization.name,
  // WebSite.name, canonical domain) — לא נגעתי בהם. כאן רק כותרת/תיאור עבריים דף-הבית עצמם.
  "/":              { fullTitle: "כי לה' המלוכה — סוד 1820 · רמזי הגאולה בשפת המספרים", title: "כי לה' המלוכה — סוד 1820", description: "מחקר חי של מספרים, גימטריה, צפנים בתורה, קוד המציאות, מקורות ומסעות גילוי — מערכת SOD1820 מחברת בין מספרים, מילים, פסוקים, אנשים ואירועים." },
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
  "/broadcasts":    { title: "מרכז השידורים", description: "כל הפעילות החיה של SOD1820 במקום אחד — פורום, ערוצים, עדכוני האתר וחדשות הבנייה. כל זרם כטאב, מצביע לתמונה המלאה." },
  "/forum":         { title: "פורום המחקר", description: "פורום המחקר של SOD1820 — חידושי הגולשים, השערות, תצפיות ומקורות. שתפו חידוש והצטרפו למחקר הקהילתי." },
  "/members":       { title: "בני ההיכל", description: "אזור המנויים — שיעורים, קורסים, עץ מתקדם וצפנים בלעדיים.", noindex: true },
  "/about":         { title: "אודות", description: "אודות SOD1820 — גימטריה, צפנים בתורה ושפת המספרים." },
  "/contact":       { title: "צור קשר", description: "יצירת קשר עם SOD1820." },
  "/community/chat":       { title: "צ'אט הקהילה", description: "צ'אט הקהילה של SOD1820 — שיחה חיה בין חברי הקהילה." },
  "/community/calculator": { title: "מחשבון קהילתי", description: "מחשבון הגימטריה הקהילתי של SOD1820." },
  "/community/comments":   { title: "תגובות הקהילה", description: "כל התגובות האחרונות בקהילת SOD1820." },
  "/verified":      { title: "פוסטים מאומתים", description: "פוסטים מאומתים באתר SOD1820." },
  "/sulamot":       { title: "סולמות", description: "סולמות הגימטריה — מבט מדורג על המספרים." },
  "/theme-preview": { title: "תצוגת צבעים", description: "עמוד תצוגה זמני לבחירת פלטת הצבעים.", noindex: true },
  // ⛔ P0 SEO fail-safe (SITE_WIDE_OBSERVABILITY_SEO_REMEDIATION_V1, 2026-09-07): ROUTE_META
  // מוזרק ב-App.jsx לפי pathname בלבד (לא כולל query) — לכן ערך יחיד כאן ל-"/research" חוסם
  // stale-title/canonical carryover גם עבור כל ה-15 כלי ?tool=* (robots.txt+middleware כבר חוסמים
  // בוטים מ-/research; ה-noindex כאן רק מבהיר את הכוונה ועוצר את הזליגה ל-GA4 page_title/canonical).
  "/research":      { title: "סביבת המחקר · SOD1820", description: "מרכז המחקר האינטראקטיבי של SOD1820 — גימטריה, דילוגי אותיות, השוואת מילים, מחשבוני שיטות וכלי מחקר נוספים, כולם במקום אחד.", noindex: true },
  "/name":          { title: "מה השם שלך מסתיר? · SOD1820", description: "גלו את ערך הגימטריה של השם שלכם, הפסוק שבו הוא מופיע בתורה וכל מה שהמספר מגלה — מעבדת השם המלאה של SOD1820." },
  "/languages":     { title: "קשרי שפות", description: "קשרים בין שפות — תעתוק, תרגום, שורש ורעיון משותף בין מילים בעברית ובשפות אחרות, במחקר קהילתי מאומת." },
  "/profile":       { title: "האזור האישי שלי", description: "האזור האישי של SOD1820 — המחקר השמור שלך, הפעילות וההגדרות.", noindex: true },
  "/credits":       { title: "רכישת קרדיטים", description: "רכישת קרדיטים לשימוש בכלי SOD1820.", noindex: true },
  "/buy":           { title: "רכישת קרדיטים", description: "רכישת קרדיטים לשימוש בכלי SOD1820.", noindex: true },
  // /gallery = עדשה כפולה על אותו gallery_images שכבר מוצג ב-/archive?tab=galleries (ה-NAV הקנוני);
  // noindex כדי לא ליצור תוכן-כפול מול הכתובת הקנונית, לא כי הדף עצמו בעייתי.
  "/gallery":       { title: "גלריה", description: "כל התמונות והממצאים של SOD1820 בתצוגת גלריה.", noindex: true },
  // ⛔ נמצא ע"י scripts/check-observability-seo-gate.mjs (הבנוי בפאס הזה) — אליאסים-עבריים
  // ל-routes שכבר תוקנו למעלה, ודף /journey תוכני אמיתי (מסע-גילוי, track()-מלא) שהיה חסר לגמרי.
  // noindex: robots.txt כבר חוסם סריקת /journey לכל הבוטים (Disallow: /journey) — מסמנים במפורש
  // כדי שלא יהיה אות מעורב (כותרת/תיאור נראים כמו "לאינדוקס" בעוד ה-crawl עצמו חסום).
  "/journey":       { title: "מסע הגילוי", description: "מסע אישי בין מספרים ומילים — מהמושג הראשוני ועד ההתכנסות המפתיעה, כל צעד מקושר לעץ הידע.", noindex: true },
  "/מסע":           { title: "מסע הגילוי", description: "מסע אישי בין מספרים ומילים — מהמושג הראשוני ועד ההתכנסות המפתיעה, כל צעד מקושר לעץ הידע.", noindex: true },
  "/login":         { title: "התחברות", description: "התחברות לאזור האישי של SOD1820.", noindex: true },
  "/name-lab":      { title: "מעבדת השם המלאה · SOD1820", description: "חיפוש שם מלא — ערך הגימטריה, הפסוק בתורה וכל כלי המחקר, במקום אחד." },
  "/מעבדת-השם":     { title: "מעבדת השם המלאה · SOD1820", description: "חיפוש שם מלא — ערך הגימטריה, הפסוק בתורה וכל כלי המחקר, במקום אחד." },
  "/שם":            { title: "מה השם שלך מסתיר? · SOD1820", description: "גלו את ערך הגימטריה של השם שלכם, הפסוק שבו הוא מופיע בתורה וכל מה שהמספר מגלה — מעבדת השם המלאה של SOD1820." },
  "/קשרי-שפות":     { title: "קשרי שפות", description: "קשרים בין שפות — תעתוק, תרגום, שורש ורעיון משותף בין מילים בעברית ובשפות אחרות, במחקר קהילתי מאומת." },
  "/הצלבה":         { title: "הצלבת שיטות", description: "המסר המצטרף שמאחורי מספר — כל הביטויים המאומתים שנופלים על אותו ערך בכל שיטות הגימטריה." },
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
