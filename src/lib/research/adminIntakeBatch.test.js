import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import ZVI_SOURCE_TEXTS_V1 from "./intake/zviSourceTextsV1.json" with { type: "json" };
import ZVI_SAVE_PAYLOADS_V1 from "./intake/zviSavePayloadsV1.json" with { type: "json" };
import {
  batchPreview, buildFrozenZviPayload, describeItem, executeOne,
  buildCorpora, buildSourceWorkPayload, buildZviPayload, executePlan, planCorpus, sendable, summarizePlan, tallyResults,
  ITEM_STATE, RESULT_STATE, SAVE_RPC,
} from "./adminIntakeBatch.js";
import { ZVI_ADMISSION_MANIFEST_V1, ZVI_CONTRIBUTOR_ID, ZVI_CONTRIBUTOR_LABEL } from "./intake/zviAdmissionManifestV1.js";
import { SOD_HASHMAL_ADMISSION_MANIFEST_V1 } from "./intake/sodHashmalAdmissionManifestV1.js";

// Rows mirror the live channel_updates occurrences via the frozen, md5-verified exact-text snapshot.
const rows = () => Object.fromEntries(ZVI_ADMISSION_MANIFEST_V1.entries.map((e) => [e.source_id, {
  id: e.source_id, channel: ZVI_SOURCE_TEXTS_V1.rows[e.source_id].channel, credit: ZVI_CONTRIBUTOR_LABEL, contributor_id: ZVI_CONTRIBUTOR_ID,
  created_at: ZVI_SOURCE_TEXTS_V1.rows[e.source_id].created_at, text: ZVI_SOURCE_TEXTS_V1.rows[e.source_id].text,
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
  assert.equal(built.payload.p_engine_verified, false); // client parser did not verify this occurrence - never promoted from the audit note
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
  const dry = src.slice(src.indexOf("const dryRun"), src.indexOf("const deps = "));
  assert.ok(!/rpc\(/.test(dry));
});

// ---- RESEARCH_2029_ADMIN_INTAKE_V1 ----

test("frozen exact texts match the canonical DB md5 and the frozen payload artifact is fresh", () => {
  for (const [id, r] of Object.entries(ZVI_SOURCE_TEXTS_V1.rows)) {
    assert.equal(crypto.createHash("md5").update(r.text, "utf8").digest("hex"), r.db_md5, id);
  }
  assert.equal(Object.keys(ZVI_SOURCE_TEXTS_V1.rows).length, 53);
  const out = spawnSync(process.execPath, ["scripts/generate-zvi-save-payloads-v1.mjs", "--check"], { encoding: "utf8" });
  assert.equal(out.status, 0, out.stderr);
  assert.deepEqual(ZVI_SAVE_PAYLOADS_V1.counts, { payloads: 42, read_only: 10, reuse: 1, blocked: 0 });
});

test("frozen payloads carry every required field, exact wording, source identity and audit provenance", () => {
  const sent = ZVI_SAVE_PAYLOADS_V1.entries.filter((e) => e.save);
  assert.equal(sent.length, 42);
  for (const e of sent) {
    const p = e.save;
    for (const k of ["p_source_ref", "p_kind", "p_statement", "p_value", "p_terms", "p_contributor", "p_engine_verified", "p_engine_detail", "p_meta"]) assert.ok(k in p, `${e.source_id} ${k}`);
    assert.equal(p.p_meta.source_text, ZVI_SOURCE_TEXTS_V1.rows[e.source_id].text);
    assert.equal(p.p_meta.source_occurrence.id, e.source_id);
    assert.equal(p.p_meta.intake.disposition, e.disposition);
    assert.equal(p.p_meta.intake.audit.version, "ZVI_ADMISSION_MANIFEST_V1");
    assert.equal(p.p_meta.intake.extraction_fidelity, "exact_source_text");
    assert.ok(Array.isArray(p.p_meta.intake.method.source_attested_labels));
    assert.ok(["READY_ENGINE_VERIFIED", "READY_SOURCE_ATTESTED", "READY_MIXED"].includes(e.disposition));
    // candidate/private is the RPC's invariant: the payload may never ask for any other status/scope
    assert.ok(!("p_status" in p) && !("p_privacy_scope" in p) && !("status" in p.p_meta) && !("privacy_scope" in p.p_meta));
  }
  // audit-only engine state is never promoted: not-run-client payloads are engine_verified=false and say so
  for (const e of sent.filter((x) => x.save.p_engine_detail.verification_state === "not_run_client")) {
    assert.equal(e.save.p_engine_verified, false);
    assert.equal(e.save.p_engine_detail.audit_attestation.rerun_here, false);
  }
});

test("batch contains only eligible dispositions; read-only classes never enter the preview", () => {
  const corpus = zvi();
  const pv = batchPreview(corpus.items);
  assert.equal(pv.will_send, 43); // 42 executable + 1 reuse provenance append
  const eligible = new Set(["READY_ENGINE_VERIFIED", "READY_SOURCE_ATTESTED", "READY_MIXED", "REUSE_CLAIM_OCCURRENCE"]);
  for (const d of Object.keys(pv.by_disposition)) assert.ok(eligible.has(d), d);
  for (const bad of ["READY_TESTED_MISMATCH", "HOLD_CONTEXT_DEPENDENT", "EXCLUDE_NO_STANDALONE_FINDING", "DUPLICATE_REPRESENTATION"]) assert.ok(!(bad in pv.by_disposition));
  assert.equal(pv.excluded, 10);
  // settled items drop out of a later preview (idempotent retry summary)
  const settled = { [pv.keys[0]]: { state: RESULT_STATE.INSERTED } };
  assert.equal(batchPreview(corpus.items, settled).will_send, 42);
});

test("every item shows contributor, exact wording, class, proposed kind/value/method, engine state and disposition before save", () => {
  const corpus = zvi();
  for (const it of sendable(corpus.items).filter((i) => i.state === ITEM_STATE.EXECUTABLE)) {
    const d = describeItem(it);
    assert.equal(d.contributor, ZVI_CONTRIBUTOR_LABEL);
    assert.equal(d.exact_source_text, ZVI_SOURCE_TEXTS_V1.rows[it.entry.source_id].text);
    assert.ok(d.candidate_class && d.disposition && d.proposed.kind && d.engine.state && d.method);
    assert.ok("value" in d.proposed);
    assert.equal(d.saves_as, "candidate · private");
  }
  const ro = corpus.items.find((i) => i.state === ITEM_STATE.READ_ONLY);
  assert.equal(describeItem(ro).exact_source_text, ZVI_SOURCE_TEXTS_V1.rows[ro.entry.source_id].text);
});

test("live text drift or wrong contributor blocks the frozen payload", () => {
  const entry = ZVI_ADMISSION_MANIFEST_V1.entries[0];
  const row = rows()[entry.source_id];
  assert.ok(buildFrozenZviPayload(entry, row).ok);
  const drift = buildFrozenZviPayload(entry, { ...row, text: row.text + " " });
  assert.equal(drift.ok, false);
  assert.ok(drift.blockers.includes("source_text_drift"));
  assert.ok(buildFrozenZviPayload(entry, { ...row, contributor_id: "x" }).blockers.includes("contributor_identity_mismatch"));
  assert.equal(buildFrozenZviPayload(entry, undefined).ok, false);
  const readOnly = ZVI_ADMISSION_MANIFEST_V1.entries.find((e) => e.disposition === "READY_TESTED_MISMATCH");
  assert.equal(buildFrozenZviPayload(readOnly, rows()[readOnly.source_id]).ok, false); // no frozen save payload exists for it
});

test("per-entry save sends exactly one research_artifact_save call and nothing else", async () => {
  const it = zvi().items.find((i) => i.state === ITEM_STATE.EXECUTABLE);
  const calls = [];
  const res = await executeOne(it, { rpc: okRpc(calls) });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, SAVE_RPC);
  assert.deepEqual(calls[0].args, it.payload);
  assert.equal(res[it.key].state, RESULT_STATE.INSERTED);
  // a read-only item is never sent even when asked for directly
  const ro = zvi().items.find((i) => i.state === ITEM_STATE.READ_ONLY);
  const none = [];
  await executeOne(ro, { rpc: okRpc(none) });
  assert.equal(none.length, 0);
});

test("one failing item is reported as failed while the others still report their own state (no silent success)", async () => {
  const items = zvi().items.filter((i) => i.state === ITEM_STATE.EXECUTABLE).slice(0, 4);
  let n = 0;
  const rpc = async () => { n += 1; return n === 3 ? { data: { ok: false, error: "person_owner_linkage_required" }, error: null } : { data: { ok: true, already_existed: n === 2, research_object_id: `id-${n}` }, error: null }; };
  const res = await executePlan(items, { rpc });
  assert.deepEqual(tallyResults(res), { inserted: 2, already_existed: 1, appended: 0, already_present: 0, pending: 0, failed: 1, total: 4 });
});

test("source files use the RPC only: no direct research_objects write, no service-role, no new store", () => {
  const files = ["adminIntakeBatch.js", "../../components/experience2029/ResearchAdminIntakePanel2029.jsx"].map((f) => fs.readFileSync(new URL(f, import.meta.url), "utf8"));
  for (const src of files) {
    assert.ok(!/from\(["']research_objects["']\)\s*\.(insert|update|upsert|delete)/.test(src));
    assert.ok(!/service_role|SERVICE_ROLE/.test(src));
    assert.ok(!/create table|create or replace function/i.test(src));
  }
});

test("intake panel is mounted only in ADMIN_ALL / admin control mode and renders nothing for non-admins", () => {
  const panel = fs.readFileSync(new URL("../../components/experience2029/ResearchAdminIntakePanel2029.jsx", import.meta.url), "utf8");
  assert.match(panel, /if \(loading \|\| !isAdmin\) return null/);
  const layer = fs.readFileSync(new URL("../../components/experience2029/GoldenProjectorModeLayer2029.jsx", import.meta.url), "utf8");
  assert.match(layer, /mode === PROJECTOR_MODE\.ADMIN_ALL \? <ResearchAdminIntakePanel2029/);
  const world = fs.readFileSync(new URL("../../pages/World2029Page.jsx", import.meta.url), "utf8");
  assert.match(world, /controlMode \? <ResearchAdminIntakePanel2029/);
  assert.match(panel, /"הכנס את כל READY|הכנס את כל READY/);
  assert.match(panel, /onRunOne/);
});
