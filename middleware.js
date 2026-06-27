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
const BAD_BOT = /(python-requests|python-urllib|aiohttp|httpx|scrapy|curl\/|wget\/|libwww|go-http-client|okhttp|node-fetch|axios\/|java\/|apache-httpclient|headless|phantomjs|puppeteer|playwright|selenium|guzzle|winhttp|zgrab|masscan|ahrefsbot|semrushbot|mj12bot|dotbot|petalbot)/;
const GENERIC_BOT = /(bot|crawler|crawl|spider|scraper)/; // אחרי שניכינו את הטובים

function classify(ua) {
  if (!ua) return 'bot';                 // UA ריק = כמעט תמיד אוטומציה
  if (GOOD_BOT.test(ua)) return 'goodbot';
  if (BAD_BOT.test(ua)) return 'bot';
  if (GENERIC_BOT.test(ua)) return 'bot';
  return 'browser';
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

  // goodbot עובר תמיד (SEO/OG). אחרת: חוסמים אם בוט-UA או מדינה-בניסוי.
  if (kind !== 'goodbot' && (kind === 'bot' || BLOCKED_COUNTRIES.has(country))) {
    return new Response('Access denied', { status: 403, headers: { 'cache-control': 'no-store' } });
  }
  return next();
}
