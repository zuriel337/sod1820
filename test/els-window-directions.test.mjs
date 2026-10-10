// Execute the production window kernel verbatim against controlled letter arrangements.
// The expected coordinates come from the fixtures, independently of the matcher.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const template = readFileSync(new URL('../tools/els/els-code.template.html', import.meta.url), 'utf8');
function functionSource(name) {
  const start = template.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  let depth = 0;
  for (let i = template.indexOf('{', start); i < template.length; i++) {
    if (template[i] === '{') depth++;
    else if (template[i] === '}' && --depth === 0) return template.slice(start, i + 1);
  }
  throw new Error(`Unbalanced ${name}`);
}
function load(text, scopeLength) {
  const context = vm.createContext({ T: text, N: text.length, scopeLength });
  const constants = ['gridStep', 'gapF', 'proxF', 'lenF', 'rarF', 'starsFromTq'].map(name => {
    const line = template.split('\n').find(line => line.trim().startsWith(`const ${name}=`));
    assert.ok(line, name);
    return line;
  });
  vm.runInContext([
    'const st={ctxR:1,windowColumns:40}; const scopeN=()=>scopeLength; const _spaceCache=new Map();',
    'const norm=s=>s.replace(/[^א-ת]/g,""); const gem=()=>0; const bookOf=()=>"fixture"; const isGov=h=>h?.v==="MATCH";',
    ...constants,
    ...['researchGeometry','searchSpace','distanceToAnchors','crossFindMultiHit','isSourceHit','isInspectableHit'].map(functionSource),
    'this.api={crossFindMultiHit,researchGeometry,isSourceHit,isInspectableHit};',
  ].join('\n'), context);
  return context.api;
}
const S = 31;
const axis = (row) => ({ skip:S, dir:1, start:row*S+15, positions:[0,1,2,3].map(k=>(row+k)*S+15) });
const place = (text, start, step, word) => [...word].forEach((letter,k)=>text[start+k*step]=letter);

test('cross window finds source, vertical and diagonal words on all eight sides and reading directions', () => {
  for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]) {
    const text = Array(S*70).fill('ס'), main = axis(33), word='זחט';
    const start=(34+dy*3)*S+15+dx*3, step=dy*S+dx;
    place(text,main.start,S,'אבגד'); place(text,start,step,word);
    const api=load(text,text.length);
    const meeting=api.crossFindMultiHit(main,7,[word],18,new Map([[word,1]]),1);
    assert.ok(meeting, `direction ${dx},${dy}`);
    const hit=meeting.detail[0];
    assert.deepEqual([hit.p0,hit.p1,hit.skip,hit.dir],[start,start+2*step,Math.abs(step),Math.sign(step)]);
    assert.equal(meeting.occ,7,'chunking preserves original occurrence identity');
  }
});

test('Torah window cannot read a secondary word beyond its scope, including a partial final row', () => {
  const text=Array(S*75).fill('ס'), main=axis(64), scopeLength=S*70-10;
  place(text,main.start,S,'אבגד');
  // Within the final geometric row, but beyond the selected corpus boundary.
  const start=scopeLength+1; place(text,start,1,'זחט');
  const torah=load(text,scopeLength), tanakh=load(text,text.length);
  assert.equal(torah.crossFindMultiHit(main,0,['זחט'],18,new Map([['זחט',1]]),1),null);
  assert.equal(tanakh.crossFindMultiHit(main,0,['זחט'],18,new Map([['זחט',1]]),1).detail[0].p0,start);
  assert.equal(torah.researchGeometry(S,15,66).r1,69);
});

test('source context requires an exact contiguous corpus match and an explicit source target', () => {
  const text=Array(100).fill('ס');place(text,40,-1,'זחט');
  const api=load(text,100), hit={skip:1,dir:-1,start:40,positions:[40,39,38]};
  assert.equal(api.isSourceHit(hit,'זחט'),true);
  assert.equal(api.isInspectableHit(hit,{term:'זחט'}),false,'cannot mint an ELS lens from source coordinates');
  assert.equal(api.isInspectableHit(hit,{term:'זחט',kind:'source-sequence'}),true);
  for (const invalid of [{...hit,skip:2},{...hit,positions:[40,38,39]},{...hit,start:41}]) {
    assert.equal(api.isInspectableHit(invalid,{term:'זחט',kind:'source-sequence'}),false);
  }
  assert.equal(api.isSourceHit(hit,'זחת'),false);
});
