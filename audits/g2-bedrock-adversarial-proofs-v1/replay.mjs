/**
 * G2 audit-only counterexample reproducer. No network, DB, credentials, or real personal data.
 * Baseline: zuriel337/sod1820 main fa154d67e5209c28f4043c2adfdede5451f12386.
 * These are isolated source-excerpt replays and explicit state models, NOT production E2E tests.
 * A DEFECT_REPRODUCED result means the baseline fails the desired invariant; it is not a product PASS.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const results = [];
async function check(id, classification, test) {
  const evidence = await test();
  results.push({ id, classification, evidence });
}

// Exact function body from src/lib/research/universalFinding.js,
// blob f2445d04d74f7ff9730a8dbfbe02d44616ae8f0e.
const safePart = (v) => encodeURIComponent(String(v ?? '').trim());
function universalFindingId({ kind, sourceIdentity, subjectKey, occurrence } = {}) {
  const occ = occurrence && typeof occurrence === 'object'
    ? [occurrence.skip, occurrence.dir ?? occurrence.direction, occurrence.start].filter(v => v != null).join(':')
    : '';
  const native = typeof sourceIdentity === 'string'
    ? sourceIdentity
    : sourceIdentity && typeof sourceIdentity === 'object'
      ? JSON.stringify(sourceIdentity)
      : '';
  return ['uf1', kind || 'other', subjectKey || '', native || occ].map(safePart).join(':');
}

// Verification loop transcribed from LIVE research-extract v3.
// RPC return values below are a canonical live SQL snapshot, not independently calculated gematria.
const methods = {
  'משיח': {'אלבם':412,'אתבש':112,'גדול':358,'קדמי':1331,'רגיל':358,'הכפלה':91764,'מילוי':878,'מסתתר':552,'ריבוע':1088,'מהמאגר':true,'סידורי':52,'כל_הערכים':[52,112,358,412,552,878,1088,1331,1976,91764],'קדמי_גדול':1331,'הכפלה_גדול':91764,'ריבוע_גדול':1088,'אותיות_אחרי':479,'אותיות_לפני':246,'מילוי_דמילוי':1976},
  'תורה': {'אלבם':179,'אתבש':174,'גדול':611,'קדמי':2326,'רגיל':611,'הכפלה':200061,'מילוי':963,'מסתתר':783,'ריבוע':2023,'מהמאגר':true,'סידורי':53,'כל_הערכים':[53,174,179,611,783,963,1447,2023,2326,200061],'קדמי_גדול':2326,'הכפלה_גדול':200061,'ריבוע_גדול':2023,'אותיות_אחרי':314,'אותיות_לפני':409,'מילוי_דמילוי':1447}
};
function legacyVerification(o, fixture = methods) {
  const kind = String(o?.kind || '').toLowerCase();
  const terms = (Array.isArray(o?.terms) ? o.terms : []).map(String).slice(0, 6);
  const relates = (Array.isArray(o?.relates) ? o.relates : []).map(String).slice(0, 4);
  const value = (o?.value != null && !isNaN(+o.value)) ? Math.trunc(+o.value) : null;
  let engine_verified = null, engine_detail = null;
  if ((kind === 'fact' || kind === 'relation') && value != null) {
    const det = {}; let anyHeb = false, matched = false;
    for (const t of [...terms, ...relates]) {
      if (/[א-ת]/.test(t || '')) {
        anyHeb = true; const m = fixture[t] ?? null;
        if (m) { det[t] = m; if (Object.values(m).some(v => v === value)) matched = true; }
      }
    }
    if (anyHeb) { engine_verified = matched; engine_detail = det; }
  }
  return { value, engine_verified, engine_detail };
}

await check('V01_one_operand_launders_whole_relation', 'DEFECT_REPRODUCED', () => {
  const out = legacyVerification({kind:'relation',terms:['משיח','תורה'],value:358});
  assert.equal(out.engine_verified, true);
  assert.notEqual(methods['תורה']['רגיל'], 358);
  return {verification:out.engine_verified, canonicalRagil:[358,611], note:'Synthetic false equality accepted by the baseline any-operand loop.'};
});
await check('V02_wrong_declared_method_is_ignored', 'DEFECT_REPRODUCED', () => {
  const out = legacyVerification({kind:'fact',terms:['משיח'],claimed_method:'סידורי',value:358});
  assert.equal(out.engine_verified, true); assert.equal(methods['משיח']['סידורי'], 52);
  return {verification:out.engine_verified, claimedMethod:'סידורי', canonicalMethodResult:52, matchedDifferentMethod:'רגיל'};
});
await check('V03_rpc_failure_becomes_false_instead_of_unknown', 'DEFECT_REPRODUCED', () => {
  const out = legacyVerification({kind:'fact',terms:['משיח'],value:358}, {});
  assert.equal(out.engine_verified, false); assert.deepEqual(out.engine_detail, {});
  return out;
});
await check('V04_fraction_is_silently_truncated', 'DEFECT_REPRODUCED', () => {
  const out = legacyVerification({kind:'observation',value:3.14});
  assert.equal(out.value,3); return {input:3.14, storedCandidateValue:out.value};
});
await check('V05_valid_single_operand_control', 'CONTROL_PASS', () => {
  const out = legacyVerification({kind:'fact',terms:['משיח'],value:358});
  assert.equal(out.engine_verified,true); return {verification:out.engine_verified, canonicalRagil:358};
});

await check('I01_els_corpus_omitted_from_id', 'DEFECT_REPRODUCED', () => {
  // The real elsStateToUniversalFindings adapter passes sourceIdentity=hitId,
  // subjectKey=term and puts corpus only in source/verification, outside ID inputs.
  const a = {kind:'els',subjectKey:'SYNTHETIC',sourceIdentity:'7_1_100',corpus:'torah'};
  const b = {...a,corpus:'tanakh'};
  const ida=universalFindingId(a), idb=universalFindingId(b);
  assert.equal(ida,idb);
  const cart = [{id:ida,corpus:a.corpus}];
  const entity={id:idb,corpus:b.corpus};
  const next=cart.some(e=>e.id===entity.id)?cart:[...cart,entity]; // actual Provider dedup expression
  assert.equal(next.length,1);
  return {sameId:true, retainedCartItems:next.length, note:'No claim that these synthetic ELS hits occur in either corpus.'};
});
await check('I02_native_id_masks_distinct_occurrences', 'DEFECT_REPRODUCED', () => {
  const base={kind:'sequence',subjectKey:'1111',sourceIdentity:'synthetic-pi-witness'};
  const a=universalFindingId({...base,occurrence:{start:10}});
  const b=universalFindingId({...base,occurrence:{start:20}});
  assert.equal(a,b); return {sameId:true, starts:[10,20], scope:'Generic constructor contract; not a claim about the current Pi adapter.'};
});
await check('I03_object_key_order_splits_same_native_identity', 'DEFECT_REPRODUCED', () => {
  const base={kind:'synthetic',subjectKey:'x'};
  const a=universalFindingId({...base,sourceIdentity:{a:1,b:2}});
  const b=universalFindingId({...base,sourceIdentity:{b:2,a:1}});
  assert.notEqual(a,b); return {sameId:false, semanticNativeObjectEqual:true};
});
await check('I04_distinct_native_id_control', 'CONTROL_PASS', () => {
  const base={kind:'els',subjectKey:'SYNTHETIC'};
  assert.notEqual(universalFindingId({...base,sourceIdentity:'7_1_100'}),universalFindingId({...base,sourceIdentity:'7_1_101'}));
  return {sameId:false};
});

// Source-shaped projection into the constructor. This is the exact field-selection
// boundary from researchObjectFinding.js, captured BEFORE makeUniversalFinding.
function projectionInput(row) {
  const clean=v=>v==null?null:(String(v).trim()||null);
  const detail=row?.engine_detail&&typeof row.engine_detail==='object'?row.engine_detail:{};
  const explicit=clean(detail.verification_state);
  const state=explicit&&new Set(['match','mismatch','method_unknown','not_tested']).has(explicit)?explicit:null;
  const sourceRef=clean(row.source_ref), promotedNodeId=clean(row.promoted_node_id);
  const terms=Array.isArray(row.terms)?row.terms.filter(Boolean):[];
  return {
    kind:'research-object',stage:null,status:row.status??null,
    subject:{type:'research-object',key:String(row.id),label:clean(row.statement)||`Research object ${row.id}`,value:row.value??null,lang:null},
    source:{engine:null,adapter:'research-object-v1',sourceRef,method:null,corpus:clean(row.source),lang:null},
    identity:{sourceIdentity:{researchObjectId:String(row.id)},entityRef:promotedNodeId?`node:${promotedNodeId}`:null,relationRef:null},
    verification:{claimed_expression:detail.claimed_expression??null,claimed_method:detail.claimed_method??null,claimed_value:detail.claimed_value??null,engine_method_tested:detail.engine_method_tested??detail.engine??null,engine_result:detail.engine_result??detail.result??null,statement_lang:detail.statement_lang??null,verification_state:state},
    evidence:{refs:sourceRef?[sourceRef]:[],facts:terms.map(term=>({type:'term',value:term})),score:row.confidence??null,confidence:row.confidence??null},
    access:{tier:row.privacy_scope??null,reason:null},
    provenance:{createdBy:null,createdAt:row.created_at||undefined,inputRef:sourceRef},
    projection:{anchors:promotedNodeId?[{space:'reality-graph',id:promotedNodeId}]:[],relations:[],dimensions:{researchObjectKind:row.kind??null}}
  };
}
await check('P01_source_proof_metadata_not_transported', 'DEFECT_REPRODUCED', () => {
  const row={id:'synthetic',statement:'fixture',source_ref:'synthetic:source',privacy_scope:'private',owner_person_id:'OWNER_MARKER',parent_id:'PARENT_MARKER',meta:{ext:{rule_application:{applications:[{rule_id:'RULE_MARKER'}]},procedure:{steps:['PROCEDURE_MARKER']}}},evidence:'QUOTE_MARKER',engine_detail:{verification_state:'match',trace:'TRACE_MARKER'}};
  const s=JSON.stringify(projectionInput(row));
  const lost=['OWNER_MARKER','PARENT_MARKER','RULE_MARKER','PROCEDURE_MARKER','QUOTE_MARKER','TRACE_MARKER'].filter(x=>!s.includes(x));
  assert.equal(lost.length,6); return {untransported:lost, note:'Evidence remains in the source row; it is lost at this envelope boundary, not deleted from DB.'};
});
await check('P02_adapter_does_not_launder_legacy_verified_boolean', 'CONTROL_PASS', () => {
  const out=projectionInput({id:'synthetic',engine_verified:true,engine_detail:{}});
  assert.equal(out.verification.verification_state,null); return {verification_state:null};
});

await check('C01_oldest40_window_never_reaches_later_messages', 'DEFECT_REPRODUCED', () => {
  const rows=Array.from({length:89},(_,i)=>({id:i+1,created_at:i+1}));
  const selected=rows.sort((a,b)=>a.created_at-b.created_at).slice(0,40);
  assert.equal(selected.at(-1).id,40); return {total:89,selected:40,latestIncluded:40,omitted:49};
});
await check('C02_now_cursor_skips_unprocessed_backlog', 'DEFECT_REPRODUCED', () => {
  const previous=0, now=101, rows=Array.from({length:100},(_,i)=>i+1);
  const batch=rows.filter(t=>t>previous).slice(0,50);
  const reflectedThrough=now;
  const next=rows.filter(t=>t>reflectedThrough).slice(0,50);
  assert.equal(batch.length,50); assert.equal(next.length,0);
  return {processed:50,neverProcessed:50,nextBatch:next.length, scope:'Synthetic backlog; live lab has only 13 rows, no historical loss claimed.'};
});
await check('C03_parse_failure_still_advances_cursor', 'DEFECT_REPRODUCED', () => {
  const out=null, nowIso='2030-01-01T00:00:00.000Z';
  const patch={reflected_through:nowIso,updated_at:nowIso}; // actual live lab-reflect assignment, unconditional
  assert.equal(!!out,false); assert.equal(patch.reflected_through,nowIso);
  return {parsed:false,cursor:patch.reflected_through};
});

// In-memory interpretation of the actual saveCloudResearch algorithm. It is
// a state-model replay, not a Supabase client or concurrent production test.
function cloudSave(existing, userId, data, upsertSucceeds=true) {
  const bucketMap={cart:'cart',saved:'library',pinned:'pinned'};
  const rows=[],seen=new Set();
  for(const [srcKey,bucket] of Object.entries(bucketMap)) {
    for(const e of (data[srcKey]||[])) {
      if(!e||!e.type) continue;
      const ref=String(e.ref??e.id??e.title??'');
      const k=`${bucket}|${e.type}|${ref}`;
      if(seen.has(k)) continue; seen.add(k);
      rows.push({user_id:userId,bucket,entity_type:e.type,entity_ref:ref,metadata:e});
    }
  }
  if(!rows.length) return existing; // baseline skips removal of final item
  const key=r=>`${r.user_id}|${r.bucket}|${r.entity_type}|${r.entity_ref}`;
  const db=new Map(existing.map(r=>[key(r),r]));
  if(upsertSucceeds) for(const r of rows) db.set(key(r),r);
  const keep=new Set(rows.map(r=>`${r.bucket}|${r.entity_type}|${r.entity_ref}`));
  return [...db.values()].filter(r=>r.user_id!==userId||!Object.values(bucketMap).includes(r.bucket)||keep.has(`${r.bucket}|${r.entity_type}|${r.entity_ref}`));
}
const item=id=>({id,ref:id,type:'finding',title:id});
const row=(uid,id)=>({user_id:uid,bucket:'library',entity_type:'finding',entity_ref:id,metadata:item(id)});
await check('W01_last_item_removal_not_synced', 'DEFECT_REPRODUCED', () => {
  const db=cloudSave([row('A','x')],'A',{saved:[]}); assert.equal(db.length,1);
  return {localItems:0,cloudItems:db.length};
});
await check('W02_stale_device_deletes_unseen_remote_addition', 'DEFECT_REPRODUCED', () => {
  const afterA=cloudSave([row('A','x')],'A',{saved:[item('x'),item('y')]});
  const afterB=cloudSave(afterA,'A',{saved:[item('x'),item('z')]});
  assert.equal(afterB.some(r=>r.entity_ref==='y'),false);
  return {beforeSecondSave:['x','y'],afterSecondSave:afterB.map(r=>r.entity_ref),lost:'y'};
});
await check('W03_failed_upsert_can_still_delete_existing', 'DEFECT_REPRODUCED', () => {
  const after=cloudSave([row('A','x')],'A',{saved:[item('y')]},false);
  assert.equal(after.length,0); return {upsertSucceeded:false,cloudItems:after.length};
});
await check('W04_account_switch_reuses_prior_local_payload', 'DEFECT_REPRODUCED', () => {
  // ResearchProvider clears context only; KEY=sod_research_v1 is not user-scoped.
  const local={saved:[item('PRIVATE_SYNTHETIC_A')],cart:[],pinned:[],history:[],collections:[],journeys:[],context:{owner:'A'}};
  local.context=null; // actual logout effect; other state survives
  const remoteB={cart:[],saved:[],pinned:[],history:[],collections:[],journeys:[],context:null};
  const has=remoteB.cart.length||remoteB.saved.length||remoteB.pinned.length||remoteB.history.length||remoteB.collections.length||remoteB.journeys.length||remoteB.context;
  const afterB=!has?cloudSave([], 'B', local):[];
  assert.equal(afterB[0].user_id,'B'); assert.equal(afterB[0].entity_ref,'PRIVATE_SYNTHETIC_A');
  return {fromLocalPrincipal:'A',cloudPrincipal:'B',copiedItems:afterB.length,scope:'Synthetic account-transition model; no live account switching or real private data.'};
});
await check('W05_different_user_rows_are_not_deleted_control', 'CONTROL_PASS', () => {
  const after=cloudSave([row('A','x'),row('B','b')],'A',{saved:[item('x')]});
  assert.equal(after.some(r=>r.user_id==='B'),true); return {otherUserPreserved:true};
});

const summary={baseline_main:'fa154d67e5209c28f4043c2adfdede5451f12386',generated_at:new Date().toISOString(),scope:'OFFLINE_ISOLATED_SOURCE_EXCERPTS_AND_STATE_MODELS',production_writes:0,network_calls:0,checks:results.length,defects_reproduced:results.filter(r=>r.classification==='DEFECT_REPRODUCED').length,positive_controls:results.filter(r=>r.classification==='CONTROL_PASS').length,results};
const out=path.join(path.dirname(fileURLToPath(import.meta.url)),'replay-results.json');
fs.writeFileSync(out,JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({checks:summary.checks,defects_reproduced:summary.defects_reproduced,positive_controls:summary.positive_controls,product_verdict:'NOT_FIXED_NOT_RELEASED'},null,2));
