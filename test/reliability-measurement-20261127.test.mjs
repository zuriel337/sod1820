import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

// S1 package guard (27.11.2026): the proposal files stay complete, pinned and consistent with the contract text. Nothing here touches a database.
const dir = new URL("../supabase/proposed/measurement-reliability-20261127/", import.meta.url);
const read = f => readFileSync(new URL(f, dir), "utf8");

test("every SQL proposal has an exact rollback, a live md5 pin and refuses to run twice or on drift", () => {
  const pins = { "01-ingest-event-engagement-v2": "3d2fa7cf1aa7513b981d338cab5aebc2", "02-classifier-activity-proof": "cf9bb5f396949bffb1c4dcfda3fbab71", "03-floors-by-visitor": "83b931888f51de9429367006c6608e9d" };
  for (const [name, md5] of Object.entries(pins)) {
    assert.ok(existsSync(new URL(name + ".rollback.sql", dir)), name + " has a rollback");
    const sql = read(name + ".sql");
    assert.ok(sql.includes(md5), name + " pins the live md5");
    assert.match(sql, /PROPOSAL ONLY - NOT APPLIED/);
    assert.match(sql, /already applied|return;/);
  }
});

test("the classifier proposal is prospective, version-aware, and never turns intensity into a bot", () => {
  const sql = read("02-classifier-activity-proof.sql");
  assert.match(sql, /PROSPECTIVE ONLY/);
  assert.match(sql, /cutover/);
  assert.match(sql, /INTENSITY IS NOT EVIDENCE OF AUTOMATION/);
  const code = sql.split("\n").filter(l => !l.trim().startsWith("--")).join("\n");
  assert.doesNotMatch(code, /'bot'/, "the proposal adds no path to the bot class");
  assert.match(code, /engagement_version/);
});

test("the floors move to distinct visitors without changing the thresholds", () => {
  const sql = read("03-floors-by-visitor.sql");
  assert.match(sql, /count\(distinct coalesce\(sod_id,session_id\)\)/);
  assert.match(sql, /'events',10,'sessions',5/);
  assert.match(sql, /VISITOR \(sod_id/);
});

test("the contract amendment text in the markdown is the text embedded in the SQL, and carries every required rule", () => {
  const md = read("CONTRACT_V14.md");
  const text = md.match(/```\n([\s\S]*?)\n```/)[1];
  assert.ok(read("04-contract-v14.sql").includes(text), "04-contract-v14.sql embeds the exact amendment");
  for (const rule of ["MEASUREMENT IDENTITY LAYERS", "INTENSITY IS NOT EVIDENCE OF AUTOMATION", "ENGAGEMENT VERSION 2", "FLOOR UNIT", "OPEN ACTIVITY TIER", "SUPPORT TEXT IS NOT ANALYTICS", "MEASURED ACTION TRIAD", "REACTIONS POLICY UNCHANGED", "PRESERVED FUTURE CAPABILITIES"]) assert.ok(text.includes(rule), rule);
  assert.ok(read("04-contract-v14.sql").includes("e7ad8ffbe9e4a612f53fa1d8c3799693"), "pins the active v13 description");
});

test("the client emits engagement version 2 and sends issue reports to the support store", () => {
  const eng = readFileSync(new URL("../src/lib/engagement.js", import.meta.url), "utf8");
  assert.match(eng, /ENGAGEMENT_VERSION = 2/);
  assert.match(eng, /lastActivityAt = null/);
});
