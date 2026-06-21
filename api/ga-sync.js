// Vercel Serverless Function — סנכרון Google Analytics (GA4) אל traffic_history.
// מושך צפיות יומיות (screenPageViews) דרך אותו service account (GSC_SERVICE_ACCOUNT),
// וכותב ל-DB (source='ga') דרך RPC מאובטח — כך שהכל נכנס לאותו גרף צמיחה אחד.
// env: GA_PROPERTY_ID (מזהה נכס GA4, מספר) · GSC_SERVICE_ACCOUNT (ה-JSON, משותף עם Search Console).

import crypto from 'crypto';

const SUPABASE_URL = 'https://linswmnnkjxvweumprav.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM';

async function getUserToken(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const uRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON, Authorization: 'Bearer ' + token } });
  if (!uRes.ok) return null;
  const u = await uRes.json();
  if (!u?.id) return null;
  const pRes = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${u.id}&select=role`, { headers: { apikey: ANON, Authorization: 'Bearer ' + token } });
  if (!pRes.ok) return null;
  const rows = await pRes.json();
  return rows?.[0]?.role === 'admin' ? token : null;
}

const b64url = buf => Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

async function getAccessToken(sa, scope) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({ iss: sa.client_email, scope, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const input = `${header}.${claim}`;
  const sig = crypto.createSign('RSA-SHA256').update(input).end().sign(sa.private_key).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${input}.${sig}` }),
  });
  if (!r.ok) throw new Error('token ' + r.status + ': ' + (await r.text()).slice(0, 200));
  return (await r.json()).access_token;
}

export default async function handler(req, res) {
  const adminToken = await getUserToken(req);
  if (!adminToken) { res.status(401).json({ error: 'unauthorized' }); return; }

  const raw = process.env.GSC_SERVICE_ACCOUNT;
  const propertyId = process.env.GA_PROPERTY_ID;
  if (!raw || !propertyId) { res.status(200).json({ configured: false }); return; }

  try {
    const sa = JSON.parse(raw);
    const days = Math.min(parseInt(req.query.days, 10) || 540, 1200);
    const fmt = d => d.toISOString().slice(0, 10);
    const startDate = fmt(new Date(Date.now() - days * 864e5));

    const token = await getAccessToken(sa, 'https://www.googleapis.com/auth/analytics.readonly');
    const gaRes = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'screenPageViews' }],
        limit: 100000,
      }),
    });
    if (!gaRes.ok) throw new Error('ga ' + gaRes.status + ': ' + (await gaRes.text()).slice(0, 200));
    const data = await gaRes.json();

    // GA מחזיר תאריך כ-YYYYMMDD → ממירים ל-YYYY-MM-DD
    const rows = (data.rows || []).map(r => {
      const d = r.dimensionValues[0].value; // 20260615
      return { date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, views: parseInt(r.metricValues[0].value, 10) || 0 };
    }).filter(x => x.views > 0);

    // כתיבה ל-DB דרך RPC מאובטח (טוקן האדמין)
    const ingest = await fetch(`${SUPABASE_URL}/rest/v1/rpc/ingest_ga_daily`, {
      method: 'POST',
      headers: { apikey: ANON, Authorization: 'Bearer ' + adminToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_rows: rows }),
    });
    if (!ingest.ok) throw new Error('ingest ' + ingest.status + ': ' + (await ingest.text()).slice(0, 200));
    const written = await ingest.json();

    res.status(200).json({ configured: true, fetched: rows.length, written, from: startDate });
  } catch (e) {
    res.status(200).json({ configured: true, error: String(e.message || e) });
  }
}
