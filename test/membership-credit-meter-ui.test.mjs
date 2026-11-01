import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const commandCenterUrl = new URL("../src/lib/commandCenter.js", import.meta.url);
const frameUrl = new URL("../src/components/experience2029/SystemFrame2029.jsx", import.meta.url);
const transportUrl = new URL("../src/lib/supabase.js", import.meta.url);

test("membership summary is an owner RPC with account-switch rejection and bounded numbers", async () => {
  const source = await readFile(commandCenterUrl, "utf8");
  const start = source.indexOf("export async function getMembershipCreditSummary");
  const end = source.indexOf("// 🎁", start);
  const reader = source.slice(start, end);

  assert.ok(start > 0 && end > start);
  assert.match(reader, /supabase\.rpc\("membership_credit_summary_v1"\)/);
  assert.match(reader, /data\?\.session\?\.user\?\.id !== userId/);
  assert.equal((reader.match(/await checkAccount\(\)/g) || []).length, 2);
  assert.match(reader, /Number\.isSafeInteger\(value\) && value >= 0/);
  assert.doesNotMatch(reader, /from\("membership_/);
});

test("the 2029 meter performs no membership read while its build flag is off", async () => {
  const source = await readFile(frameUrl, "utf8");
  const start = source.indexOf("// Paid membership state is a separate");
  const end = source.indexOf("const displayName", start);
  const effect = source.slice(start, end);

  assert.match(source, /VITE_MEMBERSHIP_CREDIT_METER_ENABLED === "true"/);
  assert.match(effect, /if \(!creditMeterEnabled\)/);
  assert.ok(effect.indexOf("if (!creditMeterEnabled)") < effect.indexOf("getMembershipCreditSummary"));
  assert.match(source, /data-membership-credit-meter=\{creditMeterEnabled \? membershipCredits\.status : "disabled"\}/);
  assert.match(source, /אין מסלול מנוי פעיל/);
});

test("a bounded server credit receipt refreshes the owner meter", async () => {
  const [frame, transport] = await Promise.all([
    readFile(frameUrl, "utf8"),
    readFile(transportUrl, "utf8"),
  ]);

  assert.match(transport, /new CustomEvent\('sod:credit-usage', \{ detail: transportMetadata\.credit_usage \}\)/);
  assert.match(frame, /window\.addEventListener\("sod:credit-usage", refresh\)/);
  assert.match(frame, /usage\?\.action_key === "raziel_fast"/);
  assert.match(frame, /setCreditSummaryAttempt\(value => value \+ 1\)/);
});
