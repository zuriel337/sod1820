// #1462 owner gate (20.11.2026): the privacy floor may close leaks of hidden corpus rows, but it must
// not remove PUBLIC knowledge. Runs the real reviewed bodies (extensions.sql helper, privacy-floor
// before/after for atlas_findings and verified_bridges) in isolated PGlite and compares before/after
// for anon and admin. No live URL or credentials; fixture strings are synthetic.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
const db = new PGlite();
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const dir = 'supabase/proposed/sitewide-statistics-20261120/';
let checks = 0;
const check = (v, label) => { assert.ok(v, label); checks++; console.log('PASS', label); };
const rows = async sql => (await db.query(sql)).rows;
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth; create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
    create table users(id uuid primary key, role text);
    create function rd_is_admin() returns boolean language sql stable security definer set search_path=public as
      $$select exists(select 1 from public.users u where u.id=auth.uid() and u.role='admin')$$;
    grant execute on function rd_is_admin() to public;
    create table gematria_words(id uuid primary key default gen_random_uuid(),phrase text,ragil integer,is_verified boolean,is_published boolean,
      is_encrypted boolean,visibility_tier smallint,public_trend_approved boolean);
    create table gematria_blocklist(pattern text);
    create table gematria_wall(phrase text,private boolean,last_at timestamptz,hits integer);
    create table search_log(id bigint,term text,value integer,created_at timestamptz);
    create table visitor_events(id bigint,section text,slug text,event_type text,visitor_id text,created_at timestamptz);
    create table relation_evidence(relation_type text,method text,a_phrase text,b_phrase text,value integer,note text,engine_verified boolean,updated_at timestamptz,status text);
    create table anchor_families(root integer,status text);
    create function zero_root(integer) returns integer language sql immutable as $$select $1$$;
    create table word_aliases(alias text,lang text,word_id uuid,verified boolean,method text,created_at timestamptz,confidence numeric);
    create table language_links(foreign_word text,lang text,hebrew text,gematria_he integer,method text,note text,evidence_level text,human_verified boolean,created_at timestamptz,status text);
    alter table gematria_words enable row level security;
    -- the live permissive policy (20.11.2026) the restrictive floor composes with
    create policy anon_read_verified_gematria on gematria_words for select using (((is_encrypted=false) or (is_encrypted is null)) and is_verified=true and is_published=true);
    grant select on gematria_words to anon,authenticated;
  `);
  // The helper and RLS from the proposal (only the statements this test needs).
  const ext = read(dir + 'extensions.sql');
  const helper = ext.slice(0, ext.indexOf('create policy ti_public_word_floor'));
  await db.exec(helper.replace(/^revoke .*$/m, '') + '\ngrant execute on function public.gematria_public_word_eligible(uuid) to anon,authenticated;');
  await db.exec(`
    insert into users values('00000000-0000-0000-0000-00000000000a','admin');
    insert into gematria_words(phrase,ragil,is_verified,is_published,is_encrypted,visibility_tier) values
      ('ציבורי',100,true,true,false,3),        -- public, approved
      ('ציבורי_בקיר',100,true,true,false,3),   -- public, approved, someone also typed it privately on the wall
      ('טיוטה',100,true,false,false,3),        -- unpublished
      ('מוצפן',100,true,true,true,3);          -- encrypted
    insert into gematria_wall values('ציבורי_בקיר',true,now(),1);
    insert into relation_evidence(relation_type,method,a_phrase,b_phrase,value,status,updated_at) values
      ('eq','רגיל','ציבורי','ציבורי_בקיר',100,'confirmed',now()),
      ('eq','רגיל','ציבורי','לא_במאגר',100,'confirmed',now()),     -- a confirmed relation to a phrase that is not in the corpus
      ('eq','רגיל','ציבורי','טיוטה',100,'confirmed',now()),
      ('eq','רגיל','מוצפן','ציבורי',100,'confirmed',now());
    insert into language_links(foreign_word,lang,hebrew,gematria_he,status,created_at) values
      ('pub','en','ציבורי',100,'approved',now()),('absent','en','לא_במאגר',100,'approved',now()),('draft','en','טיוטה',100,'approved',now());
  `);
  await db.exec('set role anon');
  const restBefore = (await rows("select string_agg(phrase,',' order by phrase) v from gematria_words"))[0].v;
  await db.exec('reset role');
  await db.exec(ext.slice(ext.indexOf('create policy ti_public_word_floor'), ext.indexOf('-- Gematria corpus owner helper')));
  await db.exec('set role anon');
  const restAfter = (await rows("select string_agg(phrase,',' order by phrase) v from gematria_words"))[0].v;
  await db.exec('reset role');
  check(restBefore === restAfter && restAfter === 'ציבורי,ציבורי_בקיר', `REST anon reads the same public words before and after the floor (${restAfter})`);
  check((await rows("select public.gematria_public_word_eligible(id) v from gematria_words where phrase='ציבורי_בקיר'"))[0].v === true,
    'a private wall entry does not hide a published, verified corpus word');

  const atlas = "select count(*)::int n, string_agg(a_phrase||'~'||b_phrase,',' order by b_phrase) v from atlas_findings(null,100)";
  const bridges = "select count(*)::int n, string_agg(hebrew,',' order by hebrew) v from verified_bridges(100)";
  const run = async (sql, admin) => { await db.exec(`set test.uid='${admin ? '00000000-0000-0000-0000-00000000000a' : ''}'; set role ${admin ? 'authenticated' : 'anon'}`);
    const r = (await rows(sql))[0]; await db.exec('reset role'); return r; };
  for (const f of ['atlas_findings', 'verified_bridges']) {
    await db.exec(read(dir + `privacy-floor/${f}.before.sql`));
    await db.exec(`grant execute on function ${f === 'atlas_findings' ? 'atlas_findings(text,integer)' : 'verified_bridges(integer)'} to anon,authenticated`);
  }
  const before = { atlas: await run(atlas), bridges: await run(bridges) };
  for (const f of ['atlas_findings', 'verified_bridges']) await db.exec(read(dir + `privacy-floor/${f}.after.sql`));
  const after = { atlas: await run(atlas), bridges: await run(bridges), atlasAdmin: await run(atlas, true), bridgesAdmin: await run(bridges, true) };
  check(before.atlas.n === 4 && after.atlas.n === 2, `atlas_findings anon: 4 -> 2 (${after.atlas.v})`);
  check(after.atlas.v.includes('ציבורי~לא_במאגר'), 'a confirmed relation to a phrase absent from the corpus stays public');
  check(after.atlas.v.includes('ציבורי~ציבורי_בקיר'), 'a confirmed relation between public words stays public');
  check(!/טיוטה|מוצפן/.test(after.atlas.v), 'relations that touch an unpublished or encrypted corpus phrase are closed for anon');
  check(after.atlasAdmin.n === 4, 'admin keeps the full atlas (parity with the REST admin policy)');
  check(before.bridges.n === 3 && after.bridges.n === 2 && after.bridges.v === 'ציבורי,לא_במאגר'.split(',').sort().join(','), `verified_bridges anon: 3 -> 2 (${after.bridges.v}); an approved link to an absent phrase stays`);
  check(after.bridgesAdmin.n === 3, 'admin keeps every approved bridge');
  console.log(`PUBLIC FLOOR NON-REGRESSION ${checks} checks PASS (real reviewed bodies, isolated PGlite)`);
} catch (e) { console.error(e.message); process.exitCode = 1; } finally { await db.close(); }
