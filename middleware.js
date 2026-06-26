import { next } from '@vercel/edge';

// ── שומר-סף לפי התנהגות + לוג צד-שרת (Vercel Edge) ────────────────────────────
// רץ על כל ניווט-דף (כולל index.html הסטטי, שפונקציית API לא רואה).
// עיקרון: חוסמים לפי *חתימת בוט ב-User-Agent*, לא לפי מדינה — כך בן אדם אמיתי
// מכל מדינה (כולל CN/SG) עובר, ובוטים נחסמים בכל מקום (כולל US).
// בוטים "טובים" (מנועי חיפוש + תצוגות שיתוף) ברשימה לבנה → עוברים חופשי (SEO/OG).
// מתעדים כל בקשה ל-public.edge_geo_log עם country + kind (goodbot/bot/browser),
// fire-and-forget (waitUntil) — בלי השהיה. כך נראה בנתונים מי באמת בוט בכל מדינה.

export const config = {
  // רק ניווטי-דף: לא api/, לא assets/, ולא נתיב עם סיומת קובץ. שומר נפח+עלות נמוכים
  // ולא מתערב ב-rewrites של vercel.json.
  matcher: ['/((?!api/|assets/|.*\\.).*)'],
};

const SUPABASE_URL = 'https://linswmnnkjxvweumprav.supabase.co';
// מפתח anon ציבורי (זהה לזה שב-api/ga-insights.js · api/ga-sync.js) — בטוח להטמעה.
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM';

// בוטים מותרים — מנועי חיפוש (SEO) ובוטי תצוגת-שיתוף (OG). חייבים לעבור חופשי.
const GOOD_BOT = /(googlebot|google-inspectiontool|bingbot|duckduckbot|yandex|baidu|applebot|facebookexternalhit|facebot|twitterbot|whatsapp|telegrambot|linkedinbot|slackbot|discordbot|pinterest|redditbot|skypeuripreview|embedly|iframely|w3c_validator|vkshare|petalbot|ahrefsbot|semrushbot)/;

// חתימות בוט לחסימה — ספריות/כלים אוטומטיים שמזדהים בעצמם, או UA גנרי/ריק.
const BAD_BOT = /(python-requests|python-urllib|aiohttp|httpx|scrapy|curl\/|wget\/|libwww|go-http-client|okhttp|node-fetch|axios\/|java\/|apache-httpclient|headless|phantomjs|puppeteer|playwright|selenium|http_request|guzzle|winhttp|zgrab|masscan)/;
const GENERIC_BOT = /(bot|crawler|crawl|spider|scraper)/; // אחרי שניכינו את הטובים

function classify(ua) {
  if (!ua) return 'bot';            // UA ריק = כמעט תמיד אוטומציה
  if (GOOD_BOT.test(ua)) return 'goodbot';
  if (BAD_BOT.test(ua)) return 'bot';
  if (GENERIC_BOT.test(ua)) return 'bot';
  return 'browser';
}

export default function middleware(request, context) {
  const country = request.headers.get('x-vercel-ip-country') || 'XX';
  const ua = (request.headers.get('user-agent') || '').toLowerCase();
  const kind = classify(ua);

  // מתעדים תמיד (כולל נחסמים) — כדי לראות לאורך זמן מי בוט בכל מדינה והאם דועך.
  context.waitUntil(
    fetch(`${SUPABASE_URL}/rest/v1/rpc/log_edge_geo`, {
      method: 'POST',
      headers: { apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_country: country, p_kind: kind }),
    }).catch(() => {}),
  );

  // חסימה לפי התנהגות בלבד — לא לפי מדינה. בוטים טובים ובני-אדם עוברים.
  if (kind === 'bot') {
    return new Response('Access denied', { status: 403, headers: { 'cache-control': 'no-store' } });
  }
  return next();
}
