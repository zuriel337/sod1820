import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  buildCorpora, buildSourceWorkPayload, buildZviPayload, executePlan, planCorpus, sendable, summarizePlan, tallyResults,
  ITEM_STATE, RESULT_STATE, SAVE_RPC,
} from "./adminIntakeBatch.js";
import { ZVI_ADMISSION_MANIFEST_V1, ZVI_CONTRIBUTOR_ID, ZVI_CONTRIBUTOR_LABEL } from "./intake/zviAdmissionManifestV1.js";
import { SOD_HASHMAL_ADMISSION_MANIFEST_V1 } from "./intake/sodHashmalAdmissionManifestV1.js";

// Synthetic fixtures only — no production text lives in the repository (the UI reads it live as the admin).
const rows = () => Object.fromEntries(ZVI_ADMISSION_MANIFEST_V1.entries.map((e) => [e.source_id, {
  id: e.source_id, channel: "fixture", credit: ZVI_CONTRIBUTOR_LABEL, contributor_id: ZVI_CONTRIBUTOR_ID,
  created_at: "2026-08-01 00:00:00+00", text: `fixture text ${e.source_id}`,
}]));
const zvi = () => buildCorpora({ zvi: rows() }).find((c) => c.key === "zvi");
const okRpc = (calls) => async (name, args) => { calls.push({ name, args }); return { data: { ok: true, routed: true, already_existed: false, research_object_id: `id-${calls.length}` }, error: null }; };

test("manifest is the frozen 53-entry audit output with the declared disposition counts", () => {
  const counts = {};
  for (const e of ZVI_ADMISSION_MANIFEST_V1.entries) counts[e.disposition] = (counts[e.disposition] || 0) + 1;
  assert.equal(ZVI_ADMISSION_MANIFEST_V1.entries.length, 53);
  assert.deepEqual(counts, ZVI_ADMISSION_MANIFEST_V1.disposition_counts);
  assert.equal(new Set(ZVI_ADMISSION_MANIFEST_V1.entries.map((e) => e.source_id)).size, 53);
});

test("dry run is pure: planning and summarizing never call the RPC", () => {
  const calls = [];
  const corpus = zvi();
  const s = summarizePlan(corpus.items);
  assert.equal(calls.length, 0);
  assert.equal(s.total, 53);
  assert.equal(s.executable, 42); // 29 + 9 + 4
  assert.equal(s.reuse, 1);
  assert.equal(s.read_only, 10); // 4 mismatch + 1 hold + 3 exclude + 2 duplicate
  assert.equal(s.blocked, 0);
});

test("mismatch / hold / exclude / duplicate are visible read-only and never sent", async () => {
  const calls = [];
  const corpus = zvi();
  await executePlan(corpus.items, { rpc: okRpc(calls), resolveReuseTarget: async () => null });
  const blockedIds = new Set(ZVI_ADMISSION_MANIFEST_V1.entries
    .filter((e) => !["READY_ENGINE_VERIFIED", "READY_SOURCE_ATTESTED", "READY_MIXED", "REUSE_CLAIM_OCCURRENCE"].includes(e.disposition))
    .map((e) => e.source_id));
  assert.equal(blockedIds.size, 10);
  for (const c of calls) {
    assert.equal(c.name, SAVE_RPC);
    for (const id of blockedIds) assert.ok(!String(c.args.p_source_ref).includes(id));
  }
  assert.equal(calls.length, 42);
  assert.ok(corpus.items.filter((i) => blockedIds.has(i.entry.source_id)).every((i) => i.state === ITEM_STATE.READ_ONLY && i.reason));
});

test("REUSE never mints: unresolved target stays pending (no RPC); resolved target is a provenance append only", async () => {
  const corpus = zvi();
  const reuse = corpus.items.filter((i) => i.state === ITEM_STATE.REUSE);
  assert.equal(reuse.length, 1);
  const none = [];
  const r1 = await executePlan(reuse, { rpc: okRpc(none), resolveReuseTarget: async () => null });
  assert.equal(none.length, 0);
  assert.equal(r1[reuse[0].key].state, RESULT_STATE.PENDING);

  const calls = [];
  const rpc = async (name, args) => { calls.push({ name, args }); return { data: { ok: true, appended: true, already_present: false, research_object_id: "target-1" }, error: null }; };
  const r2 = await executePlan(reuse, { rpc, resolveReuseTarget: async () => "target-1" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].args.p_append_to_claim_id, "target-1");
  assert.equal(calls[0].args.p_convergence_actor_type, "deterministic");
  assert.ok(calls[0].args.p_convergence_basis);
  assert.equal(r2[reuse[0].key].state, RESULT_STATE.APPENDED);
});

test("private candidate postcondition: a newly inserted row that is not private+candidate is a failure", async () => {
  const corpus = zvi();
  const one = corpus.items.filter((i) => i.state === ITEM_STATE.EXECUTABLE).slice(0, 2);
  const calls = [];
  const res = await executePlan(one, {
    rpc: okRpc(calls),
    readBack: async (id) => (id === "id-1" ? { status: "candidate", privacy_scope: "private" } : { status: "candidate", privacy_scope: "public" }),
  });
  assert.equal(res[one[0].key].state, RESULT_STATE.INSERTED);
  assert.equal(res[one[1].key].state, RESULT_STATE.FAILED);
  assert.equal(res[one[1].key].error, "postcondition_not_private_candidate");
});

