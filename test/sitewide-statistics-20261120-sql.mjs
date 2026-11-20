// Isolated PostgreSQL semantics via PGlite. No live URL or credentials accepted.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
const db = new PGlite();
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const dir='supabase/proposed/sitewide-statistics-20261120/';
let checks=0;
const check=(v,label)=>{assert.ok(v,label);checks++;console.log('PASS',label);};
const scalar=async sql=>(await db.query(sql)).rows[0]?.v;
try {
  await db.exec(read('tests/measurement-identity-20261115/fixture.sql'));
  await db.exec(`
    -- Live shape (20.11.2026): events is partitioned by ts with NO unique key on event_id.
    -- Do not add a fixture-only key: it previously hid an ON CONFLICT failure of every ingest.
    create table gematria_words(id uuid primary key default gen_random_uuid(),phrase text,ragil integer,is_verified boolean,is_published boolean,is_encrypted boolean,visibility_tier integer);
    create table gematria_wall(phrase text,private boolean,last_at timestamptz,hits integer);
    create table gematria_blocklist(pattern text);
    create table search_log(id bigint,term text,value integer,created_at timestamptz);
    create table visitor_events(id bigint,section text);
    alter table visitor_events enable row level security;
    create policy old_visitor_write on visitor_events for insert with check(true);
    grant insert on visitor_events to anon,authenticated;
    create table analytics_cache(cache_key text primary key,payload jsonb,computed_at timestamptz,cache_kind text,producer text,producer_version text,input_identity text,expires_at timestamptz,invalidated_at timestamptz,billable_state text,hit_count bigint default 0,last_hit_at timestamptz);
    create table auth.users(id uuid,created_at timestamptz,email_confirmed_at timestamptz);
    create table topic_cards_public(id uuid);
    create table els_records(id uuid,status text,visibility text,home_hidden boolean);
    create table system_suggestions(id uuid,created_at timestamptz,detector text,title text,reason text,observed jsonb,status text,sample_size integer,confidence numeric);
    create function fn_web_vital_surface_group(text,text) returns text language sql as $$select 'other'$$;
    create function edge_rate_limit_check(text,integer,integer) returns jsonb language sql as $$select '{"allowed":true}'::jsonb$$;
    create or replace function fn_ti_clean_classification(date,date) returns table(session_id text,clean_classification text,clean_eligible boolean)
    language sql as $$select distinct session_id,case when session_id like 'human-%' then 'human' else 'unknown' end,session_id like 'human-%' from events$$;
    alter table gematria_words enable row level security;
    alter table gematria_wall enable row level security;
    alter table search_log enable row level security;
    create policy baseline_words on gematria_words for select using(is_verified and is_published and not coalesce(is_encrypted,false));
    create policy baseline_wall on gematria_wall for select using(not coalesce(private,false));
    create policy baseline_search on search_log for select using(true);
    create policy baseline_search_write on search_log for insert with check(true);
    grant select on gematria_words,gematria_wall,search_log to anon,authenticated;
    grant insert on search_log to anon,authenticated;
  `);
  await db.exec(read(dir+'analytics_cache_producer_version_v1.fixture.sql'));
  await db.exec(read(dir+'analytics_cache_get_v1.fixture.sql'));
  await db.exec(read(dir+'extensions.sql'));
  await db.exec(read(dir+'ingest_event.after.sql'));
  await db.exec(read(dir+'admin_2029_analytics.after.sql'));
  await db.exec("revoke all on function admin_2029_analytics(integer,text) from public; grant execute on function admin_2029_analytics(integer,text) to authenticated;");
  const words=[['סאלי',101],['סלי',102],['ליאור מאס',103],['סליחות',104],['שלום',105]];
  for(let i=0;i<words.length;i++) await db.query('insert into gematria_words(id,phrase,ragil,is_verified,is_published,is_encrypted,public_trend_approved) values($1,$2,$3,true,$4,false,true)',[`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,...words[i],i>=3]);
  await db.exec("insert into gematria_wall values('סאלי',true,now(),100),('סלי',true,now(),100),('ליאור מאס',true,now(),100); insert into search_log values(1,'private-history',104,now());");
  await db.exec("set role anon");
  check((await db.query('select phrase from gematria_words')).rows.map(x=>x.phrase).join(',')==='סליחות,שלום','anon suggestions exclude hidden words; ordinary word remains');
  check((await db.query('select * from search_log')).rows.length===0,'raw historical searches unavailable to anon');
  check((await db.query('select * from gematria_wall')).rows.length===0,'frozen wall history (public and private rows) unavailable to anon');
  let refused=false;try{await db.exec("insert into search_log values(2,'new raw input',1,now())");}catch{refused=true;}check(refused,'direct raw search writes refused');
  refused=false;try{await db.exec("insert into visitor_events values(1,'old-client')");}catch{refused=true;}check(refused,'old clients cannot restart visitor_events writes');
  refused=false;try{await db.query('select admin_2029_analytics()');}catch{refused=true;}check(refused,'anon cannot call admin report');
  await db.exec("reset role; set request.headers='{\"cf-connecting-ip\":\"192.0.2.1\"}'");
  const body={action_version:1,operation_id:'11111111-1111-4111-8111-111111111111',measurement:{version:2,visitor_id:'browser-0001',page_path:'/gematria'}};
  const ingest=async(props=body)=>db.query("select ingest_event('sod-00001','activity_2029','compute',p_path=>'/gematria',p_app_context=>'chrome',p_session_id=>'human-0001',p_props=>$1::jsonb)",[JSON.stringify(props)]);
  await db.query("select ingest_event('sod-00002','page','view',p_path=>'/')");
  check(await scalar("select count(*)=1 as v from events where surface='page'"),'unrelated legacy ingest still inserts without a unique event_id key');
  await db.exec("delete from events");
  await ingest();await ingest();
  check(await scalar('select count(*)=1 as v from events'),'same operation counted exactly once without a unique event_id key');
  check(await scalar("select prosrc like '%set_config(''enable_nestloop'',''off'',true)%' and prosrc like '%set_config(''enable_nestloop'',nestloop,true)%' and proconfig::text not like '%enable_nestloop%' as v from pg_proc where proname='fn_ti_activity_pulse2029'"),'hash-join hint is scoped to the aggregation statement and restored (never leaks into nested privacy checks)');
  check(await scalar("select fn_ti_surface2029('/members')='community' and fn_ti_surface2029('/researcher/:item')='community' and fn_ti_surface2029('/melech-hamisparim/:item')<>'personal' and fn_ti_surface2029('/me')='personal' and fn_ti_surface2029('/journey')='journey' as v"),'route sections are anchored: members/researcher are not personal/journey');
  {
    await db.exec("set role anon");
    const lone=await scalar('select research_pulse_2029(24) as v');
    check(lone.latest_event===undefined||lone.latest_event===null,'a single sub-threshold action publishes no timestamp');
    check(lone.state==='no_data','a single sub-threshold action reads as no_data, not measured');
    await db.exec("reset role; update analytics_cache set invalidated_at=now()");
  }
  refused=false;try{await ingest({...body,operation_id:'22222222-2222-4222-8222-222222222222',term:'private'});}catch{refused=true;}check(refused,'free text refused server-side');
  await db.exec("set request.headers='{}'");
  await ingest({...body,operation_id:'33333333-3333-4333-8333-333333333333'});
  check(await scalar('select count(*)=1 as v from events'),'new activity fails closed without trusted address');
  await db.exec(`
    insert into events(ts,session_id,surface,event_type,path,props)
    select now()-interval '1 minute','human-'||i%5,'page','view','/number/:value',
      jsonb_build_object('_measurement_verified',2,'measurement',jsonb_build_object('page_path','/number/104'))
    from generate_series(1,10)i;
    insert into events(ts,session_id,surface,event_type,path,props)
    select now()-interval '1 minute','unknown-'||i,'page','view','/number/:value',
      '{"_measurement_verified":2,"measurement":{"page_path":"/number/105"}}'
    from generate_series(1,20)i;
  `);
  await db.exec("set role anon");
  let pulse=await scalar('select research_pulse_2029(24) as v');
  check(pulse.numbers.length===1 && pulse.numbers[0].n===104,'public number requires 10 events and 5 clean sessions');
  check(!JSON.stringify(pulse).includes('human-')&&!JSON.stringify(pulse).includes('browser-'),'public response contains no session/browser IDs');
  check(pulse.state==='measured' && new Date(pulse.latest_event).getUTCMinutes()===0 && new Date(pulse.latest_event).getUTCSeconds()===0,'freshness is hour-granular once the window meets the floor');
  check(new Date(pulse.numbers[0].last_at).getUTCMinutes()===0,'number last_at is hour-granular');
  await db.exec("reset role; update gematria_words set is_published=false where ragil=104");
  await db.exec("set role anon");
  pulse=await scalar('select research_pulse_2029(24) as v');
  check(pulse.numbers.length===0,'publication is rechecked after a cached aggregate');
  check((await db.query('select * from recent_number_opens()')).rows.length===0,'recent_number_opens cannot bypass publication/cache gate');
  await db.exec("reset role; set test.admin='true'; set role authenticated");
  const report=await scalar('select admin_2029_analytics() as v');
  check(report.site_activity.top_numbers.length===2,'admin top numbers project measured pages, including unknown separately');
  check(report.site_activity.summary.registered_accounts===0,'registrations come from canonical verified Auth creation, not client actions');
  check(report.site_activity.summary.views===30,'admin sees unknown separately; public never treats unknown as human');
  check(report.site_activity.summary.entrances===5,'entrances count classified human page-view sessions, not unknown arrivals');
  check(report.site_activity.journey.state==='no_data','no journey sensor data is not a measured zero');
  await db.exec("reset role; insert into events(ts,surface,event_type,session_id,props) select now()-interval '1 minute','journey_2029',x,'human-journey','{\"_measurement_verified\":2}'::jsonb from unnest(array['start','step','save','resume'])x; insert into events(surface,event_type,props) values('journey','start','{\"_measurement_verified\":2}'); set role authenticated");
  const journey=await scalar("select admin_2029_analytics()->'site_activity'->'journey' as v");
  check(journey.state==='measured'&&journey.starts===1,'journey counts canonical starts only, excluding steps, resumes and old journey signals');
  check(report.site_activity.actions.some(x=>x.event_type==='compute'&&x.events===1),'admin counts canonical compute once');
  check(report.web_vitals!==undefined && report.identified_traffic!==undefined,'existing admin projections preserved');
  check((await db.query('select * from search_log')).rows.length===0,'frozen search history is server-only, even for an admin client');
  await db.exec('reset role');
  check((await db.query('select * from search_log')).rows.length===1,'original historical row is retained');
  check((await db.query("select * from gematria_wall")).rows.length===3,'wall history rows are retained server-side for audit');
  await db.exec('reset role');
  await db.exec(`
    update gematria_words set is_published=true where ragil=104;
    insert into events(ts,session_id,surface,event_type,path,props)
    select now()-interval '1 minute','human-'||i%5,'activity_2029','select','/number/:value',
      jsonb_build_object('_measurement_verified',2,'word_id','00000000-0000-4000-8000-000000000004','measurement',jsonb_build_object('page_path','/number/104'))
    from generate_series(1,10)i;
    update analytics_cache set invalidated_at=now();
    set test.admin='false'; set role anon;
  `);
  pulse=await scalar('select research_pulse_2029(24) as v');
  check(pulse.phrases.length===1 && pulse.phrases[0].phrase==='סליחות','curated public corpus phrase passes only at the aggregate threshold');
  await db.exec("reset role; insert into gematria_blocklist values('סליחות'); set role anon");
  pulse=await scalar('select research_pulse_2029(24) as v');
  check(pulse.phrases.length===0 && pulse.numbers.length===0,'blocklist hides both cached phrase and number on the next read');
  await db.exec("reset role; delete from gematria_blocklist; update gematria_words set public_trend_approved=false where ragil=104; set role anon");
  pulse=await scalar('select research_pulse_2029(24) as v');
  check(pulse.phrases.length===0,'revoking curation hides an already cached phrase');
  check((await db.query('select * from search_log')).rows.length===0,'search history stays inaccessible to anon');
  await db.exec('reset role');
  console.log(`SQL ${checks} checks PASS (isolated; classifier/rate limiter are dependency fixtures)`);
} catch(e) { console.error(e.message); process.exitCode=1; } finally { await db.close(); }
