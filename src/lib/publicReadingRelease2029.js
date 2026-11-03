// ZURIEL 1.11.2026: explicit deployment-scoped public reading configuration.
// Existing availability owner, one projection shared by routes, metadata and XML.
// This profile never writes/rewrites shared site_flags or changes Legacy defaults.
export const PUBLIC_READING_PROFILE_ID = "public-reading-20261101";
export const PUBLIC_READING_RELEASE = typeof __SOD_2029_BUILD__ !== "undefined" && __SOD_2029_BUILD__
  && import.meta.env?.VITE_PUBLIC_READING_RELEASE === PUBLIC_READING_PROFILE_ID;
// Only the separate, dormant Production artifact preserves signed Legacy
// unsubscribe. Preview and Legacy cannot acquire this service exception.
export const PUBLIC_READING_PRODUCTION_ARTIFACT = PUBLIC_READING_RELEASE
  && typeof __SOD_PUBLIC_READING_PRODUCTION_ARTIFACT__ !== "undefined"
  && __SOD_PUBLIC_READING_PRODUCTION_ARTIFACT__ === true;

// The launch ceiling applies to the public, not to the server-verified admin.
// This projection never grants a server role or bypasses an operation's RLS.
export function publicReadingActionsLocked(isAdmin) {
  return PUBLIC_READING_RELEASE && isAdmin !== true;
}

// Books navigation now enters the admitted public source reader. Research and
// actions retain their separate identity/action gates; shared flags never change.
const openFlags = new Set(["lock_world", "lock_number", "lock_gematria", "lock_books"]);
export function publicReadingFeatureLock(flag) {
  return Object.freeze({ enabled: !openFlags.has(flag), mode: "all", message: openFlags.has(flag) ? "" : "האזור אינו פתוח בגרסת הקריאה הציבורית." });
}

