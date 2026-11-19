// Real disposable PostgreSQL over a private Unix socket; no URL or live credentials.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { localPgBin, startLocalPg } from './helpers/els-matrix-reading-durable-jobs-local-pg.mjs';
import { readingActionSpec } from '../src/lib/publicReadingTelemetry2029.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const baseline = read('tests/els-action-telemetry-20261119/baseline-ingest-event.sql');
const apply = read('supabase/proposed/20261119190000_els_action_telemetry_PROPOSAL.sql');
const rollback = read('supabase/proposed/ROLLBACK_20261119190000_els_action_telemetry.sql');
const signature = 'public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)';
const quote = value => "'" + String(value).replaceAll("'", "''") + "'";
const originalHash = '897f442aaa8f75a2f1f2dd332ad92c0a';

test('ELS action proposal: exact live baseline, closed fields, privileges, drift, idempotency and rollback', async t => {
  const bin = localPgBin();
  assert.ok(bin, 'local PostgreSQL is required; there is no live fallback or skipped acceptance');
  const server = startLocalPg(bin);
  try {
    const db = await server.connect();
    await db.query(`
      create schema auth;
      create role anon nologin; create role authenticated nologin;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create table users(id uuid primary key, role text);
      create table persons(person_id uuid primary key default gen_random_uuid(), account_user_id uuid, created_at timestamptz default now(), first_seen timestamptz, last_seen timestamptz, first_source text);
      create table events(event_id uuid default gen_random_uuid(),ts timestamptz,sod_id text,person_id uuid,session_id text,surface text,event_type text,path text,ref_host text,via text,app_context text,device text,journey_id text,depth_reached smallint,utm jsonb,is_bot boolean,props jsonb);
      create function resolve_person(text,text,text) returns uuid language sql as $$select null::uuid$$;
      ${baseline};
      revoke all on function ${signature} from public;
      grant usage on schema public,auth to anon,authenticated;
      grant execute on function ${signature} to anon,authenticated;
    `);
    const definition = async () => (await db.query(`select pg_get_functiondef(${quote(signature)}::regprocedure)`))[0][0];
    const hash = async () => (await db.query(`select md5(pg_get_functiondef(${quote(signature)}::regprocedure))`))[0][0];
    const permissions = () => db.query(`select proacl::text,proowner::text,prosecdef::text,proconfig::text from pg_proc where oid=${quote(signature)}::regprocedure`);
    const originalPermissions = await permissions();
    const spec = source => JSON.parse(source.match(/v_spec jsonb := '(\{.*\})'::jsonb;/)[1]);
    const originalSpec = spec(await definition());
    const send = (event, props = {}, surface = 'els') => db.query(`set role anon;
      select public.ingest_event(p_sod_id=>'browser-test-001',p_surface=>${quote(surface)},p_event_type=>${quote(event)},p_path=>'/code',p_app_context=>'chrome',p_session_id=>'session-test-001',
        p_props=>${quote(JSON.stringify({action_version:1,...props,measurement:{version:2,page_path:'/code',visitor_id:'visitor-test-001'}}))}::jsonb); reset role;`);
    const refused = async (sqlOrCall, pattern) => {
      try { await assert.rejects(typeof sqlOrCall === 'function' ? sqlOrCall : () => db.query(sqlOrCall), pattern); }
      finally { await db.query('rollback; reset role;'); }
    };
    await t.test('captured live baseline matches and rejects new events before apply', async () => {
      assert.equal(await hash(), originalHash);
      await send('search',{kind:'word',scope:'torah',skip:7});
      await refused(() => send('operation_started',{operation:'search'}), /unknown measurement event/);
    });
    await t.test('apply changes exactly the ELS family; privileges and all other code stay identical', async () => {
      const before = await definition();
      await db.query(apply);
      const after = await definition();
      const oldValue = apply.match(/v_old text := '([^']+)';/)[1];
      const newValue = apply.match(/v_new text := '([^']+)';/)[1];
      assert.equal(after, before.replace(oldValue,newValue));
      assert.deepEqual(spec(after), {...originalSpec,els:readingActionSpec().els});
      assert.deepEqual(await permissions(),originalPermissions);
    });
    for(const event of ['search','cross_search','ui_action','operation_started','operation_phase','operation_finished','cancel_requested']) {
      await t.test(`admits ${event} with bounded fields and the original anonymous identity envelope`, async () => {
        const before = Number((await db.query('select count(*) from events'))[0][0]);
        await send(event,{kind:'word',scope:'torah',skip:7,mode:'research',region:'tools',control:'discovery',control_index:0,gesture:'activate',operation:'search',operation_id:'operation-test-001',phase:'running',outcome:'partial',elapsed_ms:123,count:3});
        assert.equal(Number((await db.query('select count(*) from events'))[0][0]),before+1);
        assert.equal((await db.query("select count(*) from events where person_id is not null or props->'_measurement_account' <> 'null'::jsonb"))[0][0],'0');
      });
    }
    for(const [label,event,props,reason] of [
      ['unknown event','save',{},/unknown measurement event/],
      ['raw term','ui_action',{term:'private'},/unknown action field/],
      ['account id','ui_action',{uid:'user'},/unknown action field/],
      ['job token','ui_action',{job_token:'secret'},/unknown action field/],
      ['unbounded token','ui_action',{operation_id:'x'.repeat(49)},/invalid action token/],
      ['negative count','operation_finished',{count:-1},/invalid action integer/],
      ['fractional count','operation_finished',{count:1.5},/invalid action integer/],
      ['oversized count','operation_finished',{count:1000000000001},/invalid action integer/],
    ]) await t.test(`refuses ${label}`,async()=>{await refused(()=>send(event,props),reason);});
    await t.test('other action families remain usable and reject ELS-only fields',async()=>{
      await send('click',{surface:'home'},'join');
      await refused(()=>send('click',{operation:'search'},'join'),/unknown action field/);
    });
    const applied = await definition();
    await t.test('second apply is a no-op only on the exact expected definition',async()=>{
      await db.query(apply);assert.equal(await definition(),applied);
      await db.query(applied.replace('v_person uuid;','v_person uuid; -- unrelated drift'));
      await refused(apply,/ingest_event drift: re-review before apply/);
      await refused(rollback,/ingest_event drift: re-review before rollback/);
      await db.query(applied);
    });
    await t.test('rollback restores the exact body and ACL, retains old searches and rejects new events',async()=>{
      await db.query(rollback);assert.equal(await hash(),originalHash);assert.deepEqual(await permissions(),originalPermissions);
      await send('cross_search',{kind:'cross',scope:'torah',skip:7});
      await refused(()=>send('operation_started',{operation:'search'}),/unknown measurement event/);
      await db.query(rollback);assert.equal(await hash(),originalHash);
    });
    await t.test('apply refuses drift in the original definition',async()=>{
      await db.query((await definition()).replace('v_person uuid;','v_person uuid; -- unrelated drift'));
      await refused(apply,/ingest_event drift: re-review before apply/);
    });
  } finally { server.stop(); }
});
