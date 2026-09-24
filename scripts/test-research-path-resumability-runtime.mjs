import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  buildResearchPathIdentityMetadata,
  buildResearchPathRepresentation,
  buildResearchPathStep,
  contextFromResearchPathSnapshot,
  researchContextForPath,
  resumeHrefFromResearchPath,
} from "../src/lib/research/researchPathRuntime.js";
import { normalizeResearchContext } from "../src/lib/research/researchContext.js";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const migration = read("supabase/migrations/20260922205800_g3_research_path_resumability_runtime_v1.sql");
const provider = read("src/lib/research/ResearchProvider.jsx");
const frame = read("src/components/experience2029/SystemFrame2029.jsx");

const context = normalizeResearchContext({
  subject: { id: "1820", type: "number", label: "1820", href: "/2029/number/1820" },
  selection: {
    entityId: "1820",
    entityType: "number",
    expression: "סוד",
    method: "רגיל",
    resultValue: 1820,
    locator: "number:1820",
  },
  lens: "number",
  dimensions: { mode: "detail", expressionFocusExplicit: true },
  access: { tier: "admin", scope: "private" },
  journey: {
    id: "11111111-1111-4111-8111-111111111111",
    kind: "research_path",
    position: 2,
    revisionId: "22222222-2222-4222-8222-222222222222",
    revisionNo: 3,
  },
  returnTo: {
    href: "/world",
    label: "העולם",
    subject: { id: "1820", type: "number", label: "1820" },
    selection: { entityId: "1820", entityType: "number" },
    lens: "world",
    dimensions: { mode: "overview" },
    journey: {
      id: "11111111-1111-4111-8111-111111111111",
      kind: "research_path",
      position: 1,
      revisionId: "22222222-2222-4222-8222-222222222222",
      revisionNo: 3,
    },
  },
});

const safe = researchContextForPath(context);
assert.equal(safe.access, undefined, "authorization/access state must never become durable Path truth");
assert.equal(safe.subject.id, "1820");
assert.equal(safe.journey.revisionNo, 3);
assert.equal(safe.returnTo.journey.revisionNo, 3);

const step = buildResearchPathStep(context, { href: "/heichal", label: "1820", surface: "heichal" });
assert.equal(step.step_index, 0);
assert.equal(step.entity_type, "number");
assert.equal(step.entity_ref, "1820");
assert.equal(step.href, "/heichal");
assert.equal(step.surface, "heichal");

const rep = buildResearchPathRepresentation(context, { href: "/heichal", label: "מסלול 1820", surface: "heichal" });
assert.equal(rep.schema, "research-context-v1");
assert.equal(rep.context.access, undefined);
assert.equal(rep.href, "/heichal");
assert.deepEqual(buildResearchPathIdentityMetadata(context), {
  root_type: "number",
  root_ref: "1820",
  root_label: "1820",
});

const resumed = contextFromResearchPathSnapshot({
  ok: true,
  path_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  revision_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  revision_no: 4,
  steps: [{ step_index: 0 }, { step_index: 1 }],
  representation: rep,
});
assert.equal(resumed.subject.id, "1820");
assert.equal(resumed.access, null);
assert.equal(resumed.journey.id, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
assert.equal(resumed.journey.kind, "research_path");
assert.equal(resumed.journey.position, 1);
assert.equal(resumed.journey.revisionId, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
assert.equal(resumed.journey.revisionNo, 4);
assert.equal(resumeHrefFromResearchPath({ ok: true, representation: rep }), "/heichal");

// Server contract: direct tables remain closed, the RPC owns auth/ownership and
// user writes can never self-promote governance/publication/access.
for (const fn of ["fn_research_path_append_v1", "fn_research_path_resume_v1", "fn_research_path_fork_v1"]) {
  assert.match(migration, new RegExp(`function public\\.${fn}`));
}
assert.match(migration, /security definer/gi);
assert.match(migration, /auth\.uid\(\)/);
assert.match(migration, /created_by_user_id = v_uid/);
assert.match(migration, /for update/);
assert.match(migration, /p_expected_revision_no/);
assert.match(migration, /revision_conflict/);
assert.match(migration, /'candidate'/);
assert.match(migration, /'private'/);
assert.match(migration, /revoke execute[\s\S]+from public, anon/i);
assert.match(migration, /grant execute[\s\S]+to authenticated, service_role/i);
assert.match(migration, /fn_research_path_steps_valid/);
assert.match(migration, /research_path_revisions_path_save_key_uq/);
assert.match(migration, /research_paths_owner_fork_key_uq/);
assert.match(migration, /pg_advisory_xact_lock/);
assert.match(migration, /research-path-save:/);
assert.equal(/insert into public\.research_plans/i.test(migration), false, "research_plans stays unused in v1");
assert.equal(/insert into public\.journey_saves/i.test(migration), false, "legacy journey_saves is not migrated");

// Runtime integration: loading the latest Path is read-only projection state.
// Only the explicit resumeResearchPath callback may replace session Context.
assert.match(provider, /const \[pathResume, setPathResume\]/);
assert.match(provider, /getLatestResearchPath\(\)\.then/);
assert.match(provider, /only: now restore the stored navigation state/i);
assert.match(provider, /saveCurrentResearchPath/);
assert.match(provider, /resumeResearchPath/);
assert.match(provider, /revision_conflict/);
assert.match(provider, /SAME operation key/);
assert.match(provider, /persistSessionContext\(next\)/);
assert.match(frame, /data-research-path-resume="available"/);
assert.match(frame, /שמור מסלול/);
assert.match(frame, /המשך מהמסלול השמור/);
assert.match(frame, /המקור והפרסום לא משתנים/);

console.log("Research Path resumability runtime acceptance: PASS");
