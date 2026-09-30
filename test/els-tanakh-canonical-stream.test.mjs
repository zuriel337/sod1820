import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, existsSync, rmSync, chmodSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const read = (p) => readFileSync(join(root, p), 'utf8');
const MIG_NAME = '20260930090000_g3_els_tanakh_canonical_stream_build_v1.sql';
const mig = read(`supabase/migrations/${MIG_NAME}`);
const letters = read('tools/els/data/tk-letters.txt');
const md5 = (s) => createHash('md5').update(s).digest('hex');

const TORAH_LEN = 304805;
const HASH = {
  all: 'baf161858c0b4dc57b5b96990bea18db',
  torah: '0066c2431821863d258745e664d3883e',
  suffix: 'f62203f8a916b11ad68bfb195f5ed238',
};

// Independent oracle over the canonical tk-letters blob (test-only; NOT an engine).
function oracle(term, smin, smax, startMin = 0, startMax = letters.length - 1) {
  const n = term.length, out = [];
  for (let skip = smin; skip <= smax; skip++) {
    for (let st = startMin; st <= startMax; st++) {
      if (letters[st] !== term[0]) continue;
      let f = st + (n - 1) * skip < letters.length, b = st - (n - 1) * skip >= 0;
      for (let k = 1; k < n && (f || b); k++) {
        if (f && letters[st + k * skip] !== term[k]) f = false;
        if (b && letters[st - k * skip] !== term[k]) b = false;
      }
      if (f) out.push({ skip, dir: 1, start: st });
      if (b) out.push({ skip, dir: -1, start: st });
    }
  }
  return out.sort((a, b) => a.skip - b.skip || a.start - b.start || b.dir - a.dir);
}

// Bounded Tanakh Golden: term יונה, skips 2..40, first 8 ordered hits (canonical tk-letters oracle).
const GOLDEN_TERM = 'יונה';
const GOLDEN_HITS = oracle(GOLDEN_TERM, 2, 40).slice(0, 8);
// Golden 2: first 5 skip-2 occurrences strictly after the Torah/Nevi'im boundary (keyset cursor after skip=2,start=304804,dir=-1).
const GOLDEN_NW_PAGE = oracle(GOLDEN_TERM, 2, 2, TORAH_LEN).slice(0, 5);

test('canonical tk-letters witness hashes match the assignment admission constants', () => {
  assert.equal(letters.length, 1204583);
  assert.equal(md5(letters), HASH.all);
  assert.equal(md5(letters.slice(0, TORAH_LEN)), HASH.torah);
  assert.equal(md5(letters.slice(TORAH_LEN)), HASH.suffix);
});

test('bounded Tanakh Goldens are fixed (canonical tk-letters oracle) and reach past the Torah boundary', () => {
  assert.deepEqual(GOLDEN_HITS.slice(0, 2), [
    { skip: 2, dir: -1, start: 13876 },
    { skip: 2, dir: 1, start: 44400 },
  ]);
  assert.deepEqual(GOLDEN_NW_PAGE, [
    { skip: 2, dir: 1, start: 318477 },
    { skip: 2, dir: -1, start: 319265 },
    { skip: 2, dir: 1, start: 349253 },
    { skip: 2, dir: 1, start: 361969 },
    { skip: 2, dir: 1, start: 362588 },
  ]);
  assert.ok(GOLDEN_NW_PAGE.every((h) => h.start >= TORAH_LEN));
});

test('migration: derived relation shape, RLS, service-only, hard admission before function replacement', () => {
  assert.match(mig, /create table public\.tanakh_stream \(\s*idx integer primary key,\s*ch text not null,\s*book_idx smallint\s*\)/i);
  assert.match(mig, /create index tanakh_stream_ch on public\.tanakh_stream \(ch, idx\)/i);
  assert.match(mig, /alter table public\.tanakh_stream enable row level security/i);
  assert.match(mig, /revoke all on table public\.tanakh_stream from public, anon, authenticated/i);
  assert.match(mig, /grant select on table public\.tanakh_stream to service_role/i);
  assert.doesNotMatch(mig, /create policy/i);
  for (const h of [1204583, HASH.all, HASH.torah, HASH.suffix]) assert.ok(mig.includes(String(h)), `admission constant ${h}`);
  const admission = mig.indexOf('TANAKH_STREAM_ADMISSION_FAILED');
  const firstReplace = mig.search(/create or replace function public\.els_search_core_v1/i);
  assert.ok(admission > 0 && firstReplace > admission, 'admission checks must precede canonical function replacement');
  assert.doesNotMatch(mig, /create or replace function public\.fn_els_corpus_id/i, 'corpus id must not change');
});

