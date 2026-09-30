import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, existsSync, rmSync, chmodSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const read = (p) => readFileSync(join(root, p), 'utf8');
const MIG = '20260930120000_g3_els_verify_batch_v1.sql';
const mig = read(`supabase/migrations/${MIG}`);
const letters = read('tools/els/data/tk-letters.txt');
const TORAH_LEN = 304805;
const TANAKH_ID = '0b022e8eef6f9c16a20c3836c11e652e5cac45469016766f7f4fc670c9f84e1b';

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
  return out;
}

test('static: one set-wise verifier, service-only ACL, caps, corpus binding before verification', () => {
  assert.doesNotMatch(mig, /create\s+table/i);
  assert.match(mig, /c_max_candidates constant integer := 4000/);
  assert.match(mig, /c_max_letter_checks constant integer := 64000/);
  assert.ok(mig.indexOf("'CORPUS_MISMATCH'") < mig.indexOf('els_verify_batch_core_v1(v_scope, v_term, v_skips'), 'corpus binding precedes coordinate verification');
  assert.match(mig, /revoke all on function public\.els_verify_batch_v1\(text,text,text,jsonb,jsonb\) from public, anon, authenticated;\s*grant execute on function public\.els_verify_batch_v1\(text,text,text,jsonb,jsonb\) to service_role;/);
  assert.match(mig, /revoke all on function public\.els_verify_batch_core_v1\([^)]*\) from public, anon, authenticated;/);
  const single = mig.slice(mig.search(/CREATE OR REPLACE FUNCTION public\.els_verify_occurrence_v1/));
  assert.match(single, /els_verify_batch_core_v1\(/, 'single verifier delegates');
  assert.doesNotMatch(single, /els_occurrences_internal_v1\(v_scope/, 'single verifier no longer has own match semantics');
  assert.match(mig, /'negative_authority',false/);
});

const PG = ['/usr/lib/postgresql/17/bin', '/usr/lib/postgresql/16/bin', '/usr/lib/postgresql/15/bin', '/usr/lib/postgresql/14/bin']
  .find((d) => existsSync(join(d, 'initdb')));
const canRun = PG && spawnSync('sh', ['-c', 'command -v psql'], { encoding: 'utf8' }).status === 0;

test('CI: executable SQL gate must not be skipped', () => { if (process.env.ELS_REQUIRE_EXECUTABLE) assert.ok(canRun, 'ELS_REQUIRE_EXECUTABLE=1 but PostgreSQL is missing'); });

test('executable: batch verifier parity with single verifier + tk-letters oracle (Torah + Tanakh)', { skip: !canRun && 'local PostgreSQL not available' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'els-vb-'));
  const asRoot = process.getuid && process.getuid() === 0;
  const run = (cmd, args, opts = {}) => {
    const [c, a] = asRoot ? ['runuser', ['-u', 'postgres', '--', cmd, ...args]] : [cmd, args];
    return spawnSync(c, a, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, ...opts });
  };
  chmodSync(dir, 0o777);
  const data = join(dir, 'data'), port = '54331';
  try {
    let r = run(join(PG, 'initdb'), ['-D', data, '-A', 'trust', '-U', 'postgres', '-E', 'UTF8', '--locale=C.UTF-8']);
    assert.equal(r.status, 0, r.stderr);
    r = run(join(PG, 'pg_ctl'), ['-D', data, '-o', `-k ${dir} -p ${port} -c listen_addresses=''`, '-l', join(dir, 'log'), '-w', 'start']);
    assert.equal(r.status, 0, r.stderr);
    const psql = (args) => run('psql', ['-h', dir, '-p', port, '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-X', '-q', '-At', ...args]);
    assert.equal(psql(['-c', 'create database t']).status, 0);
    let seq = 0;
    const db = (sql) => { const f = join(dir, `q${seq++}.sql`); writeFileSync(f, sql.startsWith('\\') ? sql : sql + ';\n'); chmodSync(f, 0o644); return sql.startsWith('\\') ? psql(['-d', 't', '-c', sql]) : psql(['-d', 't', '-f', f]); };
    const file = (p) => psql(['-d', 't', '-f', join(root, p)]);
    const J = (sql) => { const x = db(sql); assert.equal(x.status, 0, x.stderr); return JSON.parse(x.stdout.trim()); };

    r = file('test/els-tanakh-canonical-stream-fixture.sql'); assert.equal(r.status, 0, r.stderr);
    const torahCsv = join(dir, 'torah.csv'), versesCsv = join(dir, 'verses.csv');
    writeFileSync(torahCsv, Array.from(letters.slice(0, TORAH_LEN), (c, i) => `${i + 1},${c}`).join('\n') + '\n');
    const sfx = letters.slice(TORAH_LEN), rows = [];
    let pos = 0, verse = 1, chap = 1, book = 5;
    while (pos < sfx.length) {
      const n = Math.min(sfx.length - pos, 61 + (pos % 17));
      rows.push(`${book},b${book},${chap},${verse},"${sfx.slice(pos, pos + n).replace(/(.{5})/g, '$1ְ ') + '׃ (x)'}"`);
      pos += n; verse++;
      if (verse > 30) { verse = 1; chap++; }
      if (chap > 40 && book < 38 && sfx.length - pos > 0) { chap = 1; book++; }
    }
    writeFileSync(versesCsv, rows.join('\n') + '\n');
    r = db(`\\copy public.torah_stream(idx,ch) from '${torahCsv}' csv`); assert.equal(r.status, 0, r.stderr);
    r = db(`\\copy public.tanach_verses(book_idx,book,chapter,verse,text) from '${versesCsv}' csv`); assert.equal(r.status, 0, r.stderr);
    for (const f of [
      '20260916150500_g3_els_callable_core_v1.sql', '20260916150600_g3_els_callable_core_search_path_v1.sql',
      '20260916150700_g3_els_callable_wrapper_security_v1.sql', '20260916150800_g3_els_legacy_projection_parity_v1.sql',
      '20260916150900_g3_els_core_compatibility_extension_v1.sql', '20260916151000_g3_els_core_compatibility_truth_hardening_v1.sql',
      '20260929200732_g3_els_provenance_v3_to_v9_reconciliation_v1.sql', '20260930004844_g3_els_one_engine_compat_wrapper_closure_v1.sql',
      '20260930083354_g3_els_tanakh_canonical_stream_build_v1.sql',
    ]) { r = file(`supabase/migrations/${f}`); assert.equal(r.status, 0, `${f}: ${r.stderr}`); }

    // old single verifier output captured BEFORE the migration (representative valid/invalid, torah + tanakh)
    const hits = oracle('יונה', 2, 40).slice(0, 6);
    const probes = [];
    for (const h of hits) { probes.push(['יונה', 'tanakh', h.skip, h.dir, h.start], ['יונה', 'tanakh', h.skip, h.dir, h.start + 1], ['יונה', 'tanakh', h.skip, -h.dir, h.start]); }
    const torahHit = oracle('שדי', 2, 2, 0, TORAH_LEN - 1)[0];
    probes.push(['שדי', 'torah', 2, torahHit.dir, torahHit.start], ['שדי', 'torah', 2, torahHit.dir, torahHit.start + 2],
      ['שדי', 'torah', 1820, 1, 10065], ['שדי', 'torah', 1, 1, 0], ['ש', 'torah', 2, 1, 0], ['שדי', 'torah', 2, 0, 0], ['שדי', 'torah', 2, 1, -1],
      ['שדי', 'torah', 2, 1, 304804], ['שדי', 'tanakh', 2, 1, 1204582], ['שדי', 'tanakh', 3, -1, 1], ['שדי', 'bible', 2, 1, 0]);
    const sql = (p) => `select public.els_verify_occurrence_v1('${p[0]}','${p[1]}',${p[2]},${p[3]},${p[4]})::text`;
    const before = probes.map((p) => J(sql(p)));
    r = file(`supabase/migrations/${MIG}`); assert.equal(r.status, 0, r.stderr);
    const after = probes.map((p) => J(sql(p)));
    const strip = (o) => { const c = JSON.parse(JSON.stringify(o)); if (c.provenance) delete c.provenance.verifier; return c; };
    assert.deepEqual(after.map(strip), before, 'public single-verifier contract unchanged (all valid/invalid probes)');

    // ACL
    r = db(`select concat(has_function_privilege('anon','public.els_verify_batch_v1(text,text,text,jsonb,jsonb)','execute'),has_function_privilege('authenticated','public.els_verify_batch_v1(text,text,text,jsonb,jsonb)','execute'),has_function_privilege('service_role','public.els_verify_batch_v1(text,text,text,jsonb,jsonb)','execute'),has_function_privilege('anon','public.els_verify_batch_core_v1(text,text,integer[],integer[],integer[])','execute'),has_function_privilege('anon','public.els_verify_occurrence_v1(text,text,integer,integer,integer)','execute'))`);
    assert.equal(r.stdout.trim(), 'fftft' + '');

    const batch = (term, scope, cid, cands, strat = null) =>
      J(`select public.els_verify_batch_v1('${term}','${scope}',${cid === null ? 'null' : `'${cid}'`},'${JSON.stringify(cands)}'::jsonb,${strat ? `'${JSON.stringify(strat)}'::jsonb` : 'null'})::text`);

    // exact set: oracle hits all MATCH, perturbed all rejected, dedupe preserves first order
    const all = oracle('יונה', 2, 25);
    const good = all.map((h) => ({ skip: h.skip, dir: h.dir, start: h.start }));
    const bad = good.slice(0, 20).map((h) => ({ ...h, start: h.start + 1 }));
    const dup = [good[3], good[0], good[3], good[1], good[0]];
    let b = batch('יונה', 'tanakh', TANAKH_ID, [...bad, ...good, ...dup], { policy: 'ADAPTIVE_CAPPED_V1', strategy: 'HYBRID_COVERAGE_V1' });
    assert.equal(b.status, 'OK');
    assert.equal(b.corpus_id, TANAKH_ID);
    const goodKeys = new Set(good.map((g) => `${g.skip}/${g.dir}/${g.start}`));
    assert.ok(b.verified.every((o) => goodKeys.has(`${o.skip}/${o.dir}/${o.start}`)), 'only oracle-true coordinates verified');
    assert.equal(b.verified.length, good.length, 'every oracle hit verified exactly once');
    assert.equal(b.counts.duplicates, dup.length + 0, 'oracle-true duplicates counted');
    assert.equal(b.counts.received, bad.length + good.length + dup.length);
    assert.equal(b.counts.unique + b.counts.duplicates + b.counts.invalid, b.counts.received);
    assert.equal(b.counts.verified + b.counts.mismatch, b.counts.unique);
    assert.equal(b.strategy.policy, 'ADAPTIVE_CAPPED_V1');
    assert.equal(b.completion.negative_authority, false);
    const h0 = b.verified[0];
    assert.equal(h0.occurrence_id, `els:${TANAKH_ID}:יונה:${h0.skip}:${h0.dir}:${h0.start}`);
    assert.equal(h0.positions[0], h0.start);
    assert.equal(h0.coordinate_convention, 'zero_based_character_index');
    // first-order preservation on dedupe
    b = batch('יונה', 'tanakh', TANAKH_ID, [good[5], good[2], good[5], good[2], good[0]]);
    assert.deepEqual(b.verified.map((o) => o.input_ordinal), [0, 1, 4]);
    assert.equal(b.counts.duplicates, 2);

    // parity: batch verdict == old single verifier verdict per probe
    for (const p of probes.filter((x) => x[1] !== 'bible' && x[0].length >= 2 && x[2] >= 2 && [-1, 1].includes(x[3]) && x[4] >= 0)) {
      const single = J(sql(p));
      const bb = batch(p[0], p[1], single.corpus_id, [{ skip: p[2], dir: p[3], start: p[4] }]);
      assert.equal(bb.verified.length === 1, single.verification_state === 'MATCH', JSON.stringify(p));
    }

    // invalid members counted, never verified
    b = batch('יונה', 'tanakh', TANAKH_ID, [{ skip: 1, dir: 1, start: 0 }, { skip: 2, dir: 0, start: 0 }, { skip: 2, dir: 1, start: -5 }, { skip: 'x', dir: 1, start: 0 }, {}, good[0]]);
    assert.equal(b.counts.invalid, 5); assert.equal(b.verified.length, 1);

    // corpus mismatch fails closed BEFORE coordinate verification; scope mixups rejected
    b = batch('יונה', 'tanakh', '0b022e8eef6f9c16', good.slice(0, 3));
    assert.equal(b.status, 'CORPUS_MISMATCH'); assert.equal(b.verification_state, 'NOT_TESTED'); assert.equal(b.verified, undefined);
    b = batch('יונה', 'torah', TANAKH_ID, good.slice(0, 3)); assert.equal(b.status, 'CORPUS_MISMATCH');
    b = batch('יונה', 'torah', null, good.slice(0, 3)); assert.equal(b.status, 'CORPUS_MISMATCH');
    b = batch('יונה', 'bible', TANAKH_ID, good.slice(0, 3)); assert.equal(b.status, 'CORPUS_UNKNOWN');

    // caps: 4000 candidates; 64000 letter-checks (unique*len)
    const many = (n) => Array.from({ length: n }, (_, i) => ({ skip: 2 + (i % 500), dir: 1, start: Math.floor(i / 500) }));
    b = batch('יונה', 'tanakh', TANAKH_ID, many(4001)); assert.equal(b.status, 'BUDGET_EXCEEDED'); assert.equal(b.reason, 'max_candidates');
    b = batch('יונה', 'tanakh', TANAKH_ID, many(4000)); assert.equal(b.status, 'OK'); assert.equal(b.counts.letter_checks, 16000);
    const long = 'אבגדהוזחטיכלמנ'; // 14 letters * 4000 = 56000 OK; 17 letters * 4000 = 68000 over
    b = batch(long, 'tanakh', TANAKH_ID, many(4000)); assert.equal(b.status, 'OK');
    b = batch(long + 'סעפ', 'tanakh', TANAKH_ID, many(4000)); assert.equal(b.status, 'BUDGET_EXCEEDED'); assert.equal(b.reason, 'max_letter_checks');
    // dedupe applies before the letter-check budget
    b = batch(long + 'סעפ', 'tanakh', TANAKH_ID, Array.from({ length: 4000 }, () => good[0])); assert.equal(b.status, 'OK'); assert.equal(b.counts.unique, 1);

    // empty verified set is never a negative authority
    b = batch('זזזזז', 'tanakh', TANAKH_ID, [{ skip: 2, dir: 1, start: 0 }]);
    assert.equal(b.verified.length, 0); assert.equal(b.completion.negative_authority, false);
    assert.notEqual(b.status, 'EXECUTED_EMPTY');

    // ── publish truth gate (forward-only): executable against stubbed legacy save/moderate surface ──
    const GATE = '20260930130000_g3_els_publish_truth_gate_v1.sql';
    const gmig = read(`supabase/migrations/${GATE}`);
    assert.doesNotMatch(gmig, /\bupdate\s+public\.els_records\s+set[^;]*where\s+status/i, 'no historical backfill');
    r = db(`
      create or replace function public.fn_els_term_norm(p text) returns text language sql immutable as $$ select translate(regexp_replace(coalesce(p,''),'[^א-ת]','','g'),'ךםןףץ','כמנפצ') $$;
      create or replace function public.els_slugify(p text, s integer) returns text language sql immutable as $$ select regexp_replace(coalesce(p,''),'[^א-תa-z0-9]+','-','g')||'-'||coalesce(s,0) $$;
      create schema if not exists auth;
      create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
      create table public.users(id uuid primary key, role text, display_name text, username text, email text);
      create table public.els_records(id uuid primary key default gen_random_uuid(), owner_user_id uuid, author_name text, search_term text, scope text, skip_distance integer, direction text, positions jsonb, image_url text, title text, description text, source text, status text, visibility text, slug text unique, self_published boolean, corpus_id text, term_norm text, start_index integer, engine_detail jsonb, created_at timestamptz default now());
      create table public.user_notifications(user_id uuid, email text, kind text, title text, body text, link text);
      create table public.topic_cards(slug text, node_id uuid);
      create table public.research_contributions(author_user_id uuid, author_name text, intent text, origin text, research_state text, status text, target_type text, target_id text, title text, body text, gematria_claim text, graph_node_id uuid);
      insert into public.users values ('00000000-0000-0000-0000-00000000000a','admin','A','a','a@x'),('00000000-0000-0000-0000-00000000000b','user','B','b','b@x');
      -- legacy surface as it exists live (ACL: save = default PUBLIC execute; moderate = authenticated only)
      create or replace function public.save_els_matrix(p_term text, p_scope text default 'torah', p_skip integer default null, p_direction text default null, p_positions jsonb default null, p_image_url text default null, p_title text default null, p_note text default null, p_public boolean default true, p_from_topic text default null, p_corpus_id text default null, p_term_norm text default null, p_start_index integer default null, p_engine_detail jsonb default null) returns uuid language sql as $$ select null::uuid $$;
      create or replace function public.moderate_els_matrix(p_id uuid, p_status text) returns void language sql as $$ select 1 $$;
      do $$ begin if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if; end $$;
    `);
    assert.equal(r.status, 0, r.stderr);
    // pre-existing (legacy) rows: a published legacy row with incomplete identity, and 3 pending identity-complete MATCH rows
    const tk = oracle('שדי', 2, 2, 0, TORAH_LEN - 1).slice(0, 3);
    const dname = (d) => (d === 1 ? 'fwd' : 'back');
    db(`insert into public.els_records(id,search_term,scope,skip_distance,direction,status,visibility,slug,source) values ('11111111-1111-1111-1111-111111111111','שדי','torah',2,null,'published','public','legacy-incomplete','admin')`);
    tk.forEach((h, i) => db(`insert into public.els_records(id,owner_user_id,search_term,scope,skip_distance,direction,start_index,corpus_id,status,visibility,slug,source) values ('2222222${i}-2222-2222-2222-222222222222','00000000-0000-0000-0000-00000000000b','שדי','torah',2,'${dname(h.dir)}',${h.start},'0b022e8eef6f9c16','pending','private','pend-${i}','community')`));
    const beforeLegacy = J(`select row_to_json(e)::text from public.els_records e where slug='legacy-incomplete'`);
    r = file(`supabase/migrations/${GATE}`); assert.equal(r.status, 0, r.stderr);
    const ADMIN = '00000000-0000-0000-0000-00000000000a', USER = '00000000-0000-0000-0000-00000000000b';
    const as = (uid, sql) => db(`set test.uid='${uid}'; ${sql}`);
    const fails = (x, re) => { assert.notEqual(x.status, 0, 'must be rejected'); assert.match(x.stderr, re); };
    const good0 = tk[0];
    const save = (uid, term, skip, dir, start, pub = true) => as(uid, `select public.save_els_matrix('${term}','torah',${skip},${dir === null ? 'null' : `'${dir}'`},null,null,null,null,${pub},null,null,null,${start === null ? 'null' : start},null)`);
    // (a) admin direct RPC: invalid / incomplete primary occurrence cannot create a published row
    fails(save(ADMIN, 'שדי', 2, dname(good0.dir), good0.start + 1), /els_publish_gate: REPLAY_MISMATCH/);
    fails(save(ADMIN, 'שדי', 2, dname(-good0.dir), good0.start), /els_publish_gate: REPLAY_MISMATCH/);
    fails(save(ADMIN, 'שדי', 2, null, good0.start), /IDENTITY_INCOMPLETE:direction/);
    fails(save(ADMIN, 'שדי', 2, dname(good0.dir), null), /IDENTITY_INCOMPLETE:start_index/);
    fails(save(ADMIN, 'שדי', null, dname(good0.dir), good0.start), /IDENTITY_INCOMPLETE:skip/);
    fails(save(ADMIN, 'ש', 2, dname(good0.dir), good0.start), /IDENTITY_INCOMPLETE:term/);
    assert.equal(J(`select count(*) from public.els_records where slug like 'שדי-2%' or slug like '-2%'`), 0, 'nothing published by rejected saves');
    // (b) admin valid MATCH publishes with server-derived identity
    r = save(ADMIN, 'שדי', 2, dname(good0.dir), good0.start + 0); // existing pending row key matches?  (admin upsert edit branch keeps status)
    assert.equal(r.status, 0, r.stderr);
    const fresh = oracle('שדי', 2, 2, 0, TORAH_LEN - 1)[3];
    r = save(ADMIN, 'שדי', 2, dname(fresh.dir), fresh.start); assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(J(`select json_build_array(status,source,corpus_id,start_index)::text from public.els_records where search_term='שדי' and start_index=${fresh.start} and owner_user_id='${ADMIN}'`), ['published', 'admin', '0b022e8eef6f9c16', fresh.start], 'new MATCH insert publishes');
    // (c) non-admin community intake is preserved: invalid/incomplete still lands pending (never published)
    r = save(USER, 'שדי', 2, dname(good0.dir), good0.start + 1); assert.equal(r.status, 0, r.stderr);
    assert.equal(J(`select json_agg(status)::text from public.els_records where owner_user_id='${USER}'`)[0], 'pending');
    // (d) moderation: incomplete legacy cannot be (re)published -> explicit re-anchor; wrong occurrence cannot publish
    db(`update public.els_records set status='pending' where slug='legacy-incomplete'`);
    fails(as(ADMIN, `select public.moderate_els_matrix('11111111-1111-1111-1111-111111111111','published')`), /IDENTITY_INCOMPLETE/);
    db(`update public.els_records set start_index=start_index+1 where slug='pend-0'`);
    fails(as(ADMIN, `select public.moderate_els_matrix('22222220-2222-2222-2222-222222222222','published')`), /els_publish_gate: REPLAY_MISMATCH/);
    db(`update public.els_records set start_index=start_index-1 where slug='pend-0'`);
    // (e) current-pending analogue: identity-complete MATCH pending rows remain publishable; pending/hidden transitions ungated
    for (let i = 0; i < 3; i++) { r = as(ADMIN, `select public.moderate_els_matrix('2222222${i}-2222-2222-2222-222222222222','published')`); assert.equal(r.status, 0, r.stderr); }
    assert.equal(J(`select json_agg(status order by slug)::text from public.els_records where slug like 'pend-%'`).join(','), 'published,published,published');

    // (f) post-approval mutation: owner cannot edit approved evidence in place; admin can edit only while primary replay still MATCHes.
    const pub1 = '22222221-2222-2222-2222-222222222222';
    fails(as(USER, `select public.update_els_matrix('${pub1}','{"forged":true}'::jsonb,null,null,null)`), /published_requires_remoderation/);
    assert.equal(J(`select to_json(positions is null)::text from public.els_records where id='${pub1}'`), true, 'rejected owner edit leaves published row unchanged');
    r = as(ADMIN, `select public.update_els_matrix('${pub1}','{"admin_note":"verified-primary"}'::jsonb,null,null,null)`); assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(J(`select positions::text from public.els_records where id='${pub1}'`), { admin_note: 'verified-primary' }, 'admin edit allowed only after stored primary MATCH gate');
    // The save/upsert path also cannot mutate an owner-published row: same identity becomes a NEW pending variant.
    const ownerStart = tk[2].start, ownerDir = dname(tk[2].dir);
    r = save(USER, 'שדי', 2, ownerDir, ownerStart); assert.equal(r.status, 0, r.stderr);
    assert.equal(J(`select count(*) from public.els_records where owner_user_id='${USER}' and start_index=${ownerStart} and status='published'`), 1);
    assert.equal(J(`select count(*) from public.els_records where owner_user_id='${USER}' and start_index=${ownerStart} and status='pending'`), 1, 'owner re-save creates pending variant instead of mutating approved evidence');

    r = as(ADMIN, `select public.moderate_els_matrix('11111111-1111-1111-1111-111111111111','hidden')`); assert.equal(r.status, 0, r.stderr);
    // (g) forward-only: no historical row rewritten by the migration or the gate
    db(`update public.els_records set status='published' where slug='legacy-incomplete'`);
    const afterLegacy = J(`select row_to_json(e)::text from public.els_records e where slug='legacy-incomplete'`);
    assert.deepEqual({ ...afterLegacy, status: null }, { ...beforeLegacy, status: null }, 'legacy row untouched');
    // already-published rows are not re-gated (no rewrite): re-publishing the legacy published row is a no-op success
    r = as(ADMIN, `select public.moderate_els_matrix('11111111-1111-1111-1111-111111111111','published')`); assert.equal(r.status, 0, r.stderr);
    // (h) ACL: gate helper not callable by public roles
    r = db(`select concat(has_function_privilege('anon','public.els_publish_truth_gate_v1(text,text,integer,text,integer,text,boolean)','execute'),has_function_privilege('authenticated','public.els_publish_truth_gate_v1(text,text,integer,text,integer,text,boolean)','execute'),has_function_privilege('service_role','public.els_publish_truth_gate_v1(text,text,integer,text,integer,text,boolean)','execute'))`);
    assert.equal(r.stdout.trim(), 'fft');
    // batch verifier ACL still service-role-only after the gate migration
    r = db(`select concat(has_function_privilege('anon','public.els_verify_batch_v1(text,text,text,jsonb,jsonb)','execute'),has_function_privilege('authenticated','public.els_verify_batch_v1(text,text,text,jsonb,jsonb)','execute'))`);
    assert.equal(r.stdout.trim(), 'ff');
  } finally {
    run(join(PG, 'pg_ctl'), ['-D', data, '-m', 'immediate', 'stop']);
    rmSync(dir, { recursive: true, force: true });
  }
});
