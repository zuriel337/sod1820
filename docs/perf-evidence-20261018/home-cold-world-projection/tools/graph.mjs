// usage: node graph.mjs <dist-dir> [route-src]
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
const dist = process.argv[2];
const routeSrc = process.argv[3] || 'src/pages/Home2029Page.jsx';
const manifest = JSON.parse(readFileSync(join(dist, '.vite/manifest.json'), 'utf8'));
const gz = new Map(); const raw = new Map();
const size = (k) => { const f = manifest[k]?.file; if (!f?.endsWith('.js')) return [0,0]; if (!gz.has(f)) { const b = readFileSync(join(dist, f)); gz.set(f, gzipSync(b, { level: 9 }).length); raw.set(f, b.length);} return [gz.get(f), raw.get(f)]; };
const closure = (start) => { const seen = new Set(); const q = [start]; while (q.length) { const k = q.shift(); if (!k || seen.has(k)) continue; seen.add(k); for (const d of manifest[k].imports || []) q.push(d); } return seen; };
const entryKey = Object.keys(manifest).find((k) => k === '2029.html' || manifest[k].src === '2029.html');
const entry = closure(entryKey);
const routeKey = Object.keys(manifest).find((k) => k === routeSrc || manifest[k].src === routeSrc);
const route = closure(routeKey);
const extra = [...route].filter((k) => !entry.has(k));
const name = (k) => `${manifest[k].src || manifest[k].name || k} -> ${manifest[k].file}`;
let totGz = 0, totRaw = 0;
console.log(`entry: ${entry.size} chunks, ${([...entry].reduce((n,k)=>n+size(k)[0],0)/1024).toFixed(1)} KB gz`);
console.log(`route ${routeSrc}: +${extra.length} chunks`);
for (const k of extra) { const [g, r] = size(k); totGz += g; totRaw += r; console.log(`  ${(g/1024).toFixed(1).padStart(7)} KB gz ${(r/1024).toFixed(1).padStart(7)} KB raw  ${name(k)}`); }
console.log(`route extra total: ${(totGz/1024).toFixed(1)} KB gz, ${(totRaw/1024).toFixed(1)} KB raw, ${extra.length} chunks`);
// dynamic imports reachable from route (deferral boundaries)
const dyn = new Set(); for (const k of route) for (const d of manifest[k].dynamicImports || []) dyn.add(d);
console.log(`dynamic boundaries from route: ${dyn.size}`);
for (const d of dyn) { const c = closure(d); const ex = [...c].filter((x) => !route.has(x) && !entry.has(x)); console.log(`  dyn ${name(d)}  (+${ex.length} own chunks, ${(ex.reduce((n,x)=>n+size(x)[0],0)/1024).toFixed(1)} KB gz)`); }
