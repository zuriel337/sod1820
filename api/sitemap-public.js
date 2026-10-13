import { PUBLIC_CAPABILITY_KEYS, publicCapabilityForPath, publicCapabilityIsOpen } from "../src/lib/publicCapabilityRoutes.js";
// Public sitemap projection for capability availability.
// site_flags_lock_law v3: public metadata must consume the same capability state as the route.
// This adapter filters the existing sitemap by anonymous capability availability.

const SUPABASE_URL = 'https://linswmnnkjxvweumprav.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM';
const SITE = 'https://sod1820.co.il';
const HEADERS = { apikey: ANON, Authorization: 'Bearer ' + ANON };

async function publicFlags() {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/site_flags?select=key,enabled,mode&key=in.(${PUBLIC_CAPABILITY_KEYS.join(',')})`, { headers: HEADERS, signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    const rows = await r.json();
    return Array.isArray(rows) ? rows : null;
  } catch { return null; }
}

export function projectPublicUrls(xml, rows) {
  return String(xml || '').replace(/\s*<url(?:\s[^>]*)?>[\s\S]*?<\/url>/g, entry => {
    const loc = entry.match(/<loc>\s*([^<]+)\s*<\/loc>/)?.[1];
    if (!loc) return entry;
    let url;
    try { url = new URL(loc.trim().replace(/&amp;/g, '&')); } catch { return ''; }
    if (url.origin !== SITE) return entry;
    const capability = publicCapabilityForPath(url.pathname);
    return capability && !publicCapabilityIsOpen(rows, capability.key) ? '' : entry;
  });
}

export default async function handler(req, res) {
  const [rows, upstream] = await Promise.all([
    publicFlags(),
    fetch(`${SITE}/api/sitemap`, { headers: { 'user-agent': 'SOD1820-Sitemap-Projection/1.0' } }),
  ]);

  if (!upstream.ok) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).send('sitemap unavailable');
  }

  const xml = projectPublicUrls(await upstream.text(), rows);

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  // Do not serve a stale open projection after a capability closes.
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(xml);
}