test('migration: MISSING_ADAPTER removed from executable code; one generator; no duplicated search semantics', () => {
  const code = mig.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
  assert.doesNotMatch(code, /MISSING_ADAPTER/);
  assert.doesNotMatch(code, /if v_scope\s*=\s*'tanakh' then/i);
  for (const fn of ['els_search_core_v1', 'els_search_page_core_v1', 'els_search_geometry_core_v1', 'els_verify_occurrence_v1']) {
    const start = code.search(new RegExp(`create or replace function public\\.${fn}\\(`, 'i'));
    assert.ok(start >= 0, fn);
    const body = code.slice(start, code.indexOf('$function$;', start + 30));
    assert.match(body, /els_occurrences_internal_v1\(v_scope,/, `${fn} must use the single generator with scope`);
    assert.doesNotMatch(body, /torah_stream|tanakh_stream/, `${fn} must not name a stream relation`);
    assert.doesNotMatch(body, /'scope','torah'/, `${fn} must report the requested scope`);
  }
  const generators = code.match(/create or replace function public\.els_\w*occurrences_internal_v1\(/gi) || [];
  assert.equal(generators.length, 2, 'one generator + one torah delegate');
  assert.match(code, /select \* from public\.els_occurrences_internal_v1\('torah'/);
  assert.match(code, /start0|h\.st-1 start0/);
});

test('migration: helper/generator grants are service-only', () => {
  for (const sig of ['els_stream_relation_v1\\(text\\)', 'els_stream_letters_v1\\(text\\)', 'els_occurrences_internal_v1\\(text,text,integer,integer,integer,integer\\)']) {
    assert.match(mig, new RegExp(`revoke all on function public\\.${sig} from public, anon, authenticated;\\s*grant execute on function public\\.${sig} to service_role;`));
  }
});

// ── executable acceptance on a throwaway local PostgreSQL (skipped when unavailable) ──
const PG = ['/usr/lib/postgresql/17/bin', '/usr/lib/postgresql/16/bin', '/usr/lib/postgresql/15/bin', '/usr/lib/postgresql/14/bin']
  .find((d) => existsSync(join(d, 'initdb')));
const canRun = PG && spawnSync('sh', ['-c', 'command -v psql'], { encoding: 'utf8' }).status === 0;

test('executable: migration admits derived stream and Tanakh runs through the one engine', { skip: !canRun && 'local PostgreSQL not available' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'els-tk-'));
  const asRoot = process.getuid && process.getuid() === 0;
  const run = (cmd, args, opts = {}) => {
    const [c, a] = asRoot ? ['runuser', ['-u', 'postgres', '--', cmd, ...args]] : [cmd, args];
    return spawnSync(c, a, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, ...opts });
  };
  chmodSync(dir, 0o777);
  const data = join(dir, 'data'), sock = dir, port = '54329';
  try {
    let r = run(join(PG, 'initdb'), ['-D', data, '-A', 'trust', '-U', 'postgres', '-E', 'UTF8', '--locale=C.UTF-8']);
    assert.equal(r.status, 0, r.stderr);
    r = run(join(PG, 'pg_ctl'), ['-D', data, '-o', `-k ${sock} -p ${port} -c listen_addresses=''`, '-l', join(dir, 'log'), '-w', 'start']);
    assert.equal(r.status, 0, r.stderr + (existsSync(join(dir, 'log')) ? readFileSync(join(dir, 'log'), 'utf8') : ''));
    const psql = (args, input) => run('psql', ['-h', sock, '-p', port, '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-X', '-q', '-At', ...args], input ? { input } : {});
    const file = (p) => psql(['-d', 't', '-f', join(root, p)]);
    assert.equal(psql(['-c', 'create database t']).status, 0);
    const db = (args, input) => psql(['-d', 't', ...args], input);

    // fixture + real data (torah prefix from the canonical blob; NW books as synthetic verse rows with
    // punctuation/spaces that the ELS normalization must strip; the live DB derivation hash was proven separately)
    r = db(['-f', join(root, 'test/els-tanakh-canonical-stream-fixture.sql')]); assert.equal(r.status, 0, r.stderr);
    const torahCsv = join(dir, 'torah.csv'), versesCsv = join(dir, 'verses.csv');
    const tl = letters.slice(0, TORAH_LEN);
    writeFileSync(torahCsv, Array.from(tl, (c, i) => `${i + 1},${c}`).join('\n') + '\n');
    const sfx = letters.slice(TORAH_LEN);
    const rows = [];
    let pos = 0, verse = 1, chap = 1, book = 5;
    while (pos < sfx.length) {
      const n = Math.min(sfx.length - pos, 61 + (pos % 17));
      const chunk = sfx.slice(pos, pos + n);
      // dress with spaces, niqqud (U+05B0), sof-pasuq and latin marks: all outside U+05D0..U+05EA and must be stripped
      const dressed = chunk.replace(/(.{5})/g, '$1\u05B0 ') + '\u05C3 (x)';
      rows.push(`${book},b${book},${chap},${verse},"${dressed}"`);
      pos += n; verse++;
      if (verse > 30) { verse = 1; chap++; }
      if (chap > 40 && book < 38 && sfx.length - pos > 0) { chap = 1; book++; }
    }
    writeFileSync(versesCsv, rows.join('\n') + '\n');
    r = db(['-c', `\\copy public.torah_stream(idx,ch) from '${torahCsv}' csv`]); assert.equal(r.status, 0, r.stderr);
    r = db(['-c', `\\copy public.tanach_verses(book_idx,book,chapter,verse,text) from '${versesCsv}' csv`]); assert.equal(r.status, 0, r.stderr);

    // baseline = the live-deployed ELS core tree (history up to main d009991e)
    for (const f of [
      '20260916150500_g3_els_callable_core_v1.sql', '20260916150600_g3_els_callable_core_search_path_v1.sql',
      '20260916150700_g3_els_callable_wrapper_security_v1.sql', '20260916150800_g3_els_legacy_projection_parity_v1.sql',
      '20260916150900_g3_els_core_compatibility_extension_v1.sql', '20260916151000_g3_els_core_compatibility_truth_hardening_v1.sql',
      '20260929200732_g3_els_provenance_v3_to_v9_reconciliation_v1.sql', '20260930004844_g3_els_one_engine_compat_wrapper_closure_v1.sql',
    ]) { r = file(`supabase/migrations/${f}`); assert.equal(r.status, 0, `${f}: ${r.stderr}`); }

    const torahProbes = `
      select 'core',   public.els_search_core_v1('יונה','torah',40,8,null)::text union all
      select 'core0',  public.els_search_core_v1('יונה','torah',1,8,null)::text union all
      select 'page',   public.els_search_page_core_v1('שדי','torah',2,30,10,null,null,null,null)::text union all
      select 'verify', public.els_verify_occurrence_v1('שדי','torah',2,1,${oracleTorahStart()})::text union all
      select 'geom',   public.els_search_geometry_core_v1('שדי','torah',50,0,4000,0,50,array[2,3,4],50)::text order by 1`;
    const before = db(['-c', torahProbes]); assert.equal(before.status, 0, before.stderr);
    r = db(['-c', `select public.els_search_core_v1('יונה','tanakh',40,8,null)->>'status'`]);
    assert.equal(r.stdout.trim(), 'MISSING_ADAPTER', 'baseline must still fail closed for Tanakh');

    // the migration under test
    r = file(`supabase/migrations/${MIG_NAME}`); assert.equal(r.status, 0, r.stderr);

    // hash proof
    r = db(['-c', `select count(*)||'|'||md5(string_agg(ch,'' order by idx))||'|'||md5(string_agg(ch,'' order by idx) filter (where idx<=${TORAH_LEN}))||'|'||md5(string_agg(ch,'' order by idx) filter (where idx>${TORAH_LEN})) from public.tanakh_stream`]);
    assert.equal(r.stdout.trim(), `1204583|${HASH.all}|${HASH.torah}|${HASH.suffix}`);

    // Torah Goldens unchanged (byte-identical JSON)
    const after = db(['-c', torahProbes]); assert.equal(after.status, 0, after.stderr);
    assert.equal(after.stdout, before.stdout, 'Torah search/page/replay/geometry output must be unchanged');

    // Tanakh executes and equals the independent tk-letters oracle
    r = db(['-c', `select public.els_search_core_v1('${GOLDEN_TERM}','tanakh',40,8,null)::text`]); assert.equal(r.status, 0, r.stderr);
    const t = JSON.parse(r.stdout.trim());
    assert.equal(t.status, 'OK'); assert.equal(t.scope, 'tanakh');
    assert.equal(t.corpus_id, '0b022e8eef6f9c16a20c3836c11e652e5cac45469016766f7f4fc670c9f84e1b');
    assert.equal(t.provenance.source_relation, 'public.tanakh_stream');
    assert.equal(t.provenance.corpus_letters, 1204583);
    assert.equal(t.coordinate.position_base, 0);
    assert.deepEqual(t.hits.map((h) => ({ skip: h.skip, dir: h.dir, start: h.start })), GOLDEN_HITS);
    assert.ok(t.hits.every((h) => h.coordinate_convention === 'zero_based_character_index' && h.positions[0] === h.start));
    const total = oracle(GOLDEN_TERM, 2, 40).length;
    assert.equal(t.els_count, total);

    // page: exhaustive keyset continuation equals oracle (skips 2..3)
    const want = oracle(GOLDEN_TERM, 2, 3);
    let got = [], after_ = ['null', 'null', 'null'];
    for (let guard = 0; guard < 400; guard++) {
      r = db(['-c', `select public.els_search_page_core_v1('${GOLDEN_TERM}','tanakh',2,3,50,${after_.join(',')},null)::text`]);
      assert.equal(r.status, 0, r.stderr);
      const p = JSON.parse(r.stdout.trim());
      assert.notEqual(p.status, 'MISSING_ADAPTER'); assert.equal(p.scope, 'tanakh');
      assert.equal(p.provenance.source_relation, 'public.tanakh_stream');
      got.push(...p.hits.map((h) => ({ skip: h.skip, dir: h.dir, start: h.start })));
      const c = p.completion.continuation;
      if (!c) break;
      after_ = [c.after.skip, c.after.start, c.after.dir];
    }
    assert.deepEqual(got, want);

    r = db(['-c', `select public.els_search_page_core_v1('${GOLDEN_TERM}','tanakh',2,2,5,2,${TORAH_LEN - 1},-1,null)::text`]);
    const nw = JSON.parse(r.stdout.trim());
    assert.deepEqual(nw.hits.map((h) => ({ skip: h.skip, dir: h.dir, start: h.start })), GOLDEN_NW_PAGE);
    assert.ok(nw.hits.every((h) => h.positions.every((p) => p >= 0 && p < 1204583)));

    // replay: MATCH on Golden hit, MISMATCH off-by-one; NW-region coordinates
    const g = GOLDEN_HITS[0];
    r = db(['-c', `select public.els_verify_occurrence_v1('${GOLDEN_TERM}','tanakh',${g.skip},${g.dir},${g.start})::text`]);
    let v = JSON.parse(r.stdout.trim());
    assert.equal(v.status, 'OK'); assert.equal(v.verification_state, 'MATCH'); assert.equal(v.scope, 'tanakh');
    assert.equal(v.occurrence.start, g.start); assert.equal(v.provenance.source_relation, 'public.tanakh_stream');
    r = db(['-c', `select public.els_verify_occurrence_v1('${GOLDEN_TERM}','tanakh',${g.skip},${g.dir},${g.start + 1})::text`]);
    v = JSON.parse(r.stdout.trim()); assert.equal(v.verification_state, 'MISMATCH');

    // geometry: Tanakh executes and each hit matches the oracle subset in the window
    r = db(['-c', `select public.els_search_geometry_core_v1('${GOLDEN_TERM}','tanakh',100,3000,3300,0,100,array[2,3,5],500)::text`]);
    const geo = JSON.parse(r.stdout.trim());
    assert.notEqual(geo.status, 'MISSING_ADAPTER'); assert.equal(geo.scope, 'tanakh');
    assert.equal(geo.provenance.source_relation, 'public.tanakh_stream');
    for (const h of geo.hits) assert.ok(oracle(GOLDEN_TERM, h.skip, h.skip, h.start, h.start).some((o) => o.dir === h.dir));

    // unknown scope still fail-closed; service-only underlying relation
    r = db(['-c', `select public.els_search_core_v1('יונה','bible',40,8,null)->>'status'`]);
    assert.equal(r.stdout.trim(), 'CORPUS_UNKNOWN');
    r = db(['-c', `select concat(has_table_privilege('anon','public.tanakh_stream','select'),has_table_privilege('authenticated','public.tanakh_stream','select'),has_table_privilege('service_role','public.tanakh_stream','select'),(select relrowsecurity from pg_class where relname='tanakh_stream'),(select count(*) from pg_policies where tablename='tanakh_stream'))`]);
    assert.equal(r.stdout.trim(), 'fftt0');
    r = db(['-c', `select string_agg(indexdef,'|' order by indexname) from pg_indexes where tablename='tanakh_stream'`]);
    assert.match(r.stdout, /tanakh_stream_ch.*\(ch, idx\).*tanakh_stream_pkey.*\(idx\)/);

    // fail-closed admission: a corrupted stream aborts the migration before functions are replaced
    r = db(['-c', `drop table public.tanakh_stream cascade; update public.tanach_verses set text = text || 'א' where book_idx=6 and chapter=1 and verse=1`]);
    r = file(`supabase/migrations/${MIG_NAME}`);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /TANAKH_STREAM_ADMISSION_FAILED/);
  } finally {
    run(join(PG, 'pg_ctl'), ['-D', data, '-m', 'immediate', 'stop']);
    rmSync(dir, { recursive: true, force: true });
  }
});

function oracleTorahStart() {
  const hit = oracle('שדי', 2, 2, 0, TORAH_LEN - 1).find((h) => h.dir === 1);
  return hit.start;
}
