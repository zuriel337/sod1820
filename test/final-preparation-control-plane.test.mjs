// Execute the actual controller with synthetic identities and controlled reader
// promises. No production session, RPC, model, or database is used.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { unlink } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const outfile = resolve(`.test-finalprep-cp1-${process.pid}.mjs`);
await build({ entryPoints: ['src/pages/ControlPlane2029Page.jsx'], outfile, bundle: true, platform: 'node', format: 'esm', external: ['react'], plugins: [{ name: 'owned-read-boundaries', setup(b) {
  b.onResolve({ filter: /(?:AuthContext\.jsx|visits\.js|NavigationIcon2029\.jsx|Sod2029Shell\.jsx|OperationalMetrics2029\.jsx)$|^react-router-dom$/ }, a => ({ path: a.path, namespace: 'fixture' }));
  b.onLoad({ filter: /.*/, namespace: 'fixture' }, a => ({ loader: 'jsx', contents: a.path.endsWith('OperationalMetrics2029.jsx') ? 'import React from "react";export default(props)=>{globalThis.__cp1.metricsMounted=(globalThis.__cp1.metricsMounted||0)+1;globalThis.__cp1.metricsProps=props;return <p>metrics-fixture providers:{String(Boolean(props.providersOpen))} refresh:{props.refreshToken}</p>;};' : a.path.endsWith('AuthContext.jsx') ? 'export const useAuth=()=>globalThis.__cp1.auth;' : a.path.endsWith('visits.js') ? 'export const getSystemHealth=()=>globalThis.__cp1.read("health"),getVideoMapHealth=()=>globalThis.__cp1.read("video"),getOperationalTraceList=(...args)=>globalThis.__cp1.read("list",args),getOperationalTrace=id=>globalThis.__cp1.read("detail",id);' : a.path === 'react-router-dom' ? 'import React from "react";export const Navigate=()=> <p>signed-out</p>;' : a.path.endsWith('NavigationIcon2029.jsx') ? 'export default()=>null;' : 'import React from "react";export default({children})=><main>{children}</main>;export const FrameState=({title,children})=><section><h3>{title}</h3>{children}</section>;' }));
} }] });
const { default: Page } = await import(pathToFileURL(outfile));
after(async () => { await unlink(outfile); delete globalThis.__cp1; });
const defer = () => { let resolve, reject; const promise = new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject}; };
const snapshot = { generated_at: '2026-11-03T16:00:00Z', cron: [], security: { unacked: 0, recent_24h: 0 } };
const text = root => JSON.stringify(root.toJSON());
function fixture(auth = { user: { id: 'A' }, isAdmin: true, loading: false }) {
  const f = { auth, calls: [], read(kind,arg) { const d=defer(); f.calls.push({kind,arg,...d});return d.promise; } };
  globalThis.__cp1 = f; return f;
}
async function mount(f) { let root; await act(async()=>{root=Renderer.create(React.createElement(Page));}); return root; }
async function settle(f, values = {}) { await act(async()=>{for (const c of f.calls.filter(c=>c.kind!=='detail')) { const value=Object.hasOwn(values,c.kind)?values[c.kind]:c.kind==='list'?[]:snapshot; if(value instanceof Error)c.reject(value); else c.resolve(value); }}); }

test('each successful CP1 section appears independently of failed/slow secondary readers', async()=>{
  const f=fixture(),root=await mount(f);
  assert.deepEqual(f.calls.map(c=>c.kind),['health','video','list']);
  assert.deepEqual(f.calls[2].arg,[7,100]);
  await act(async()=>{f.calls[0].resolve({...snapshot,security:{unacked:66,recent_24h:3}});});
  assert.ok(text(root).includes('66'));assert.ok(text(root).includes('טוען traces'));
  await act(async()=>{f.calls[1].reject(new Error('video reader down'));f.calls[2].reject(new Error('trace reader down'));});
  assert.ok(text(root).includes('66'));assert.ok(text(root).includes('לא ניתן לקרוא את מצב הווידאו'));
  assert.ok(text(root).includes('לא ניתן לקרוא traces כרגע'));assert.ok(!text(root).includes('שהתקבלה ריקה'));
  await act(async()=>root.unmount());
});

