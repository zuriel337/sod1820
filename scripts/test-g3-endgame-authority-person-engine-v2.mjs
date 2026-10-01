import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const mig = fs.readFileSync("supabase/migrations/20261001020000_g3_endgame_authority_person_engine_enforcement_v2.sql", "utf8");
const edge = fs.readFileSync("supabase/functions/research-extract/index.ts", "utf8");
const fnAll = mig.slice(mig.indexOf("create or replace function public.fn_all_methods"), mig.indexOf("-- C -"));

test("fn_all_methods has no independent formulas; values come only from registry dispatch", () => {
  for (const legacy of ["fn_ragil(", "fn_misratar(", "fn_albam(", "fn_otiot_after(", "fn_otiot_before("]) {
    assert.ok(!fnAll.includes(legacy), `legacy formula call ${legacy} must be gone`);
  }
  assert.match(fnAll, /fn_method_value\(r\.method_key, w\)/);
  assert.match(fnAll, /fn_method_is_engine_verified\(r\.method_key\)/);
  assert.ok(!/select\s+ragil|misratar AS|\bragil AS/i.test(fnAll), "stored columns are not a value source");
  for (const k of ["רגיל", "מסתתר", "אלבם", "אותיות_אחרי", "אותיות_לפני", "מהמאגר", "כל_הערכים"]) assert.ok(fnAll.includes(k), `compat key ${k}`);
});

test("negative gate: person-owned save without canonical owner linkage cannot return ok/SAVED", () => {
  assert.match(mig, /person_owner_linkage_required/);
  assert.match(mig, /btrim\(p_source_ref\) ~\* ''\^person:''/);
  assert.match(mig, /owner_person_id\)\s+VALUES|privacy_scope, meta, owner_person_id/);
  assert.ok(mig.includes("v_meta,\\n    v_owner\\n  )"), "INSERT patch persists v_owner after v_meta");
  assert.ok(!/\bE'[^\n]*'\s*\n\s*E'/.test(mig), "no adjacent E-string literals (invalid PG syntax; must be || concatenated)");
});

test("resolver never invents identity: unique verified link only; service_role only", () => {
  assert.match(mig, /verified_at is not null/);
  assert.match(mig, /v_n = 1/);
  assert.match(mig, /revoke all on function public\.fn_research_resolve_owner_person\(text\) from public, anon, authenticated/);
});

test("backfill is bounded to identified wa-raziel DM rows (67 linked / 21 unresolved untouched)", () => {
  const upd = mig.slice(mig.indexOf("update public.research_objects"));
  assert.match(upd, /source = 'wa-raziel' and r\.contributor = 'DM' and r\.owner_person_id is null/);
  assert.match(upd, /fn_research_resolve_owner_person\(r\.source_ref\) is not null/);
  assert.ok(!/DM-anon/.test(upd.replace(/--.*$/gm, "")), "DM-anon rows are not targeted");
  assert.ok(!/privacy_scope\s*=/.test(upd), "privacy semantics unchanged");
});

test("research-extract links owner only through canonical resolver", () => {
  assert.match(edge, /fn_research_resolve_owner_person/);
  assert.match(edge, /owner_person_id: ownerPersonId/);
});
