import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync(
  new URL("../supabase/migrations/20261008170750_g4_kpi_funnel_aggregation_v1.sql", import.meta.url),
  "utf8",
);
const landing = fs.readFileSync(new URL("../src/pages/EarlyAccess2029Page.jsx", import.meta.url), "utf8");
const acquisition = fs.readFileSync(new URL("../src/lib/acquisition.js", import.meta.url), "utf8");

test("G4 emits the five canonical funnel stages", () => {
  for (const stage of ["landing_view", "engaged", "email_signup", "whatsapp_click", "returned"]) {
    assert.match(migration, new RegExp(`'${stage}'`));
  }
  assert.match(landing, /"landing_view"/);
  assert.match(landing, /"email_signup"/);
  assert.match(landing, /"whatsapp_click"/);
  assert.match(landing, /"returned"/);
  assert.doesNotMatch(landing, /CAMPAIGN, "view"/);
});

test("G4 refreshes are bounded, idempotent and off the ingest path", () => {
  assert.match(migration, /on conflict \(day\) do update/i);
  assert.match(migration, /delete from public\.journey_funnel_daily/i);
  assert.match(migration, /on conflict \(day, stage, segment\) do update/i);
  assert.match(migration, /limited to 121 days/i);
  assert.doesNotMatch(migration, /create\s+trigger/i);
});

test("G4 projections and writers are not public", () => {
  assert.match(migration, /revoke all on table public\.daily_kpi from public, anon, authenticated/i);
  assert.match(migration, /revoke execute on function public\.refresh_daily_kpi\(date, date\) from public, anon, authenticated/i);
  assert.match(migration, /if not public\.rd_is_admin\(\)/i);
});

test("signup attribution carries the canonical browser and session identities", () => {
  assert.match(acquisition, /visitor_id: getVisitorId\(\)/);
  assert.match(acquisition, /session_id: currentSessionId\(\)/);
});
