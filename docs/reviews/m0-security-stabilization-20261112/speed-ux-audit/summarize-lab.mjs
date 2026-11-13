// Turns one or more speed-lab.mjs result files into the phase table used in README.md (medians over the runs).
// Phases of one load, all in ms from the start of the navigation:
//   ttfb      first byte of the document
//   fcp       first paint of the static opening shell
//   entry     the application entry starts to run (mark sod2029:render-requested); before it: worker admission
//   opened    the opening shell is replaced by the application's own markup
//   lcp       the last "largest contentful paint" candidate the browser reported, and what element it was
// Usage: node summarize-lab.mjs results.json [more.json ...] [--json]
import { readFileSync } from 'node:fs';
const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const asJson = process.argv.includes('--json');
const median = (list) => { const v = list.filter((x) => typeof x === 'number').sort((a, b) => a - b); return v.length ? v[Math.floor((v.length - 1) / 2)] : null; };
const mark = (s, name) => s.marks?.find((m) => m[0] === name)?.[1] ?? null;
const rows = [];
for (const file of files) {
  const rep = JSON.parse(readFileSync(file, 'utf8')); const groups = new Map();
  for (const r of rep.results) { const key = r.page + '|' + r.profile; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(r); }
  for (const [key, list] of groups) for (const state of ['cold', 'warm']) {
    const s = list.map((r) => r[state]).filter((x) => x && !x.error && x.nav);
    const host = new URL(rep.origin).host;
    const site = (x) => x.requests.filter((q) => q.host === host);
    const supa = (x) => x.requests.filter((q) => q.host.endsWith('.supabase.co'));
    const firstData = (x) => { const d = x.resources.filter((e) => e.type === 'fetch' && /supabase\.co\/(rest|functions)\//.test(e.url) && !/rpc\/(track_visit|ingest_event)|meta-capi/.test(e.url)); return d.length ? Math.min(...d.map((e) => e.start)) : null; };
    const lcpEl = (x) => x.lcp ? `${x.lcp.el?.inOpeningShell ? 'opening-shell ' : ''}${x.lcp.el?.tag}${x.lcp.el?.cls ? '.' + x.lcp.el.cls.split(' ')[0] : ''}${x.lcp.url ? (x.lcp.el?.tag === 'img' ? ' <img> ' : ' background ') + new URL(x.lcp.url).pathname.split('/').slice(-1)[0].slice(0, 44) : ' text'}` : null;
    const elements = [...new Set(s.map(lcpEl))];
    rows.push({ origin: rep.origin, rtt: rep.added_rtt_ms, page: key.split('|')[0], profile: key.split('|')[1], state, runs: s.length,
      ttfb: median(s.map((x) => x.nav.ttfb)), fcp: median(s.map((x) => x.fcp)), workerControls: median(s.map((x) => x.controllerAtStart ? 0 : x.controllerAt)),
      entry: median(s.map((x) => mark(x, 'render-requested'))), opened: median(s.map((x) => x.opened)), firstDataRequest: median(s.map(firstData)), lcp: median(s.map((x) => x.lcp?.t)), lcpAll: s.map((x) => x.lcp?.t),
      lcpElement: elements.join(' / '), cls: median(s.map((x) => x.cls)), longTaskMs: median(s.map((x) => x.longTasks.reduce((a, b) => a + b[1], 0))),
      requests: median(s.map((x) => x.requests.length)), siteRequests: median(s.map((x) => site(x).length)), supabaseRequests: median(s.map((x) => supa(x).length)),
      siteBytes: median(s.map((x) => site(x).reduce((a, q) => a + Math.max(0, q.bodyBytes || 0), 0))),
      siteNotReusable: median(s.map((x) => site(x).filter((q) => q.type !== 'document' && !q.viaWorker && q.cacheControl === 'no-store').length)),
      siteNotReusableBytes: median(s.map((x) => site(x).filter((q) => q.type !== 'document' && !q.viaWorker && q.cacheControl === 'no-store').reduce((a, q) => a + Math.max(0, q.bodyBytes || 0), 0))) });
  }
}
if (asJson) console.log(JSON.stringify(rows, null, 1));
else {
  console.log('page      profile  state runs | ttfb  fcp  worker entry opened data  lcp   | cls   long  | req site supa siteKB no-store(n/KB) | lcp element');
  for (const r of rows) console.log(`${r.page.padEnd(9)} ${r.profile.padEnd(8)} ${r.state.padEnd(5)} ${String(r.runs).padEnd(4)} | ${[r.ttfb, r.fcp, r.workerControls, r.entry, r.opened, r.firstDataRequest, r.lcp].map((v) => String(v ?? '-').padStart(5)).join(' ')} | ${String(r.cls).padEnd(5)} ${String(r.longTaskMs).padStart(5)} | ${String(r.requests).padStart(3)} ${String(r.siteRequests).padStart(4)} ${String(r.supabaseRequests).padStart(4)} ${String(Math.round(r.siteBytes / 1024)).padStart(6)} ${String(r.siteNotReusable).padStart(4)}/${String(Math.round(r.siteNotReusableBytes / 1024)).padEnd(4)} | ${r.lcpElement}  [${r.lcpAll.join(',')}]`);
}
