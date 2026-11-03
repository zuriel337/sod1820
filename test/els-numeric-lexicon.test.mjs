import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createElsNumericLexicon, elsNumericPlan, isElsNumericCandidate, formatElsHebrewNumeral } from '../src/lib/research/elsNumericLexicon.js';
import { isElsLexiconCandidate, prepareElsLexiconFindings } from '../src/lib/research/elsLexiconResearch.js';
import { groupElsLexiconDiscoveries } from '../src/lib/research/elsStructureInspection.js';

const source = readFileSync(new URL('../tools/els/els-code.template.html', import.meta.url), 'utf8');
const numericSource = readFileSync(new URL('../src/lib/research/elsNumericLexicon.js', import.meta.url), 'utf8').replaceAll('export ', '');
const formatter = source.slice(source.indexOf('  const HEBNUM='), source.indexOf('  __TANAKH_REFERENCE_FORMATTER__'));
const recognize = createElsNumericLexicon();
const words = new Map([['ימינ', {label:'ימין',lexiconSources:['canonical_tanakh_words']}], ['שמאל', {label:'שמאל',lexiconSources:['canonical_tanakh_words']}]]);
const fn = name => {
  let start = source.indexOf(`function ${name}(`), depth = 0;
  assert.ok(start >= 0, name);
  if (source.slice(start - 6, start) === 'async ') start -= 6;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(name);
};

test('conventional notation uses the existing formatter; number position, ambiguity and source remain explicit', () => {
  for (const [term, value, label] of [['מאשמאל',41,'מ״א שמאל'],['ימיננג',53,'ימין נ״ג'],['טושמאל',15,'ט״ו שמאל'],['שמאלטז',16,'שמאל ט״ז']]) {
    const readings = recognize(term, words, {});
    assert.ok(readings.some(r => r.value === value && r.label === label));
    assert.ok(isElsNumericCandidate(term, readings, {}));
    assert.ok(readings.every(r => r.interpretationRequired && r.lexiconSources.includes('hebrew_numeral_notation')));
  }
  assert.deepEqual(recognize('אמשמאל', words), [], 'same sum with nonconventional reversed numeral spelling is not enough');
  assert.deepEqual(recognize('יהשמאל', words), [], '15 uses טו');
  assert.deepEqual(recognize('מא', words), [], 'no naked two-letter numerals');
  assert.deepEqual(recognize('מאאבגדה', words), [], 'the word must exist in the declared lexicon');
  assert.deepEqual(recognize('מאשמאל', words, {numberMin:42}), []);
  assert.deepEqual(recognize('ימיננג', words, {numberMax:52}), []);
});

test('year parsing is an explicitly marked thousands interpretation, not ordinary Gematria', () => {
  const rows = recognize('התשפז', words);
  assert.equal(rows[0].value, 5787);
  assert.equal(rows[0].kind, 'hebrew-year');
  assert.equal(rows[0].label, 'ה׳תשפ״ז');
  assert.deepEqual(recognize('תשפז', words), [], 'missing millennium prefix is not invented');
  assert.deepEqual(recognize('התשפז', words, {yearMax:5786}), []);
  assert.equal(isElsNumericCandidate('התשפז', [{...rows[0],value:792}], {}), false);
  assert.equal(isElsNumericCandidate('התשפז', [{...rows[0],exactLetters:'התשפו'}], {}), false);
  assert.equal(isElsNumericCandidate('התשפז', [{...rows[0],interpretationRequired:false}], {}), false);
  assert.deepEqual(elsNumericPlan({numberMin:-10,numberMax:5000,yearMin:6000,yearMax:5000}), {numberMin:1,numberMax:999,yearMin:5999,yearMax:5999});
});

test('every admitted conventional 2–5 letter numeral roundtrips through the existing tool notation', () => {
  const lexicon = new Map([['אבגדה',{label:'אבגדה',lexiconSources:['test_fixture']}] ]);
  for (let value=1;value<=999;value++) {
    const letters=formatElsHebrewNumeral(value).replace(/[׳״]/g,'');
    const result=recognize(letters+'אבגדה',lexicon);
    assert.equal(result.some(r=>r.value===value),letters.length>=2,`${value}/${letters}`);
  }
});

function scanner(text, axis, box, wordMap=words, now=()=>0) {
  const context=vm.createContext({T:text,axis,box,wordMap,scopeN:()=>text.length,performance:{now},setTimeout:f=>f(),
    norm:s=>s.replace(/[ךםןףץ]/g,c=>({'ך':'כ','ם':'מ','ן':'נ','ף':'פ','ץ':'צ'}[c])),
    distanceToAnchors:(positions,anchors,S)=>Math.min(...positions.flatMap(p=>anchors.map(a=>Math.abs(Math.floor(p/S)-a[0])+Math.abs(p%S-a[1]))))});
  vm.runInContext(numericSource+formatter+'\nlet _elsNumericLexicon=null;'+['matrixNumericReadings','guidedMatrixRays','guidedMatrixDisplayTerm','guidedMatrixDistance','scanMatrixLexicon'].map(fn).join('\n'),context);
  vm.runInContext('const lexicon={words:wordMap,profile:{entryCount:wordMap.size}};let stopped=false;const updates=[];',context);
  return context;
}
const scan = (context, plan={mode:'numbers'}) => {
  context.plan=plan;
  return vm.runInContext('scanMatrixLexicon(axis,box,lexicon,()=>stopped,p=>updates.push(p),plan)',context).then(r=>r&&JSON.parse(JSON.stringify(r)));
};