test('measured empty and measured zero remain different from malformed/unknown snapshots',async()=>{
  const f=fixture(),root=await mount(f);await settle(f);
  assert.ok(text(root).includes('שהתקבלה ריקה'));assert.ok(!text(root).includes('לא ניתן לקרוא traces כרגע'));
  assert.ok(text(root).includes('הקורא החזיר רשימה ריקה'));
  const refresh=root.root.findAllByType('button').find(b=>b.children.includes('רענן'));
  await act(async()=>{ refresh.props.onClick(); });
  await settle(f,{health:null,video:{},list:null});
  assert.ok(text(root).includes('לא ניתן לקרוא את מצב המערכת'));assert.ok(text(root).includes('לא ניתן לקרוא traces כרגע'));
  assert.ok(!text(root).includes('שהתקבלה ריקה'));assert.ok(!text(root).includes('הקורא החזיר רשימה ריקה'));
  await act(async()=>root.unmount());
});

test('same selected trace is refreshed and a delayed old detail cannot restore stale content',async()=>{
  const f=fixture(),root=await mount(f);
  await settle(f,{list:[{trace_id:'trace-A',capability:'test',span_count:null}]});
  const first=f.calls.find(c=>c.kind==='detail');assert.ok(first);
  await act(async()=>{first.resolve({trace:{outcome:'old-outcome'},rollup:{},spans:[]});});
  assert.ok(text(root).includes('old-outcome'));
  const refresh=root.root.findAllByType('button').find(b=>b.children.includes('רענן'));
  await act(async()=>{ refresh.props.onClick(); });assert.ok(!text(root).includes('old-outcome'));
  await settle(f,{list:[{trace_id:'trace-A',capability:'test'}]});
  assert.equal(f.calls.filter(c=>c.kind==='detail').length,2);
  await act(async()=>{f.calls.filter(c=>c.kind==='detail')[1].resolve({trace:{outcome:'new-outcome'},rollup:{},spans:[]});});
  assert.ok(text(root).includes('new-outcome'));assert.ok(!text(root).includes('old-outcome'));
  await act(async()=>root.unmount());
});

test('identity change clears all prior view state before pending A replies settle',async()=>{
  const f=fixture(),root=await mount(f),old=[...f.calls];
  f.auth={user:{id:'B'},isAdmin:true,loading:false};
  await act(async()=>root.update(React.createElement(Page)));
  await act(async()=>{old[0].resolve({...snapshot,security:{unacked:987654321}});old[1].resolve(snapshot);old[2].resolve([{trace_id:'private-A'}]);});
  assert.ok(!text(root).includes('987654321'));assert.ok(!text(root).includes('private-A'));
  assert.equal(f.calls.filter(c=>c.kind==='detail').length,0);
  f.auth={user:{id:'B'},isAdmin:false,loading:false};
  await act(async()=>root.update(React.createElement(Page)));
  const count=f.calls.length;
  await act(async()=>{for(const c of f.calls.filter(c=>!old.includes(c))){c.resolve(c.kind==='list'?[{trace_id:'private-B'}]:snapshot);}});
  assert.ok(text(root).includes('signed-out'));assert.ok(!text(root).includes('private-B'));assert.equal(f.calls.length,count);
  await act(async()=>root.unmount());
});

test('guest and loading identity perform no privileged reads',async()=>{
  for(const auth of [{user:null,isAdmin:false,loading:false},{user:{id:'A'},isAdmin:true,loading:true}]){
    const f=fixture(auth),root=await mount(f);assert.equal(f.calls.length,0);await act(async()=>root.unmount());
  }
});

test('pending admin verification has a visible status, without any privileged reads',async()=>{
  const f=fixture({user:null,isAdmin:false,loading:true}),root=await mount(f);
  assert.equal(f.calls.length,0);
  assert.equal(root.root.findByType('main').props.role,'status');
  assert.ok(text(root).includes('מאמתים את חשבון המנהל'));
  await act(async()=>root.unmount());
});

test('old observed egress is labelled last observation, never current24h zero',async()=>{
  const f=fixture(),root=await mount(f);
  await settle(f,{health:{...snapshot,cron:null,security:{unacked:null,recent_24h:null},usage:{storage_egress_observed_latest:{at:'2026-10-06T06:59:12Z',bytes:123456},storage_egress_guard:{state:'STALE'},storage_egress_observed_history_24h:[]}}});
  assert.ok(text(root).includes('המדידה האחרונה'));assert.ok(text(root).includes('STALE'));assert.ok(text(root).includes('לא התקבל מידע על המשימות'));
  assert.ok(!text(root).includes('הקורא החזיר רשימה ריקה'));
  await act(async()=>root.unmount());
});

