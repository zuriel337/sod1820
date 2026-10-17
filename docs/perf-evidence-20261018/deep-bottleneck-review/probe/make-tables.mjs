// Turns the clean probe JSON files into markdown tables for the report. Pure post-processing, no measurement.
import fs from 'node:fs';
const dir = process.argv[2];
const med = (a) => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
const rng = (a) => (a.length ? `${Math.min(...a)}–${Math.max(...a)}` : '—');
const f = (x) => (x == null ? '—' : Math.round(x));
const ENTRY_RE = /\/assets\/2029-[^/]+\.js$/;
const CHUNK = { '/': 'Home2029Page', '/post/matrix-506': 'Post2029Page', '/world': 'World2029Page', '/number/1820': 'Number2029Page', '/code': 'Els2029Page', '/posts': 'Posts2029Page' };
const LABEL = { '/': 'Home `/`', '/post/matrix-506': 'Post `/post/:slug`', '/world': 'World `/world`', '/number/1820': 'Number `/number/1820`', '/code': 'ELS `/code`', '/posts': 'Posts `/posts`' };

function routeStats(rs, route) {
  const entryDone = rs.map((r) => { const e = r.res.find((x) => ENTRY_RE.test(x.n)); const sup = r.res.find((x) => /\/assets\/supabase-/.test(x.n)); return Math.max(e?.re ?? 0, sup?.re ?? 0); });
  const chunk = (k) => rs.map((r) => r.res.find((x) => x.n.includes('/assets/' + CHUNK[route] + '-') && x.n.endsWith('.js'))?.[k]).filter((x) => x != null);
  const enc = rs.map((r) => r.res.reduce((a, x) => a + x.enc, 0));
  const jsN = rs.map((r) => r.res.filter((x) => /\.js$/.test(x.n)).length);
  const lt = rs.map((r) => r.longtasks.reduce((a, x) => a + x[1], 0));
  const ltBefore = rs.map((r) => { const t = r.sel.home_shell ?? Infinity; return r.longtasks.filter((x) => x[0] < t).reduce((a, x) => a + x[1], 0); });
  return { n: rs.length, entryDone: med(entryDone), chunkStart: med(chunk('s')), chunkEnd: med(chunk('re')), h29: rs.map((r) => r.sel.home_shell).filter((x) => x != null), fcp: med(rs.map((r) => r.fcp)), enc: med(enc), jsN: med(jsN), req: med(rs.map((r) => r.res.length)), lt: med(lt), ltBefore: med(ltBefore), scriptCall: med(rs.map((r) => r.scriptingTotal.call || 0)) };
}

