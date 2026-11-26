// Consolidated end-to-end report for "בדוק את האתר מקצה לקצה". Merges: the static site action map, the curated families file, the
// PASS/FAIL lines of the isolated QA run, the backend source that exists in this repository for each family, and the existing tests
// that mention each entry point. Reads files only. Usage: node scripts/site-e2e-report-2029.mjs [qa-log-or-report.json] [--json]
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const read = (file) => readFileSync(join(root, file), 'utf8');
const families = JSON.parse(read('qa/site-e2e-families.json')).families;
const map = JSON.parse(read('docs/site-action-map-2029.json'));
const input = process.argv.slice(2).find((arg) => !arg.startsWith('--'));
const lines = [];
if (input && existsSync(input)) {
  const raw = readFileSync(input, 'utf8');
  if (input.endsWith('.json')) for (const r of JSON.parse(raw).results) lines.push({ ok: r.ok, text: r.name });
  else for (const l of raw.split('\n')) { const m = /^(PASS|FAIL) (.*)$/.exec(l.trim()); if (m) lines.push({ ok: m[1] === 'PASS', text: m[2] }); }
}

// SQL that exists in the repository (applied migrations and proposed SQL); a function or table that is only in production cannot be built in the isolated stack.
const sqlFiles = [];
for (const dir of ['supabase/migrations', 'supabase/proposed']) {
  const walk = (d) => { for (const e of readdirSync(join(root, d), { withFileTypes: true })) { const p = `${d}/${e.name}`; if (e.isDirectory()) walk(p); else if (p.endsWith('.sql')) sqlFiles.push(p); } };
  if (existsSync(join(root, dir))) walk(dir);
}
const sql = [...sqlFiles.map((f) => read(f)), read('qa/extract/prod-definitions.sql')].join('\n');   // the definitions read from production count as repository SQL
const hasFn = (n) => new RegExp(`create\\s+(or\\s+replace\\s+)?function\\s+(public\\.)?"?${n}"?\\s*\\(`, 'i').test(sql);
const hasTable = (n) => new RegExp(`create\\s+table\\s+(if\\s+not\\s+exists\\s+)?(public\\.)?"?${n}"?\\s*\\(`, 'i').test(sql);

const rows = [];
for (const family of families) {
  const rpcSource = family.rpcs.map((n) => ({ name: n, inRepo: hasFn(n), tests: (map.rpcs[n]?.tests || []).length }));
  const tableSource = family.tables.map((n) => ({ name: n, inRepo: hasTable(n) }));
  const missing = [...rpcSource.filter((x) => !x.inRepo).map((x) => x.name), ...tableSource.filter((x) => !x.inRepo).map((x) => x.name)];
  const reachable = family.rpcs.length + family.tables.length === 0 || missing.length === 0;
  const existingTests = [...new Set(family.rpcs.flatMap((n) => map.rpcs[n]?.tests || []))];
  for (const sc of family.scenarios) {
    const matched = sc.results.map((prefix) => lines.filter((l) => l.text.startsWith(prefix)));
    let status, why = '';
    const failed = matched.flat().filter((l) => !l.ok);
    if (failed.length) { status = 'FAIL'; why = failed[0].text; }
    else if (sc.results.length && matched.every((m) => m.length)) status = 'PASS';
    else if (sc.results.length) { status = 'NOT_RUN'; why = 'the QA run did not print this result (run site-qa-2029.yml)'; }
    else if (sc.blocker) { status = 'NOT_TESTED'; why = `blocked: ${sc.blocker}`; }
    else if (!reachable) { status = 'NOT_TESTED'; why = `no scenario yet; the repository SQL does not define: ${missing.join(', ')} (they exist only in production; the isolated stack needs their definitions first)`; }
    else { status = 'NOT_TESTED'; why = 'no scenario yet; backend SQL exists in the repository'; }
    rows.push({ family: family.id, label: family.label, id: sc.id, scenario: sc.label, role: sc.role, status, why, fixtureTests: status === 'PASS' ? [] : existingTests.slice(0, 3) });
  }
}
const count = (s) => rows.filter((r) => r.status === s).length;
const totals = { PASS: count('PASS'), FAIL: count('FAIL'), NOT_RUN: count('NOT_RUN'), NOT_TESTED: count('NOT_TESTED'), scenarios: rows.length };
const routesWithTests = map.routes.filter((r) => r.tests.length).length;
if (process.argv.includes('--json')) { console.log(JSON.stringify({ totals, rows, routes: { total: map.routes.length, mentionedByAnyTest: routesWithTests } }, null, 1)); process.exit(totals.FAIL ? 1 : 0); }
const icon = { PASS: '✅', FAIL: '❌', NOT_RUN: '⏸', NOT_TESTED: '⬜' };
const out = [`## דוח מקצה לקצה`, ``, `עבר ${totals.PASS} · נכשל ${totals.FAIL} · לא הורץ ${totals.NOT_RUN} · טרם נבדק ${totals.NOT_TESTED} (מתוך ${totals.scenarios} תרחישים)`,
  `מפת האתר: ${map.routes.length} כתובות, ${routesWithTests} מוזכרות בבדיקה כלשהי (אזכור אינו הוכחה); ${Object.keys(map.rpcs).length} RPC נגישים מהקוד.`, ``];
let current = '';
for (const r of rows) { if (r.family !== current) { current = r.family; out.push(`### ${r.label}`); } out.push(`- ${icon[r.status]} ${r.scenario} [${r.role}]${r.why ? ` — ${r.why}` : ''}`); }
console.log(out.join('\n'));
process.exit(totals.FAIL ? 1 : 0);
