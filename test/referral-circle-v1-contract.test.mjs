import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20261025020055_referral_circle_v1.sql");
const newsletter = read("supabase/functions/newsletter-signup/index.ts");
const join = read("src/pages/JoinPage.jsx");
const commandCenter = read("src/lib/commandCenter.js");

test("signup attribution never grants a referral reward", () => {
  const recordBody = migration.match(/create or replace function public\.record_referral[\s\S]*?\n\$\$;/i)?.[0] || "";
  assert.ok(recordBody, "record_referral definition exists");
  assert.doesNotMatch(recordBody, /grant_credits|referral_welcome_paid/);
  assert.doesNotMatch(newsletter, /rpc\/award_referral/);
});

test("verified payment processing is idempotent and service-only", () => {
  assert.match(migration, /payment_ref text not null unique/i);
  assert.match(migration, /on conflict \(payment_ref\) do nothing/i);
  assert.match(migration, /revoke all on function public\.process_referral_payment[\s\S]*anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.process_referral_payment[\s\S]*to service_role/i);
});

test("the approved referral economics are encoded once", () => {
  assert.match(migration, /then 50 else 15 end/i);
  assert.match(migration, /'referral_welcome_paid'/i);
  assert.match(migration, /'invitee_points', 20/i);
  assert.match(migration, /default 2000 check \(rate_bps between 0 and 3000\)/i);
  assert.match(migration, /interval '12 months'/i);
  assert.match(migration, /interval '30 days'/i);
});

test("member-facing copy uses Circle of the Secret and paid conversion", () => {
  assert.match(join, /מעגל הסוד/);
  assert.match(join, /מנוי משלם/);
  assert.match(join, /20 נקודות חקירה/);
  assert.match(commandCenter, /wallet_available_ils/);
});
