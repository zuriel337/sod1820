// writer_material_home_law v7 proposal (#1514, ZURIEL 24.11.2026): review-only text, one intake, five separate stages, and an
// authorization list that is the same list the admission planner enforces.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TORAT_HAREMEZ_WRITERS, TORAT_HAREMEZ_EFFECTIVE_FROM } from "../supabase/functions/_shared/giluiCommunityAdmissionPlan.mjs";

const sql = readFileSync(new URL("../supabase/proposed/20261124_writer_material_home_v7_group_source_admission_REVIEW_ONLY.sql", import.meta.url), "utf8");
const text = /\$u\$([\s\S]*?)\$u\$/.exec(sql)[1];

test("guarded: applies only over the exact active v6 and writes v7 as v5 → v6 was written", () => {
  assert.match(sql, /rule_version <> 6 or md5\(v_old\.description\) <> 'b8be155dcfb7f5562d1f33d6de440193'/);
  assert.match(sql, /update public\.nodes set is_active = false where id = v_old\.id/);
  assert.match(sql, /true, 'writer_material_home_law', 7, 6, v_old\.weight\)/);
  assert.match(sql, /v_old\.description \|\| v_update/);
  assert.match(sql, /v_old\.metadata \|\| jsonb_build_object\(\s*'group_source_admission_v1'/, "v6 metadata keys are kept, the update is nested");
  const code = sql.replace(/\$u\$[\s\S]*?\$u\$/, "").replace(/^\s*--.*$/gm, "");
  assert.doesNotMatch(code, /\b(GRANT|REVOKE|CREATE\s+(TABLE|FUNCTION|POLICY)|ALTER\s+TABLE|DROP)\b/i, "no schema, function, policy or grant change");
});

test("one intake and five separate stages; no new mechanism, no duplicated publication rules", () => {
  for (let n = 43; n <= 49; n++) assert.match(text, new RegExp(`\\n${n}\\. `), `section ${n}`);
  assert.match(text, /43\. ONE INTAKE/);
  for (const stage of ["(1) INTAKE", "(2) IDENTITY", "(3) THREAD LINKAGE", "(4) PUBLICATION AUTHORIZATION", "(5) RESEARCH VERIFICATION"]) assert.ok(text.includes(stage), stage);
  assert.match(text, /not restated here: they remain with §10 and publishing conventions/);
  assert.match(text, /creates no new law, store, intake, publication axis or permission/);
});

test("the authorization in the law is exactly the planner's list: Shimon and the owner, new messages only, no backfill", () => {
  const ids = [...new Set(sql.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g).filter(id => !id.startsWith("43b6ca7b")))];
  assert.deepEqual(ids.sort(), [...TORAT_HAREMEZ_WRITERS].sort());
  assert.match(sql, /'channel', 'torat-haremez', 'new_messages_only', true, 'backfill', false/);
  assert.match(text, /Every other member of the group, verified or not, is held/);
});

test("the exact start instant is the same in the law, its metadata and the admission planner that enforces it", () => {
  assert.equal(TORAT_HAREMEZ_EFFECTIVE_FROM, "2026-11-24T18:52:39Z");
  assert.ok(text.includes(`at or after ${TORAT_HAREMEZ_EFFECTIVE_FROM}`), "§45 states the instant");
  assert.match(sql, new RegExp(`'effective_from', '${TORAT_HAREMEZ_EFFECTIVE_FROM}'`), "metadata carries the same instant, not now()");
  assert.doesNotMatch(sql, /now\(\)/);
});
test("existing is a no-op; a reply with a missing parent is held; content authorization is not system authorization", () => {
  assert.match(text, /recognized as existing\. No second write, no change of its visibility, no hiding, no re-dating and no re-linking/);
  assert.match(text, /it is never published as a new root/);
  assert.match(text, /It authorizes no change to the system/);
  assert.doesNotMatch(text.split("46. EXISTING AND HOLD.")[1].split("(b)")[1], /already admitted/, "an existing source is not in the hold list");
});