test("retry is idempotent: settled items are skipped, failed ones are re-sent", async () => {
  const one = zvi().items.filter((i) => i.state === ITEM_STATE.EXECUTABLE).slice(0, 3);
  const calls = [];
  let n = 0;
  const flaky = async (name, args) => {
    calls.push(args.p_source_ref); n += 1;
    return n === 2 ? { data: null, error: { message: "network" } } : { data: { ok: true, already_existed: n > 3, research_object_id: `id-${n}` }, error: null };
  };
  const first = await executePlan(one, { rpc: flaky });
  assert.deepEqual(tallyResults(first), { inserted: 2, already_existed: 0, appended: 0, already_present: 0, pending: 0, failed: 1, total: 3 });
  const second = await executePlan(one, { rpc: flaky, previous: first });
  assert.equal(calls.length, 4); // only the failed item re-sent
  assert.equal(tallyResults(second).failed, 0);
  assert.equal(tallyResults(second).already_existed, 1);
});

test("RPC refusal (admin_only) is a failure, never a silent success", async () => {
  const one = zvi().items.filter((i) => i.state === ITEM_STATE.EXECUTABLE).slice(0, 1);
  const res = await executePlan(one, { rpc: async () => ({ data: { ok: false, error: "admin_only" }, error: null }) });
  assert.equal(res[one[0].key].state, RESULT_STATE.FAILED);
  assert.equal(res[one[0].key].error, "admin_only");
});

test("exact source refs, exact text and Zvi attribution are preserved", () => {
  const entry = ZVI_ADMISSION_MANIFEST_V1.entries[0];
  const row = rows()[entry.source_id];
  const built = buildZviPayload(entry, row);
  assert.ok(built.ok);
  assert.equal(built.payload.p_source_ref, `channel_updates:${entry.source_id}#a0`);
  assert.equal(built.payload.p_contributor, ZVI_CONTRIBUTOR_LABEL);
  assert.equal(built.payload.p_meta.source_text, row.text);
  assert.equal(built.payload.p_meta.source_occurrence.id, entry.source_id);
  assert.equal(built.payload.p_meta.intake.disposition, entry.disposition);
  assert.ok(["fact", "relation", "observation", "hypothesis", "question"].includes(built.payload.p_kind));
  assert.equal(built.payload.p_engine_verified, false); // fixture text has no canonical engine match — never promoted from the audit note
});

test("a source row with a different contributor identity is blocked, not saved", () => {
  const entry = ZVI_ADMISSION_MANIFEST_V1.entries[0];
  const bad = { ...rows()[entry.source_id], contributor_id: "00000000-0000-0000-0000-000000000000" };
  const built = buildZviPayload(entry, bad);
  assert.equal(built.ok, false);
  assert.ok(built.blockers.includes("contributor_identity_mismatch"));
  assert.equal(buildZviPayload(entry, undefined).ok, false);
});

test("Sod Hashmal is a Source Work: contributor null, source_work/post/locus preserved, nothing invented", () => {
  assert.equal(SOD_HASHMAL_ADMISSION_MANIFEST_V1.entries.length, 0);
  const sod = buildCorpora({}).find((c) => c.key === "sod_hashmal");
  assert.equal(sendable(sod.items).length, 0);
  assert.ok(sod.blocker);
  assert.equal(buildSourceWorkPayload({ post_id: 5028, locus: "p5028:l3", statement: "x" }).ok, false); // missing kind/text => blocked
  const built = buildSourceWorkPayload({ post_id: 5028, locus: "p5028:l3", statement: "fixture statement", exact_text: "fixture exact", kind: "observation", disposition: "READY_SOURCE_ATTESTED" });
  assert.ok(built.ok);
  assert.equal(built.payload.p_contributor, null);
  assert.equal(built.payload.p_meta.source_work.kind, "source_work");
  assert.equal(built.payload.p_meta.source_post.id, 5028);
  assert.equal(built.payload.p_meta.source_locus, "p5028:l3");
  assert.equal(built.payload.p_source_ref, "posts:5028#a0");
  const items = planCorpus("sod_hashmal", { entries: [{ post_id: 5028, locus: "p5028:l3", statement: "s", exact_text: "e", kind: "observation", disposition: "READY_MIXED" }] }, { builder: (e) => buildSourceWorkPayload(e) });
  assert.equal(items[0].state, ITEM_STATE.EXECUTABLE);
});

test("UI is admin-only and the panel never calls the RPC outside an explicit run handler", () => {
  const src = fs.readFileSync(new URL("../../components/experience2029/ResearchAdminIntakePanel2029.jsx", import.meta.url), "utf8");
  assert.match(src, /if \(loading \|\| !isAdmin\) return null/);
  assert.equal((src.match(/supabase\.rpc\(/g) || []).length, 1);
  assert.match(src, /window\.confirm\(/);
  const dry = src.slice(src.indexOf("const dryRun"), src.indexOf("const run = "));
  assert.ok(!/rpc\(/.test(dry));
});
