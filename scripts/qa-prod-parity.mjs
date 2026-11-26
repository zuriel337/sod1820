#!/usr/bin/env node
// Drift detector between production and the QA definitions (ZURIEL 26.11.2026). Read-only and secret-free.
//   node scripts/qa-prod-parity.mjs --query          prints one SQL read: the extraction CTE of qa/extract/extract-definitions.sql compared with the
//                                                    committed md5 of every object; run it with the Supabase MCP execute_sql (or psql) as a read.
//   node scripts/qa-prod-parity.mjs --check <file>   reads that query's JSON result: empty = production and QA match; every row is a changed,
//                                                    missing or new object. Exit 1 on any difference.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadDefinitions } from './qa-prod-definitions-lib.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
if (args[0] === '--query') {
  const extraction = readFileSync(root + 'qa/extract/extract-definitions.sql', 'utf8').replace(/select kind, nm as name, md5\(ddl\) as md5, ddl from rows order by[\s\S]*$/, '');
  const values = loadDefinitions(root).map((o) => `('${o.kind}','${o.name.replace(/'/g, "''")}','${o.md5}')`).join(',\n  ');
  console.log(`${extraction}, expected(kind, name, md5) as (values\n  ${values}\n), prod as (select kind, nm as name, md5(ddl) as md5 from rows where kind <> 'dependency')\n` +
    `select coalesce(p.kind, e.kind) as kind, coalesce(p.name, e.name) as name, case when e.md5 is null then 'new_in_production' when p.md5 is null then 'missing_in_production' else 'changed' end as difference\n` +
    `from prod p full join expected e on e.kind = p.kind and e.name = p.name where p.md5 is distinct from e.md5 order by 1, 2;`);
} else if (args[0] === '--check' && args[1]) {
  const raw = readFileSync(args[1], 'utf8'), match = /\[[\s\S]*\]/.exec(raw);
  const rows = match ? JSON.parse(match[0]) : null;
  if (!Array.isArray(rows)) { console.error('parity: the result file holds no JSON array'); process.exit(2); }
  if (!rows.length) { console.log('PASS parity: production definitions match the QA definitions (0 differences)'); process.exit(0); }
  for (const r of rows) console.log(`FAIL parity: ${r.difference} ${r.kind} ${r.name}`);
  process.exit(1);
} else { console.error('usage: qa-prod-parity.mjs --query | --check <result.json>'); process.exit(2); }
