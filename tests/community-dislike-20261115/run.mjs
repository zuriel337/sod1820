// Exact proposal/rollback on a disposable database; never accepts a network DB URL.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {pathToFileURL} from 'node:url';
const read = relative => readFileSync(new URL(relative,import.meta.url),'utf8');
const proposal=read('../../supabase/proposed/20261115210000_community_dislike_PROPOSAL.sql');
const rollback=read('../../supabase/proposed/ROLLBACK_20261115210000_community_dislike.sql');
const baseline=read('./baseline.sql');
const beforeHash='ca68c32b18b94480301073fba9869be2',afterHash='60857d34a181a774886bfd43240c2506';
let db,exec,parallel;
if(process.env.PGLITE_MODULE){
 const {PGlite}=await import(pathToFileURL(process.env.PGLITE_MODULE)); db=new PGlite();
 exec=async sql => {const results=await db.exec(sql); return results.at(-1)?.rows?.[0] ? Object.values(results.at(-1).rows[0])[0] : null;};
}else{
 const socket=process.env.COMMUNITY_TEST_SOCKET,bin=process.env.COMMUNITY_TEST_PSQL;
 if(!socket?.startsWith('/')||!bin?.endsWith('/psql'))throw new Error('Disposable local socket and psql required; no live fallback.');
 const args=['-X','-h',socket,'-p','55444','-U','postgres','-d','community_dislike','-v','ON_ERROR_STOP=1','-qAt'];
 const env={...process.env,PGHOST:socket,PGPORT:'55444',PGUSER:'postgres',PGDATABASE:'community_dislike',PGOPTIONS:''};
 exec=async sql => execFileSync(bin,args,{input:sql,encoding:'utf8',env,stdio:['pipe','pipe','pipe']}).trim();
 parallel=sql=>promisify(execFile)(bin,[...args,'-c',sql],{env});
}
const value=async sql=>{const result=await exec(`select to_json((${sql}));`);return db?result:JSON.parse(result);};
const meta=()=>value(`select jsonb_build_object('hash',md5(pg_get_functiondef(p.oid)),'owner',pg_get_userbyid(proowner),'security',prosecdef,'config',proconfig,'acl',proacl::text) from pg_proc p where oid='public.toggle_contribution_reaction(uuid,text,text)'::regprocedure`);
const state=()=>value(`select md5(jsonb_agg(to_jsonb(r) order by id)::text) from public.research_contributions r`);
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const quote=s=>s===null?'null':`'${String(s).replaceAll("'","''")}'`;
const call=(n,emoji,marker,role='anon')=>`set role ${role}; select public.toggle_contribution_reaction('${id(n)}',${quote(emoji)},${quote(marker)}); reset role;`;
const reactions=n=>value(`select reactions from public.research_contributions where id='${id(n)}'`);
let checks=0;
function ok(label){checks++;console.log(`PASS ${checks}: ${label}`);}
async function denies(sql,label){let failed=false;try{await exec(sql);}catch{failed=true;}finally{await exec('rollback; reset role;');}assert.ok(failed,label);}
async function unchangedDenial(sql,label){const stamp=await state();await denies(sql,label);assert.equal(await state(),stamp,label+' preserves rows/activity');ok(label);}
try{
 await exec(read('./fixture.sql'));
 await exec(baseline);
 await exec('revoke all on function public.toggle_contribution_reaction(uuid,text,text) from public; grant execute on function public.toggle_contribution_reaction(uuid,text,text) to anon,authenticated;');
 const original=await meta(); assert.equal(original.hash,beforeHash);ok('fixture is the exact reviewed live function');
 await unchangedDenial(call(1,'👎','community-repeatable-dislike'),'negative control: baseline refuses dislike');
 await exec(proposal);assert.deepEqual(await meta(),{...original,hash:afterHash});ok('apply changes only body; owner, privileges, search_path and security retained');
 for(const role of ['anon','authenticated']){
  await exec(role==='authenticated'?"select set_config('request.jwt.claim.sub','99999999-9999-4999-8999-999999999999',false);":"select set_config('request.jwt.claim.sub','',false);");
  for(let i=0;i<3;i++)await exec(call(1,'👎','community-repeatable-dislike',role));
 }
 let r=await reactions(1);assert.equal(r.community_dislikes,6);assert.equal(r.likes,27);assert.equal(r.dislikes,8);assert.deepEqual(r['👍'],['v:old']);assert.deepEqual(r['🔥'],['v:old']);ok('three clicks each by guest and member add six; historical counts unchanged');
 await exec("select set_config('request.jwt.claim.sub','',false);");
 for(let i=0;i<2;i++)await exec(call(1,'👍','community-repeatable-like'));
 r=await reactions(1);assert.equal(r.community_likes,2);assert.equal(r.community_dislikes,6);ok('likes still add independently');
 await exec("update public.research_contributions set origin='community_2029' where id='"+id(2)+"';");
 await exec(call(2,'👎','community-repeatable-dislike'));assert.equal((await reactions(2)).community_dislikes,1);
 assert.equal(await value(`select bool_and(last_activity_at > '2020-01-01') from public.research_contributions where id in ('${id(1)}','${id(2)}')`),true);ok('current Community reply adds dislike and updates ancestor activity');
 for(const [n,label]of [[3,'pending'],[4,'pending ancestor'],[5,'deleted'],[6,'hidden'],[7,'noncommunity'],[8,'hidden ancestor'],[9,'cycle'],[10,'missing ancestor'],[99,'missing target']])await unchangedDenial(call(n,'👎','community-repeatable-dislike'),label+' is refused');
 for(const [emoji,marker]of [['👎','community-repeatable-like'],['👍','community-repeatable-dislike'],['🔥','community-repeatable-dislike'],['👎','ordinary-visitor'],['👎',null],['👎',''],[null,'community-repeatable-dislike']])await unchangedDenial(call(1,emoji,marker),'invalid pair '+emoji+'/'+marker);
 await exec("select set_config('request.jwt.claim.sub','99999999-9999-4999-8999-999999999999',false);");
 await unchangedDenial(call(1,'👎',null,'authenticated'),'signed-in caller still needs repeatable dislike marker');
 await exec("select set_config('request.jwt.claim.sub','',false);");
 for(const emoji of ['👍','💡','🔥','🙏','✨']){
  const prior=await reactions(1);await exec(call(1,emoji,'fixture-visitor'));assert.ok((await reactions(1))[emoji].includes('v:fixture-visitor'));
  await exec(call(1,emoji,'fixture-visitor'));assert.deepEqual((await reactions(1))[emoji],prior[emoji]??[]);
 }ok('all five existing per-visitor toggles still add and remove');
 await unchangedDenial(`set role anon;update public.research_contributions set reactions='{}';`,'direct public writes remain forbidden');
 if(parallel){
  const initial=await reactions(1);
  await Promise.all(Array.from({length:20},(_,i)=>parallel(call(1,i%2?'👍':'👎',i%2?'community-repeatable-like':'community-repeatable-dislike'))));
  const final=await reactions(1);assert.equal(final.community_likes,initial.community_likes+10);assert.equal(final.community_dislikes,initial.community_dislikes+10);ok('20 concurrent independent connections lose no likes or dislikes');
 }else console.log('NOT RUN: parallel connections (PGlite); required in local PostgreSQL/CI runner.');
 const saved=await state();await exec(rollback);assert.deepEqual(await meta(),original);assert.equal(await state(),saved);ok('rollback restores exact definition/permissions without deleting counters or activity');
 await unchangedDenial(call(1,'👎','community-repeatable-dislike'),'rollback removes only new capability');
 await exec(call(1,'👍','community-repeatable-like'));ok('old like remains writable after rollback');
 await exec('create role fixture_other_owner;');
 const drifts=[
  ['body',"select pg_get_functiondef('public.toggle_contribution_reaction(uuid,text,text)'::regprocedure);"],
  ['security','alter function public.toggle_contribution_reaction(uuid,text,text) security invoker;'],
  ['search_path',"alter function public.toggle_contribution_reaction(uuid,text,text) set search_path=public;"],
  ['ACL','grant execute on function public.toggle_contribution_reaction(uuid,text,text) to public;'],
  ['owner','alter function public.toggle_contribution_reaction(uuid,text,text) owner to fixture_other_owner;'],
 ];
 async function reset(){
  await exec('alter function public.toggle_contribution_reaction(uuid,text,text) owner to postgres;');
  await exec(baseline);await exec('revoke all on function public.toggle_contribution_reaction(uuid,text,text) from public,anon,authenticated;grant execute on function public.toggle_contribution_reaction(uuid,text,text) to anon,authenticated;');
 }
 for(const [phase,file]of [['apply',proposal],['rollback',rollback]])for(const [kind,sql]of drifts){
  await reset();if(phase==='rollback')await exec(proposal);
  if(kind==='body'){
   const def=String(await exec(sql));await exec(def.replace('declare','declare\n  -- synthetic changed body'));
  }else await exec(sql);
  const changed=await meta(),rows=await state();await denies(file,`${phase} refuses ${kind} drift`);assert.deepEqual(await meta(),changed);assert.equal(await state(),rows);ok(`${phase} refuses ${kind} drift without changes`);
 }
 await reset();await exec(proposal);await denies(proposal,'apply refuses already-applied state');assert.equal((await meta()).hash,afterHash);await exec(rollback);await denies(rollback,'rollback refuses baseline state');assert.equal((await meta()).hash,beforeHash);ok('wrong phase / duplicate apply and rollback refuse safely');
 console.log(`COMMUNITY DISLIKE ALL PASS (${checks})`);
}catch(e){console.error(e.message,e.stderr?.toString()||'');process.exitCode=1;}finally{if(db)await db.close();}
