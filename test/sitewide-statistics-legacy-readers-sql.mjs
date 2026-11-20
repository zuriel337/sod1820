// #1461 acceptance review: isolated PGlite proof for legacy-readers-hardening.psql.
// No live URL or credentials. Reader bodies for fn_name_research/reality_scan/
// fn_name_research_stats are stubs: only their grants are changed by the proposal.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
const db = new PGlite();
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const dir = 'supabase/proposed/sitewide-statistics-20261120/';
let checks = 0;
const check = (v, label) => { assert.ok(v, label); checks++; console.log('PASS', label); };
const scalar = async sql => (await db.query(sql)).rows[0]?.v;
// Inline \ir, drop psql meta-commands and the live-only md5 preflight block.
const psql = file => read(dir + file).split('\n').map(line => {
  const inc = /^\\ir\s+(\S+)/.exec(line);
  return inc ? read(dir + inc[1]) + '\n;' : line.startsWith('\\') ? '' : line;
}).join('\n').replace(/do \$\$ begin[\s\S]*?end \$\$;/, '');
try {
  await db.exec(read('tests/measurement-identity-20261115/fixture.sql'));
  await db.exec(`
    create role service_role;
    create table gematria_words(id uuid primary key default gen_random_uuid(),phrase text,ragil integer,is_verified boolean,is_published boolean,is_encrypted boolean,visibility_tier integer,lead_rank integer);
    create table gematria_wall(phrase text,private boolean,last_at timestamptz,hits integer);
    create table gematria_blocklist(pattern text);
    create table search_log(id bigint,term text,value integer,created_at timestamptz);
    create table analytics_cache(cache_key text primary key,payload jsonb,computed_at timestamptz,cache_kind text,producer text,producer_version text,input_identity text,expires_at timestamptz,invalidated_at timestamptz,billable_state text,hit_count bigint default 0,last_hit_at timestamptz);
    create table topic_cards_public(id uuid);
    create table els_records(id uuid,status text,visibility text,home_hidden boolean);
    create table posts(id bigint,slug text,title text,tags text[]);
    create table bidim(value integer,phrase text,method text);
    create table visitor_events(section text,slug text,event_type text,visitor_id text,created_at timestamptz);
    create table convergences(value integer,group_size integer);
    create table nodes(type text,label text);
    create table decision_ledger(subject_ref text,status text);
    alter table gematria_words enable row level security;
    create policy baseline_words on gematria_words for select using(is_verified and is_published and not coalesce(is_encrypted,false));
    grant select on gematria_words to anon,authenticated;
    create function fn_name_research(text) returns jsonb language sql security definer as $$select '{}'::jsonb$$;
    create function reality_scan(integer,integer) returns table(value integer) language sql security definer as $$select 1$$;
    create function fn_name_research_stats(integer) returns jsonb language sql security definer as $$select '{}'::jsonb$$;
    create function journey_pulse() returns jsonb language sql security definer as $$select '{}'::jsonb$$;
    create function activity_pulse() returns json language sql security definer as $$select '{}'::json$$;
    create function site_pulse_today() returns json language sql security definer as $$select '{}'::json$$;
    create function live_stats() returns json language sql security definer as $$select '{}'::json$$;
    create function admin_research_map(integer) returns jsonb language sql security definer as $$select '{}'::jsonb$$;
    create function save_wall_word_private(text,integer) returns void language sql security definer as $$select$$;
    grant execute on function journey_pulse(),activity_pulse(),site_pulse_today(),live_stats(),save_wall_word_private(text,integer) to anon,authenticated;
    create function url_decode(text) returns text language sql immutable as $$select $1$$;
    create function fn_ragil(text) returns integer language sql immutable as $$select 0$$;
    create or replace function fn_ti_clean_classification(date,date) returns table(session_id text,clean_classification text,clean_eligible boolean)
      language sql as $$select distinct session_id,case when session_id like 'human-%' then 'human' else 'unknown' end,session_id like 'human-%' from events$$;
  `);
  // Live TI chain: the unmodified fn_human_entrances preimage plus the entity-demand readers.
  await db.exec(read(dir + 'fn_human_entrances.before.sql'));
  await db.exec(read(dir + 'fn_ti_entity_demand.fixture.sql'));
  // The current live preimages, then the proposal on top (needs extensions.sql first).
  await db.exec(read(dir + 'number_cross_resonance.before.sql'));
  await db.exec(read(dir + 'fn_raziel_research_intel.before.sql'));
  await db.exec("grant execute on function number_cross_resonance(text,jsonb,integer),fn_name_research(text),reality_scan(integer,integer) to anon,authenticated");
  await db.exec(read(dir + 'analytics_cache_producer_version_v1.fixture.sql'));
  await db.exec(read(dir + 'analytics_cache_get_v1.fixture.sql'));
  await db.exec(read(dir + 'extensions.sql'));
  await db.exec(`
    insert into gematria_words(phrase,ragil,is_verified,is_published,is_encrypted,visibility_tier) values
      ('גלוי',300,true,true,false,1),('נסתר',300,true,false,false,1),('מוצפן',300,true,true,true,1),('פרטי',300,true,true,false,1);
    insert into gematria_wall values('פרטי',true,now(),1);
    insert into bidim values(300,'גלוי','רגיל'),(300,'נסתר','רגיל'),(300,'מוצפן','רגיל'),(300,'פרטי','רגיל');
    insert into visitor_events select 'number','777','view','v'||i,now()-interval '1 hour' from generate_series(1,12)i;
    -- Canonical v2 measurement: label in events.path, identity in props.measurement.page_path.
    insert into events(ts,session_id,surface,event_type,path,via,props)
      select now()-interval '1 hour','human-'||i,'page','view','/number/:value','google',
        jsonb_build_object('_measurement_verified',2,'measurement',jsonb_build_object('page_path','/number/777')) from generate_series(1,9)i;
    insert into events(ts,session_id,surface,event_type,path,via,props)
      select now()-interval '1 hour','anon-'||i,'page','view','/number/:value','google',
        jsonb_build_object('_measurement_verified',2,'measurement',jsonb_build_object('page_path','/number/777')) from generate_series(1,3)i;
    insert into events(ts,session_id,surface,event_type,path,via,props)
      values(now()-interval '1 hour','human-solo','page','view','/number/:value','google','{"_measurement_verified":2,"measurement":{"page_path":"/number/778"}}');
    insert into visitor_events select 'number','778','view','v1',now()-interval '1 hour';
    insert into search_log values(1,'private name',778,now());
  `);
  const ncr = "select string_agg(match_phrase,',' order by match_phrase) as v from number_cross_resonance('x','[{\"method\":\"רגיל\",\"value\":300}]'::jsonb,90)";
  await db.exec('set role anon');
  check((await scalar(ncr)).split(',').length === 4, 'preimage: number_cross_resonance returns hidden, encrypted and private-wall phrases');
  const lone = await scalar("select fn_raziel_research_intel(778,'24h',8) as v");
  check(lone.demand.views === 1 && lone.demand.searches === 1, 'preimage: a single visit and a single legacy search are disclosed by p_number');
  await db.exec('reset role');
  check(await scalar("select count(*)=0 as v from fn_ti_entity_demand_clean_composition(current_date-1,current_date+1) where entity_type='number'"),'root cause: unmodified fn_human_entrances keys v2 landings by the label, so TI entity demand sees 0 numbers');
  await db.exec(read(dir + 'fn_human_entrances.after.sql'));
  check(await scalar("select string_agg(entity_key||':'||clean_human_visits||'/'||clean_unknown_visits,',' order by entity_key) as v from fn_ti_entity_demand_clean_composition(current_date-1,current_date+1) where entity_type='number'")==='777:9/3,778:1/0','fixed landing identity: TI entity demand sees v2 number landings, human/unknown separate');
  await db.exec(psql('legacy-readers-hardening.psql'));
  await db.exec('set role anon');
  check(await scalar(ncr) === 'גלוי', 'number_cross_resonance returns only publicly eligible phrases');
  for (const sig of ['fn_raziel_research_intel(integer,text,integer)', 'fn_name_research(text)', 'reality_scan(integer,integer)', 'fn_name_research_stats(integer)'])
    check(await scalar(`select not has_function_privilege('anon','${sig}','execute') and not has_function_privilege('authenticated','${sig}','execute') and has_function_privilege('service_role','${sig}','execute') as v`), `${sig} is server-only`);
  check(await scalar("select has_function_privilege('anon','number_cross_resonance(text,jsonb,integer)','execute') as v"), 'number_cross_resonance stays callable by the 2029 client');
  check(await scalar("select bool_and(not has_function_privilege('anon',f::regprocedure,'execute') and not has_function_privilege('authenticated',f::regprocedure,'execute') and has_function_privilege('service_role',f::regprocedure,'execute')) as v from unnest(array['journey_pulse()','activity_pulse()','site_pulse_today()','live_stats()','admin_research_map(integer)','save_wall_word_private(text,integer)']) f"), 'retired legacy RPCs (frozen sources, audience size, last wall writer) are server-only');
  await db.exec('reset role');
  const hidden = await scalar("select fn_raziel_research_intel(778,'24h',8) as v");
  check(hidden.suppressed === 'below_privacy_floor' && hidden.demand === undefined, 'a number below 10 views / 5 visitors is suppressed, shape kept');
  const shown = await scalar("select fn_raziel_research_intel(777,'24h',8) as v");
  check(shown.source_state==='measured' && shown.demand.views === 12 && shown.demand.clean_human === 9 && shown.demand.clean_unknown === 3 && shown.demand.unique_users === null, 'Raziel demand comes from TI events: human and unknown separate, people not claimed');
  check(shown.demand.searches === null && shown.demand.source.startsWith('traffic_intelligence'), 'no frozen search_log/visitor_events input; searches unavailable below the floor, not 0');
  const top = await scalar("select fn_raziel_research_intel(null,'24h',8) as v");
  check(top.signals.length === 1 && top.signals[0].number === 777, 'top mode lists only numbers above the floor');
  await db.exec("delete from events where surface='page'");
  const silent = await scalar("select fn_raziel_research_intel(777,'7d',8) as v");
  check(silent.source_state === 'unavailable' && silent.demand === undefined, 'a silent TI source reads as unavailable, never as zero demand');
  await db.exec(psql('legacy-readers-hardening.rollback.psql'));
  check(await scalar("select md5(pg_get_functiondef('number_cross_resonance(text,jsonb,integer)'::regprocedure))='10e65227bef491d351cadaa68a28b86c' and md5(pg_get_functiondef('fn_raziel_research_intel(integer,text,integer)'::regprocedure))='1b6215ef43e1c794caaca2195c5aa235' as v"), 'rollback restores the exact live preimages');
  check(await scalar("select has_function_privilege('anon','fn_name_research(text)','execute') and has_function_privilege('anon','fn_raziel_research_intel(integer,text,integer)','execute') and has_function_privilege('anon','journey_pulse()','execute') and has_function_privilege('authenticated','admin_research_map(integer)','execute') as v"), 'rollback restores the previous grants');
  console.log(`LEGACY READERS SQL ${checks} checks PASS (isolated PGlite; not a live or PostgREST proof)`);
} catch (e) { console.error(e.message); process.exitCode = 1; } finally { await db.close(); }
