// Actual server operation + actual repository RPC payloads + actual PostgreSQL.
// Only canonical data/provider responses are fixtures. No remote connection exists.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { localPgBin, startLocalPg } from './helpers/els-matrix-reading-durable-jobs-local-pg.mjs';
import { AXIS, call, req, world } from './helpers/els-matrix-reading-world.mjs';
const bin=localPgBin();
const identity='u:11111111-1111-4111-8111-111111111111';
const literal=value=>value==null?'null':"'"+String(typeof value==='object'?JSON.stringify(value):value).replaceAll("'","''")+"'";

test('real operation -> repository -> PostgreSQL: concurrent starts, lost attach response, reload and single cost receipt',
  {skip:!bin&&'Local PostgreSQL binaries required; remote DB never accepted',timeout:90000},async()=>{
  const pg=startLocalPg(bin);
  try {
    const admin=await pg.connect();
    await admin.query(readFileSync(new URL('./fixtures/els-matrix-reading-durable-jobs-bootstrap.sql',import.meta.url),'utf8'));
    await admin.query(readFileSync(new URL('../supabase/migrations/20261029125427_els_matrix_reading_durable_jobs.sql',import.meta.url),'utf8'));
    const w=world();const fakeFetch=w.fetchImpl;let loseAttach=true;
    w.fetchImpl=async(url,init)=>{
      const fn=new URL(url).pathname.match(/^\/rest\/v1\/rpc\/(els_matrix_reading_job_[a-z_]+_v1)$/)?.[1];
      if(!fn)return fakeFetch(url,init);
      const args=JSON.parse(init.body);
      assert.ok(Object.keys(args).every(key=>/^p_[a-z_]+$/.test(key)));
      const client=await pg.connect();
      try {
        await client.query('set role service_role;');
        const rows=await client.query(`select public.${fn}(${Object.entries(args).map(([key,value])=>`${key} => ${literal(value)}`).join(',')});`);
        if(fn.includes('_attach_')&&loseAttach){loseAttach=false;throw Error('lost attach response after COMMIT');}
        return new Response(rows[0][0],{status:200});
      }finally{client.close();}
    };
    const starts=await Promise.all(Array.from({length:12},()=>call(w,req('start',{request_id:randomUUID(),ack_upper_bound_usd:2}),{identity})));
    assert.equal(starts.filter(r=>r.body.error==='reading_tracking_write_uncertain').length,1);
    assert.equal(new Set(starts.map(r=>r.body.job.id)).size,1);
    assert.equal(w.calls.filter(c=>c.url.endsWith('/messages/batches')).length,1);
    assert.equal((await admin.query('select count(*) from public.els_matrix_reading_jobs;'))[0][0],'1');
    w.state.batchState='ended';
    const recovered=await Promise.all(Array.from({length:12},()=>call(w,req('recover'),{identity,jobSecret:'rotated-key'})));
    for(const result of recovered){assert.equal(result.body.state,'COMPLETE',JSON.stringify(result.body));assert.equal(result.body.axis.corpus_id,AXIS.corpusId);}
    assert.equal(recovered.flatMap(r=>r.spans).filter(s=>s.kind==='model_call').length,1);
    assert.equal((await admin.query('select count(*) from public.ai_token_log;'))[0][0],'1');
    const [row]=(await admin.query('select state, (cost_log_id is not null)::text, (result is not null)::text, (job_token is null)::text from public.els_matrix_reading_jobs;'));
    assert.deepEqual(row,['COMPLETE','true','true','true']);
    const previousCalls=w.calls.length;
    const cached=await call(w,req('recover'),{identity});
    assert.equal(cached.body.findings.length,25);assert.equal(cached.body.recovered,true);assert.equal(w.calls.length,previousCalls,'terminal cache needs no provider/data/engine call');
    assert.equal((await call(w,req('recover'),{identity,axis:{...AXIS,corpusId:'different'}})).body.error,'reading_job_not_found');
  }finally{pg.stop();}
});
