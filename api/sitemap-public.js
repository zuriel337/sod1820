// Public sitemap projection for capability availability.
// site_flags_lock_law v3: public metadata must consume the same capability state as the route.
// This adapter does not own sitemap truth; it filters the canonical /api/sitemap output only when
// capabilities are unavailable to anonymous visitors. The canonical sitemap owner is unchanged.

const SUPABASE_URL = 'https://linswmnnkjxvweumprav.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM';
const SITE = 'https://sod1820.co.il';
const HEADERS = { apikey: ANON, Authorization: 'Bearer ' + ANON };

const FLAG_KEYS = [
  'lock_convergence_tree', 'lock_world', 'lock_books', 'lock_life_journey',
  'lock_number', 'lock_heichal', 'lock_raziel_site',
];

async function publicCapabilityFlags() {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/site_flags?select=key,enabled,mode&key=in.(${FLAG_KEYS.join(',')})`, { headers: HEADERS, signal: AbortSignal.timeout(5000) });
    if (!r.ok) return { flags: new Map(), failed: true };
    const rows = await r.json();
    if (!Array.isArray(rows)) return { flags: new Map(), failed: true };
    const flags = new Map();
    for (const row of rows) {
      if (!row || !FLAG_KEYS.includes(row.key)) continue;
      // A malformed/duplicate row cannot accidentally open a launch gate.
      const valid = typeof row.enabled === 'boolean' && ['all', 'anon'].includes(row.mode);
      flags.set(row.key, flags.has(row.key) || !valid ? null : row);
    }
    return { flags, failed: false };
  } catch {
    return { flags: new Map(), failed: true };
  }
}

function capabilityForPath(path) {
  if (/^\/(?:world|topic|researcher)(?:\/|$)/.test(path)) return 'lock_world';
  if (/^\/books?(?:\/|$)/.test(path)) return 'lock_books';
  if (/^\/(?:journey|journey-beta|מסע)(?:\/|$)/.test(path) || /^\/2029\/journey(?:\/|$)/.test(path)) return 'lock_life_journey';
  if (/^\/numbers?(?:\/|$)/.test(path) || /^\/2029\/number(?:\/|$)/.test(path)) return 'lock_number';
  if (/^\/(?:heichal|היכל)(?:\/|$)/.test(path)) return 'lock_heichal';
  if (/^\/(?:2029\/)?raziel(?:\/|$)/.test(path)) return 'lock_raziel_site';
  return null;
}

function projectPublicUrls(xml, state) {
  return String(xml || '').replace(/\s*<url(?:\s[^>]*)?>[\s\S]*?<\/url>/g, (entry) => {
    const loc = entry.match(/<loc>\s*([^<]+)\s*<\/loc>/)?.[1];
    if (!loc) return entry;
    let path;
    try {
      const url = new URL(loc.trim().replace(/&amp;/g, '&'));
      if (url.origin !== SITE) return entry;
      path = decodeURIComponent(url.pathname).replace(/\/+$/, '') || '/';
    } catch { return ''; }
    // Forum is retired independently of capability flags. The two chat surfaces
    // share a transitional, intentionally noindex route.
    if (/^\/forum(?:\/|$)/.test(path) || path === '/community/chat') return '';
    if (/^\/numbers(?:\/|$)/.test(path)) {
      // Preserve the preexisting convergence-tree missing-row default. Failed
      // reads/malformed rows and either enabled mode never advertise the hub.
      const flag = state.flags.get('lock_convergence_tree');
      const convergenceClosed = state.failed || state.flags.has('lock_convergence_tree') && flag?.enabled !== false;
      // The legacy alias lands on /number, so it also needs the Number launch
      // gate explicitly open. Its convergence default is unchanged.
      return convergenceClosed || state.flags.get('lock_number')?.enabled !== false ? '' : entry;
    }
    const gate = capabilityForPath(path);
    return gate && (state.failed || state.flags.get(gate)?.enabled !== false) ? '' : entry;
  });
}

export default async function handler(req, res) {
  const [state, upstream] = await Promise.all([
    publicCapabilityFlags(),
    fetch(`${SITE}/api/sitemap`, { headers: { 'user-agent': 'SOD1820-Sitemap-Projection/1.0' } }),
  ]);

  if (!upstream.ok) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).send('sitemap unavailable');
  }

  const xml = projectPublicUrls(await upstream.text(), state);

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  // Availability state is DB-driven; keep projection cache bounded so open/close remains operationally one change.
  res.setHeader('Cache-Control', state.failed ? 'no-store' : 'public, max-age=300, s-maxage=300');
  return res.status(200).send(xml);
}
