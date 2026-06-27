// Vercel Serverless — מלכודת לניסיונות פריצה (wp-admin, xmlrpc, .env, .git ...).
// מחזיר 403 ורושם את הניסיון ל-public.security_log עם מדינה+נתיב+UA+IP, כדי שנדע
// מאיפה התקיפות מגיעות (למשל לאמת אם זה מסין). נתיבי המלכודת מוגדרים ב-vercel.json.

const SUPABASE_URL = 'https://linswmnnkjxvweumprav.supabase.co';
// מפתח anon ציבורי (זהה לזה שב-api/ga-insights.js · api/ga-sync.js) — בטוח להטמעה.
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM';

export default async function handler(req, res) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '';
  const country = req.headers['x-vercel-ip-country'] || '';
  const ua = req.headers['user-agent'] || '';
  const path = req.url || '';

  console.warn(`[honeypot] blocked probe: country=${country} ip=${ip} path=${path} ua=${ua}`);

  // רישום ל-DB (best-effort — לא מפיל את התשובה אם נכשל)
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/log_security`, {
      method: 'POST',
      headers: { apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_country: country, p_path: path, p_ua: ua, p_ip: ip }),
    });
  } catch { /* ignore */ }

  res.status(403).end();
}
