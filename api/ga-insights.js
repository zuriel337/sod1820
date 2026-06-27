// Vercel Serverless Function — תובנות Google Analytics (GA4) חיות לדאשבורד.
// מושך דרך GA4 Data API מערך מלא: סך הכל + מעורבות, זמן-אמת (כולל מה צופים עכשיו),
// מדינות *עם זמן שהייה*, ערים, ערוצים/מקורות/מדיום, מכשירים/מערכת/דפדפן/שפה,
// דפים *עם זמן*, דפי נחיתה, חדשים-מול-חוזרים, מגמה יומית, ושעות היום.
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

const num = v => parseFloat(v) || 0;

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

    // דוח: ממד יחיד + מדד יחיד → [{key,value}]
    const rep = (dim, metric, limit) => gaReport(token, pid, {
      dateRanges: range, dimensions: [{ name: dim }], metrics: [{ name: metric }],
      orderBys: [{ metric: { metricName: metric }, desc: true }], limit,
    });
    // דוח: ממד יחיד + כמה מדדים → [{key, m0, m1, ...}]
    const repM = (dim, metrics, limit, ordered = true) => gaReport(token, pid, {
      dateRanges: range, dimensions: [{ name: dim }], metrics: metrics.map(m => ({ name: m })),
      orderBys: ordered ? [{ metric: { metricName: metrics[0] }, desc: true }] : undefined, limit,
    });
    const list = data => (data.rows || []).map(r => ({ key: r.dimensionValues?.[0]?.value || '(לא ידוע)', value: num(r.metricValues?.[0]?.value) }));
    const listM = (data, keys) => (data.rows || []).map(r => {
      const o = { key: r.dimensionValues?.[0]?.value || '(לא ידוע)' };
      keys.forEach((k, i) => { o[k] = num(r.metricValues?.[i]?.value); });
      return o;
    });

    // ── שלוש מנות (≤6 בקשות מקבילות כל אחת — מתחת למגבלת ה-concurrency של GA) ──
    const [totals, realtime, realtimePages, countries, cities, channels] = await Promise.all([
      gaReport(token, pid, { dateRanges: range, metrics: ['totalUsers', 'newUsers', 'sessions', 'screenPageViews', 'averageSessionDuration', 'engagementRate', 'bounceRate', 'screenPageViewsPerSession', 'engagedSessions'].map(n => ({ name: n })) }),
      gaReport(token, pid, { metrics: [{ name: 'activeUsers' }] }, true),
      gaReport(token, pid, { dimensions: [{ name: 'unifiedScreenName' }], metrics: [{ name: 'activeUsers' }], orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }], limit: 8 }, true),
      repM('country', ['activeUsers', 'averageSessionDuration', 'engagementRate'], 14),
      rep('city', 'activeUsers', 12),
      rep('sessionDefaultChannelGroup', 'sessions', 8),
    ]);

    const [sources, mediums, devices, os, browsers, langs] = await Promise.all([
      rep('sessionSource', 'sessions', 12),
      rep('sessionMedium', 'sessions', 8),
      rep('deviceCategory', 'sessions', 4),
      rep('operatingSystem', 'sessions', 8),
      rep('browser', 'sessions', 8),
      rep('language', 'activeUsers', 8),
    ]);

    const [pages, landing, daily, hours, newRet] = await Promise.all([
      repM('pagePath', ['screenPageViews', 'averageSessionDuration'], 15),
      rep('landingPage', 'sessions', 12),
      repM('date', ['totalUsers'], 400, false),
      repM('hour', ['activeUsers'], 24, false),
      rep('newVsReturning', 'activeUsers', 4),
    ]);

    const t = totals.rows?.[0]?.metricValues || [];
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.status(200).json({
      configured: true, days,
      totals: {
        users: num(t[0]?.value), newUsers: num(t[1]?.value), sessions: num(t[2]?.value),
        views: num(t[3]?.value), avgEngagementSec: num(t[4]?.value), engagementRate: num(t[5]?.value),
        bounceRate: num(t[6]?.value), viewsPerSession: num(t[7]?.value), engagedSessions: num(t[8]?.value),
      },
      realtime: num(realtime.rows?.[0]?.metricValues?.[0]?.value),
      realtimePages: list(realtimePages),
      channels: list(channels),
      sources: list(sources),
      mediums: list(mediums),
      countries: listM(countries, ['users', 'avgSec', 'engRate']),
      cities: list(cities),
      devices: list(devices),
      os: list(os),
      browsers: list(browsers),
      langs: list(langs),
      pages: listM(pages, ['views', 'avgSec']),
      landing: list(landing),
      daily: listM(daily, ['users']).sort((a, b) => (a.key < b.key ? -1 : 1)),
      hours: listM(hours, ['users']).sort((a, b) => Number(a.key) - Number(b.key)),
      newReturning: list(newRet),
    });
  } catch (e) {
    res.status(200).json({ configured: true, error: String(e.message || e) });
  }
}
