import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readingActionSpec, readingActionBody, readingActionProps, readingMeasurementBody } from '../src/lib/publicReadingTelemetry2029.js';
import { classifyAppIncident, routeAppIncident } from '../src/lib/appIncidentOwner2029.js';
import { groupSuggestions } from '../src/lib/maintenanceAttention2029.js';
import { normalizeAppFailure, appFailureAdmission } from '../src/lib/appHealthIncident2029.js';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('failure-only telemetry uses canonical events and refuses arbitrary fields', () => {
  const events = readingActionSpec().app_health.events;
  for (const e of ['save_started','save_confirmed','save_failed','auth_failed','load_failed','runtime_error']) assert.ok(events.includes(e));
  const props = readingActionProps('app_health','save_failed',{reason:'no_receipt',stage:'save',expression:'SECRET',account:'user'});
  assert.deepEqual(props, {action_version:1,reason:'no_receipt',stage:'save'});
  const body = {p_app_context:'chrome',p_event_type:'save_failed',p_is_bot:false,p_path:'/code',
    p_props:props,p_session_id:null,p_sod_id:null,p_surface:'app_health'};
  assert.equal(readingActionBody(body),true);
  assert.equal(readingActionBody({...body,p_props:{...props,detail:'SECRET'}}),false);
  assert.equal(readingActionBody({...body,p_path:'/2029/me/research'}),false);
  assert.equal(readingMeasurementBody({...body,p_session_id:'12345678',p_sod_id:'12345678',
    p_props:{...props,measurement:{version:2,visitor_id:null,page_path:'/code'}}}),true);
});
test('typed outcomes are bounded, no raw errors or content leave the client',()=>{
  assert.deepEqual(normalizeAppFailure('save_failed',{reason:'no_receipt',stage:'save'}), {kind:'save_failed',reason:'no_receipt',stage:'save'});
  assert.deepEqual(normalizeAppFailure('auth_failed',{reason:'Bearer SECRET',stage:'emails@example.com'}),
    {kind:'auth_failed',reason:'unknown',stage:'runtime'});
  assert.equal(normalizeAppFailure('anything_else',{reason:'x'}),null);
  const v={kind:'runtime_error',reason:'render_error',stage:'runtime'};
  assert.equal(appFailureAdmission(v,1000000),true);
  assert.equal(appFailureAdmission(v,1000000),false);
});
test('each incident resolves to its owning contract; unknown is not a pass',()=>{
  assert.equal(routeAppIncident('save_failed').owner,'research_workspace_law');
  assert.equal(routeAppIncident('auth_failed').kind,'auth');
  assert.equal(classifyAppIncident({surface:'performance',event_type:'web_vital'}).owner,'traffic_intelligence_law');
  assert.equal(classifyAppIncident({surface:'issue_report',event_type:'issue_report'}).owner,'canonical_ui_components_law');
  assert.equal(classifyAppIncident({surface:'app_health',event_type:'cipher_saved'}).kind,'unclassified');
  assert.equal(classifyAppIncident({surface:'unexpected',event_type:'save_failed'}).kind,'unclassified');
});
test('instrumentation remains lazy and does not add a second store, AI, or background poll',()=>{
  const tracker=read('src/lib/tracking.js'),save=read('src/components/TzofenEmbed.jsx');
  const incident=read('src/lib/appHealthIncident2029.js');
  assert.match(tracker,/import\("\.\/appHealthIncident2029\.js"\)/);
  assert.match(save,/recordCipherSave\(stage\)/);
  assert.match(save,/reportCipherSave\("save_started"\)/);
  assert.match(save,/reportCipherSave\("save_confirmed"\)/);
  assert.match(save,/reportCipherSave\("save_failed"\)/);
  assert.doesNotMatch(incident,/localStorage|sessionStorage|setInterval|setTimeout|fetch\(.*ai|createClient|new WebSocket/);
  assert.match(incident,/sendMeasurement\(/);
});

test('existing attention view exposes the actual owning law without new store',()=>{
  const now=Date.now(), rows=[{id:1,category:'performance',detector:'app_health_incident',status:'pending',
    created_at:new Date(now).toISOString(), title:'save_failed / no_receipt', reason:'regression',
    observed:{event_type:'save_failed',failure_code:'no_receipt',sessions:3}}];
  const grouped=groupSuggestions(rows,now);
  assert.equal(grouped.length,1);
  assert.equal(grouped[0].owner,'research_workspace_law');
  assert.equal(grouped[0].rank,1);
  assert.equal(groupSuggestions([{...rows[0],observed:{event_type:'unknown'}}],now)[0].owner,
    'UNKNOWN — דרוש שיוך חוזה');
});
test('SQL detector is only a guarded proposal on the canonical reliability owner',()=>{
  const sql=read('supabase/proposed/app-health-incidents-20261123/apply.sql');
  assert.match(sql,/DO NOT EXECUTE/);
  assert.match(sql,/md5\(pg_get_functiondef\('public\.fn_reliability_watch\(\)'::regprocedure\)\)/);
  assert.match(sql,/surface = 'app_health'/);
  assert.match(sql,/count\(distinct coalesce\(session_id,sod_id\)\) >= 3/);
  assert.match(sql,/public\.suggest_add\('performance','app_health_incident'/);
  assert.match(sql,/public\.notify_admin\(/);
  assert.doesNotMatch(sql,/create\s+table|cron\.schedule|alter\s+table|drop\s+table|truncate\s+/i);
});
