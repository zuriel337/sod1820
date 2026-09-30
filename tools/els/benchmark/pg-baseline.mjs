#!/usr/bin/env node
// Canonical-SQL baseline for strategy A on a THROWAWAY local PostgreSQL (never touches Supabase).
// Loads torah_stream/tanakh_stream from the canonical tk-letters blob, applies the EXACT generator text from
// migration 20260930083354 (els_stream_relation_v1/els_stream_letters_v1/els_occurrences_internal_v1) and times
// `select count(*) / first-N` per case with a statement_timeout. Output: results/pg-baseline.json
//   node tools/els/benchmark/pg-baseline.mjs [--timeout 60000] [--runs 3]
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, chmodSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadCorpus, TORAH_LEN } from './corpus.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a, i, r) => a.startsWith('--') ? [a.slice(2), r[i + 1]] : []).filter((x) => x.length));
const TIMEOUT = Number(args.timeout ?? 60000), RUNS = Number(args.runs ?? 3);
const PG = ['/usr/lib/postgresql/17/bin', '/usr/lib/postgresql/16/bin', '/usr/lib/postgresql/15/bin', '/usr/lib/postgresql/14/bin'].find((d) => existsSync(join(d, 'initdb')));
if (!PG) { console.error('no local postgres'); process.exit(2); }
const root = new URL('../../../', import.meta.url).pathname;
const mig = readFileSync(join(root, 'supabase/migrations/20260930083354_g3_els_tanakh_canonical_stream_build_v1.sql'), 'utf8');
const a = mig.indexOf('create or replace function public.els_stream_relation_v1'), b = mig.indexOf('-- Torah-scope delegate');
if (a < 0 || b < a) throw new Error('generator extraction failed');
const generatorSql = mig.slice(a, b);
const { letters } = loadCorpus();

const dir = mkdtempSync(join(tmpdir(), 'els-bench-')); chmodSync(dir, 0o777);
const asRoot = process.getuid && process.getuid() === 0;
const run = (cmd, argv, opts = {}) => { const [c, a2] = asRoot ? ['runuser', ['-u', 'postgres', '--', cmd, ...argv]] : [cmd, argv]; return spawnSync(c, a2, { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, ...opts }); };
const data = join(dir, 'data'), port = '54331';
const psql = (argv, input) => run('psql', ['-h', dir, '-p', port, '-U', 'postgres', '-d', 't', '-v', 'ON_ERROR_STOP=1', '-X', '-q', '-At', ...argv], input ? { input } : {});
const out = [];
try {
  let r = run(join(PG, 'initdb'), ['-D', data, '-A', 'trust', '-U', 'postgres', '-E', 'UTF8', '--locale=C.UTF-8']); if (r.status) throw new Error(r.stderr);
  r = run(join(PG, 'pg_ctl'), ['-D', data, '-o', `-k ${dir} -p ${port} -c listen_addresses='' -c shared_buffers=512MB -c work_mem=256MB -c max_parallel_workers_per_gather=0`, '-l', join(dir, 'log'), '-w', 'start']); if (r.status) throw new Error(r.stderr);
  run('psql', ['-h', dir, '-p', port, '-U', 'postgres', '-c', 'create database t']);
  psql(['-c', `create table public.torah_stream(idx integer primary key, ch text not null); create index torah_stream_ch on public.torah_stream(ch,idx);
    create table public.tanakh_stream(idx integer primary key, ch text not null); create index tanakh_stream_ch on public.tanakh_stream(ch,idx);`]);
  const csv = join(dir, 's.csv'); writeFileSync(csv, Array.from(letters, (c, i) => `${i + 1},${c}`).join('\n') + '\n'); chmodSync(csv, 0o644);
  psql(['-c', `\\copy public.tanakh_stream(idx,ch) from '${csv}' csv`]);
  psql(['-c', `insert into public.torah_stream select idx,ch from public.tanakh_stream where idx<=${TORAH_LEN}; analyze;`]);
  r = psql(['-c', generatorSql]); if (r.status) throw new Error(r.stderr);
  const cases = [['torah', 'יונה', 1, 40], ['torah', 'תורה', 1, 40], ['torah', 'אליהו', 1, 500], ['torah', 'אל', 1, 40], ['torah', 'שדי', 1, null], ['torah', 'תורהקדשה', 1, null], ['tanakh', 'יונה', 1, 40], ['tanakh', 'תורה', 1, 500], ['tanakh', 'אליהו', 1, null]];
  for (const [scope, term, lo, hi] of cases) {
    const times = []; let count = null, status = 'OK';
    for (let k = 0; k < RUNS; k++) {
      const sql = `set statement_timeout=${TIMEOUT}; select count(*) from public.els_occurrences_internal_v1('${scope}','${term}',${lo},${hi ?? 'null'},null,null);`;
      const t0 = performance.now(); const x = psql(['-c', sql]); const ms = performance.now() - t0;
      if (x.status) { status = /statement timeout/.test(x.stderr) ? 'TIMEOUT' : 'ERROR:' + x.stderr.slice(0, 80); times.push(ms); break; }
      count = Number(x.stdout.trim().split('\n').pop()); times.push(ms);
    }
    const s = [...times].sort((p, q) => p - q);
    out.push({ scope, term, skip_min: lo, skip_max: hi, status, count, runs: times.length, median_ms: Math.round(s[Math.floor(s.length / 2)]), p95_ms: Math.round(s[Math.min(s.length - 1, Math.ceil(0.95 * s.length) - 1)]), timeout_ms: TIMEOUT });
    console.error(JSON.stringify(out.at(-1)));
  }
} finally {
  run(join(PG, 'pg_ctl'), ['-D', data, '-m', 'immediate', 'stop']); rmSync(dir, { recursive: true, force: true });
}
const resDir = new URL('./results/', import.meta.url).pathname; mkdirSync(resDir, { recursive: true });
writeFileSync(join(resDir, 'pg-baseline.json'), JSON.stringify({ note: 'strategy A canonical SQL generator (exact migration text) on throwaway local PG16; count(*) of full occurrence set (cap does not reduce cost: order-by after full join)', pg: PG, cases: out }, null, 1));
