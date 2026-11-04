import test from "node:test";
import assert from "node:assert/strict";
import { validateIsolatedConfig, isolatedFetch } from "../../scripts/isolation-a3/client.mjs";
import { resolveA3Client, runA3ClientCorrelation } from "../../scripts/test-a3-client-correlation-live.mjs";

const encode = x => Buffer.from(JSON.stringify(x)).toString("base64url");
const config = () => ({ runId: "sod-a3-test", url: "http://127.0.0.1:19783",
  anonKey: `e30.${encode({ iss: "sod1820-isolation-a3", ref: "sod-a3-test", role: "anon", exp: Math.floor(Date.now()/1000)+1800 })}.synthetic` });
test("isolated mode validates destination and local-only token lineage before SDK import", () => {
  assert.equal(validateIsolatedConfig(config()).url, "http://127.0.0.1:19783");
  for (const url of ["https://canonical.supabase.co", "https://candidate.supabase.co", "http://localhost:19783", "http://127.0.0.1:19783/remote", "http://127.0.0.1:19783/?target=x"]) {
    assert.throws(() => validateIsolatedConfig({ ...config(), url }));
  }
  assert.throws(() => validateIsolatedConfig({ ...config(), anonKey: `e30.${encode({ role: "anon" })}.synthetic` }));
});
test("isolated transport denies alternate origins before I/O and disables redirects", async () => {
  const calls = [];
  const fetch = isolatedFetch("http://127.0.0.1:19783", async (...args) => { calls.push(args); return new Response("{}"); });
  await assert.rejects(fetch("https://canonical.supabase.co/functions/v1/research-run"));
  await assert.rejects(fetch("http://127.0.0.1:19783/other"));
  assert.equal(calls.length, 0);
  await fetch("http://127.0.0.1:19783/functions/v1/research-run");
  assert.equal(calls[0][1].redirect, "error");
});
test("partial/unknown isolated configuration fails before canonical SDK import", async () => {
  for (const env of [{ SOD_CI_ISOLATION: "1" }, { SOD_A3_ISOLATED_CONFIG: "/missing" }, { SOD_A3_MODE: "typo" }, { SOD_A3_MODE: "isolated" }]) {
    await assert.rejects(resolveA3Client(env));
  }
});
test("original A3 payload and trace assertions remain intact (unit contract only)", async () => {
  const traceId="f24237ca-b096-4bf0-a24d-321f3322036f";
  let invocation;
  const result=await runA3ClientCorrelation({client:{functions:{invoke:async(name,options)=>{
    invocation={name,...options};return {data:{trace_id:traceId,status:"ok"},error:null};
  }}},log:()=>{}});
  assert.equal(invocation.name,"research-run");
  assert.equal(invocation.body.number,"878");assert.equal(invocation.body.question,"878");
  assert.equal(invocation.body.surface,"heichal");
  assert.deepEqual(invocation.body.requested_capabilities,["numeric","numeric_operators"]);
  assert.equal(invocation.body.interaction_id,result.interactionId);
  assert.equal(result.traceId,traceId);
  const clientFor=output=>({functions:{invoke:async()=>output}});
  await assert.rejects(runA3ClientCorrelation({client:clientFor({data:{trace_id:"bad"}}),log:()=>{}}),/trace_id_missing_or_invalid/);
  await assert.rejects(runA3ClientCorrelation({client:clientFor({error:{message:"transport"}}),log:()=>{}}),/research_run_transport_failed/);
  // The historical test accepts any valid trace, including a denied gate result.
  await runA3ClientCorrelation({client:clientFor({data:{trace_id:traceId,status:"error",error:"access_filtered"}}),log:()=>{}});
});
