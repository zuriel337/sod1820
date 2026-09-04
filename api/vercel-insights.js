// Vercel Serverless Function — Vercel Web Analytics read-only connector for the admin Growth Center.
// One Tree: does not create a parallel analytics store; it reads Vercel's official Web Analytics API
// and returns a normalized projection alongside GA4 + first-party SOD1820 metrics.
// Requires server-only VERCEL_API_TOKEN. Never expose this token to the browser.

const SUPABASE_URL = 'https://linswmnnkjxvweumprav.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInR5cCI6IkpXVCJ9'.slice(0,0) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM';

const DEFAULT_TEAM = 'team_vtfWHZfKvdbob8gvynQb5N89';
const DEFAULT_PROJECT = 'prj_43q7k7QFAcWnin1tcBjce5xOi7Cq';

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

function pct(now, prev) {
  if (now == null || prev == null) return null;
  if (prev === 0) return now === 0 ? 0 : null;
  return Math.round(((now - prev) / prev) * 1000) / 10;
}

async function query(path, params, token) {
  const u = new URL('https://api.vercel.com' + path);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v == null) return;
    if (Array.isArray(v)) v.forEach(x => u.searchParams.append(k, String(x)));
    else u.searchParams.set(k, String(v));
  });
  const r = await fetch(u, { headers: { Authorization: 'Bearer ' + token } });
  if (!r.ok) throw new Error(`vercel ${r.status}: ${(await r.text()).slice(0,220)}`);
  return r.json();
}

const cleanKey = row => row?.key ?? row?.requestPath ?? row?.referrerHostname ?? row?.deviceType ?? row?.country ?? row?.browserName ?? row?.day ?? row?.date ?? '(לא ידוע)';
const cleanAgg = data => (data?.data || []).map(row => ({
  key: cleanKey(row),
  pageviews: Number(row.pageviews ?? row.count ?? 0),
  visitors: Number(row.visitors ?? 0),
}));

export default async function handler(req, res) {
  if (!(await verifyAdmin(req))) { res.status(401).json({ error: 'unauthorized' }); return; }

  const token = process.env.VERCEL_API_TOKEN;
  if (!token) {
    res.status(200).json({
      configured: false,
      missing: 'VERCEL_API_TOKEN',
      note: 'Add a server-only Vercel API token to the Vercel project environment.'
    });
    return;
  }

  const projectId = process.env.VERCEL_ANALYTICS_PROJECT_ID || DEFAULT_PROJECT;
  const teamId = process.env.VERCEL_ANALYTICS_TEAM_ID || DEFAULT_TEAM;
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 90);
  const until = new Date();
  const since = new Date(until.getTime() - days * 86400000);
  const prevUntil = new Date(since.getTime() - 1);
  const prevSince = new Date(prevUntil.getTime() - days * 86400000);

  const base = { projectId, teamId };
  const curRange = { ...base, since: since.toISOString(), until: until.toISOString() };
  const prevRange = { ...base, since: prevSince.toISOString(), until: prevUntil.toISOString() };

  try {
    const [current, previous, daily, pages, refs, devices, countries, browsers] = await Promise.all([
      query('/v1/query/web-analytics/visits/count', curRange, token),
      query('/v1/query/web-analytics/visits/count', prevRange, token),
      query('/v1/query/web-analytics/visits/aggregate', { ...curRange, by: ['day'], limit: 100 }, token),
      query('/v1/query/web-analytics/visits/aggregate', { ...curRange, by: ['requestPath'], limit: 12 }, token),
      query('/v1/query/web-analytics/visits/aggregate', { ...curRange, by: ['referrerHostname'], limit: 12 }, token),
      query('/v1/query/web-analytics/visits/aggregate', { ...curRange, by: ['deviceType'], limit: 8 }, token),
      query('/v1/query/web-analytics/visits/aggregate', { ...curRange, by: ['country'], limit: 10 }, token),
      query('/v1/query/web-analytics/visits/aggregate', { ...curRange, by: ['browserName'], limit: 10 }, token),
    ]);

    const c = current?.data || {};
    const p = previous?.data || {};
    const visitors = Number(c.visitors || 0);
    const pageviews = Number(c.pageviews || 0);
    const prevVisitors = Number(p.visitors || 0);
    const prevPageviews = Number(p.pageviews || 0);

    res.setHeader('Cache-Control', 'private, max-age=300');
    res.status(200).json({
      configured: true,
      source: 'vercel-web-analytics',
      days,
      range: { since: since.toISOString(), until: until.toISOString() },
      totals: {
        visitors,
        pageviews,
        viewsPerVisitor: visitors ? Math.round((pageviews / visitors) * 100) / 100 : null,
        visitorsChangePct: pct(visitors, prevVisitors),
        pageviewsChangePct: pct(pageviews, prevPageviews),
      },
      previous: { visitors: prevVisitors, pageviews: prevPageviews },
      daily: cleanAgg(daily),
      pages: cleanAgg(pages),
      referrers: cleanAgg(refs),
      devices: cleanAgg(devices),
      countries: cleanAgg(countries),
      browsers: cleanAgg(browsers),
    });
  } catch (e) {
    res.status(200).json({ configured: true, error: String(e?.message || e) });
  }
}
