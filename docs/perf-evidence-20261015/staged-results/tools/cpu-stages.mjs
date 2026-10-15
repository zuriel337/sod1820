// CPU cost (unthrottled node, same modules) of turning the real fn_number_lookup response into what the number view renders.
// usage: node cpu-stages.mjs <fixtures.json> <value>
import fs from 'node:fs';
import { researchNumber } from '../../../../src/lib/research/numericResearch.js';
import { getValueFamilies } from '../../../../src/lib/supabase.js';
const [fxPath, valueArg] = process.argv.slice(2); const value = Number(valueArg);
const fx = JSON.parse(fs.readFileSync(fxPath));
const key = Object.keys(fx).find((k) => k.includes('rpc/fn_number_lookup') && k.includes(`"p_value":${value}`) && k.includes('"p_limit":500'));
if (!key) { console.error('no fixture for', value); process.exit(2); }
const rows = JSON.parse(Buffer.from(fx[key].body, 'base64').toString()); const bytes = Buffer.from(fx[key].body, 'base64').length;
const rpc = async (name, args) => name === 'fn_number_lookup' ? { data: rows, error: null } : { data: [], error: null };
const ms = async (fn, n = 5) => { const t = []; for (let i = 0; i < n; i++) { const a = performance.now(); await fn(); t.push(performance.now() - a); } t.sort((x, y) => x - y); return +t[Math.floor(n / 2)].toFixed(1); };
const out = { value, rows: rows.length, bytes, parseJsonMs: await ms(async () => JSON.parse(Buffer.from(fx[key].body, 'base64').toString())) };
out.researchNumber_lookupOnlyMs = await ms(() => researchNumber(value, { lenses: ['number_lookup'], budget: { maxLenses: 1, depth: 1 }, rpc, lookupWindow: { limit: 500 } }));
out.getValueFamiliesMs = await ms(() => getValueFamilies(value, 12, { lookup: async () => rows }));
console.log(JSON.stringify(out));
