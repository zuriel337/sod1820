import { next } from '@vercel/edge';

// ── לוג גיאוגרפי צד-שרת (אבחון זמני) ──────────────────────────────────────────
// רץ ב-Vercel Edge על כל ניווט-דף (כולל index.html הסטטי, שפונקציית API לא רואה).
// סופר בקשות לפי מדינה לטבלת public.edge_geo_log דרך RPC log_edge_geo.
// observe-only: לעולם לא חוסם/משכתב — תמיד next(). הכתיבה fire-and-forget
// (waitUntil) כך שלא מוסיף השהיה למשתמש. מטרה: למדוד תנועה שבאמת נוגעת בשרת,
// בלתי-תלוי ב-Google Analytics (תופס גם בוטים ש-GA מסנן; ghost-spam לא יופיע כאן
// כי הוא לא נוגע בשרת). אבחון — להסיר אחרי שנסיק.

export const config = {
  // רק ניווטי-דף: לא api/, לא assets/, ולא שום נתיב עם סיומת קובץ (.js/.css/.ico
  // /.png/.txt/.xml...). שומר על נפח+עלות נמוכים ולא מתערב ב-rewrites של vercel.json.
  matcher: ['/((?!api/|assets/|.*\\.).*)'],
};

const SUPABASE_URL = 'https://linswmnnkjxvweumprav.supabase.co';
// מפתח anon ציבורי (זהה לזה שב-api/ga-insights.js · api/ga-sync.js) — בטוח להטמעה.
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM';

export default function middleware(request, context) {
  const country = request.headers.get('x-vercel-ip-country') || 'XX';
  context.waitUntil(
    fetch(`${SUPABASE_URL}/rest/v1/rpc/log_edge_geo`, {
      method: 'POST',
      headers: { apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_country: country }),
    }).catch(() => {}),
  );
  return next();
}
