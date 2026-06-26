import { next } from '@vercel/edge';

// ── שומר-סף גיאוגרפי + לוג צד-שרת (Vercel Edge) ───────────────────────────────
// רץ על כל ניווט-דף (כולל index.html הסטטי, שפונקציית API לא רואה).
// 1) מתעד כל "דפיקה" לפי מדינה ל-public.edge_geo_log (RPC log_edge_geo) — גם
//    כשחוסמים, כדי שנראה לאורך זמן אם נפח הבוטים דועך.
// 2) חוסם (403) מדינות שהן כמעט-100% בוטים לאתר עברי (אבחון GA4: 0 שניות שהייה,
//    ~99% עזיבה מ-CN/SG). חסימה על ה-HTML → הבוט לא מריץ JS → נופל גם מ-GA.
// הכתיבה fire-and-forget (waitUntil) — לא מוסיפה השהיה. observe לשאר העולם: next().

export const config = {
  // רק ניווטי-דף: לא api/, לא assets/, ולא נתיב עם סיומת קובץ. שומר נפח+עלות נמוכים
  // ולא מתערב ב-rewrites של vercel.json.
  matcher: ['/((?!api/|assets/|.*\\.).*)'],
};

const SUPABASE_URL = 'https://linswmnnkjxvweumprav.supabase.co';
// מפתח anon ציבורי (זהה לזה שב-api/ga-insights.js · api/ga-sync.js) — בטוח להטמעה.
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM';

// מדינות חסומות — לשינוי: ערוך את הסט והעלה מחדש. (CN=סין, SG=סינגפור)
// להסרת החסימה בעתיד: הפוך לסט ריק `new Set()` — הלוג ימשיך לעבוד.
const BLOCKED = new Set(['CN', 'SG']);

export default function middleware(request, context) {
  const country = request.headers.get('x-vercel-ip-country') || 'XX';

  // מתעדים את הדפיקה תמיד (גם אם נחסום) — כך הגרף מראה אם הבוטים דועכים עם הזמן.
  context.waitUntil(
    fetch(`${SUPABASE_URL}/rest/v1/rpc/log_edge_geo`, {
      method: 'POST',
      headers: { apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_country: country }),
    }).catch(() => {}),
  );

  if (BLOCKED.has(country)) {
    return new Response('Access denied', { status: 403, headers: { 'cache-control': 'no-store' } });
  }
  return next();
}
