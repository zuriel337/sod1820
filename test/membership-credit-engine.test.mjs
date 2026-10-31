import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/20261031073716_membership_credit_engine_v1.sql",
  import.meta.url,
);

test("membership catalog is an inactive internal draft with fixed server prices", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /'sod_personal', 'SOD אישי', 30\.00, 300\.00, 600, 1200/);
  assert.match(sql, /'sod_research', 'SOD מחקר', 79\.00, 790\.00, 3000, 6000/);
  assert.match(sql, /'raziel_fast', 'רזיאל מהיר', 15, 900/);
  assert.match(sql, /'els_matrix_ai_reading', 'קריאת מטריצת צופן', 500, 7200/);
  assert.match(sql, /active boolean not null default false/);
  assert.match(sql, /published boolean not null default false/);
});

test("credit charging is reserve-settle-return and clients never submit a cost", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /create or replace function public\.credit_reserve_v1\(\s*p_action_key text,\s*p_operation_ref text\s*\)/s);
  assert.doesNotMatch(sql, /credit_reserve_v1\([^)]*p_(cost|amount)/s);
  assert.match(sql, /unique \(user_id, action_key, operation_ref\)/);
  assert.match(sql, /create or replace function public\.credit_settle_v1/);
  assert.match(sql, /create or replace function public\.credit_return_v1/);
  assert.match(sql, /create or replace function public\.credit_release_expired_v1/);
});

test("public tables use RLS and privileged functions have narrow grants", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  for (const table of [
    "membership_plans",
    "credit_action_prices",
    "membership_credit_cycles",
    "credit_reservations",
    "credit_reservation_allocations",
  ]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated`));
  }
  assert.match(sql, /grant execute on function public\.credit_reserve_v1\(text,text\) to authenticated/);
  assert.doesNotMatch(sql, /grant execute on function public\.credit_(settle|return|release_expired)_v1[^;]+to authenticated/);
});