test('egress card exposes 20/24 PARTIAL and never labels the observed subtotal a full day',async()=>{
  const f=fixture(),root=await mount(f);
  await settle(f,{health:{...snapshot,usage:{
    storage_egress_observed_24h_bytes:null,
    storage_egress_observed_24h_observed_bytes:20*1048576,
    storage_egress_observed_24h_coverage:{observed_hours:20,required_hours:24,partial_hours:0,status:'PARTIAL',window_start:'2026-11-18T19:00:00Z',window_end:'2026-11-19T19:00:00Z'},
    storage_egress_guard:{state:'WARN'},supabase_cached_egress_basis:'UNKNOWN'
  }}});
  const section=root.root.findByProps({'data-experience-capability':'storage-egress-health'});
  const chips=section.findAll(n=>n.props.className==='sod29-chip').flatMap(n=>n.children).filter(v=>typeof v==='string');
  assert.ok(text(root).includes('כיסוי 20/24 שעות · PARTIAL'));
  assert.ok(text(root).includes('20 MiB'));
  assert.ok(text(root).includes('הסכום מתייחס לשעות שנמדדו בלבד'));
  assert.ok(!text(root).includes('24 שעות מלאות'));
  assert.ok(text(root).includes('UNKNOWN'));
  assert.ok(chips.includes('PARTIAL'));
  await act(async()=>root.unmount());
});

test('egress card distinguishes a complete measured zero from no data and missing coverage metadata',async()=>{
  for(const kind of ['COMPLETE','NO_DATA','legacy']) {
    const f=fixture(),root=await mount(f);
    const coverage={observed_hours:kind==='COMPLETE'?24:0,required_hours:24,partial_hours:0,status:kind,window_start:'2026-11-18T19:00:00Z',window_end:'2026-11-19T19:00:00Z'};
    await settle(f,{health:{...snapshot,usage:{storage_egress_observed_24h_bytes:123*1048576,
      storage_egress_observed_24h_observed_bytes:kind==='COMPLETE'?0:null,
      ...(kind==='legacy'?{}:{storage_egress_observed_24h_coverage:coverage})}}});
    const cards=root.root.findAll(n=>n.props.className==='sod29-card');
    const card=cards.find(c=>c.findAllByType('div').some(d=>d.children.some(v=>typeof v==='string' && (v.includes('סכום חלקי בחלון')||v.includes('24 שעות מלאות')))));
    assert.ok(card);
    assert.equal(card.findByType('h3').children.join(''),kind==='COMPLETE'?'0 MiB':'—');
    assert.equal(text(root).includes('24 שעות מלאות'),kind==='COMPLETE');
    assert.ok(!text(root).includes('123 MiB'),'old unqualified subtotal is not displayed');
    assert.ok(text(root).includes(kind==='legacy'?'כיסוי UNKNOWN':kind==='COMPLETE'?'כיסוי 24/24':'כיסוי 0/24'));
    await act(async()=>root.unmount());
  }
});

test('the speed centre is part of the main view; Google sources wait for "מדידה וגוגל"; "רענן" reaches the open measurement; all disappear with revoked admin',async()=>{
  const f=fixture(),root=await mount(f);
  assert.ok(f.metricsMounted>=1);assert.ok(text(root).includes('metrics-fixture'));assert.equal(f.metricsProps.providersOpen,false);assert.equal(f.metricsProps.refreshToken,0);
  const button=root.root.findAllByType('button').find(b=>b.children.includes('מדידה וגוגל'));
  assert.ok(button);await act(async()=>{button.props.onClick();});
  assert.equal(f.metricsProps.providersOpen,true);
  const refresh=root.root.findAllByType('button').find(b=>b.props['data-control-refresh']==='true');
  assert.ok(refresh);await act(async()=>{refresh.props.onClick();});
  assert.equal(f.metricsProps.refreshToken,1,'the page refresh is passed to the open measurement component');
  f.auth={user:{id:'A'},isAdmin:false,loading:false};await act(async()=>root.update(React.createElement(Page)));
  assert.ok(!text(root).includes('metrics-fixture'));assert.ok(text(root).includes('signed-out'));
  await act(async()=>root.unmount());
});
