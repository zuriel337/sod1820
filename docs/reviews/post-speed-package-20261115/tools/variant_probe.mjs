// Read-only comparison of three ways to resolve a post by its slug variants against the production Supabase REST endpoint (same anon key and select as api/og.js).
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
const root = process.argv[2];
const src = readFileSync(root + '/api/og.js', 'utf8');
const SUPABASE_URL = (src.match(/SUPABASE_URL\s*=\s*['"`]([^'"`]+)/) || [])[1] || process.env.SUPABASE_URL;
const ANON = (src.match(/ANON\s*=\s*['"`]([^'"`]+)/) || [])[1];
if (!SUPABASE_URL || !ANON) { console.error('constants not found', SUPABASE_URL, !!ANON); process.exit(1); }
const H = { apikey: ANON, Authorization: 'Bearer ' + ANON };
const SEL = 'select=id,slug,source,link,wp_id,title,excerpt,content,image_url,date,modified,tags,categories,author&limit=1';
const SELNC = 'select=id,slug,source,link,wp_id,title,excerpt,image_url,date,modified,tags,categories,author&limit=1';
const keys = JSON.parse(readFileSync('data/sample-posts.json', 'utf8')); const posts = Array.isArray(keys) ? keys : keys.posts;
const results = {};
const get = async (u) => { const r = await fetch(u, { headers: H }); const t = await r.json(); return t; };
function variants(path) {
  let slug = path.replace(/^\//, ''); try { slug = decodeURIComponent(slug); } catch {}
  const v = [slug]; const enc = encodeURIComponent(slug).replace(/%[0-9A-Fa-f]{2}/g, m => m.toLowerCase()); if (enc !== slug) v.push(enc); return v;
}
const strategies = {
  sequential: async (vs, sel) => { for (const v of vs) { const rows = await get(`${SUPABASE_URL}/rest/v1/posts?slug=eq.${encodeURIComponent(v)}&${sel}`); if (rows[0]) return rows[0]; } return null; },
  parallel: async (vs, sel) => { const all = await Promise.all(vs.map(v => get(`${SUPABASE_URL}/rest/v1/posts?slug=eq.${encodeURIComponent(v)}&${sel}`))); for (const rows of all) if (rows[0]) return rows[0]; return null; },
  inQuery: async (vs, sel) => { const list = vs.map(v => /[,()"\\]/.test(v) ? '"' + v.replace(/["\\]/g, '\\$&') + '"' : v).join(','); const rows = await get(`${SUPABASE_URL}/rest/v1/posts?slug=${encodeURIComponent('in.(' + list + ')')}&${sel.replace('limit=1', 'limit=2')}`); for (const v of vs) { const r = rows.find(x => x.slug === v); if (r) return r; } return rows[0] || null; },
};
const order = Object.keys(strategies);
for (const key of ['O1', 'O3', 'O4', 'N5']) {
  const p = posts.find(x => x.key === key); const vs = variants(decodeURIComponent(p.path));
  results[key] = {};
  for (let rep = 0; rep < 5; rep++) {
    for (const name of order) {
      for (const [selName, sel] of [['content', SEL], ['nocontent', SELNC]]) {
        const t0 = performance.now(); const row = await strategies[name](vs, sel); const ms = Math.round(performance.now() - t0);
        (results[key][name + '/' + selName] ||= []).push({ ms, id: row?.id ?? null });
        await new Promise(r => setTimeout(r, 400));
      }
    }
  }
}
for (const [key, byName] of Object.entries(results)) {
  console.log(key);
  for (const [name, arr] of Object.entries(byName)) {
    const ms = arr.map(x => x.ms).sort((a, b) => a - b); const ids = new Set(arr.map(x => x.id));
    console.log(`  ${name.padEnd(20)} median ${ms[Math.floor(ms.length / 2)]} ms   all ${ms.join(',')}   ids ${[...ids].join(',')}`);
  }
}
