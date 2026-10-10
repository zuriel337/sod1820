// Synthetic source-linked pilot, based on the documented year/holiday/plane example.
// No real source row, number calculation, personal transcript or credential is copied.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

export const UID = "11111111-2222-4333-8444-555555555555";
export const OTHER_UID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
export const USER_UID = "bbbbbbbb-1111-4111-8111-111111111111";
export const TOKEN = "synthetic-admin-token";
export const SERVICE = "synthetic-service-key";
export const ANON = "synthetic-anon-key";
export const SOURCE = "synthetic:787:year-holiday-plane#fragment-1";
export const Q1 = "22222222-2222-4222-8222-222222222222";
export const Q2 = "33333333-3333-4333-8333-333333333333";
export const OLD = "הפירוש הקודם במוק: ההתאמה לברכה מעידה שנאמרה במטוס.";
export const CORRECTED = "פירוש צוריאל במוק: 787 מקשר שנה, חג והודיה; ההתאמה לברכה היא פירוש ואינה ראיה שנאמרה במטוס.";
export const correction = {
  interpretation: CORRECTED,
  reason: "אותו פוסט הוא מקור אחד; התאמה מספרית אינה עדות לאמירת ברכה באירוע.",
  scope: "הקטע הנבחר בסיפור המטוס; קשר פרשני בלבד בין שנה, חג והודיה.",
  exceptions: ["אין להסיק אמירה בפועל או שלוש עדויות עצמאיות.", "אין לקדם ל-Gold או לשנות עובדת מנוע."],
};
const copy = value => structuredClone(value);
const reply = (data, status = 200) => new Response(JSON.stringify(copy(data)), { status });
const inList = value => value?.startsWith("in.(") ? value.replace(/^in\.\(|\)$/g, "").split(",") : [];

