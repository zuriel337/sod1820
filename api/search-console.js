// Vercel Serverless Function — נתוני Google Search Console כ-JSON (לדאשבורד הניהול).
// מושך מ-GSC את מילות החיפוש, הקליקים, ההופעות והמיקום הממוצע — חי, ומחזיר JSON
// שאפשר לחבר לישויות בגרף ("עץ אחד": חיפוש → /number/:n או מחשבון בית-המדרש).
//
// אבטחה: מוגן ל-role=admin בלבד (מאמת את ה-session token של Supabase מול טבלת users).
// אימות מול גוגל: service account — ה-JSON המלא נשמר ב-env GSC_SERVICE_ACCOUNT,
// והנכס ב-env GSC_SITE_URL (ברירת מחדל: נכס הדומיין sc-domain:sod1820.co.il).

import crypto from 'crypto';

const SUPABASE_URL = 'https://linswmnnkjxvweumprav.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM';

// ── מאמת שהקורא הוא אדמין מחובר (לפי ה-session token שלו) ──
async function verifyAdmin(req) {
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return false;
    const uRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON, Authorization: 'Bearer ' + token } });
    if (!uRes.ok) return false;
    const u = await uRes.json();
    if (!u?.id) return false;
    const pRes = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${u.id}&select=role`, { headers: { apikey: ANON, Authorization: 'Bearer ' + token } });
    if (!pRes.ok) return false;
    const rows = await pRes.json();
    return rows?.[0]?.role === 'admin';
  } catch { return false; }
}

const b64url = buf => Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

// ── מנפיק access token מול גוגל בעזרת ה-service account (JWT חתום RS256) ──
async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
  }));
  const signingInput = `${header}.${claim}`;
  const signature = crypto.createSign('RSA-SHA256').update(signingInput).end()
    .sign(sa.private_key).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const jwt = `${signingInput}.${signature}`;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  if (!r.ok) throw new Error('token ' + r.status + ': ' + (await r.text()).slice(0, 200));
  return (await r.json()).access_token;
}

async function gscQuery(token, siteUrl, body) {
  const r = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error('gsc ' + r.status + ': ' + (await r.text()).slice(0, 200));
  return (await r.json()).rows || [];
}

export default async function handler(req, res) {
  if (!(await verifyAdmin(req))) { res.status(401).json({ error: 'unauthorized' }); return; }

  const raw = process.env.GSC_SERVICE_ACCOUNT;
  if (!raw) { res.status(200).json({ configured: false }); return; }

  try {
    const sa = JSON.parse(raw);
    const siteUrl = process.env.GSC_SITE_URL || 'sc-domain:sod1820.co.il';
    const days = Math.min(parseInt(req.query.days, 10) || 90, 480);
    const fmt = d => d.toISOString().slice(0, 10);
    const base = { startDate: fmt(new Date(Date.now() - days * 864e5)), endDate: fmt(new Date()), rowLimit: 25 };

    const token = await getAccessToken(sa);
    const [queries, pages, timeline] = await Promise.all([
      gscQuery(token, siteUrl, { ...base, dimensions: ['query'] }),
      gscQuery(token, siteUrl, { ...base, dimensions: ['page'] }),
      gscQuery(token, siteUrl, { ...base, dimensions: ['date'], rowLimit: 500 }),
    ]);
    const map = r => ({ key: r.keys[0], clicks: r.clicks || 0, impressions: r.impressions || 0, ctr: r.ctr || 0, position: r.position || 0 });

    res.setHeader('Cache-Control', 'private, max-age=600');
    res.status(200).json({
      configured: true, days,
      queries: queries.map(map),
      pages: pages.map(map),
      timeline: timeline.map(r => ({ date: r.keys[0], clicks: r.clicks || 0, impressions: r.impressions || 0 })),
    });
  } catch (e) {
    res.status(200).json({ configured: true, error: String(e.message || e) });
  }
}
