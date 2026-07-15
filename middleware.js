import { next } from '@vercel/edge';

// ── שומר-סף + לוג צד-שרת (Vercel Edge) ────────────────────────────────────────
// רץ על כל ניווט-דף (כולל index.html הסטטי, שפונקציית API לא רואה).
// שתי שכבות חסימה + מדידה מלאה:
//   1) חסימה לפי התנהגות (User-Agent של בוט) — עוקבת אחרי הבוט לכל מדינה (גם US).
//   2) חסימת מדינה זמנית (CN/SG) — ניסוי: לראות אם הבוטים עוצרים, מגבירים, או
//      "עוברים מדינה". מוסר בעוד כמה ימים לפי הנתונים.
// בוטים "טובים" (חיפוש + תצוגות שיתוף) ברשימה לבנה → עוברים חופשי (SEO/OG).
// מתעדים כל בקשה (כולל נחסמים) ל-edge_geo_log (country+kind) ול-edge_ua_seen (UA
// אמיתי) דרך RPC log_edge, fire-and-forget (waitUntil) — בלי השהיה. כך נראה אם
// בוטים מסתובבים בין מדינות, והאם נפח הדפיקות מ-CN/SG עולה או יורד עם הזמן.

export const config = {
  // רק ניווטי-דף: לא api/, לא assets/, ולא נתיב עם סיומת קובץ.
  matcher: ['/((?!api/|assets/|.*\\.).*)'],
};

const SUPABASE_URL = 'https://linswmnnkjxvweumprav.supabase.co';
// מפתח anon ציבורי (זהה לזה שב-api/ga-insights.js · api/ga-sync.js) — בטוח להטמעה.
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM';

// שכבה זמנית — ניסוי חסימת מדינה. להסרה: הפוך ל-new Set(). (CN=סין, SG=סינגפור)
const BLOCKED_COUNTRIES = new Set(['CN', 'SG']);

// בוטים מותרים — מנועי חיפוש (SEO), בוטי תצוגת-שיתוף (OG), וכל הסורקים של מטא
// (facebookexternalhit/facebot=תצוגות · meta-externalagent/facebookbot=סורק התוכן/AI).
// לבקשת צוריאל: לא חוסמים שום דבר של מטא. חייבים לעבור חופשי.
const GOOD_BOT = /(googlebot|google-inspectiontool|bingbot|duckduckbot|yandex|baidu|applebot|facebookexternalhit|facebot|meta-externalagent|facebookbot|meta-externalfetcher|twitterbot|whatsapp|telegrambot|linkedinbot|slackbot|discordbot|pinterest|redditbot|skypeuripreview|embedly|iframely|w3c_validator|vkshare)/;
// חתימות בוט לחסימה — ספריות/כלים אוטומטיים שמזדהים בעצמם.
const BAD_BOT = /(python-requests|python-urllib|aiohttp|httpx|scrapy|curl\/|wget\/|libwww|go-http-client|okhttp|node-fetch|axios\/|java\/|apache-httpclient|headless|phantomjs|puppeteer|playwright|selenium|guzzle|winhttp|zgrab|masscan|ahrefsbot|semrushbot|mj12bot|dotbot|petalbot|um-ic|ubermetrics|dataforseo|blexbot|barkrowler|mauibot|serpstatbot|zoominfobot)/;
// 🤖 בוטי-AI — מותרים לתוכן ציבורי בלבד (חשיפה במנועי-תשובות), חסומים ממסלולים יקרים.
//    (בקשת צוריאל: מדיניות לפי סוג-תוכן, לא לפי בוט.)
const AI_BOT = /(gptbot|oai-searchbot|chatgpt-user|claudebot|anthropic-ai|claude-web|perplexitybot|perplexity-user|amazonbot|ccbot|cohere-ai|google-extended|applebot-extended|bytespider|youbot|ai2bot|omgili|diffbot|timpibot|imagesiftbot|webzio|meta-externalagent)/;
const GENERIC_BOT = /(bot|crawler|crawl|spider|scraper)/; // אחרי שניכינו את הטובים
// 🔒 מסלולים יקרים/פרטיים — חסומים לכל בוט (רק דפדפן-אדם עובר). מגן על טוקנים/AI.
const EXPENSIVE_PATH = /^\/(journey|journey-beta|research|reveal|experience|auth|profile|login|admin|traffic|numbers-report|theme-preview)(\/|$)/;

function classify(ua) {
  if (!ua) return 'bot';                 // UA ריק = כמעט תמיד אוטומציה
  if (GOOD_BOT.test(ua)) return 'goodbot';
  if (AI_BOT.test(ua)) return 'ai';      // בוט-AI — ציבורי בלבד
  if (BAD_BOT.test(ua)) return 'bot';
  if (GENERIC_BOT.test(ua)) return 'bot';
  return 'browser';
}

