// Isolated SQL regression only: this creates an in-memory PostgreSQL database, never a live connection.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const { PGlite } = await import(process.env.PGLITE_MODULE || "@electric-sql/pglite");
const db = new PGlite();
await db.exec(`
CREATE SCHEMA auth; CREATE SCHEMA vault; CREATE SCHEMA net;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT 'service_role'::text $$;
CREATE FUNCTION public.rd_is_admin() RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
CREATE TABLE public.work_log(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), topic text,status text,what_we_did text,open_threads text,
 task_key text,from_actor text,to_actor text,assignment_mode text,assignment_scope text,primary_owner text,
 release_authorization_state text,parent_assignment_id uuid,dispatch_kind text,dispatch_state text,
 dispatch_next_attempt_at timestamptz,dispatch_context jsonb DEFAULT '{}',dispatch_attempts integer DEFAULT 0,
 dispatch_lease_owner text,dispatch_lease_expires_at timestamptz,dispatch_last_error text,
 dispatch_completed_at timestamptz,superseded_by_id uuid,archived boolean DEFAULT false,
 dispatch_last_emitted_at timestamptz,dispatch_last_request_id bigint
);
`);
await db.exec(readFileSync(new URL("../supabase/migrations/20261011172200_agent_dispatch_one_directional_results_v16.sql",import.meta.url),"utf8"));
let checked=0;
const add=async (from="GPT",to="CLAUDE",kind="ASSIGNMENT",state="CLAIMED")=>(await db.query(
 "INSERT INTO work_log(from_actor,to_actor,dispatch_kind,dispatch_state,dispatch_lease_owner,task_key,what_we_did,assignment_mode) VALUES($1,$2,$3,$4,'test-worker','TEST_TASK','retained evidence','READ_ONLY') RETURNING id",
 [from,to,kind,state])).rows[0].id;
for(const outcome of ["COMPLETED","FAILED","CANCELLED"]){
 const id=await add();
 const {rows}=await db.query("SELECT agent_dispatch_finish($1,'test-worker',$2,'AFTER_TEST','result evidence','next step',false,null) result",[id,outcome]);
 assert.equal(rows[0].result.result_wake_queued,false);
 const after=(await db.query("SELECT * FROM work_log WHERE parent_assignment_id=$1",[id])).rows[0];
 assert.equal(after.from_actor,"CLAUDE");assert.equal(after.to_actor,"GPT");
 assert.equal(after.dispatch_kind,null);assert.equal(after.dispatch_state,null);
 assert.equal(after.what_we_did,"result evidence");assert.equal(after.open_threads,"next step");
 const parent=(await db.query("SELECT * FROM work_log WHERE id=$1",[id])).rows[0];
 assert.equal(parent.dispatch_state,outcome);assert.equal(parent.superseded_by_id,after.id);
 checked++;
}
{
 const id=await add();
 await assert.rejects(db.query("SELECT agent_dispatch_finish($1,'wrong-worker','COMPLETED','AFTER','x',null,false,null)",[id]),/lease mismatch/);
 assert.equal((await db.query("SELECT count(*)::int n FROM work_log WHERE parent_assignment_id=$1",[id])).rows[0].n,0);checked++;
}
{
 const id=await add();
 await db.query("SELECT agent_dispatch_cancel($1,'human one-way policy')",[id]);
 const after=(await db.query("SELECT * FROM work_log WHERE parent_assignment_id=$1",[id])).rows[0];
 assert.equal(after.to_actor,"GPT");assert.equal(after.dispatch_kind,null);assert.equal(after.dispatch_state,null);
 assert.equal((await db.query("SELECT dispatch_state FROM work_log WHERE id=$1",[id])).rows[0].dispatch_state,"CANCELLED");checked++;
}
for(const state of ["QUEUED","RETRY_WAIT","DEFERRED"]){
 const id=await add("CLAUDE","GPT","RESULT_WAKE",state);
 const result=(await db.query("SELECT agent_dispatch_emit_gpt($1) value",[id])).rows[0].value;
 assert.equal(result,null);
 const row=(await db.query("SELECT * FROM work_log WHERE id=$1",[id])).rows[0];
 assert.equal(row.dispatch_state,"CANCELLED");assert.equal(row.what_we_did,"retained evidence");
 assert.equal(row.dispatch_last_request_id,null);assert.equal(row.dispatch_next_attempt_at,null);
 // vault/net functions do not exist: reaching either would fail this test.
 checked++;
}
{
 const id=await add("GPT","CLAUDE","ASSIGNMENT","QUEUED");
 assert.equal((await db.query("SELECT agent_dispatch_emit_gpt($1) value",[id])).rows[0].value,null);
 assert.equal((await db.query("SELECT dispatch_state FROM work_log WHERE id=$1",[id])).rows[0].dispatch_state,"QUEUED");checked++;
}
{
 const id=await add("CLAUDE","GPT");
 const result=(await db.query("SELECT agent_dispatch_finish($1,'test-worker','COMPLETED','AFTER','legacy return',null,false,null) result",[id])).rows[0].result;
 assert.equal(result.result_wake_queued,true);
 const after=(await db.query("SELECT * FROM work_log WHERE parent_assignment_id=$1",[id])).rows[0];
 assert.equal(after.from_actor,"GPT");assert.equal(after.to_actor,"CLAUDE");checked++;
}
await db.close();
console.log(JSON.stringify({passed:checked,failed:0,networkCalls:0,liveDatabase:false}));

