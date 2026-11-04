import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { selectElsMatrixReadingActivity as select, elsMatrixReadingReturnLoad as reopen } from "../src/lib/research/elsMatrixReadingActivity.js";

const axis = { term: "קולומביה", scope: "torah", corpusId: "0b022e8eef6f9c16", skip: 4545, dir: 1, start: 248765, hitId: "4545_1_248765" };
const context = { contract: "els_matrix_presentation_context_v1", axis, matrix: { width:4545,rowStart:54,colStart:3300,rows:["אבגד"] } };
const turn = { id:"scan-a",kind:"els_matrix_reading",status:"running",continuation:{contextSnapshot:{elsMatrixContext:context}},progress:{phase:"running",elapsedMs:125000} };
const message = { ...turn, id:undefined, turnId:turn.id,role:"raziel",elsMatrixReading:{state:"COMPLETE",axis:{...axis,corpus_id:axis.corpusId},timing:{elapsed_ms:125000}} };

test("running presence is a projection, with observed elapsed time and no invented percentage",()=>{
  const state={busy:true,currentTurn:turn,thread:[]}; const original=JSON.stringify(state);
  assert.deepEqual(select(state),{turnId:"scan-a",axis,active:true,label:"סריקת מטריצה ברקע",phase:"running",minutes:2,canCancel:true,fixture:false,saved:false});
  assert.equal(JSON.stringify(state),original);
  assert.equal("percent" in select(state),false);
});
test("page context and ordinary conversation do not change the origin of the scan",()=>{
  const state={busy:true,currentTurn:{kind:"question"},contextSnapshot:{focus:{els:{term:"אחר"}}},thread:[message]};
  assert.equal(select(state).axis.start,axis.start);assert.equal(select(state).active,false);
  assert.equal(reopen(state,"scan-a").hitId,axis.hitId);assert.equal(reopen(state,"missing"),null);
});
test("new scan wins over previous results without mixing occurrences",()=>{
  const next={...turn,id:"scan-b",continuation:{contextSnapshot:{elsMatrixContext:{...context,axis:{...axis,start:248766,hitId:"4545_1_248766"}}}}};
  const state={busy:true,currentTurn:next,thread:[message]};
  assert.equal(select(state).turnId,"scan-b");assert.equal(reopen(state,"scan-a").start,248765);assert.equal(reopen(state,"scan-b").start,248766);
});
test("cancel requested, interrupted, failure and test data are never presented as success",()=>{
  assert.equal(select({busy:true,currentTurn:{...turn,progress:{phase:"cancelling",cancelling:true}}}).canCancel,false);
  for(const status of ["INCOMPLETE","FAILED_WITH_REASON","REFUSED","RUNNING","CANCEL_REQUESTED"]){
    const activity=select({thread:[{...message,elsMatrixReading:{...message.elsMatrixReading,state:status,is_test_fixture:true}}]});
    assert.equal(activity.phase,status);assert.equal(activity.fixture,true);assert.notEqual(activity.label,"תוצאות הסריקה מוכנות");
  }
  assert.equal(select({currentTurn:{...turn,status:"error"}}).phase,"error");
});
test("invalid/mismatched context, preview and a reset principal expose no activity",()=>{
  assert.equal(select({}),null);assert.equal(reopen({},"scan-a"),null);
  assert.equal(select({busy:true,currentTurn:{...turn,continuation:null}}),null);
  assert.equal(select({busy:true,currentTurn:{...turn,readingOp:"preview"}}),null,"cost preview is not a scan");
  assert.equal(reopen({currentTurn:{...turn,readingOp:"preview"}},"scan-a"),null);
  assert.equal(select({thread:[{...message,elsMatrixReading:{...message.elsMatrixReading,axis:{...message.elsMatrixReading.axis,start:5}}}]}),null);
  assert.equal(select({thread:[{...message,elsMatrixReading:{state:"PREVIEW"}}]}),null);
  const mismatched={...message,elsMatrixReading:{...message.elsMatrixReading,axis:{...message.elsMatrixReading.axis,start:5}}};
  assert.equal(reopen({currentTurn:turn,thread:[mismatched]},"scan-a"),null,"do not fall back to the request after a contradictory response");
});
test("return intent contains engine coordinates but never job credentials or new search",()=>{
  const load=reopen({busy:true,currentTurn:turn},"scan-a");
  assert.deepEqual(load,{term:axis.term,scope:axis.scope,corpusId:axis.corpusId,skip:axis.skip,dir:axis.dir,start:axis.start,hitId:axis.hitId,words:[],researchNonce:"scan-a"});
  assert.equal(load.verified,undefined);
});
test("global frame and existing page consume the same projection; no new polling/Provider",()=>{
  const component=readFileSync(new URL("../src/components/experience2029/ElsMatrixReadingActivity2029.jsx",import.meta.url),"utf8");
  assert.doesNotMatch(component,/useEffect|setInterval|setTimeout|fetch\(|submitElsMatrixReading|createContext/);
  assert.match(component,/navigate\("\/code\?mode=classic", \{ state: \{ elsReadingReturnTurnId: activity.turnId \}/);
  const frame=readFileSync(new URL("../src/components/experience2029/SystemFrame2029.jsx",import.meta.url),"utf8");
  assert.match(frame,/<ElsMatrixReadingActivity2029 \/>/);assert.match(frame,/data-matrix-reading-status/);
  const page=readFileSync(new URL("../src/pages/Els2029Page.jsx",import.meta.url),"utf8");
  assert.match(page,/elsMatrixReadingReturnLoad\(razielSession, turnId\)/);
  assert.match(page,/setResearchLoad\(\{ \.\.\.item, researchNonce:/);
});