// 📊 Crawl Intelligence — שם-בוט ספציפי + דלי-תוכן (לתיעוד מגמות ב-crawl_daily).
function botName(ua) {
  if (/googlebot|google-inspection/.test(ua)) return 'Googlebot';
  if (/bingbot|bingpreview|adidxbot/.test(ua)) return 'Bingbot';
  if (/gptbot|oai-search|chatgpt-user/.test(ua)) return 'GPTBot';
  if (/claudebot|anthropic/.test(ua)) return 'ClaudeBot';
  if (/perplexit/.test(ua)) return 'PerplexityBot';
  if (/meta-external|facebookexternal|facebot|facebookbot/.test(ua)) return 'Meta';
  if (/amazonbot/.test(ua)) return 'Amazonbot';
  if (/applebot/.test(ua)) return 'Applebot';
  if (/yandex/.test(ua)) return 'Yandex';
  if (/baidu/.test(ua)) return 'Baidu';
  if (/duckduck/.test(ua)) return 'DuckDuckBot';
  if (/ccbot/.test(ua)) return 'CCBot';
  if (/ahrefs/.test(ua)) return 'AhrefsBot';
  if (/semrush/.test(ua)) return 'SemrushBot';
  if (/mj12/.test(ua)) return 'MJ12bot';
  if (/um-ic|ubermetrics/.test(ua)) return 'ubermetrics';
  return 'other';
}
function bucketOf(p) {
  if (p === '/') return 'home';
  if (p.startsWith('/number')) return '/number';
  if (p.startsWith('/topic')) return '/topic';
  if (p.startsWith('/cross')) return '/cross';
  if (p.startsWith('/gallery') || p.startsWith('/archive')) return 'gallery';
  if (p.startsWith('/languages') || p.startsWith('/name-lab') || p.startsWith('/%D7%A7%D7%A9%D7%A8%D7%99')) return 'languages';
  if (p.startsWith('/journey')) return 'journey';
  if (p.startsWith('/research') || p.startsWith('/beit-midrash')) return 'research';
  if (p.startsWith('/community')) return 'community';
  if (p.startsWith('/post') || p.startsWith('/category') || p.startsWith('/verified')) return 'posts';
  if (p.startsWith('/timeline') || p.startsWith('/numbers') || p.startsWith('/map') || p.startsWith('/broadcasts')) return 'index';
  if (/^\/[^/]+$/.test(p)) return 'post/slug';   // מקטע-יחיד = כנראה סלאג-פוסט
  return 'other';
}

export default function middleware(request, context) {
  const country = request.headers.get('x-vercel-ip-country') || 'XX';
  const uaRaw = request.headers.get('user-agent') || '';
  const kind = classify(uaRaw.toLowerCase());

  // מתעדים תמיד (כולל נחסמים) — country+kind+UA אמיתי. כך מזהים רוטציה ומגמה.
  context.waitUntil(
    fetch(`${SUPABASE_URL}/rest/v1/rpc/log_edge`, {
      method: 'POST',
      headers: { apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_country: country, p_kind: kind, p_ua: uaRaw }),
    }).catch(() => {}),
  );

  let path = '/'; try { path = new URL(request.url).pathname; } catch { /* ignore */ }
  const isBot = kind !== 'browser';       // goodbot | ai | bot
  const uaL = uaRaw.toLowerCase();

  // ── מדיניות לפי סוג-תוכן (לא רק לפי בוט) ──
  // 1) כל בוט חסום ממסלולים יקרים/פרטיים (מסע/מחקר/AI/ניהול) — רק דפדפן-אדם עובר.
  // 2) בוט-רע (BAD/GENERIC) → 403 מלא.  3) חסימת-מדינה (ניסוי) — לא חלה על goodbot/ai.
  // goodbot (חיפוש/שיתוף) + ai (מנועי-תשובות) → מותרים בתוכן ציבורי.
  let blocked = false;
  if (isBot && EXPENSIVE_PATH.test(path)) blocked = true;
  else if (kind === 'bot') blocked = true;
  if (kind !== 'goodbot' && kind !== 'ai' && BLOCKED_COUNTRIES.has(country)) blocked = true;
  // 🤖 דף-מספר טהור מעל 4 ספרות (/number/<5+ ספרות>) = סריקת-זבל של בוט (/number/<אקראי>).
  //    חוסמים כל בוט (כולל goodbot/ai) בקצה: הכלל הקליינטי (noindex ב-EntityPage) לא מגיע
  //    לבוטים חסרי-JS, לכן האכיפה חייבת לקרות כאן. דפי-ביטוי (עברית) ומספרים ≤4 ספרות לא מושפעים.
  if (isBot && /^\/number\/\d{5,}$/.test(path)) blocked = true;

  // 📊 Crawl Intelligence — לבוטים בלבד: שם-בוט + דלי-תוכן + נחסם (crawl_daily, UPSERT מצטבר)
  if (isBot) {
    context.waitUntil(
      fetch(`${SUPABASE_URL}/rest/v1/rpc/log_crawl`, {
        method: 'POST',
        headers: { apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_bot: botName(uaL), p_bucket: bucketOf(path), p_blocked: blocked }),
      }).catch(() => {}),
    );
  }

  if (blocked) return new Response('Access denied', { status: 403, headers: { 'cache-control': 'no-store' } });
  // 🇮🇱 חושפים את מדינת-המבקר ללקוח (cookie vc) — לגידור מודעות ל-IL בלבד (בקשת צוריאל:
  //    פרסומות לא-צנועות הגיעו מתעבורה זרה). המודעות ממילא רק בפוסטים הישנים.
  return next({ headers: { 'set-cookie': `vc=${country}; Path=/; Max-Age=86400; SameSite=Lax` } });
}
