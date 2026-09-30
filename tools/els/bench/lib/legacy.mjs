// Observational baseline: the legacy browser findAll (anchor + dispersal), extracted VERBATIM from
// tools/els/els-code.template.html (the single engine source) and executed in a worker so it can be
// hard-terminated on timeout. It is NOT a truth authority and NOT part of the canonical boundary.
import { Worker } from 'node:worker_threads';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = join(HERE, '..', '..', 'els-code.template.html');

export function extractLegacySource() {
  const src = readFileSync(TEMPLATE, 'utf8');
  const a = src.indexOf('function lb(a,x)');
  const endMarker = 'return{hits,capped,t};}';
  const b = src.indexOf(endMarker, a);
  if (a < 0 || b < 0) throw new Error('legacy findAll extraction markers not found');
  return src.slice(a, b + endMarker.length);
}

const WORKER = `
const { parentPort, workerData } = require('node:worker_threads');
const { performance } = require('node:perf_hooks');
const { T, SN, code, term, cap } = workerData;
const FIN={"ך":"כ","ם":"מ","ן":"נ","ף":"פ","ץ":"צ"};
const norm=s=>{let o="";for(const c of s||"")if(c>="א"&&c<="ת")o+=(FIN[c]||c);return o;};
const scopeN=()=>SN;
const { findAll } = new Function('T','scopeN','norm', code + '\\nreturn {findAll};')(T, scopeN, norm);
const t0 = performance.now();
const r = findAll(term, cap);
const ms = performance.now() - t0;
parentPort.postMessage({ ms, capped: r.capped, hits: r.hits.map(h => ({ skip: h.skip, dir: h.dir, start: h.start })) });
`;

/** Returns { state:'OK'|'TIMEOUT', ms, capped, hits:[{skip,dir,start}] } — legacy semantics (skip>=1, no bounded domain). */
export function runLegacy({ text, n, term, cap, budgetMs }) {
  return new Promise(resolve => {
    const w = new Worker(WORKER, { eval: true, workerData: { T: text, SN: n, code: extractLegacySource(), term, cap } });
    const timer = setTimeout(() => { w.terminate(); resolve({ state: 'TIMEOUT', ms: null, capped: null, hits: [] }); }, budgetMs);
    w.on('message', m => { clearTimeout(timer); w.terminate(); resolve({ state: 'OK', ...m }); });
    w.on('error', e => { clearTimeout(timer); resolve({ state: 'ERROR', error: String(e), ms: null, hits: [] }); });
  });
}