export function fixture() {
  const objects = new Map([
    [Q1, { id: Q1, kind: "question", value: 787, statement: "מה משמעות החיבור בין השנה, החג וההודיה בסיפור המטוס?", source_ref: SOURCE, status: "candidate", privacy_scope: "private", meta: {} }],
    [Q2, { id: Q2, kind: "question", value: 787, statement: "איזו דוגמת נגד תגביל את הפירוש בלי לייחס לברכה אירוע שלא תועד?", source_ref: SOURCE, status: "candidate", privacy_scope: "private", meta: {} }],
  ]);
  const paths = new Map(), savedKeys = new Map(), calls = [], models = [], unexpected = [], faults = [];
  const memory = [];
  const principals = { [TOKEN]: { id: UID, admin: true }, "synthetic-other-admin-token": { id: OTHER_UID, admin: true },
    "synthetic-user-token": { id: USER_UID, admin: false }, "synthetic-anonymous-token": { id: USER_UID, admin: false, is_anonymous: true } };
  let gateAllowed = true, beforeReview = null;
  const failOnce = (name, predicate = () => true, body = { ok: false, error: "synthetic_owner_failure" }, status = 200) => faults.push({ name, predicate, body, status });
  const fetchImpl = async (input, init = {}) => {
    const url = new URL(input), name = url.pathname.split("/").at(-1), headers = new Headers(init.headers);
    const token = (headers.get("Authorization") || "").replace(/^Bearer /, ""), who = principals[token];
    const body = init.body ? JSON.parse(init.body) : null;
    const call = { name, url: url.href, method: init.method || "GET", token, body }; calls.push(call);
    const fault = faults.findIndex(f => f.name === name && f.predicate(body, call));
    if (fault >= 0) { const f = faults.splice(fault, 1)[0]; return reply(f.body, f.status); }
    if (url.origin === "https://api.anthropic.com") {
      models.push(copy(body));
      const match = body.messages[0].content.match(/== ראיון מקור-קשור · פירוש אדם מיוחס, לא עובדה\/קנון ==\n([^\n]+)/);
      const pack = match ? JSON.parse(match[1]) : null;
      return reply({ content: [{ type: "text", text: `תשובת מודל מדומה: ${pack?.decisions?.at(-1)?.interpretation || "אין פירוש מאושר"}` }], usage: { input_tokens: 50, output_tokens: 20 } });
    }
    if (url.origin !== "https://fixture.invalid") { unexpected.push(call); throw new Error("unexpected mocked origin"); }
    if (url.pathname === "/auth/v1/user") return reply(who ? { id: who.id, is_anonymous: who.is_anonymous || false } : {}, who ? 200 : 401);
    if (url.pathname === "/rest/v1/research_objects") {
      assert.equal(token, SERVICE);
      assert.equal(url.searchParams.get("value"), "eq.787", "service reads must stay inside the bounded pilot");
      assert.ok(url.searchParams.get("source_ref")?.startsWith("eq."), "exact source filter required");
      assert.equal(url.searchParams.get("owner_person_id"), "is.null", "pilot must not read Person-owned private material");
      assert.equal(url.searchParams.get("privacy_scope"), "eq.private");
      assert.ok(url.searchParams.has("kind"));
      const refs = inList(url.searchParams.get("id"));
      const predecessors = inList(url.searchParams.get("meta->ext->raziel_interview->>predecessor_id"));
      const initialQuestions = inList(url.searchParams.get("meta->ext->raziel_interview->>question_id"));
      const out = [...objects.values()].filter(row => row.value === 787 && row.source_ref === url.searchParams.get("source_ref").slice(3) && row.owner_person_id == null && row.privacy_scope === "private" && ["question", "hypothesis"].includes(row.kind)
        && (!refs.length || refs.includes(row.id))
        && (!predecessors.length || (["candidate", "approved"].includes(row.status) && predecessors.includes(row.meta?.ext?.raziel_interview?.predecessor_id)))
        && (!initialQuestions.length || (["candidate", "approved"].includes(row.status) && initialQuestions.includes(row.meta?.ext?.raziel_interview?.question_id)
          && row.meta?.ext?.raziel_interview?.predecessor_id == null)));
      return reply(out.slice(0, Number(url.searchParams.get("limit")) || out.length));
    }
    if (url.pathname === "/rest/v1/users") {
      const uid = url.searchParams.get("id")?.slice(3);
      return reply([{ role: Object.values(principals).find(p => p.id === uid)?.admin ? "admin" : "user" }]);
    }
    if (url.pathname === "/rest/v1/agent_user_memory") {
      if (init.method === "POST") { memory.push({ ...copy(body), id: randomUUID(), created_at: memory.length }); return reply(null); }
      const uid = url.searchParams.get("user_ref")?.slice(3);
      const selected = memory.filter(r => r.user_ref === uid).sort((a,b) => url.searchParams.get("order")?.includes("desc") ? b.created_at-a.created_at : a.created_at-b.created_at);
      return reply(selected.slice(0, Number(url.searchParams.get("limit")) || 40));
    }
    if (url.pathname === "/rest/v1/raziel_brain") return reply([{ voice_version: "fixture", updated_at: null }]);
    if (url.pathname === "/rest/v1/decision_ledger") return reply([]);
    if (url.pathname === "/rest/v1/ai_token_log") return reply([{ id: 1 }]);
    if (url.pathname.startsWith("/rest/v1/rpc/")) {
      if (name === "rd_is_admin") return reply(who?.admin === true);
      if (["fn_research_path_resume_v1", "fn_research_path_append_v1", "research_artifact_save", "admin_research_review"].includes(name)) {
        assert.ok(who, "owner RPC must carry user JWT, never service role");
        if (name === "fn_research_path_resume_v1") {
          const p = body.p_path_id ? paths.get(body.p_path_id) : [...paths.values()].filter(p => p.owner === who.id).at(-1);
          return reply(p?.owner === who.id ? p.latest : { ok: false, error: "not_found" });
        }
        if (name === "fn_research_path_append_v1") {
          const key = `${who.id}:${body.p_save_key}`, previousSave = savedKeys.get(key);
          if (previousSave) return reply({ ...previousSave, idempotent_replay: true });
          const old = body.p_path_id ? paths.get(body.p_path_id) : null;
          if (body.p_path_id && old?.owner !== who.id) return reply({ ok: false, error: "not_found" });
          if (old && body.p_expected_revision_no !== old.latest.revision_no) return reply({ ok: false, error: "revision_conflict" });
          const pathId = old?.latest.path_id || randomUUID();
          const latest = { ok: true, path_id: pathId, revision_id: randomUUID(), revision_no: (old?.latest.revision_no || 0)+1,
            representation: body.p_representation, provenance: { ...body.p_provenance, save_key: body.p_save_key, writer: name },
            identity_metadata: body.p_identity_metadata,
            steps: [...(old?.latest.steps || []), ...body.p_steps].map((s,i) => ({ ...s, step_index: i })),
            access_scope: "private", governance_status: "candidate", reference_validation: "destination_surface_required" };
          paths.set(pathId, { owner: who.id, latest: copy(latest) }); savedKeys.set(key, copy(latest)); return reply(latest);
        }
        if (!who.admin) return reply({ ok: false, error: "admin_only" });
        if (name === "research_artifact_save") {
          assert.equal(body.p_kind, "hypothesis"); assert.equal(body.p_engine_verified, false); assert.equal(body.p_engine_detail, null);
          assert.equal(body.p_contributor, who.id);
          assert.equal(body.p_meta.ext.raziel_interview.created_by, who.id);
          assert.equal(body.p_meta.governance, undefined); assert.equal(body.p_meta.ext.revision, undefined);
          const normalized = s => s.replace(/[\s.,;!?]/g, "");
          const existing = [...objects.values()].find(row => row.source_ref === body.p_source_ref && normalized(row.statement) === normalized(body.p_statement));
          if (existing) return reply({ ok: true, research_object_id: existing.id, already_existed: true });
          const id = randomUUID();
          objects.set(id, { id, kind: body.p_kind, value: body.p_value, statement: body.p_statement, source_ref: body.p_source_ref,
            contributor: body.p_contributor, status: "candidate", privacy_scope: "private", engine_verified: false, engine_detail: null,
            meta: copy(body.p_meta) });
          return reply({ ok: true, research_object_id: id, already_existed: false });
        }
        if (name === "admin_research_review") {
          if (beforeReview) await beforeReview(body);
          const row = objects.get(body.p_id);
          if (!row) return reply({ ok: false, error: "not_found" });
          assert.ok(["approve", "reject"].includes(body.p_decision), "no canonicalization in the pilot");
          if (body.p_decision === "approve") {
            if (row.status !== "candidate") return reply({ ok: false, error: "already_reviewed" });
            row.status = "approved"; row.meta.governance = { ...row.meta.governance, approved_by: who.id, approved_at: "synthetic-time" };
          } else {
            if (!["candidate", "approved"].includes(row.status)) return reply({ ok: false, error: "invalid_transition" });
            row.status = "rejected"; row.meta.governance = { ...row.meta.governance, rejected_by: who.id, rejected_at: "synthetic-time" };
          }
          return reply({ ok: true, status: row.status });
        }
      }
      if (name === "fn_capability_execution_gate_v1") return reply({ allowed: gateAllowed, availability: { allowed: true }, entitlement: { allowed: true }, budget: { allowed: gateAllowed } });
      if (name === "op_trace_begin_v1") return reply({ trace_id: body.p_trace_id, root_span_id: body.p_root_span_id });
      if (["op_trace_record_span_v1", "op_trace_finish_v1", "op_trace_link_ai_cost_v1"].includes(name)) return reply({ ok: true });
      if (name === "fn_raziel_persona") return reply("SYNTHETIC_RAZIEL_PERSONA");
      if (name === "fn_raziel_context") return reply({ user_context: { summary: "Older conversation summary, never interpretation authority" } });
      if (name === "metatron_context") return reply({ canonical: {}, context_version: "fixture" });
      if (name === "fn_number_dossier") return reply({ facts: {}, decisions: [], preferences: [] });
      if (["fn_rules_snapshot", "fn_engine_snapshot"].includes(name)) return reply([]);
    }
    unexpected.push(call); throw new Error(`Unexpected mocked endpoint: ${url.pathname}`);
  };
  return { fetchImpl, objects, paths, savedKeys, calls, models, unexpected, memory, failOnce,
    set gateAllowed(value) { gateAllowed = value; }, set beforeReview(fn) { beforeReview = fn; } };
}
