// CL-13 WhatsApp unit - the intermediate states of the release, run on the DEPLOYED Edge code (the exact sources of the rollback
// manifest: wa-raziel v21 from git, ai-analyze v91 from the committed artifact) and on the mix of deployed and candidate code, against
// a throwaway PostgreSQL. Never a live project. Run by scripts/run-cl13-whatsapp-unit-test.sh (second database), which pins the number of tests.
//
// The release order is wa-raziel, then ai-analyze, then (a separate package) the database step. This file shows what each state
// does, on code that is really deployed today:
//   TODAY    both functions deployed as they are: the baseline, and the proof that the harness runs this code
//   MIXED 1  wa-raziel candidate A deployed, ai-analyze still v91: the WhatsApp collector is closed, ai-analyze still reads and remembers
//   DB-FIRST the database step alone, under the deployed code: the database functions close both functions' reach into memory
//   MIXED 3  wa-raziel candidate deployed, ai-analyze v91, database applied
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { pgBridge } from "./helpers/cl13-pg-bridge.mjs";
import { aiAnalyzeOnPg, waRazielOnPg, treeSource, UA } from "./helpers/cl13-wa-edge-handlers.mjs";
import { USER_JWT, SERVICE_KEY } from "./helpers/ai-analyze-handler.mjs";
import { candidate, deployedBytes } from "../scripts/cl13-whatsapp-unit.mjs";

const pg = pgBridge();
const APPLY = "supabase/proposed/20261112230000_cl13_personal_memory_pause.sql";
const haveHistory = (() => { try { for (const c of ["949c24ad549ae9e95ced528a4ee8159670b52678", "b4d5ec47132ed8003b822cc70de9e1b82447cb7c"]) execFileSync("git", ["cat-file", "-e", `${c}^{commit}`], { stdio: "ignore" }); return true; } catch { return false; } })();
const PROFILE_TEXT = "שמי דוד כהן. מה הגימטריה של אור?";
const modelText = (run) => JSON.stringify(run.models.map((m) => [m.system, m.user]));
const waWrites = () => [...new Set(pg.statements.filter((s) => s.kind === "rpc").map((s) => s.name))].sort();

test("the deployed wa-raziel and ai-analyze reach the memory only through database functions, and so do the candidates (so the database step alone closes the reach of the deployed code)", { skip: haveHistory ? false : "clone too shallow (fetch the commits of the rollback manifest)" }, () => {
  const direct = /agent_user_memory/;
  const memoryCalls = (text) => [...new Set([...text.matchAll(/\b(fn_raziel_context|fn_raziel_remember|fn_raziel_fact|fn_raziel_upsert_summary|fn_mem_add|fn_research_output_context_v1|fn_personal_memory_[a-z0-9_]+)\b/g)].map((m) => m[1]))].sort();
  const text = (b) => b.toString("utf8");
  const deployed = { wa: text(deployedBytes("wa-raziel", "functions/wa-raziel/index.ts")), ai: text(deployedBytes("ai-analyze", "index.ts")) };
  assert.doesNotMatch(deployed.wa, direct); assert.doesNotMatch(deployed.ai, direct);
  assert.deepEqual(memoryCalls(deployed.wa), ["fn_raziel_context", "fn_raziel_fact", "fn_raziel_remember"]);
  assert.deepEqual(memoryCalls(deployed.ai), ["fn_raziel_context", "fn_raziel_remember"]);
  // the candidates call the same functions and ask the policy: nothing new is reached, nothing is read from the table
  for (const [slug, variant, path] of [["wa-raziel", "A", "functions/wa-raziel/index.ts"], ["wa-raziel", "B", "functions/wa-raziel/index.ts"], ["ai-analyze", "A", "index.ts"]]) {
    const c = text(candidate(slug, variant).get(path));
    assert.doesNotMatch(c, direct, `${slug} ${variant}`);
    assert.deepEqual(memoryCalls(c), slug === "wa-raziel" ? ["fn_personal_memory_policy_v1", "fn_raziel_context", "fn_raziel_fact", "fn_raziel_remember"] : ["fn_personal_memory_policy_v1", "fn_raziel_context", "fn_raziel_remember"], `${slug} ${variant}`);
  }
});

