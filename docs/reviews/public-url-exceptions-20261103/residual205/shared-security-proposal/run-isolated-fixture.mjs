// Explicit Unix-socket-only synthetic fixture. No connection strings or secrets.
import {readFileSync,writeFileSync,realpathSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const [psql,socket,port,database,output='/tmp/continuity-s2-fixture-receipt.json']=process.argv.slice(2);
assert.ok(psql&&socket&&/^\d{4,5}$/.test(port)&&/^s2_[a-z_]+_fixture$/.test(database),'explicit isolated fixture arguments required');
assert.ok(realpathSync(socket).startsWith('/tmp/continuity-postgres/'),'only the task-owned isolated Unix socket is permitted');
const dir=new URL('./',import.meta.url),read=name=>readFileSync(new URL(name,dir),'utf8');
const metadata=JSON.parse(read('observed-metadata.json')),calls=[];
function sql(source,{failure}={}){const r=spawnSync(psql,['-X','-h',socket,'-p',port,'-U','agent','-d',database,'-v','ON_ERROR_STOP=1','-At'],{input:source,encoding:'utf8'});
 if(failure){assert.notEqual(r.status,0,'drift must fail closed');assert.ok(r.stderr.includes(failure),r.stderr);return r.stderr;}
 assert.equal(r.status,0,r.stderr);return r.stdout;}
assert.equal(sql("select current_setting('listen_addresses')='' and current_database() like 's2_%_fixture';").trim(),'t');
assert.equal(sql("select count(*) from posts where title like '%SECRET%' and id in (3,4);").trim(),'2','exact synthetic fixture markers required');
const report={kind:'isolated-native-postgresql-s2-proposal',liveConnection:false,liveWrites:0,sharedApplied:false,serverVersion:sql('show server_version;').trim(),fixture:'synthetic posts/language_links and minimal dependencies; not full Supabase or formal S2',cases:[],infrastructureFailures:['Docker initialization failed: workspace/root overlay full; isolated PostgreSQL binaries/share copied into /tmp; Unix socket only, no TCP listener']};
function check(name,run){run();report.cases.push({name,passed:true});}
const apply=read('apply.proposal.sql'),assertions=read('fixture-assertions.sql');
check('apply twice is idempotent; owner/admin/public/Forum/privacy/numeric source assertions pass',()=>{
 for(let i=0;i<2;i++){sql(apply);const receipt=sql(assertions);assert.ok(receipt.includes('PASS:admin role unchanged'));assert.equal(receipt.includes('FAIL:'),false);report.assertionsPerPass=(receipt.match(/PASS:/g)||[]).length;}
});
check('object-only rollback compiles and restores historical behavior; rows are preserved',()=>{
 sql(read('rollback.proposal.sql'));const rows=sql("set role anon; select count(*) from posts; select count(*) from lang_links_list('visitor-known-A'); reset role;");assert.ok(rows.includes('\n7\n'));assert.ok(rows.includes('\n3\n'));sql(apply);sql(assertions);
});
const admin=metadata.policies.find(p=>p.policyname==='posts_admin_write');
check('same-name admin policy widened to true cannot bypass drift guard',()=>{
 try{sql('ALTER POLICY posts_admin_write ON public.posts USING(true);');sql(apply,{failure:'S2_ADMIN_POLICY_DRIFT'});}finally{sql('ALTER POLICY posts_admin_write ON public.posts USING('+admin.qual+') WITH CHECK('+admin.with_check+');');}
});
check('unreviewed extra permissive read policy fails closed',()=>{
 try{sql('CREATE POLICY s2_fixture_extra_read ON public.posts FOR SELECT TO anon USING(true);');sql(apply,{failure:'S2_UNREVIEWED_POST_READ_POLICY'});}finally{sql('DROP POLICY s2_fixture_extra_read ON public.posts;');}
});
check('function source drift stops before replacing a concurrent server change',()=>{
 const original=metadata.functions.find(f=>f.signature==='lang_links_list(text)').definition;
 try{sql("CREATE OR REPLACE FUNCTION public.lang_links_list(p_visitor text DEFAULT NULL) RETURNS SETOF public.language_links LANGUAGE sql SECURITY DEFINER AS $$ SELECT * FROM public.language_links WHERE false; $$;");sql(apply,{failure:'S2_SOURCE_DRIFT: lang_links_list(text)'});}finally{sql(original+';');sql(apply);}
});
check('all private fixture rows, review states, admin role and canonical Post identities survive',()=>{
 sql(assertions);assert.equal(sql('select count(*) from posts;').trim(),'7');assert.equal(sql('select count(*) from language_links;').trim(),'3');
});
report.finishedAt=new Date().toISOString();report.passed=report.cases.length;report.failed=0;writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,assertionsPerPass:report.assertionsPerPass,sharedApplied:false,output}));
