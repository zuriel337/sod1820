import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createElsOperationTelemetry,elsUiAction} from '../src/lib/research/elsTelemetry2029.js';
import {readingActionProps,readingActionSpec,readingActionBody} from '../src/lib/publicReadingTelemetry2029.js';
import {runElsMatrixReadingTurn} from '../src/lib/research/elsMatrixReadingTransport.js';
function rig(){let account={user:'A'},clock=0;const rows=[];return {rows,setAccount:a=>account=a,tick:()=>clock+=100,options:{capture:()=>account,send:(context,event,props)=>rows.push({context,event,props}),now:()=>clock,id:()=> 'operation-1'}};}
test('an operation keeps its original account and matrix mode; terminal is emitted once',()=>{
 const r=rig(),source={mode:'research',scope:'tanakh',term:'private'};const t=createElsOperationTelemetry('search',source,r.options);
 source.scope='torah';r.setAccount({user:'B'});r.tick();t.update('verifying');t.update('verifying');t.update('done',{count:3});t.update('error');
 assert.deepEqual(r.rows.map(x=>x.event),['operation_started','operation_phase','operation_finished']);
 assert.ok(r.rows.every(x=>x.context.user==='A'&&x.props.scope==='tanakh'));assert.equal(r.rows.at(-1).props.elapsed_ms,100);
 assert.ok(r.rows.every(x=>!('term' in x.props)));
});
test('cancel requested, partial completion, stopped tracking, confirmed cancellation and failure differ',()=>{
 for(const [status,extra,outcome] of [['done',{partial:true},'partial'],['tracking_stopped',{},'tracking_stopped'],['cancelled',{},'cancelled'],['error',{},'failed']]){
  const r=rig(),t=createElsOperationTelemetry('discovery',{},r.options);t.cancel();t.cancel();assert.equal(r.rows.filter(x=>x.event==='cancel_requested').length,1);assert.equal(r.rows.filter(x=>x.event==='operation_finished').length,0);
  t.update(status,extra);assert.equal(r.rows.at(-1).props.outcome,outcome);
 }
});
test('client and proposed SQL allowlists match; private fields are projected out',()=>{
 const fields={operation:'fable',operation_id:'operation-1',scope:'torah',term:'private',uid:'user',job_token:'secret',url:'https://private'};
 const props=readingActionProps('els','operation_started',fields);
 assert.deepEqual(props,{action_version:1,scope:'torah',operation:'fable',operation_id:'operation-1'});
 const sql=readFileSync(new URL('../supabase/proposed/20261119190000_els_action_telemetry_PROPOSAL.sql',import.meta.url),'utf8');
 assert.ok(sql.includes('"els":'+JSON.stringify(readingActionSpec().els)));
 assert.equal(readingActionBody({p_sod_id:null,p_session_id:null,p_path:'/code',p_app_context:'chrome',p_surface:'els',p_event_type:'operation_started',p_is_bot:false,p_props:props}),true);
});
test('Fable reports partial, failure, confirmed cancellation and stopped tracking without extra provider requests',async()=>{
 for(const [value,status] of [[{state:'COMPLETE'},'complete'],[{state:'INCOMPLETE'},'partial'],[{state:'FAILED_WITH_REASON',reason:'batch_canceled'},'cancelled'],[{state:'FAILED_WITH_REASON'},'failed']]){
  const observed=[];let calls=0;await runElsMatrixReadingTurn({action:{op:'start'},invoke:async()=>{calls++;return {data:{els_matrix_reading:{contract:'els_matrix_reading_v1',...value}}};},telemetry:{update:s=>observed.push(s),cancel(){}}});
  assert.equal(calls,1);assert.equal(observed.at(-1),status);
 }
});
test('telemetry failures cannot prevent tools running',()=>{
 const t=createElsOperationTelemetry('search',{}, {capture:()=>null,send:()=>{throw Error('offline')},id:()=> 'x'});
 assert.doesNotThrow(()=>{t.cancel();t.update('done')});
});

test('blocked identity storage cannot break an operation',()=>{
 const tracker=createElsOperationTelemetry('search',{}, {capture:()=>{throw Error('storage denied')},send:()=>assert.fail('must not send')});
 assert.doesNotThrow(()=>{tracker.update('done');tracker.cancel()});
});