test('the same bounded scanner finds numeric phrases in eight traversals, with exact positions and no term-by-corpus search', async () => {
  const S=31,grid=Array(S*S).fill('ז'),term='מאשמאל';
  const paths=[[2,2,0,1],[5,8,0,-1],[2,12,1,0],[9,16,-1,0],[12,2,1,1],[21,10,-1,-1],[12,24,1,-1],[23,18,-1,1]];
  const expected=[];
  for (const [r,c,dr,dc] of paths) {
    const start=r*S+c,step=dr*S+dc;
    [...term].forEach((ch,i)=>grid[start+i*step]=ch);
    expected.push(`${Math.abs(step)}_${Math.sign(step)}_${start}`);
  }
  const axis={positions:[30*S+24,30*S+25,30*S+26,30*S+27,30*S+28]},box={S,r0:0,r1:30,c0:0,c1:30};
  const context=scanner(grid.join(''),axis,box);
  context.wordMap[Symbol.iterator]=()=>{throw new Error('no dictionary enumeration');};
  const result=await scan(context);
  assert.equal(result.coverage.complete,true);
  assert.equal(result.modelCalls,0);assert.equal(result.findingMutation,false);assert.equal(result.truthPromotion,false);
  for (const hitId of expected) assert.ok(result.items.some(r=>r.term===term&&r.hitId===hitId),hitId);
  assert.ok(result.items.every(item=>item.numericReadings.every(r=>r.interpretationRequired)));
  assert.ok(result.items.every(item=>item.positions.every((p,i)=>p===item.start+i*item.skip*item.dir)));
  vm.runInContext('stopped=true',context);
  assert.equal(await scan(context),null);
});

test('same exact real corpus reproduces the supplied case as a regression, never a blind discovery claim', () => {
  const T=readFileSync(new URL('../tools/els/data/tk-letters.txt',import.meta.url),'utf8');
  const context=vm.createContext({T,scopeN:()=>304805,norm:s=>s.replace(/[^א-ת]/g,'').replace(/[ךםןףץ]/g,c=>({'ך':'כ','ם':'מ','ן':'נ','ף':'פ','ץ':'צ'}[c]))});
  vm.runInContext(fn('findAtSkips'),context);
  for (const [term,start,skip,dir,value] of [['מאשמאל',117646,5,-1,41],['ימיננג',109170,16965,-1,53],['התשפז',83718,16965,1,5787]]) {
    context.term=term;context.skip=skip;
    const hit=vm.runInContext('findAtSkips(term,[skip],0,304805,10000)',context).find(h=>h.start===start&&h.dir===dir);
    assert.ok(hit,term);
    const exact=hit.positions.map(p=>T[p]).join('');assert.equal(exact,term);
    assert.ok(recognize(exact,words).some(r=>r.value===value));
  }
});

test('a numeric axis is annotated separately, never duplicated as a new finding; caps and cancellation remain explicit', async () => {
  const T=readFileSync(new URL('../tools/els/data/tk-letters.txt',import.meta.url),'utf8').slice(0,304805);
  const positions=[109170,92205,75240,58275,41310,24345],S=16965,c0=positions[0]%S;
  const context=scanner(T,{positions},{S,r0:0,r1:8,c0:c0-3,c1:c0+3});
  const result=await scan(context,{mode:'numbers',numberMin:53,numberMax:53,yearMin:5787,yearMax:5787});
  assert.ok(result.axisNumericReadings.some(r=>r.value===53));
  assert.ok(!result.items.some(item=>item.positions.every(p=>positions.includes(p))));
  assert.equal(result.plan.numberMin,53);assert.equal(result.plan.yearMax,5787);
  assert.equal(result.coverage.directions,8);
  let calls=0;
  const timed=scanner(T,{positions},{S,r0:0,r1:8,c0:c0-3,c1:c0+3},words,()=>calls++?10001:0);
  const partial=await scan(timed);assert.equal(partial.coverage.stop,'TIME_LIMIT');assert.equal(partial.coverage.complete,false);
});

test('numeric candidates join existing groups and exact atomic admission; stale or malformed candidates are refused', () => {
  const state={status:'ok',term:'אבגדהו',scope:'torah',corpusLetters:1000,verification:{state:'MATCH',corpus_id:'test'},axis:{start:41,skip:31,dir:1,hitId:'31_1_41'},geometry:{S:31,cw:20,r0:0,r1:9,c0:0},findings:[],ui:{zoom:1.2}};
  const positions=[43,74,105,136,167,198];
  const item={term:'מאשמאל',label:'מ״א שמאל',numericReadings:recognize('מאשמאל',words),hitId:'31_1_43',start:43,skip:31,dir:1,positions,kind:'els'};
  const result={ok:true,origin:{term:state.term,corpus:'torah',corpusId:'test',start:41,skip:31,dir:1},plan:{mode:'numbers'},box:{S:31,c0:0,c1:19,r0:0,r1:9},items:[item]};
  assert.equal(isElsLexiconCandidate(item,result),true);
  assert.ok(groupElsLexiconDiscoveries(state,result).groups.some(g=>g.types.includes('parallel')));
  const load=prepareElsLexiconFindings(state,result,[item],'cyan');
  assert.ok(load);assert.equal(load.term,state.term);assert.equal(load.view.zoom,1.2);assert.deepEqual(load.words[0].sh,['31_1_43']);
  assert.equal(state.findings.length,0);
  assert.equal(prepareElsLexiconFindings(state,{...result,origin:{...result.origin,start:42}},[item]),null);
  assert.equal(isElsLexiconCandidate({...item,numericReadings:[{...item.numericReadings[0],wordLetters:'ימינ'}]},result),false);
  assert.equal(isElsLexiconCandidate({...item,numericReadings:[{...item.numericReadings[0],value:42}]},result),false);
});
