// Vercel Serverless Function — תובנות Google Analytics (GA4) חיות לדאשבורד.
// מושך דרך GA4 Data API מערך מלא: סך הכל + מעורבות, זמן-אמת (כולל מה צופים עכשיו),
// מדינות *עם זמן שהייה*, ערים, ערוצים/מקורות/מדיום, מכשירים/מערכת/דפדפן/שפה,
// דפים *עם זמן*, דפי נחיתה, חדשים-מול-חוזרים, מגמה יומית, ושעות היום.
// אותו service account (GSC_SERVICE_ACCOUNT) + GA_PROPERTY_ID. אדמין בלבד.
// GA4 Israel history bridge: the same successful admin read also refreshes the bounded
// `ga:country:IL` slice in existing traffic_history. This is an idempotent cache/history refresh,
// not a second analytics store and not an authorization bypass.

import crypto from 'crypto';

const SUPABASE_URL = 'https://linswmnnkjxvweumprav.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBiYXNlIiwicmVmIjoibGluc3dtbm5ranh2d2V1bXByYXYiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc4MDYyODc2MiwiZXhwIjoyMDk2MjA0NzYyfQ.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM';

async function getAdminToken(req) {
  try {
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
  } catch { return null; }
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

async function callRpc(adminToken, rpc, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${rpc}`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: 'Bearer ' + adminToken, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${rpc} ${r.status}: ` + (await r.text()).slice(0, 160));
  return r.json();
}

const num = v => parseFloat(v) || 0;

function gaDailyRows(data) {
  return (data.rows || []).map(r => {
    const d = r.dimensionValues?.[0]?.value || '';
    return {
      date: d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : '',
      views: parseInt(r.metricValues?.[0]?.value, 10) || 0,
      users: parseInt(r.metricValues?.[1]?.value, 10) || 0,
      sessions: parseInt(r.metricValues?.[2]?.value, 10) || 0,
    };
  }).filter(x => x.date && x.views > 0);
}

export default async function handler(req, res) {
  const adminToken = await getAdminToken(req);
  if (!adminToken) { res.status(401).json({ error: 'unauthorized' }); return; }

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

    const [pages, landing, daily, hours, newRet, ilDailyHistory] = await Promise.all([
      repM('pagePath', ['screenPageViews', 'averageSessionDuration'], 15),
      rep('landingPage', 'sessions', 12),
      repM('date', ['totalUsers', 'sessions'], 400, false),
      repM('hour', ['activeUsers'], 24, false),
      rep('newVsReturning', 'activeUsers', 4),
      gaReport(token, pid, {
        dateRanges: [{ startDate: '120daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }, { name: 'sessions' }],
        dimensionFilter: {
          filter: {
            fieldName: 'countryId',
            stringFilter: { matchType: 'EXACT', value: 'IL' },
          },
        },
        limit: 100000,
      }),
    ]);

    // Release hotfix: /api/ga-insights is already proven to authenticate the admin session in production.
    // Refresh the Israel history through that same authenticated path so a transient POST/session-race
    // on /api/ga-sync cannot block the canonical country history. RPC remains admin-gated in DB.
    const ilRows = gaDailyRows(ilDailyHistory);
    const countryHistory = { source: 'ga:country:IL', fetched: ilRows.length, written: 0 };
    try {
      countryHistory.written = num(await callRpc(adminToken, 'ingest_ga_country_daily', { p_rows: ilRows, p_country_id: 'IL' }));
    } catch (persistErr) {
      countryHistory.error = String(persistErr?.message || persistErr).slice(0, 180);
    }

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
      daily: listM(daily, ['users', 'sessions']).sort((a, b) => (a.key < b.key ? -1 : 1)),
      hours: listM(hours, ['users']).sort((a, b) => Number(a.key) - Number(b.key)),
      newReturning: list(newRet),
      countryHistory,
    });
  } catch (e) {
    res.status(200).json({ configured: true, error: String(e.message || e) });
  }
}
