import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const tpl=readFileSync(new URL('../tools/els/els-code.template.html',import.meta.url),'utf8');
const corpus=readFileSync(new URL('../tools/els/data/tk-letters.txt',import.meta.url),'utf8').slice(0,304805);
function source(name){const start=tpl.indexOf(`function ${name}(`);assert.ok(start>=0,name);let depth=0;for(let i=tpl.indexOf('{',start);i<tpl.length;i++){if(tpl[i]==='{')depth++;else if(tpl[i]==='}'&&!--depth)return tpl.slice(start,i+1);}throw Error(name);}
function load({text=corpus,start=270574,skip=59,term='תורתאמתמונתכר',center=true,width=40,ctxR=1}={}){
 const axis={start,skip,dir:1,positions:Array.from(term,(_,k)=>start+k*skip),v:'MATCH'};
 const st={ctxR,windowColumns:width,centerAxis:center,words:[],showN:2,res:{hits:[axis]}};
 const ctx=vm.createContext({T:text,N:text.length,st,axis,scopeN:()=>text.length,occ:()=>axis,hasGov:()=>true,hitKey:h=>`${h.skip}_${h.dir}_${h.start}`,norm:s=>s.replace(/[ךםןףץ]/g,c=>({'ך':'כ','ם':'מ','ן':'נ','ף':'פ','ץ':'צ'}[c])).replace(/[^א-ת]/g,''),
  governedCells:()=>new Set(axis.positions),colorSets:()=>({colorMap:new Map(axis.positions.map(i=>[i,'main'])),startSet:new Set([start])}),shownHitsOf:()=>[],isSourceHit:()=>false});
 const constants=tpl.split('\n').filter(l=>/^\s*const (gridStep|gapF|proxF)=/.test(l)).join('\n');
 vm.runInContext('const _spaceCache=new Map();\n'+constants+'\n'+['matrixRC','researchGeometry','blockOf','searchSpace','distanceToAnchors','recomputeWords','matrixSnapshot'].map(source).join('\n')+'\nthis.api={matrixRC,researchGeometry,blockOf,recomputeWords,matrixSnapshot};',ctx);
 return {api:ctx.api,st,axis};
}
test('centered Torah example finds the screenshot neighbours inside a compact window',()=>{
 const {api,st}=load();const b=api.blockOf();assert.equal(b.c0,-20);assert.equal(b.cw,40);
 st.words=['אמת','תורת','תורתי','אנכיתתנ','אשרנתןלך','לכם'].map(t=>({t}));api.recomputeWords();
 for(const w of st.words)assert.ok(w.hits.length,w.t);
 assert.ok(st.words.find(w=>w.t==='אנכיתתנ').hits.some(h=>h.start===271212&&h.skip===59&&h.dir===1));
 assert.ok(st.words.find(w=>w.t==='אשרנתןלך').hits.some(h=>h.start===271503&&h.skip===1));
 const snap=api.matrixSnapshot(b);
 for(const mark of snap.marks){const [r,c]=api.matrixRC(mark.i,b.S,b.c0);assert.equal(snap.rows[r-b.r0][c-b.c0],corpus[mark.i]);assert.equal(c-b.c0,20);}
});
test('historical uncentered window remains unchanged until explicitly centered',()=>{
 const {api,st}=load({center:false});const b=api.blockOf();assert.deepEqual([b.c0,b.cw,b.r0,b.r1],[0,40,4569,4615]);
 st.words=['אנכיתתנ','אשרנתןלך'].map(t=>({t}));api.recomputeWords();assert.ok(st.words.every(w=>!w.hits.length));
});
test('both row seams admit horizontal/diagonal neighbours with exact canonical indices',()=>{
 for(const column of [0,58])for(const step of [1,-1,58,-58,60,-60]){
  const text=Array(59*80).fill('ס'),start=59*40+column,first=start+(step>0?-1:1);
  [...'אבג'].forEach((c,k)=>text[first+k*step]=c);
  const {api,st}=load({text:text.join(''),start,term:'ססס'});st.words=[{t:'אבג'}];api.recomputeWords();
  assert.ok(st.words[0].hits.some(h=>h.start===first&&h.skip===Math.abs(step)&&h.dir===Math.sign(step)),`${column}/${step}`);
  const b=api.blockOf();for(const h of st.words[0].hits)for(const p of h.positions){const [r,c]=api.matrixRC(p,59,b.c0);assert.equal(r*59+c,p);assert.ok(r>=b.r0&&r<=b.r1&&c>=b.c0&&c<b.c0+b.cw);}
 }
});
test('centered windows include corpus-edge partial rows without duplicating or inventing letters',()=>{
 for(const start of [0,58,116]){
  const text='א'.repeat(118),{api}=load({text,start,term:'א',width:59});const b=api.blockOf(),snap=api.matrixSnapshot(b),seen=new Set();
  for(let y=0;y<snap.rows.length;y++)for(let x=0;x<b.cw;x++){
   const p=(b.r0+y)*59+b.c0+x,ch=snap.rows[y][x];
   if(p<0||p>=text.length){assert.equal(ch,' ');continue;}
   assert.ok(!seen.has(p));seen.add(p);assert.equal(ch,text[p]);
   const rc=api.matrixRC(p,59,b.c0);assert.equal(rc[0],b.r0+y);assert.equal(rc[1],b.c0+x);
  }
  assert.equal(seen.size,text.length);
 }
});
test('short skips retain contiguous reading layout',()=>{
 for(const skip of [2,3,8]){const {api}=load({skip,start:120,term:'אבא'});assert.equal(api.blockOf().c0,0);}
});
test('palindrome verification reuse is keyed to the final selected reading direction',()=>{
 const text=Array(59*80).fill('ס'),first=59*38+1,positions=[first,first+59,first+118];
 positions.forEach((p,k)=>text[p]='אבא'[k]);
 const {api,st}=load({text:text.join(''),start:59*40,term:'ססס'});
 const forward={start:first,skip:59,dir:1,positions,v:'MATCH'};
 st.words=[{t:'אבא',hits:[forward],extra:new Set([`59_-1_${first+118}`])}];api.recomputeWords();
 const reversed=st.words[0].hits.find(h=>h.skip===59&&h.start===first+118&&h.dir===-1);
 assert.ok(reversed);assert.equal(reversed.v,undefined,'forward verification must not be relabelled as reverse verification');
 reversed.v='MATCH';api.recomputeWords();
 assert.equal(st.words[0].hits.find(h=>h.skip===59&&h.start===first+118&&h.dir===-1)?.v,'MATCH','same reversed identity retains its verification');
});
