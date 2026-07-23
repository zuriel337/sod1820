// 🌗 מקור-אמת יחיד לראוטים שתומכים במצב בהיר (יום/לילה).
// הוצא מ-Layout.jsx כדי שגם ה-Navbar (מתג התמה) יוכל לדעת אם הדף הנוכחי תומך בבהיר —
// בלי לייבא את Layout (שהיה יוצר תלות-מעגלית: Layout ← Navbar ← Layout).
// דפים שכבר הוסבו לפלטה (תומכים במצב בהיר). שאר הדפים נשארים כהים *בכוח*.

// 🔒 חקוק: נתיבי-מערכת בעלי-מקטע-אחד שנשארים כהים (לא מוגרו). כל השאר (/:slug) = פוסט → תומך בבהיר.
const RESERVED_ROUTES = [
  "about", "admin", "archive", "beit-midrash", "broadcasts", "chat", "code", "community", "contact",
  "cross", "enter", "experience", "galaxy", "gallery", "gallery-updates", "gematria", "heichal",
  "home-classic", "home-new", "journey", "lab", "languages", "login", "map", "members", "name", "number", "numbers",
  "numbers-report", "post", "profile", "reality", "research", "reveal", "start", "stream", "sulamot",
  "theme-preview", "timeline", "traffic", "verified",
  "בית-חדש", "גימטריה", "דף-צאט-ראשי", "היכל", "הצלבה", "חישוב", "מסע", "ניסיון", "פוסטים-אחרונים", "פוסטים-אחרונים-2", "קשרי-שפות",
].join("|");
// פוסט = מקטע-אחד שאינו נתיב-מערכת שמור. (sulamot\d* מכסה sulamot2..11)
export const POST_SLUG_RE = new RegExp(`^\\/(?!(?:${RESERVED_ROUTES}|sulamot\\d+)(?:\\/|$))[^\\/]+$`);

// כלל-אצבע: כל דף שבנוי תמה-מודע (משתמש ב-usePalette) שייך לכאן — כך שרקע-ה-Layout
// עוקב אחרי צבעי-התוכן, ואין «חצי בהיר חצי כהה». הוספת דף תמה-מודע חדש = שורה כאן.
export const LIGHT_ROUTES = [
  /^\/$/, /^\/home-new$/, /^\/בית-חדש$/,
  /^\/number(\/|$)/, /^\/name$/, /^\/שם$/,
  /^\/cross$/, /^\/topic(\/|$)/,
  /^\/post$/, /^\/community\/chat$/,
  /^\/verified$/, /^\/code(\/|$)/, /^\/code-archive$/, /^\/map$/, /^\/start$/,
  /^\/community$/,   // 🫂 עמוד הקהילה
  /^\/codes(\/|$)/,   // 🔠 ספריית הצפנים + דף-צופן (/codes/:slug) + מחקר — «צופן»
  /^\/forum(\/|$)/,   // 🌐 פורום המחקר + שרשור
  /^\/community\/calculator$/, /^\/community\/researchers$/, /^\/community\/whatsapp$/,
  /^\/broadcasts$/, /^\/login$/, /^\/profile$/, /^\/join$/, /^\/welcome$/,
  /^\/privacy$/, /^\/unsubscribe$/, /^\/verse-gematria$/, /^\/whats-new$/, /^\/editor(\/|$)/,
  /^\/category(\/|$)/, /^\/tag(\/|$)/, /^\/journey$/, /^\/מסע$/,
  /^\/languages$/, /^\/קשרי-שפות$/,   // 🌍 קשרי-שפות — מרחב מחקר בהיר-נקי
  POST_SLUG_RE,   // 🔒 פוסטים (/:slug) — תומכים בבהיר מערכתית
];

// 🔒 דפים שהם *תמיד בהירים* (לא תלויי-מתג) — עיצוב «מעבדה» בהיר קבוע (research_workspace_law).
// דף-החוקר («תיקייה») כופה PALETTES.lab בקוד → ה-Layout חייב להיות בהיר שם בשני מצבי-המתג,
// אחרת חצי-בהיר-חצי-כהה. כאן ה-Layout מוקרן בהיר תמיד, כך שהתוכן והרקע תמיד תואמים.
export const ALWAYS_LIGHT = [
  /^\/community\/researcher\//,   // 📁 דף-החוקר (ContributorPage) — לוח-מעבדה בהיר
];

// האם הראוט הנוכחי תומך במצב בהיר בכלל (אחרת התמה כפויה-כהה).
export const supportsLight = pathname => LIGHT_ROUTES.some(re => re.test(pathname));
export const alwaysLight = pathname => ALWAYS_LIGHT.some(re => re.test(pathname));

// 🌗 המצב האפקטיבי היחיד — מקור-אמת אחד גם ל-Layout וגם ל-usePalette, כך שרקע וקדמה
// תמיד באותו מצב (הסוף ל«חצי בהיר חצי כהה»). always-light גובר; אחרת עוקב אחרי המתג
// רק בדפים תמה-מודעים; דף לא-מוגר נשאר כהה תמיד.
export function effectiveMode(pathname, globalMode) {
  if (alwaysLight(pathname)) return "light";
  return supportsLight(pathname) && globalMode === "light" ? "light" : "dark";
}
