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

export const LIGHT_ROUTES = [
  /^\/$/, /^\/home-new$/, /^\/בית-חדש$/,
  /^\/number(\/|$)/, /^\/name$/, /^\/שם$/,
  /^\/cross$/, /^\/topic(\/|$)/,
  /^\/post$/, /^\/community\/chat$/,
  /^\/verified$/, /^\/code$/, /^\/map$/, /^\/start$/,
  /^\/category(\/|$)/, /^\/tag(\/|$)/, /^\/journey$/, /^\/מסע$/,
  /^\/languages$/, /^\/קשרי-שפות$/,   // 🌍 קשרי-שפות — מרחב מחקר בהיר-נקי
  POST_SLUG_RE,   // 🔒 פוסטים (/:slug) — תומכים בבהיר מערכתית
];

// האם הראוט הנוכחי תומך במצב בהיר בכלל (אחרת התמה כפויה-כהה).
export const supportsLight = pathname => LIGHT_ROUTES.some(re => re.test(pathname));
