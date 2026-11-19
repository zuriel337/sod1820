import test from 'node:test';
import assert from 'node:assert/strict';
import { captureElsResearchReturn, elsResearchReturnLoad, elsResearchSnapshotMatches } from '../src/lib/research/elsResearchReturnSnapshot.js';
const state = () => ({ status:'ok',term:'תורה',termRaw:'תורה',scope:'torah',verification:{state:'MATCH',corpus_id:'fixture'},
  axis:{hitId:'50_1_5',start:5,skip:50,length:4},geometry:{cw:40},
  ui:{ctxR:1,windowSize:'small',windowRequested:'small',zoom:1.6,fit:false,heat:true,niqqud:true,hideMain:true,showN:3,findingRadius:8},
  findings:[{t:'אמת',color:'#112233',shown:['49_1_25'],sourceHits:[{selected:true,shown:true,hitId:'1_1_50'}]}],
  matrix:{rows:['DO NOT COPY']},provenance:{editId:'private',desc:'private'} });
const origin={entityType:'els',term:'תורה',corpus:'torah',corpusId:'fixture',skip:50,dir:1,start:5};
test('return snapshot copies only bounded engine identity/findings/view; later state cannot mutate it',()=>{
  const current=state(),snap=captureElsResearchReturn(current);
  assert.ok(elsResearchSnapshotMatches(snap,origin));
  current.findings[0].shown.length=0;current.ui.zoom=2;
  const load=elsResearchReturnLoad({origin,returnSnapshot:snap});
  assert.equal(load.view.zoom,1.6);assert.equal(load.view.fit,false);
  assert.deepEqual(load.words,[{t:'אמת',color:'#112233',sh:['49_1_25'],sourceShown:['1_1_50']}]);
  assert.deepEqual(load.searchWindow,{ctxR:1,windowColumns:40,windowSize:'small',windowRequested:'small'});
  assert.equal(load.hideMain,true);assert.equal(load.hitId,'50_1_5');
  assert.ok(Object.isFrozen(snap.findings[0].shown));
  assert.doesNotMatch(JSON.stringify(snap),/private|DO NOT COPY/);
});
test('radius-hidden selections survive without admitting candidate hits',()=>{
  const current=state();
  current.findings[0].hits=[{hitId:'49_1_25',selected:true,shown:false,verified:true},{hitId:'48_1_29',selected:true,verified:false}];
  current.findings[0].shown=[];
  assert.deepEqual(captureElsResearchReturn(current).findings[0].shown,['49_1_25']);
});
test('unverified, unbounded or mismatched snapshots never attach to a different occurrence',()=>{
  assert.equal(captureElsResearchReturn({...state(),verification:{state:'CANDIDATE'}}),null);
  // The ceiling is 24 words on one matrix (ZURIEL 18.11.2026, was 12): 24 attach, 25 do not.
  assert.notEqual(captureElsResearchReturn({...state(),findings:Array(24).fill(state().findings[0])}),null);
  assert.equal(captureElsResearchReturn({...state(),findings:Array(25).fill(state().findings[0])}),null);
  for(const finding of [null,{}, {t:''}]) assert.equal(captureElsResearchReturn({...state(),findings:[finding]}),null);
  const snap=captureElsResearchReturn(state());
  for(const change of [{start:6},{corpusId:'other'},{corpus:'tanakh'},{term:'אור'},{dir:-1},{skip:51}]){
    assert.equal(elsResearchSnapshotMatches(snap,{...origin,...change}),false);
    assert.deepEqual(elsResearchReturnLoad({origin:{...origin,...change},returnSnapshot:snap}).words,[]);
  }
});

test('row spacing restores its own coordinates without replacing occurrence skip, and rejects unsupported geometry',()=>{
  const current=state();current.axis={...current.axis,skip:60,hitId:'60_1_5'};
  const projection={kind:'row-spacing',width:20,rowGap:2,r0:2,r1:26,c0:3,c1:19};
  const snap=captureElsResearchReturn(current,projection);
  projection.r0=99;
  const load=elsResearchReturnLoad({origin:{...origin,skip:60},returnSnapshot:snap});
  assert.equal(load.skip,60);assert.equal(load.matrixProjection.width,20);
  assert.equal(load.matrixProjection.rowGap,2);assert.equal(load.matrixProjection.r0,2);
  assert.ok(Object.isFrozen(snap.matrixProjection));
  for(const change of [{width:30},{rowGap:6},{r0:-1},{r1:90},{c1:20}]){
    assert.equal(captureElsResearchReturn(current,{...load.matrixProjection,...change}).matrixProjection,undefined);
  }
});
