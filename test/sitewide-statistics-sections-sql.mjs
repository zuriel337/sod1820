// #1456/#1461 per-section proof: for every 2029 section, the request is built by the REAL client
// functions (readingMeasurementPath, readingTelemetryPath, readingMeasurementBody — exactly as
// captureMeasurement/measurementBody build it), ingested through the proposed ingest_event TWICE
// (a replay), and counted exactly once in the right section of admin_2029_analytics.site_activity.
// Isolated PGlite; no live URL or credentials. Not a browser click: page-view emission itself is
// covered by the existing measurement-visit-once browser test.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { readingMeasurementPath, readingTelemetryPath, readingMeasurementBody } from '../src/lib/publicReadingTelemetry2029.js';
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
const db = new PGlite();
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const dir = 'supabase/proposed/sitewide-statistics-20261120/';
let checks = 0;
const check = (v, label) => { assert.ok(v, label); checks++; console.log('PASS', label); };

// [section, route actually visited, surface, event, extra props]
const CASES = [
  ['home', '/', 'page', 'view'],
  ['world', '/world', 'page', 'view'],
  ['calculator', '/gematria', 'page', 'view'],
  ['calculator_community', '/community/calculator', 'page', 'view'],
  ['number', '/number/104', 'page', 'view'],
  ['els', '/code', 'page', 'view'],
  ['cipher', '/codes', 'page', 'view'],
  ['posts', '/post/some-post', 'page', 'view'],
  ['books', '/books', 'page', 'view'],
  ['community', '/community/chat', 'page', 'view'],
  ['now', '/', 'activity_2029', 'view', { section: 'now' }],
  ['raziel', '/', 'activity_2029', 'view', { section: 'raziel' }],
  ['calculator', '/gematria', 'activity_2029', 'compute', { section: 'calculator' }],
  ['calculator_advanced', '/gematria', 'activity_2029', 'compute', { section: 'calculator_advanced' }],
  ['calculator_community', '/community/calculator', 'activity_2029', 'compute', { section: 'calculator_community' }],
  ['site_search', '/world', 'activity_2029', 'search', { section: 'site_search' }],
  ['number', '/number/104', 'activity_2029', 'search', {}],
  ['cipher', '/codes', 'activity_2029', 'search', {}],
];
try {
  await db.exec(read('tests/measurement-identity-20261115/fixture.sql'));
  await db.exec(`
    create table gematria_words(id uuid primary key default gen_random_uuid(),phrase text,ragil integer,is_verified boolean,is_published boolean,is_encrypted boolean,visibility_tier integer);
    create table gematria_wall(phrase text,private boolean,last_at timestamptz,hits integer);
    create table gematria_blocklist(pattern text);
    create table search_log(id bigint,term text,value integer,created_at timestamptz);
    create table analytics_cache(cache_key text primary key,payload jsonb,computed_at timestamptz,cache_kind text,producer text,producer_version text,input_identity text,expires_at timestamptz,invalidated_at timestamptz,billable_state text,hit_count bigint default 0,last_hit_at timestamptz);
    create table auth.users(id uuid,created_at timestamptz,email_confirmed_at timestamptz);
    create table topic_cards_public(id uuid);
    create table els_records(id uuid,status text,visibility text,home_hidden boolean);
    create table posts(id bigint,slug text,title text,tags text[]);
    create table visitor_events(id bigint,section text,slug text,event_type text,visitor_id text,created_at timestamptz);
    create table system_suggestions(id uuid,created_at timestamptz,detector text,title text,reason text,observed jsonb,status text,sample_size integer,confidence numeric);
    create function fn_web_vital_surface_group(text,text) returns text language sql as $$select 'other'$$;
    create function edge_rate_limit_check(text,integer,integer) returns jsonb language sql as $$select '{"allowed":true}'::jsonb$$;
    create or replace function fn_ti_clean_classification(date,date) returns table(session_id text,clean_classification text,clean_eligible boolean)
    language sql as $$select distinct session_id,'human',true from events$$;
  `);
  await db.exec(read(dir + 'analytics_cache_producer_version_v1.fixture.sql'));
  await db.exec(read(dir + 'analytics_cache_get_v1.fixture.sql'));
  await db.exec(read(dir + 'extensions.sql'));
  await db.exec(read(dir + 'ingest_event.after.sql'));
  await db.exec(read(dir + 'admin_2029_analytics.after.sql'));
  await db.exec(`set request.headers='{"cf-connecting-ip":"192.0.2.10"}'`);
  let n = 0;
  for (const [section, route, surface, event, extra = {}] of CASES) {
    const pagePath = readingMeasurementPath(route);
    check(pagePath, `${section}: client measures ${route} (page_path ${pagePath})`);
    n++;
    const props = surface === 'activity_2029' ? { action_version: 1, operation_id: randomUUID(), ...extra } : {};
    const body = { p_sod_id: `sod-${String(n).padStart(5, '0')}`, p_session_id: `human-${String(n).padStart(6, "0")}`, p_path: readingTelemetryPath(pagePath),
      p_app_context: 'chrome', p_surface: surface, p_event_type: event, p_is_bot: false,
      p_props: { ...props, measurement: { version: 2, visitor_id: `browser-${String(n).padStart(4, '0')}`, page_path: pagePath } } };
    check(readingMeasurementBody(body), `${section}: the real client validator admits the ${surface}/${event} body`);
    const send = () => db.query(`select ingest_event($1,$2,$3,p_path=>$4,p_app_context=>$5,p_session_id=>$6,p_props=>$7::jsonb,p_is_bot=>false)`,
      [body.p_sod_id, body.p_surface, body.p_event_type, body.p_path, body.p_app_context, body.p_session_id, JSON.stringify(body.p_props)]);
    await send(); await send();
  }
  await db.exec("set test.admin='true'");
  const report = (await db.query('select admin_2029_analytics(24) as v')).rows[0].v.site_activity;
  const want = {};
  for (const [section, , surface, event] of CASES) {
    want[section] ??= { views: 0, domain_views: 0, actions: 0 };
    if (surface === 'page') want[section].views++;
    else if (event === 'view') want[section].domain_views++;
    else want[section].actions++;
  }
  // Page views have no operation_id, so a replay is two page views by design (the client sends one per settled visit:
  // measurement-visit-once browser test). Actions carry one operation_id: the replay must not double them.
  for (const [section, w] of Object.entries(want)) {
    const row = report.sections.find(x => x.section === section);
    check(row, `${section}: present in the admin section report`);
    check(row.views === w.views * 2 && row.domain_views === w.domain_views && row.actions === w.actions,
      `${section}: ${w.views} page view(s) per send, ${w.domain_views} tool open(s) and ${w.actions} action(s) counted once despite a replay`);
  }
  check(!report.sections.some(x => x.section === 'other'), 'no measured section falls into "other"');
  console.log(`SECTIONS ${checks} checks PASS (real client path/body code + proposed ingest/admin SQL, isolated PGlite)`);
} catch (e) { console.error(e.message); process.exitCode = 1; } finally { await db.close(); }
