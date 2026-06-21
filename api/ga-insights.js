// Vercel Serverless Function — תובנות Google Analytics (GA4) חיות לדאשבורד.
// מושך דרך GA4 Data API: סך הכל, זמן-אמת, ערוצים/מקורות, מדינות, מכשירים, דפים.
// אותו service account (GSC_SERVICE_ACCOUNT) + GA_PROPERTY_ID. אדמין בלבד.

import crypto from 'crypto';

const SUPABASE_URL = 'https://linswmnnkjxvweumprav.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM';

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

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/analytics.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const input = `${header}.${claim}`;
  const sig = crypto.createSign('RSA-SHA256').update(input).end().sign(sa.private_key).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${input}.${sig}` }),
  });
  if (!r.ok) throw new Error('token ' + r.status + ': ' + (await r.text()).slice(0, 200));
  return (await r.json()).access_token;
}

async function gaReport(token, pid, body, realtime = false) {
  const verb = realtime ? 'runRealtimeReport' : 'runReport';
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${pid}:${verb}`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error('ga ' + r.status + ': ' + (await r.text()).slice(0, 160));
  return r.json();
}

// שורות → [{ key, value }]
const rowsToList = data => (data.rows || []).map(row => ({
  key: row.dimensionValues?.[0]?.value || '(לא ידוע)',
  value: parseInt(row.metricValues?.[0]?.value, 10) || 0,
}));

export default async function handler(req, res) {
  if (!(await verifyAdmin(req))) { res.status(401).json({ error: 'unauthorized' }); return; }

  const raw = process.env.GSC_SERVICE_ACCOUNT;
  const pid = process.env.GA_PROPERTY_ID;
  if (!raw || !pid) { res.status(200).json({ configured: false }); return; }

  try {
    const sa = JSON.parse(raw);
    const days = Math.min(parseInt(req.query.days, 10) || 28, 365);
    const range = [{ startDate: `${days}daysAgo`, endDate: 'today' }];
    const token = await getAccessToken(sa);

    const rep = (dim, metric, limit) => gaReport(token, pid, {
      dateRanges: range, dimensions: [{ name: dim }], metrics: [{ name: metric }],
      orderBys: [{ metric: { metricName: metric }, desc: true }], limit,
    });

    const [totals, realtime, channels, sources, countries, devices, pages] = await Promise.all([
      gaReport(token, pid, { dateRanges: range, metrics: [{ name: 'totalUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }] }),
      gaReport(token, pid, { metrics: [{ name: 'activeUsers' }] }, true),
      rep('sessionDefaultChannelGroup', 'sessions', 8),
      rep('sessionSource', 'sessions', 10),
      rep('country', 'activeUsers', 10),
      rep('deviceCategory', 'sessions', 4),
      rep('pageTitle', 'screenPageViews', 12),
    ]);

    const t = totals.rows?.[0]?.metricValues || [];
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.status(200).json({
      configured: true, days,
      totals: { users: parseInt(t[0]?.value, 10) || 0, sessions: parseInt(t[1]?.value, 10) || 0, views: parseInt(t[2]?.value, 10) || 0 },
      realtime: parseInt(realtime.rows?.[0]?.metricValues?.[0]?.value, 10) || 0,
      channels: rowsToList(channels),
      sources: rowsToList(sources),
      countries: rowsToList(countries),
      devices: rowsToList(devices),
      pages: rowsToList(pages),
    });
  } catch (e) {
    res.status(200).json({ configured: true, error: String(e.message || e) });
  }
}
