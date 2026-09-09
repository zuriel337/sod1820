// Vercel Serverless Function — סנכרון Google Analytics (GA4) אל traffic_history.
// מושך צפיות (screenPageViews) + משתמשים (activeUsers) + סשנים (sessions) יומיים דרך אותו
// service account (GSC_SERVICE_ACCOUNT), וכותב ל-DB דרך RPC מאובטח.
// source='ga' נשאר TOTAL היסטורי/קנוני ללא שינוי. בנוסף נשמר פילוח מדינתי קטן ומפורש
// דרך אותו Traffic Intelligence owner (כרגע IL בלבד) תחת source='ga:country:IL'.
// אין טבלת Analytics/Store חדשה; traffic_history נשאר הבית ההיסטורי הקיים.
// env: GA_PROPERTY_ID (מזהה נכס GA4, מספר) · GSC_SERVICE_ACCOUNT (ה-JSON, משותף עם Search Console).

import crypto from 'crypto';

const SUPABASE_URL = 'https://linswmnnkjxvweumprav.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBiYXNlIiwicmVmIjoibGluc3dtbm5ranh2d2V1bXByYXYiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc4MDYyODc2MiwiZXhwIjoyMDk2MjA0NzYyfQ.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM';

const COUNTRY_SEGMENTS = [
  { id: 'IL', source: 'ga:country:IL' },
];

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

async function fetchDailyReport(token, propertyId, startDate, countryId = null) {
  const body = {
    dateRanges: [{ startDate, endDate: 'today' }],
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }, { name: 'sessions' }],
    limit: 100000,
  };
  if (countryId) {
    body.dimensionFilter = {
      filter: {
        fieldName: 'countryId',
        stringFilter: { matchType: 'EXACT', value: countryId },
      },
    };
  }

  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`ga${countryId ? ':' + countryId : ''} ${r.status}: ` + (await r.text()).slice(0, 200));
  return r.json();
}

function dailyRows(data) {
  // GA מחזיר תאריך כ-YYYYMMDD → ממירים ל-YYYY-MM-DD
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

async function callRpc(adminToken, rpc, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${rpc}`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: 'Bearer ' + adminToken, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${rpc} ${r.status}: ` + (await r.text()).slice(0, 200));
  return r.json();
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
    const reports = await Promise.all([
      fetchDailyReport(token, propertyId, startDate),
      ...COUNTRY_SEGMENTS.map(s => fetchDailyReport(token, propertyId, startDate, s.id)),
    ]);

    // TOTAL נשמר בדיוק באותו מסלול היסטורי כדי לא לשנות measurement-gap / unified history semantics.
    const totalRows = dailyRows(reports[0]);
    const written = await callRpc(adminToken, 'ingest_ga_daily', { p_rows: totalRows });

    // פילוח מדינה נשמר באותה traffic_history עם source נפרד, כך שלא מתערבב אוטומטית ב-source='ga'.
    const segments = {};
    for (let i = 0; i < COUNTRY_SEGMENTS.length; i += 1) {
      const seg = COUNTRY_SEGMENTS[i];
      const rows = dailyRows(reports[i + 1]);
      const segWritten = await callRpc(adminToken, 'ingest_ga_country_daily', { p_rows: rows, p_country_id: seg.id });
      segments[seg.id] = { source: seg.source, fetched: rows.length, written: segWritten };
    }

    res.status(200).json({ configured: true, fetched: totalRows.length, written, from: startDate, segments });
  } catch (e) {
    res.status(200).json({ configured: true, error: String(e.message || e) });
  }
}
