import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sourceUrl = new URL("../supabase/functions/ai-analyze/index.ts", import.meta.url);
const clientUrl = new URL("../src/lib/supabase.js", import.meta.url);

test("Raziel fast credit metering is a two-key, authenticated 2029-only pilot", async () => {
  const source = await readFile(sourceUrl, "utf8");
  const start = source.indexOf("const rFastCreditEligible =");
  const end = source.indexOf("const razielModelSpanId", start);
  assert.ok(start > 0 && end > start);
  const gate = source.slice(start, end);

  assert.match(gate, /razielCreditMeterEnabled\(\)/);
  assert.match(gate, /&& rCanonicalResearchOptIn/);
  assert.match(gate, /&& rFast/);
  assert.match(gate, /&& tier === "user"/);
  assert.match(gate, /&& !!rVerifiedRef/);
  assert.match(gate, /&& !!rUserBearer/);
  assert.match(gate, /&& !rSemanticEligible/);
  assert.match(gate, /&& !rPersonalAreaCompanion/);
  assert.match(gate, /&& !rMatrix/);
  assert.match(gate, /&& !rTrusted/);
  assert.match(gate, /reserveRazielFastCredits\(rUserBearer, interactionId\)/);
});

test("Raziel credit meter can auto-enable only on the isolated preview project", async () => {
  const source = await readFile(sourceUrl, "utf8");
  const start = source.indexOf("function razielCreditMeterEnabled");
  const end = source.indexOf("function ", start + 10);
  const helper = source.slice(start, end);

  assert.match(helper, /RAZIEL_CREDIT_METER_ENABLED"\) === "on"/);
  assert.match(helper, /SB_URL === RAZIEL_CREDIT_METER_PREVIEW_PROJECT_URL/);
  assert.match(source, /RAZIEL_CREDIT_METER_PREVIEW_PROJECT_URL = "https:\/\/srwpltjirwbqzcvuesmx\.supabase\.co"/);
  assert.doesNotMatch(helper, /includes|startsWith|endsWith/);
});

test("server-owned fixed price is reserved before provider I/O", async () => {
  const source = await readFile(sourceUrl, "utf8");
  const reserve = source.indexOf("const credit = await reserveRazielFastCredits");
  const provider = source.indexOf("const rel = await callClaudeReliable", reserve);
  const helperStart = source.indexOf("async function reserveRazielFastCredits");
  const helperEnd = source.indexOf("async function finalizeRazielCredits", helperStart);
  const helper = source.slice(helperStart, helperEnd);

  assert.ok(reserve > 0 && provider > reserve);
  assert.match(helper, /p_action_key: "raziel_fast"/);
  assert.match(helper, /p_operation_ref: operationRef/);
  assert.doesNotMatch(helper, /p_(cost|amount)/);
  assert.match(helper, /Number\(payload\?\.cost\)/);
  assert.match(helper, /Authorization: `Bearer \$\{bearer\}`/);
  assert.match(helper, /if \(already\).*"operation_replay"/s);
});

test("accepted output settles; degraded, failed and thrown paths return the reservation", async () => {
  const source = await readFile(sourceUrl, "utf8");
  const outcome = source.indexOf("const creditOutcome = responseDegraded ? \"return\" : \"settle\"");
  const catchStart = source.lastIndexOf("} catch (e) {");
  const catchBlock = source.slice(catchStart);

  assert.ok(outcome > 0);
  assert.match(source.slice(outcome, outcome + 1800), /finalizeRazielCredits\(/);
  assert.match(source.slice(outcome, outcome + 1800), /settlement_failed/);
  assert.match(source.slice(outcome, outcome + 1800), /credit_finalize_failed/);
  assert.match(catchBlock, /finalizeRazielCredits\(activeCreditReservation, "return", null, "request_failed"\)/);
  assert.match(source, /credit_usage: rCreditUsage/);
});

test("the client accepts only the bounded server credit receipt", async () => {
  const client = await readFile(clientUrl, "utf8");
  const start = client.indexOf("function razielTransportMetadata");
  const end = client.indexOf("export async function askRaziel", start);
  const projection = client.slice(start, end);

  assert.match(client, /'credit_usage'/);
  assert.match(projection, /actionKey === 'raziel_fast'/);
  assert.match(projection, /status === 'settled' \|\| status === 'returned'/);
  assert.match(projection, /Number\.isSafeInteger\(cost\)/);
  assert.match(projection, /out\.credit_usage = \{ action_key: actionKey, cost, status \}/);
});
