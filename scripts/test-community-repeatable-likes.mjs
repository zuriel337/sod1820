// Disposable PostgreSQL only; requires a task-owned container, never a live URL.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
const container=process.env.TEST_PG_CONTAINER;
assert.match(container||'',/^[a-zA-Z0-9][a-zA-Z0-9_.-]+$/,'TEST_PG_CONTAINER must name a disposable local PostgreSQL container');
const env={...process.env};for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[key];
const db='community_repeatable_'+Date.now();
const docker=['--host=unix:///var/run/docker.sock','exec','-i',container];
let r=spawnSync('docker',[...docker,'createdb','-U','postgres',db],{env,encoding:'utf8'});assert.equal(r.status,0,r.stderr);
const args=[...docker,'psql','-XAtq','-U','postgres','-d',db,'-v','ON_ERROR_STOP=1'];
const migration=readFileSync(new URL('../supabase/migrations/20261104123515_community_repeatable_likes.sql',import.meta.url),'utf8');
let fixture=readFileSync(new URL('../tests/sql/community_reaction_public_visibility_v1.sql',import.meta.url),'utf8')
 .replace('  reactions jsonb,',"  reactions jsonb,\n  origin text default 'openweb',\n  deleted_at timestamptz,\n  thread_hidden_at timestamptz,")
 .replaceAll('\\ir ../../supabase/migrations/20261013062404_community_reaction_public_visibility_gate_v1.sql',()=>migration);
for(const role of ['anon','authenticated','ungranted_reader'])fixture=fixture.replace('create role '+role+' nologin;',()=>`do $$ begin if not exists(select 1 from pg_roles where rolname='${role}') then create role ${role} nologin; end if; end $$;`);
fixture=fixture.replace('rollback;',()=>"reset role;\ninsert into public.research_contributions(id,status,origin,deleted_at,thread_hidden_at,reactions) values\n('00000000-0000-0000-0000-000000000050','approved','forum',null,null,'{}'),\n('00000000-0000-0000-0000-000000000051','approved','openweb',now(),null,'{}'),\n('00000000-0000-0000-0000-000000000052','approved','openweb',null,now(),'{}');\nset local role anon;\ndo $$\ndeclare before_rx jsonb; after_rx jsonb; id uuid;\nbegin\n select reactions into before_rx from public.research_contributions rc where rc.id='00000000-0000-0000-0000-000000000001';\n for n in 1..100 loop\n  after_rx:=public.toggle_contribution_reaction('00000000-0000-0000-0000-000000000001','👍','community-repeatable-like');\n end loop;\n if (after_rx->>'community_likes')::int<>100 or (after_rx-'community_likes')<>before_rx then raise exception 'repeatable count or baseline failure'; end if;\n after_rx:=public.toggle_contribution_reaction('00000000-0000-0000-0000-000000000011','👍','community-repeatable-like');\n if (after_rx->>'community_likes')::int<>1 then raise exception 'reply like failed'; end if;\n foreach id in array array['00000000-0000-0000-0000-000000000002'::uuid,'00000000-0000-0000-0000-000000000012'::uuid,'00000000-0000-0000-0000-000000000015'::uuid,'00000000-0000-0000-0000-000000000050'::uuid,'00000000-0000-0000-0000-000000000051'::uuid,'00000000-0000-0000-0000-000000000052'::uuid] loop\n  perform public.expect_reaction_denial(id,'👍','community-repeatable-like');\n end loop;\n perform public.expect_reaction_denial('00000000-0000-0000-0000-000000000001','🔥','community-repeatable-like');\nend $$;\nreset role;\nselect 'PASS: guest100+replies, baseline preservation, private/cycle/source/deleted/hidden negatives' as result;\ncommit;\n\n");
r=spawnSync('docker',args,{input:fixture,env,encoding:'utf8'});assert.equal(r.status,0,r.stderr);
async function call(sql){return new Promise((resolve,reject)=>{const child=spawn('docker',args,{env});let out='',error='';child.stdout.on('data',x=>out+=x);child.stderr.on('data',x=>error+=x);child.on('error',reject);child.on('close',code=>code?reject(new Error(error)):resolve(out.trim()));child.stdin.end(sql);});}
const values=await Promise.all(Array.from({length:20},()=>call("set role anon;select public.toggle_contribution_reaction('00000000-0000-0000-0000-000000000001','👍','community-repeatable-like');")));
assert.equal(new Set(values.map(x=>JSON.parse(x).community_likes)).size,20);
assert.equal(await call("select reactions->>'community_likes' from public.research_contributions where id='00000000-0000-0000-0000-000000000001';"),'120');
await call('reset role;');
const cleanup=spawnSync('docker',[...docker,'dropdb','-U','postgres',db],{env,encoding:'utf8'});assert.equal(cleanup.status,0,cleanup.stderr);
console.log(JSON.stringify({priorVisibilityAndToggleRegression:true,guestSequential:100,concurrent:20,total:120,lostIncrements:0,negativePublicScopeChecks:true}));
