import test from 'node:test';
import assert from 'node:assert/strict';
import { elsMatrixReadingIndicator as select, elsMatrixReadingEstimate as estimate } from '../src/lib/research/elsMatrixReadingActivity.js';
const axis={term:'קולומביה',scope:'torah',corpusId:'0b022e8eef6f9c16',skip:4545,dir:1,start:248765,hitId:'4545_1_248765'};
const context={contract:'els_matrix_presentation_context_v1',axis,matrix:{width:4545,rowStart:54,colStart:3300,rows:['אבגד']}};
const turn={id:'a',kind:'els_matrix_reading',startedAt:'2026-11-19T10:00:00Z',continuation:{contextSnapshot:{elsMatrixContext:context}},progress:{phase:'running',elapsedMs:120000,observedAt:Date.parse('2026-11-19T10:02:00Z')}};
const now=Date.parse('2026-11-19T10:03:00Z');
const terminal=(state,extra={})=>({thread:[{...turn,id:undefined,role:'raziel',turnId:'a',elsMatrixReading:{state,axis,timing:{elapsed_ms:300000},...extra}}]});
test('existing session drives source identity, live elapsed and indeterminate progress',()=>{
 const input={busy:true,currentTurn:turn};const before=JSON.stringify(input);const task=select(input,now);
 assert.equal(task.origin.term,axis.term);assert.equal(task.origin.skip,4545);assert.equal(task.id,'a');assert.equal(task.phase,'בעבודה אצל הספק');assert.equal(task.elapsedMs,180000);assert.equal(task.estimate,'הערכה בלבד: עוד 0–10 דקות');assert.equal('percent' in task,false);assert.equal(JSON.stringify(input),before);
 assert.equal(select({...input,pageContext:{axis:{term:'אחר'}}},now).origin.term,axis.term);
});
test('estimate is a range, never resets beyond thirteen minutes',()=>{
 assert.equal(estimate(0),'הערכה בלבד: עוד 3–13 דקות');assert.equal(estimate(120000),'הערכה בלבד: עוד 1–11 דקות');assert.equal(estimate(780001),'לוקח יותר מהרגיל');assert.equal(estimate(1200000),'לוקח יותר מהרגיל');
 const task=select({busy:true,currentTurn:turn},now+900000);assert.equal(task.elapsedMs,1080000);assert.equal(task.status,'RUNNING');assert.equal(task.estimate,'לוקח יותר מהרגיל');
});
test('sent, cancellation requested, stopped, partial, failed and tracking interrupted stay distinct',()=>{
 assert.equal(select({busy:true,currentTurn:{...turn,progress:{phase:'starting'}}},now).phase,'נשלחה');
 const cancel=select({busy:true,currentTurn:{...turn,progress:{phase:'cancelling'}}},now);assert.equal(cancel.phase,'ביטול התבקש');assert.equal(cancel.canCancel,false);assert.equal(cancel.status,'RUNNING');
 for(const [state,reason,status,label] of [['COMPLETE',null,'COMPLETE','הושלמה'],['INCOMPLETE',null,'PARTIAL','הושלמה חלקית'],['FAILED_WITH_REASON','batch_canceled','CANCELLED','נעצרה'],['FAILED_WITH_REASON','network','FAILED','נכשלה'],['RUNNING',null,'INTERRUPTED','המעקב נפסק'],['CANCEL_REQUESTED',null,'INTERRUPTED','ביטול התבקש · המעקב נפסק']]){
 const task=select(terminal(state,{reason}),now);assert.equal(task.status,status);assert.equal(task.phase,label);assert.equal(task.estimate,null);assert.equal(task.elapsedMs,300000);
 }
 assert.equal(select({currentTurn:{...turn,status:'error'}},now).status,'FAILED');
 assert.equal(select({currentTurn:{...turn,status:'error',progress:{jobId:'known'}}},now).status,'INTERRUPTED');
});
test('principal reset and previews expose no previous reading; later questions retain the original result',()=>{
 assert.equal(select({},now),null);assert.equal(select({busy:true,currentTurn:{...turn,readingOp:'preview'}},now),null);
 const session={...terminal('COMPLETE'),busy:true,currentTurn:{id:'q',kind:'question'}};assert.equal(select(session,now).id,'a');
});