// Continuations extend the existing release projection; they do not select a
// deployment, grant an operation, or replace the canonical content readers.
function addressPath(pathname) {
  if (typeof pathname !== "string" || !pathname.startsWith("/") || pathname.startsWith("//")) return null;
  try {
    const path = decodeURIComponent(pathname).replace(/\/+$/, "") || "/";
    return /[\\\u0000-\u001f\u007f?#]/.test(path) ? null : path;
  } catch { return null; }
}

export function publicReadingContinuation(pathname, search = "", hash = "") {
  const path = addressPath(pathname);
  if (!path) return null;
  const query = new URLSearchParams(search);
  let target = ({
    "/WORLD": "/world", "/home-classic": "/", "/home-new": "/", "/בית-חדש": "/",
    "/category/סוד-האותיות/גלריות-גימטריה": "/category/גלריות-גימטריה",
    "/2029/number": "/number",
    "/chat": "/community/chat", "/דף-צאט-ראשי": "/community/chat",
    "/posts": "/post", "/פוסטים-אחרונים": "/post", "/פוסטים-אחרונים-2": "/post",
    "/גימטריה": "/gematria", "/888": "/community/researcher/888",
    "/book": "/books", "/book.html": "/books",
    "/אור-הגאולה": "/or-geula", "/צור-קשר": "/contact", "/about": "/contact",
    "/profile": "/2029/me/profile", "/lab/els": "/code", "/tzofen.html": "/code",
    "/שם": "/name", "/מעבדת-השם": "/name-lab", "/פסוקים": "/verse-gematria",
    "/קשרי-שפות": "/languages", "/הצלבה": "/cross",
    "/gematria-3d": "/spatial-gematria", "/גימטריה-תלת-ממדית": "/spatial-gematria", "/גימטריה-מרחבית": "/spatial-gematria",
    "/gallery-updates": "/archive", "/מסע": "/journey", "/journey-beta": "/journey",
  })[path];
  if (/^\/me\/(?:public-page|page-editor|profile|messages|notifications|progress|research|notes)$/.test(path)) target = "/2029" + path;
  if (path === "/2029/me" || path === "/me" && !query.has("tab")) target = "/2029/me/research";
  if (path === "/me" && /^(?:public-page|page-editor|profile|messages|notifications|progress|research|notes)$/.test(query.get("tab") || "")) target = "/2029/me/" + query.get("tab");
  // Only the documented chat aliases, never a tag merely containing "chat".
  if (["/tag/chat", "/tag/צאט", "/tag/צ'אט", "/tag/צ׳אט", "/tag/צ-אט"].includes(path)) target = "/community/chat";
  if (["/", "/2029"].includes(path) && query.get("preview") === "community") target = "/community/chat";
  if (path === "/research" && query.get("tool") === "gematria") target = "/gematria";
  // Use the raw encoded segment: an encoded slash can belong to a label.
  const book = /^\/books\/([^/]+)\/?$/.exec(pathname);
  if (book) target = `/book/${book[1]}`;
  if (!target) return null;
  // Keep original query bytes, duplicates and anchors (OAuth/payment data is
  // never interpreted here). Router and HTTP redirects share this adapter.
  return target + (search.startsWith("?") ? search : search ? `?${search}` : "")
    + (hash.startsWith("#") ? hash : hash ? `#${hash}` : "");
}

export function publicReadingCapability(pathname) {
  const path = addressPath(pathname);
  if (path === '/2029/me' || path === '/community/researcher/me'
    || /^\/2029\/me\/(?:public-page|page-editor|profile|messages|notifications|progress)$/.test(path || '')) {
    return { title: 'האזור האישי', description: 'החשבון והמידע הקיימים נשמרים. הגישה המלאה באזור הזה עדיין בתהליך בדיקה; מידע אישי אינו מוצג בדף הציבורי.', links: [['/login', 'כניסה לחשבון']] };
  }
  const externalSources={"/464378687028017/videos/vb.464378687028017/727568620709021":"https://www.facebook.com/464378687028017/videos/727568620709021/","/sod1820/videos/vb.617996338259568/1042960175763180":"https://www.facebook.com/sod1820/videos/1042960175763180/",
    // Same saved XFBML block binds relative video/cite paths to the explicit
    // facebook.com author profile and immutable video ID. Never infer a host
    // from a title or apply this conversion to arbitrary relative links.
    "/86AND26/videos/vb.103870716369907/801439149946390":"https://www.facebook.com/86AND26/videos/801439149946390/",
    "/k1820/videos/839307259461807":"https://www.facebook.com/k1820/videos/839307259461807/",
    "/k1820/videos/vb.617996338259568/839307259461807":"https://www.facebook.com/k1820/videos/839307259461807/"};
  if(externalSources[path])return {title:"סרטון המקור בפייסבוק",description:"הקישור הזה נשמר מתוך פרסום ישן. הסרטון נמצא באתר המקור; זמינותו שם תלויה בפרסום ובהרשאות של פייסבוק.",links:[[externalSources[path],"לסרטון באתר המקור"]]};
  const historicalServices={"/צור-קשר/טופס-הזמנת-עלונים-ודיסקים/":"הזמנת עלונים ודיסקים","/צור-קשר/תרומות-donate":"תרומה לאתר"};
  const service=historicalServices[path]||historicalServices[path+"/"];
  if(service)return {title:service,description:"הפעולה ההיסטורית הזו עדיין אינה זמינה בגרסה החדשה. לא מופעלת הזמנה, תרומה או התחייבות כספית מתוך הדף הזה.",links:[["/contact","לפנייה לצוות"]]};
  const privateViews={"/research-viewer":"מציג המחקר הפרטי","/2029/control":"מרכז הבקרה","/editor":"עריכת פוסטים","/traffic":"תעבורת האתר","/numbers-report":"דוח המספרים","/stream":"שער הזרם הפרטי"};
  if(privateViews[path])return {title:privateViews[path],description:"זהו מסך פרטי. הגישה דורשת חשבון והרשאה מתאימים; מידע פרטי אינו מוצג כאן.",links:[["/login","כניסה לחשבון"]]};
  const experiments={"/cheder/400":"חדר 400","/ניסיון":"תצוגת החוויה","/experience":"תצוגת החוויה","/חישוב":"מחשבון ההתגלות","/reveal":"מחשבון ההתגלות","/meaning-lab":"מעבדת המשמעות","/מעבדת-משמעות":"מעבדת המשמעות","/galaxy":"תצוגת הגלקסיה","/lab":"מעבדת הניסויים","/enter":"שער הכניסה","/community-shadow-preview-2029":"תצוגת הקהילה הניסיונית","/entity-hub-preview":"תצוגת הישויות הניסיונית","/entity-hub-preview/number/1237":"תצוגת הישויות הניסיונית","/explorer-preview":"תצוגת החוקר הניסיונית","/theme-preview":"תצוגת העיצוב הניסיונית","/2029/home-preview":"תצוגת הבית הניסיונית","/2029/kingdom":"תצוגת הממלכה הניסיונית","/2029/preview":"תצוגת המערכות הניסיונית","/2029/preview/follow-center":"תצוגת המעקב הניסיונית","/dev/torah-occurrence-scene":"תצוגת המקור הניסיונית"};
  if(experiments[path]||/^\/sulamot(?:[2-9]|10|11)?$/.test(path||""))return {title:experiments[path]||"ניסוי הסולמות",description:"תצוגה ניסיונית שנשמרת להמשך ואינה פתוחה בגרסת האתר הזאת.",links:[["/map","למפת הזמינות"]]};
  const item = ({
    "/code": ["הצופן התנ״כי", "כלי המחקר החדש נמצא בבנייה. הצפנים שפורסמו נשארים זמינים בספרייה.", "/codes", "לספריית הצפנים"],
    "/els": ["הצופן התנ״כי", "כלי המחקר החדש נמצא בבנייה. הצפנים שפורסמו נשארים זמינים בספרייה.", "/codes", "לספריית הצפנים"],
    "/heichal": ["ההיכל", "ההיכל נמצא בבנייה. אפשר להמשיך לקריאת המקורות והפרסומים הזמינים.", "/books", "לספרים ולמקורות"],
    "/היכל": ["ההיכל", "ההיכל נמצא בבנייה. אפשר להמשיך לקריאת המקורות והפרסומים הזמינים.", "/books", "לספרים ולמקורות"],
    "/journey": ["מסע החיים", "מסע החיים אינו פתוח לציבור עדיין. המידע האישי הקיים נשמר.", "/login", "כניסה לחשבון"],
    "/2029/journey": ["מסע החיים", "מסע החיים אינו פתוח לציבור עדיין. המידע האישי הקיים נשמר.", "/login", "כניסה לחשבון"],
    "/raziel": ["רזיאל", "רזיאל נמצא בבנייה ואינו מופעל בכניסה לדף. אפשר להשתמש בחיפוש ובמחשבון הקיימים.", "/gematria", "למחשבון"],
    "/2029/raziel": ["רזיאל", "רזיאל נמצא בבנייה ואינו מופעל בכניסה לדף. אפשר להשתמש בחיפוש ובמחשבון הקיימים.", "/gematria", "למחשבון"],
    "/research": ["סביבת המחקר", "כלי המחקר מתאימים בהדרגה למערכת החדשה. המחשבון הציבורי זמין כעת.", "/gematria", "למחשבון"],
    "/beit-midrash": ["בית המדרש", "הקריאה והכלים של בית המדרש עדיין בתהליך התאמה. הספרים הציבוריים זמינים בנפרד.", "/books", "לספרים ולמקורות"],
    "/name": ["מחקר השם", "מסלול מחקר השם עדיין בתהליך התאמה. אפשר לחשב שם במחשבון הקהילה; זהו כלי נפרד ממחקר השם.", "/community/calculator", "למחשבון הקהילה"],
    "/name-lab": ["מעבדת השם", "מעבדת השם בתהליך התאמה. חישוב השם זמין במחשבון הקהילה, בלי הפעלת מחקר אישי.", "/community/calculator", "למחשבון הקהילה"],
    "/spatial-gematria": ["גימטריה מרחבית", "הכלי המרחבי עדיין בתהליך התאמה. המחשבון הרגיל נשאר זמין.", "/gematria", "למחשבון"],
    "/verse-gematria": ["חיפוש פסוקים", "כלי הפסוקים עדיין בתהליך התאמה למערכת החדשה. אפשר לעיין במקורות שבדף המספר.", "/number", "למספר או לביטוי"],
    "/languages": ["קשרי שפות", "כלי קשרי השפות עדיין בתהליך התאמה. לא הוחלף בחישוב רגיל.", "/gematria", "למחשבון הגימטריה"],
    "/cross": ["הצלבת שיטות", "כלי ההצלבה עדיין בתהליך התאמה. שיטות החישוב הקיימות זמינות במחשבון.", "/gematria", "למחשבון"],
    "/community/whatsapp": ["מקורות WhatsApp", "תיבת המקורות אינה פתוחה לציבור. מקורות שכבר פורסמו נגישים דרך התוכן שלהם באתר.", "/world", "לעולם"],
    "/credits": ["קרדיטים ותשלומים", "רכישה ובדיקת עסקאות אינן פעילות בגרסה זו. כתובת חזרה מתשלום אינה אישור שבוצע חיוב. פרטי החשבון הקיימים נשמרים.", "/contact", "יצירת קשר"],
    "/buy": ["קרדיטים ותשלומים", "רכישה ובדיקת עסקאות אינן פעילות בגרסה זו. כתובת חזרה מתשלום אינה אישור שבוצע חיוב. פרטי החשבון הקיימים נשמרים.", "/contact", "יצירת קשר"],
    "/join": ["הרשמה ועדכוני האתר", "הרשמה לעדכונים אינה פעילה בגרסה זו עדיין. כניסה לחשבון קיים זמינה בנפרד, ללא הרשמה אוטומטית לדיוור.", "/login", "כניסה לחשבון קיים"],
    "/welcome": ["ברוכים הבאים", "אפשר להתחיל לקרוא בבית, למצוא חומר בעולם או להיכנס לחשבון קיים. עמוד זה אינו מאשר הרשמה או תשלום.", "/", "לבית"],
    "/archive": ["זרם המציאות", "הזרם ההיסטורי בתהליך התאמה. הגלריות והתוכן שפורסם זמינים בנפרד; הם אינם מחליפים את סדר הזרם הישן.", "/gallery", "לגלריות"],
    "/reality": ["זרם המציאות", "תצוגת הזרם ההיסטורית בתהליך התאמה. תיעוד האירועים שפורסם נשמר בפוסטים ובגלריות.", "/post", "לתיעוד שפורסם"],
    "/timeline": ["ציר הזמן", "ציר הזמן נמצא בתוכנית ההמשך. פרסומים קיימים נשארים זמינים לפי תאריך.", "/post", "לפוסטים"],
    "/numbers": ["עץ המספרים", "עץ המספרים בתהליך התאמה. דף של מספר או ביטוי מסוים כבר זמין.", "/number", "למספר או לביטוי"],
    "/broadcasts": ["מרכז השידורים", "המרכז ההיסטורי בתהליך התאמה. העדכונים הזמינים ממשיכים להופיע ב״עכשיו״ ובמקורות שפורסמו.", "/or-geula", "לאור הגאולה"],
    "/whats-new": ["מה חדש באתר", "עדכוני האתר ותמונת הזמינות מופיעים בבית ובמפת האתר. ההרשמה במייל עדיין אינה פעילה בגרסה זו.", "/map", "למפת האתר"],
    "/start": ["מתחילים כאן", "הבית, העולם, הפוסטים, המספרים והגלריות פתוחים לקריאה. מפת האתר מציגה גם את החלקים שעדיין בבנייה.", "/map", "למפת האתר"],
  })[path];
  return item ? { title: item[0], description: item[1], links: [[item[2], item[3]]] } : null;
}

export function publicReadingPath(pathname, { isAdmin = false, search = "" } = {}) {
  let path;
  path = addressPath(pathname);
  if (!path || ["/*", "/$1", "/SLUG"].includes(path)) return "missing";
  if (publicReadingContinuation(pathname, search)) return "continuation";
  if (path === "/login" || path === "/auth/callback" || path === "/community/researcher/me") return "account";
  if (/^\/2029\/me\/(?:public-page|page-editor|profile|messages|notifications|progress|research|notes)$/.test(path)) return "account";
  // Only existing application surfaces; arbitrary /api or unknown paths do not
  // become public or executable merely because the viewer is an admin.
  if (isAdmin === true && /^\/(?:code|els|heichal|היכל|books?|beit-midrash|research|admin|journey|raziel|2029\/(?:me|journey|raziel|control)|community\/(?:chat|researcher\/me))(?:\/|$)/.test(path)) return "admin-view";
  if (publicReadingCapability(path)) return "closed";
  if (/^\/(?:api|admin|auth|2029\/me|community\/researcher\/me)(?:\/|$)/.test(path)) return "closed";
  if (path === "/unsubscribe" && PUBLIC_READING_PRODUCTION_ARTIFACT) return "public";
  if (["/updates", "/unsubscribe"].includes(path)) return "service-closed";
  if (["/", "/world", "/verified", "/post", "/posts", "/number", "/gematria", "/gallery", "/map", "/privacy", "/2029", "/2029/posts", "/2029/gematria", "/2029/gematria/viral", "/2029/calculator", "/community", "/community/chat", "/community/calculator", "/community/comments", "/community/researchers", "/members", "/forum", "/or-geula", "/books", "/codes", "/codes/מחקר", "/contact", "/early-access", "/melech-hamisparim/718"].includes(path)) return "public";
  if (/^\/(?:post|number|topic|researcher|video|tag|category|book|codes|forum)\/[^/]+\/?$/.test(pathname) || /^\/or-geula\/video\/[^/]+$/.test(path) || /^\/2029\/number\/[^/]+$/.test(path) || /^\/community\/researcher\/[^/]+$/.test(path)) return "public";
  // A historical single-segment Post remains subject to the canonical public
  // Post lookup/boundary. This does not declare an unknown/draft slug published.
  return /^\/[^/]+$/.test(path) ? "post-lookup" : "missing";
}

export const PUBLIC_READING_OPEN_ROUTES = Object.freeze(["/", "/world", "/post", "/number", "/gematria", "/gallery", "/map", "/privacy"]);