if (!pg) {
  test("the intermediate states need the throwaway PostgreSQL of scripts/run-cl13-whatsapp-unit-test.sh", { skip: "start them with the runner script" }, () => {});
} else if (!haveHistory) {
  test("the intermediate states need the commits of the rollback manifest", { skip: "clone too shallow (fetch 949c24ad5 and b4d5ec47)" }, () => {});
} else {
  const DEPLOYED_WA = { source: deployedBytes("wa-raziel", "functions/wa-raziel/index.ts").toString("utf8") };
  const DEPLOYED_AI = { source: deployedBytes("ai-analyze", "index.ts").toString("utf8"), bundled: true };
  const CAND_WA = [["A", { source: candidate("wa-raziel", "A").get("functions/wa-raziel/index.ts").toString("utf8") }], ["B", { source: treeSource("wa-raziel") }]];
  const rowsOf = (where) => pg.scalar(`(select count(*) from public.agent_user_memory where ${where})`);

  // ───────────── TODAY: the deployed code on the live functions ─────────────
  test("TODAY 1: the deployed wa-raziel reads the stored context and stores the message and the profile detail (the active collector)", async () => {
    pg.statements.length = 0; const before = pg.stamp();
    const run = await waRazielOnPg(pg, { text: PROFILE_TEXT, linked: true, ...DEPLOYED_WA });
    assert.ok(run.sent.length >= 1);
    assert.deepEqual(waWrites(), ["fn_raziel_context", "fn_raziel_fact", "fn_raziel_remember"]);
    assert.ok(rowsOf(`user_ref = '${UA}' and memory_type = 'personal_context' and topic = 'name'`) >= 1, "the profile detail was stored");
    assert.ok(run.inserts.some((x) => /facts-captured/.test(String(x.row?.reply_out))));
    assert.ok(pg.stamp().rows >= before.rows + 2, "the message and the detail are new rows");
  });
  test("TODAY 2: the deployed ai-analyze reads the stored context into the answer (site and WhatsApp channel) and remembers a site question", async () => {
    const site = await aiAnalyzeOnPg(pg, { bearer: USER_JWT, verifiedUid: UA, ...DEPLOYED_AI });
    assert.equal(site.status, 200); assert.match(modelText(site), /OLD-SITE-THREAD-A3|OLD-DM-A|OLD-FACT-A/, "the site answer is built with the stored memory");
    const wa = await aiAnalyzeOnPg(pg, { bearer: SERVICE_KEY, trustedUid: UA, body: { surface: "whatsapp", visitor_id: undefined, trusted_channel: { channel: "whatsapp", sender: "972500000001", depth: false } }, ...DEPLOYED_AI });
    assert.equal(wa.status, 200); assert.match(modelText(wa), /OLD-SITE-THREAD-A3|OLD-DM-A|OLD-FACT-A/, "the WhatsApp answer is built with the stored memory of the linked sender");
    assert.ok(rowsOf(`user_ref = '${UA}' and channel = 'site' and content like '%PRIVATE-PAYLOAD-SENTINEL%'`) >= 1, "the site question was remembered");
  });

  // ───────────── MIXED 1: wa-raziel candidate deployed first, ai-analyze still v91, the database not applied ─────────────
  test("MIXED 1a: with the wa-raziel candidate the collector is closed (nothing stored, no stored context) while ai-analyze v91 is still deployed", async () => {
    for (const [name, variant] of CAND_WA) {
      const before = pg.stamp(); pg.statements.length = 0;
      const run = await waRazielOnPg(pg, { text: PROFILE_TEXT, linked: true, ...variant });
      assert.ok(run.sent.length >= 1, `${name}: the person is still answered`);
      assert.deepEqual(waWrites().filter((n) => n !== "fn_personal_memory_policy_v1"), [], `${name}: no memory function is called (the policy function does not exist: closed)`);
      const after = pg.stamp(); assert.equal(after.rows, before.rows, `${name}: nothing stored`); assert.equal(after.original, before.original);
      assert.equal(run.inserts.some((x) => /facts-captured/.test(String(x.row?.reply_out))), false, `${name}: no "captured" record for a detail that was not stored`);
    }
  });
  test("MIXED 1b: until ai-analyze is deployed it still reads the stored context for a linked sender and remembers a site question - the part this step does not close", async () => {
    const before = pg.stamp();
    const wa = await aiAnalyzeOnPg(pg, { bearer: SERVICE_KEY, trustedUid: UA, body: { surface: "whatsapp", visitor_id: undefined, trusted_channel: { channel: "whatsapp", sender: "972500000001", depth: false } }, ...DEPLOYED_AI });
    assert.match(modelText(wa), /OLD-SITE-THREAD-A3|OLD-DM-A|OLD-FACT-A/, "the WhatsApp answer still carries the stored memory");
    const site = await aiAnalyzeOnPg(pg, { bearer: USER_JWT, verifiedUid: UA, ...DEPLOYED_AI });
    assert.match(modelText(site), /OLD-SITE-THREAD-A3|OLD-DM-A|OLD-FACT-A/);
    assert.equal(pg.stamp().rows, before.rows + 1, "and the site question is remembered (the WhatsApp channel does not remember: the adapter does)");
  });

  // ───────────── DB-FIRST: the proposal applied under the deployed code ─────────────
  test("DB-FIRST 0: the proposal applies on the live state", () => {
    pg.run("delete from public.agent_user_memory where id not in (select id from public.cl13_original_ids);");   // back to the rows of the base
    pg.file(APPLY);
    assert.equal(pg.rpc("fn_personal_memory_policy_v1", { p_user_ref: UA }).data.policy, "cl13_pause_v1");
  });
  test("DB-FIRST 1: the deployed wa-raziel is closed by the database functions (no context, nothing stored) but still records 'facts-captured' for a detail that was not stored", async () => {
    const before = pg.stamp(); pg.statements.length = 0;
    const run = await waRazielOnPg(pg, { text: PROFILE_TEXT, linked: true, ...DEPLOYED_WA });
    assert.ok(run.sent.length >= 1, "the person is still answered");
    assert.doesNotMatch(JSON.stringify(run.aiCalls), /OLD-|PRE-LINK|BARE-PHONE/, "no stored memory is sent on: fn_raziel_context is closed in the database");
    const after = pg.stamp(); assert.equal(after.rows, before.rows, "nothing was stored"); assert.equal(after.original, before.original);
    assert.ok(run.inserts.some((x) => /facts-captured/.test(String(x.row?.reply_out))), "the deployed code writes the 'captured' record without checking the writer's answer (the candidates fix it)");
  });
  test("DB-FIRST 2: the deployed ai-analyze is closed by the database functions: no stored memory in the answer, nothing remembered", async () => {
    const before = pg.stamp();
    const site = await aiAnalyzeOnPg(pg, { bearer: USER_JWT, verifiedUid: UA, ...DEPLOYED_AI });
    const wa = await aiAnalyzeOnPg(pg, { bearer: SERVICE_KEY, trustedUid: UA, body: { surface: "whatsapp", visitor_id: undefined, trusted_channel: { channel: "whatsapp", sender: "972500000001", depth: false } }, ...DEPLOYED_AI });
    for (const run of [site, wa]) { assert.equal(run.status, 200); assert.doesNotMatch(modelText(run), /OLD-|PRE-LINK|BARE-PHONE/); }
    const after = pg.stamp(); assert.equal(after.rows, before.rows); assert.equal(after.original, before.original);
  });

  // ───────────── MIXED 3: wa-raziel candidate deployed, ai-analyze v91, database applied ─────────────
  test("MIXED 3: with the proposal applied the wa-raziel candidates are closed and record no 'captured' detail; the deployed ai-analyze stays closed by the database", async () => {
    for (const [name, variant] of CAND_WA) {
      const before = pg.stamp();
      const run = await waRazielOnPg(pg, { text: PROFILE_TEXT, linked: true, ...variant });
      assert.ok(run.sent.length >= 1, `${name}: the person is still answered`);
      const after = pg.stamp(); assert.equal(after.rows, before.rows); assert.equal(after.original, before.original);
      assert.equal(run.inserts.some((x) => /facts-captured/.test(String(x.row?.reply_out))), false, `${name}: no "captured" record`);
    }
    const site = await aiAnalyzeOnPg(pg, { bearer: USER_JWT, verifiedUid: UA, ...DEPLOYED_AI });
    assert.doesNotMatch(modelText(site), /OLD-|PRE-LINK|BARE-PHONE/);
  });
}
