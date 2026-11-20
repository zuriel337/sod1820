// /stats + per-section strips (ZURIEL 21.11.2026): the extended producer fn_ti_activity_pulse2029 (v2) in isolated
// PGlite. Proves: every list keeps the 10 events / 5 sessions floor; totals keep human and unknown apart and never
// count bots; crawlers come only from crawl_daily (served hits, named bots, nothing blocked); "added" counts public
// rows only; no internal reference key leaves the function. No live URL or credentials.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
const db = new PGlite();
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const base = 'supabase/proposed/sitewide-statistics-20261120/';
const dir = 'supabase/proposed/statistics-sections-20261121/';
let checks = 0;
const check = (v, label) => { assert.ok(v, label); checks++; console.log('PASS', label); };
try {
  await db.exec(read('tests/measurement-identity-20261115/fixture.sql'));
  await db.exec(`
    create table gematria_words(id uuid primary key default gen_random_uuid(),phrase text,ragil integer,is_verified boolean,is_published boolean,is_encrypted boolean,visibility_tier integer);
    create table gematria_wall(phrase text,private boolean,last_at timestamptz,hits integer);
    create table gematria_blocklist(pattern text);
    create table search_log(id bigint,term text,value integer,created_at timestamptz);
    create table visitor_events(id bigint,section text);
    create table analytics_cache(cache_key text primary key,payload jsonb,computed_at timestamptz,cache_kind text,producer text,producer_version text,input_identity text,expires_at timestamptz,invalidated_at timestamptz,billable_state text,hit_count bigint default 0,last_hit_at timestamptz);
    create table topic_cards_public(id uuid);
    create table els_records(id uuid,status text,visibility text,home_hidden boolean,created_at timestamptz default now());
    create table posts(id bigint,slug text,title text,tags text[],created_at timestamptz default now());
    create table research_contributions(id uuid default gen_random_uuid(),origin text,status text,created_at timestamptz default now());
    create table crawl_daily(day date,bot text,bucket text,blocked boolean,hits integer);
    create function edge_rate_limit_check(text,integer,integer) returns jsonb language sql as $$select '{"allowed":true}'::jsonb$$;
    create or replace function fn_ti_clean_classification(date,date) returns table(session_id text,clean_classification text,clean_eligible boolean)
    language sql as $$select distinct session_id,case when session_id like 'human-%' then 'human' else 'unknown' end,session_id like 'human-%' from events$$;
  `);
  await db.exec(read(base + 'analytics_cache_producer_version_v1.fixture.sql'));
  await db.exec(read(base + 'analytics_cache_get_v1.fixture.sql'));
  await db.exec(read(base + 'extensions.sql'));
  await db.exec(read(dir + 'fn_ti_activity_pulse2029.after.sql'));
  await db.exec(`
    insert into gematria_words(phrase,ragil,is_verified,is_published,is_encrypted) values('יהוה',26,true,true,false),('נסתר',77,true,false,false);
    -- human page views: /number/26 (12 views, 6 sessions) passes; /number/99 (3 views) does not
    insert into events(session_id,surface,event_type,path,props,ts)
      select 'human-'||(i%6),'page','view','/number/:value','{"_measurement_verified":2,"measurement":{"page_path":"/number/26"}}'::jsonb,now()-interval '1 hour' from generate_series(1,12) i;
    insert into events(session_id,surface,event_type,path,props,ts)
      select 'human-'||i,'page','view','/number/:value','{"_measurement_verified":2,"measurement":{"page_path":"/number/99"}}'::jsonb,now()-interval '1 hour' from generate_series(1,3) i;
    -- computes: 26 passes the floor and has a public word; 77 passes the floor but has only a hidden word
    insert into events(session_id,surface,event_type,props,ts)
      select 'human-'||(i%5),'activity_2029','compute',jsonb_build_object('_measurement_verified',2,'number',26),now()-interval '1 hour' from generate_series(1,10) i;
    insert into events(session_id,surface,event_type,props,ts)
      select 'human-'||(i%5),'activity_2029','compute',jsonb_build_object('_measurement_verified',2,'number',77),now()-interval '1 hour' from generate_series(1,10) i;
    -- unknown sessions (10 views, 5 sessions) and a bot row that must never be counted
    insert into events(session_id,surface,event_type,props,ts)
      select 'anon-'||(i%5),'page','view','{"_measurement_verified":2,"measurement":{"page_path":"/"}}'::jsonb,now()-interval '1 hour' from generate_series(1,10) i;
    insert into events(session_id,surface,event_type,props,ts,is_bot)
      select 'human-bot','page','view','{"_measurement_verified":2,"measurement":{"page_path":"/"}}'::jsonb,now()-interval '1 hour',true from generate_series(1,50) i;
    insert into crawl_daily values(current_date,'Googlebot','/number',false,700),(current_date,'Googlebot','/number',true,999),
      (current_date,'Meta','post/slug',false,300),(current_date,'other','home',false,40),(current_date-30,'Bingbot','home',false,5000);
    insert into research_contributions(origin,status) values('community_2029','approved'),('community_2029','approved'),('community_2029','hidden'),('openweb','approved'),('openweb','pending');
    insert into posts(id,slug,title,tags) values(1,'a','A','{}'),(2,'b','B','{טיוטה}'),(3,'c',null,'{}');
    insert into els_records(status,visibility,home_hidden) values('published','public',false),('draft','public',false),('published','private',false);
  `);
  const d = (await db.query('select public.research_pulse_2029(168) as v')).rows[0].v;
  check(d.version === 1 && d.state === 'measured', 'the public wrapper serves the extended producer');
  check(!('computed_refs' in d) && !('word_refs' in d) && !('content_refs' in d), 'no internal reference list leaves the function');
  check(d.numbers.some(x => x.n === 26) && !d.numbers.some(x => x.n === 99), 'numbers keep the 10/5 floor (26 in, 99 out)');
  check(d.computed.length === 1 && d.computed[0].n === 26 && d.computed[0].events === 10, 'most computed: above the floor and only values with a public word (77 has only a hidden word)');
  const number = d.sections.find(x => x.section === 'number');
  check(number && number.views === 15 && !d.sections.some(x => x.views < 10), 'sections: one aggregate per section (number 12+3 = 15 views) and the floor applies to the section');
  check(d.totals.human.page_views === 15 && d.totals.human.actions === 20, 'human totals are events of human sessions (15 views incl. below-floor items, 20 actions)');
  check(d.totals.unknown.page_views === 10, 'unknown is counted apart, never added to people');
  check(!JSON.stringify(d.totals).includes('65'), 'bot rows never enter any total');
  check(d.crawlers.served === 1040 && d.crawlers.days === 7, 'crawlers: served hits in the window only (blocked 999 and a 30-day-old row excluded)');
  check(d.crawlers.by_bot.map(x => x.bot).join(',') === 'Googlebot,Meta', 'crawlers by name: the generic "other" bucket is not named');
  check(d.crawlers.by_section[0].bucket === '/number' && d.crawlers.by_section[0].hits === 700, 'crawlers by section: number pages first');
  check(d.added.community_messages === 2 && d.added.contributions === 1, 'added: only approved messages and contributions (hidden/pending excluded)');
  check(d.added.posts === 1 && d.added.codes === 1 && d.posts_total === 1, 'added: non-draft titled posts and published public codes only');
  check(!JSON.stringify(d).includes('נסתר'), 'a hidden corpus word never appears');
  console.log(`STATISTICS SECTIONS SQL ${checks} checks PASS (isolated PGlite; extended producer v2)`);
} catch (e) { console.error(e.message); process.exitCode = 1; } finally { await db.close(); }
