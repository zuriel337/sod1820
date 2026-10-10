import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { runInNewContext } from "node:vm";
import { webcrypto } from "node:crypto";
import { createMaterialGate, conversationalLimit } from "../../supabase/functions/_shared/materialGate.js";
import { createRazielInterview } from "../../supabase/functions/_shared/razielInterview.js";
import { TOKEN, SERVICE, ANON } from "../fixtures/raziel-interview-787.mjs";

// Execute the actual Deno endpoint. All dependencies/I/O are real modules or mocks;
// unknown network paths fail the test even when product code catches the error.
export function numberResearcherHandler(f, configured = true) {
  const source = readFileSync(new URL("../../supabase/functions/number-researcher/index.ts",import.meta.url),"utf8");
  assert.deepEqual([...source.matchAll(/^import .*;$/gm)].map(([line])=>line),[
    'import { createMaterialGate, conversationalLimit } from "../_shared/materialGate.js";',
    'import { createRazielInterview } from "../_shared/razielInterview.js";',
  ],"new handler dependencies require explicit review");
  let fn;
  const env = { SUPABASE_URL:"https://fixture.invalid",SUPABASE_SERVICE_ROLE_KEY:SERVICE,SUPABASE_ANON_KEY:ANON,ANTHROPIC_API_KEY:configured?"synthetic-model-key":"" };
  runInNewContext(stripTypeScriptTypes(source.replace(/^import .*;\n/gm,"")),{
    Deno:{env:{get:k=>env[k]},serve:f=>{fn=f;}},
    createMaterialGate: opts=>createMaterialGate({...opts,fetchImpl:f.fetchImpl}), conversationalLimit,
    createRazielInterview: opts=>createRazielInterview({...opts,fetchImpl:f.fetchImpl}),
    fetch:f.fetchImpl,Request,Response,Headers,URL,AbortController,AbortSignal,TextEncoder,TextDecoder,
    crypto:webcrypto,setTimeout,clearTimeout,
  });
  return async (body,token=TOKEN)=>{
    const response=await fn(new Request("https://fixture.invalid/number-researcher",{method:"POST",headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)}));
    assert.equal(f.unexpected.length,0,"all I/O must remain mocked");
    return {status:response.status,body:await response.json()};
  };
}
