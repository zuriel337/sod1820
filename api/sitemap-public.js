// Public sitemap projection for capability availability.
// site_flags_lock_law v3: public metadata must consume the same capability state as the route.
// This adapter does not own sitemap truth; it filters the canonical /api/sitemap output only when
// the public Convergence Tree capability is closed/registered-only.

const SUPABASE_URL = 'https://linswmnnkjxvweumprav.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM';
const SITE = 'https://sod1820.co.il';
const HEADERS = { apikey: ANON, Authorization: 'Bearer ' + ANON };

async function convergenceTreePubliclyOpen() {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/site_flags?select=enabled,mode&key=eq.lock_convergence_tree&limit=1`, { headers: HEADERS });
    if (!r.ok) return false;
    const rows = await r.json();
    const flag = Array.isArray(rows) ? rows[0] : null;
    // Public discovery is allowed only when the capability is actually open.
    // enabled=true means either closed-to-all or registered-only, neither belongs in a public sitemap.
    return !flag?.enabled;
  } catch {
    // Public metadata fails closed for this capability: never advertise /numbers if availability truth is unavailable.
    return false;
  }
}

function removeNumbersHub(xml) {
  return String(xml || '').replace(
    /\s*<url>\s*<loc>https:\/\/sod1820\.co\.il\/numbers<\/loc>[\s\S]*?<\/url>/,
    '',
  );
}

export default async function handler(req, res) {
  const [publiclyOpen, upstream] = await Promise.all([
    convergenceTreePubliclyOpen(),
    fetch(`${SITE}/api/sitemap`, { headers: { 'user-agent': 'SOD1820-Sitemap-Projection/1.0' } }),
  ]);

  if (!upstream.ok) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).send('sitemap unavailable');
  }

  let xml = await upstream.text();
  if (!publiclyOpen) xml = removeNumbersHub(xml);

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  // Availability state is DB-driven; keep projection cache bounded so open/close remains operationally one change.
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=300');
  return res.status(200).send(xml);
}