const out = [];
const p1 = JSON.parse(fs.readFileSync(`${dir}/p1-all-routes.json`));
out.push('### P1 — כל המסלולים (CPU×4, 1.6Mbps/150ms, n=7 לכל מסלול, חציון)\n');
out.push('| מסלול | entry הגיע (ms) | chunk מסלול: התחלה→סיום (ms) | מעטפת Home `.h29` (ms) | FCP | קבצי JS | בקשות | בתים (brotli) | long tasks (ms) |');
out.push('|---|--:|--:|--:|--:|--:|--:|--:|--:|');
for (const route of Object.keys(CHUNK)) {
  const rs = p1.results.filter((r) => r.route === route);
  const s = routeStats(rs, route);
  out.push(`| ${LABEL[route]} | ${f(s.entryDone)} | ${f(s.chunkStart)}→${f(s.chunkEnd)} | ${s.h29.length ? `${f(med(s.h29))} (${rng(s.h29)})` : '—'} | ${f(s.fcp)} | ${f(s.jsN)} | ${f(s.req)} | ${Math.round(s.enc / 1024)}KB | ${f(s.lt)} |`);
}
out.push('');
const prof = [['p1-all-routes', 'CPU×4 · 1.6Mbps · RTT150 (פרופיל הקבלה)'], ['p2-cpu4-9mbps', 'CPU×4 · 9Mbps · RTT70'], ['p3-cpu1-1p6', 'CPU×1 · 1.6Mbps · RTT150'], ['p4-cpu1-9mbps', 'CPU×1 · 9Mbps · RTT70']];
out.push('### רגישות — Home `.h29` לפי פרופיל (n=7, חציון, טווח)\n');
out.push('| פרופיל | `.h29` ms | FCP ms | entry הגיע ms | long tasks ms | בקשות |');
out.push('|---|--:|--:|--:|--:|--:|');
for (const [file, label] of prof) {
  try {
    const d = JSON.parse(fs.readFileSync(`${dir}/${file}.json`));
    const rs = d.results.filter((r) => r.route === '/');
    const s = routeStats(rs, '/');
    out.push(`| ${label} | ${f(med(s.h29))} (${rng(s.h29)}) | ${f(s.fcp)} | ${f(s.entryDone)} | ${f(s.lt)} | ${f(s.req)} |`);
  } catch { out.push(`| ${label} | חסר | | | | |`); }
}
out.push('');
// Home phase split on the median run of P1
const hs = p1.results.filter((r) => r.route === '/' && r.sel.home_shell);
const target = med(hs.map((r) => r.sel.home_shell));
const r = hs.reduce((b, x) => (Math.abs(x.sel.home_shell - target) < Math.abs(b.sel.home_shell - target) ? x : b));
const entry = r.res.find((x) => ENTRY_RE.test(x.n));
const sup = r.res.find((x) => /\/assets\/supabase-/.test(x.n));
const entryEnd = Math.max(entry.re, sup.re);
const g = { A: { n: 0, b: 0, end: 0 }, B: { n: 0, b: 0, end: 0 }, C: { n: 0, b: 0, end: 0 } };
for (const x of r.res) { if (!/\.(js|css|woff2|ttf)$/.test(x.n)) continue; const k = x.re <= entryEnd + 5 ? 'A' : x.s < r.sel.home_shell ? 'B' : 'C'; g[k].n++; g[k].b += x.enc; g[k].end = Math.max(g[k].end, x.re); }
out.push('### Home — ריצה חציונית של P1: חלוקת בתים לשלבים\n');
out.push(`| שלב | קבצים | בתים (brotli) | הסתיים ב־ms |\n|---|--:|--:|--:|\n| A. entry (HTML→סיום גרף entry) | ${g.A.n} | ${Math.round(g.A.b / 1024)}KB | ${g.A.end} |\n| B. גרף מסלול Home עד \`.h29\` (${r.sel.home_shell}ms) | ${g.B.n} | ${Math.round(g.B.b / 1024)}KB | ${g.B.end} |\n| C. אחרי תוכן שמיש (timeFlow וכו') | ${g.C.n} | ${Math.round(g.C.b / 1024)}KB | ${g.C.end} |`);
out.push('');
const calls = r.res.filter((x) => x.t === 'fetch').sort((a, b) => a.s - b.s);
out.push('### Home — מתי התחילו קריאות הנתונים (ריצה חציונית, ms מ־navigationStart)\n');
const first = (re) => calls.find((x) => re.test(x.n))?.s;
out.push(`- קריאה ראשית מוקדמת מה־HTML (posts, כרטיסי בית): ${first(/rest\/v1\/posts/)}ms`);
const sf = calls.filter((x) => /site_flags/.test(x.n)).map((x) => x.s);
out.push(`- \`site_flags\`: ${sf.join(' ו־')}ms (${sf.length} קריאות)`);
const burst = calls.filter((x) => x.s >= r.sel.home_shell);
out.push(`- קריאות נתונים שהופעלו אחרי \`.h29\`: ${burst.length} מתוך ${calls.length} (הראשונה ב־${burst[0]?.s}ms)`);
fs.writeFileSync(`${dir}/tables.md`, out.join('\n') + '\n');
console.log(out.join('\n'));
