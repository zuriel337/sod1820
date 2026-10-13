// Bounded Raziel consumer over existing research_objects + private Research Path.
// Interpretations stay hypotheses; Path stores references, never their truth/history.
// No schema, grants, memory store, corpus scan or automatic canonicalization.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FIELDS = "id,kind,statement,value,source_ref,status,privacy_scope,owner_person_id,meta";
const MAX_QUESTIONS = 8;
const CONTRACT = "raziel_interview_787_v1";
const fail = (error, stage = "load", status = 409) => Object.assign(new Error(error), { stage, status });
const OWNER_ERRORS = new Set(["admin_only", "already_reviewed", "invalid_transition", "identity_collision", "revision_conflict", "not_found", "invalid_kind", "person_owner_linkage_required"]);
function text(value, max, required = false) {
  if (typeof value !== "string" || value.length > max || (required && !value.trim())) throw fail("invalid_input", "input", 400);
  return value.trim();
}
function id(value) {
  if (typeof value !== "string" || !UUID.test(value)) throw fail("invalid_reference", "input", 400);
  return value;
}
function questions(value) {
  if (!Array.isArray(value) || !value.length || value.length > MAX_QUESTIONS) throw fail("invalid_questions", "input", 400);
  const ids = value.map(id);
  if (new Set(ids).size !== ids.length) throw fail("duplicate_question", "input", 400);
  return ids;
}
function decisionFields(value) {
  const exceptions = value?.exceptions;
  if (!Array.isArray(exceptions) || exceptions.length > 4) throw fail("invalid_exceptions", "input", 400);
  return { reason: text(value.reason, 600, true), scope: text(value.scope, 400, true), exceptions: exceptions.map(v => text(v, 200, true)) };
}
function envelope(row) { return row?.meta?.ext?.raziel_interview; }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}
const equal = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
function live(row) { return row && !row.meta?.ext?.revision?.superseded_by; }
function decision(row, questionId, sourceRef, uid) {
  const info = envelope(row);
  if (!live(row) || row.kind !== "hypothesis" || row.value !== 787 || row.source_ref !== sourceRef || row.status !== "approved") return null;
  if (info?.contract !== CONTRACT || info.domain !== "source_interpretation" || info.question_id !== questionId) return null;
  if (row.meta?.governance?.approved_by !== uid) throw fail("decision_actor_mismatch", "authorization", 403);
  if (info.created_by !== uid || !UUID.test(info.request_id || "") || !/^[0-9a-f]{64}$/.test(info.request_fingerprint || "")
      || !row.meta.governance.approved_at) throw fail("invalid_decision_provenance");
  let fields;
  try { fields = decisionFields(info); } catch { throw fail("invalid_decision_provenance"); }
  return { id: row.id, question_id: questionId, interpretation: row.statement, source_ref: sourceRef, ...fields,
    approved_by: uid, approved_at: row.meta.governance.approved_at, predecessor_id: info.predecessor_id || null,
    basis: "ATTRIBUTED_HUMAN_INTERPRETATION", canonical: false };
}

export function interviewContext(result) {
  if (!result?.ok || !result.found) return "";
  // JSON is data, not instructions. Do not promote approval into historical fact.
  return "\n\n== ראיון מקור-קשור · פירוש אדם מיוחס, לא עובדה/קנון ==\n" + JSON.stringify({
    source_ref: result.source_ref, pilot_value: 787,
    decisions: result.decisions.map(d => ({ ...d, interpretation: d.interpretation.slice(0, 1200) })),
    next_question: result.next_question,
    boundary: "חישוב / אירוע / פירוש נפרדים; אותו מקור אינו כמה עדים עצמאיים. התאמת ברכה אינה מוכיחה שנאמרה במטוס. השתמש רק בהחלטות התקפות כאן, תוך שמירת תחולתן וחריגיהן.",
  });
}

export function createRazielInterview({ supabaseUrl, serviceKey, anonKey, fetchImpl = fetch }) {
  async function request(path, { token = serviceKey, body, method = "POST" } = {}, stage = "load") {
    const response = await fetchImpl(`${supabaseUrl}${path}`, {
      method, headers: { apikey: token === serviceKey ? serviceKey : anonKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) throw fail("owner_unavailable", stage, 503);
    return response.json();
  }
  async function caller(req) {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!token || token === anonKey || token === serviceKey) throw fail("authentication_required", "authorization", 401);
    let user;
    try { user = await request("/auth/v1/user", { token, method: "GET" }, "authorization"); }
    catch { throw fail("authentication_required", "authorization", 401); }
    if (!UUID.test(user?.id || "") || user.is_anonymous === true) throw fail("authentication_required", "authorization", 401);
    // DB Root-of-Trust, using the verified user's JWT; metadata/client role is never authority.
    const admin = await request("/rest/v1/rpc/rd_is_admin", { token, body: {} }, "authorization");
    if (admin !== true) throw fail("admin_only", "authorization", 403);
    return { uid: user.id, token };
  }
  async function rpc(who, name, body, stage) {
    const result = await request(`/rest/v1/rpc/${name}`, { token: who.token, body }, stage);
    if (result?.ok !== true) throw fail(OWNER_ERRORS.has(result?.error) ? result.error : "owner_failed", stage);
    return result;
  }
  async function rows(ids, sourceRef, requiredIds = ids) {
    const refs = [...new Set(ids.map(id))];
    if (refs.length > MAX_QUESTIONS * 2) throw fail("too_many_references");
    const scope = `value=eq.787&kind=in.(question,hypothesis)&owner_person_id=is.null&privacy_scope=eq.private&source_ref=eq.${encodeURIComponent(sourceRef)}`;
    const found = await request(`/rest/v1/research_objects?id=in.(${refs.join(",")})&${scope}&select=${FIELDS}`, { method: "GET" });
    if (!Array.isArray(found) || requiredIds.some(ref => !found.some(r => r.id === ref))) throw fail("reference_unavailable");
    return new Map(found.map(r => [r.id, r]));
  }
  async function successors(ids, sourceRef, initialQuestions = []) {
    if (!ids.length && !initialQuestions.length) return [];
    const refs = [...new Set(ids.map(id))];
    const scope = `/rest/v1/research_objects?value=eq.787&kind=eq.hypothesis&owner_person_id=is.null&privacy_scope=eq.private&source_ref=eq.${encodeURIComponent(sourceRef)}&status=in.(candidate,approved)`;
    const fields = `&select=${FIELDS}&limit=${MAX_QUESTIONS * 2 + 1}`;
    const found = refs.length ? await request(`${scope}&meta->ext->raziel_interview->>predecessor_id=in.(${refs.join(",")})${fields}`, { method: "GET" }) : [];
    if (initialQuestions.length) {
      const initial = await request(`${scope}&meta->ext->raziel_interview->>question_id=in.(${initialQuestions.map(id).join(",")})&meta->ext->raziel_interview->>predecessor_id=is.null${fields}`, { method: "GET" });
      if (!Array.isArray(initial)) throw fail("successor_ambiguity");
      found.push(...initial);
    }
    if (!Array.isArray(found) || found.length > MAX_QUESTIONS * 2) throw fail("successor_ambiguity");
    return found.filter(row => envelope(row)?.contract === CONTRACT && live(row));
  }
  async function load(who, pathId = null) {
    const path = await request("/rest/v1/rpc/fn_research_path_resume_v1", { token: who.token, body: { p_path_id: pathId == null ? null : id(pathId) } });
    if (path?.ok === false && ["not_found", "no_revision"].includes(path.error)) return { ok: true, found: false };
    if (path?.ok !== true) throw fail("path_unavailable");
    const state = path.representation?.raziel_interview;
    if (state?.contract !== CONTRACT) return { ok: true, found: false };
    const queue = questions(state.question_ids), sourceRef = text(state.source_ref, 1000, true);
    const resolutions = state.resolutions || {};
    if (Object.keys(resolutions).some(ref => !queue.includes(ref))) throw fail("invalid_checkpoint");
    const objects = await rows([...queue, ...Object.values(resolutions)], sourceRef, queue);
    const replacements = await successors(Object.values(resolutions), sourceRef, queue.filter(ref => !resolutions[ref]));
    const pending = [], decisions = [], questionRows = [], recoveries = [];
    for (const ref of queue) {
      const q = objects.get(ref);
      if (q.kind !== "question" || q.value !== 787 || q.source_ref !== sourceRef) throw fail("question_scope_mismatch");
      if (!live(q) || !["candidate", "approved"].includes(q.status)) throw fail("question_unavailable");
      const item = { id: ref, question: q.statement, source_ref: q.source_ref };
      questionRows.push(item);
      const replaced = replacements.some(row => envelope(row).predecessor_id === resolutions[ref] && envelope(row).question_id === ref);
      const d = !replaced && resolutions[ref] && decision(objects.get(resolutions[ref]), ref, sourceRef, who.uid);
      if (d) decisions.push(d); else {
        pending.push(item);
        // Recover a persisted operation after reload without writing on load or
        // treating an uncheckpointed interpretation as answer context.
        const previous = objects.get(resolutions[ref]);
        if (!resolutions[ref] || (live(previous) && previous.kind === "hypothesis" && previous.meta?.governance?.approved_by === who.uid
            && (previous.status === "approved" || (previous.status === "rejected" && previous.meta.governance.rejected_by === who.uid)))) {
          const candidates = [];
          for (const row of replacements) {
            const info = envelope(row);
            if (info.predecessor_id !== (previous?.id || null) || info.question_id !== ref || info.domain !== "source_interpretation"
                || info.created_by !== who.uid || !UUID.test(info.request_id || "")) continue;
            let fields;
            try { text(row.statement, 1200, true); fields = decisionFields(info); } catch { continue; }
            if (info.request_fingerprint !== await fingerprint({ questionId: ref, interpretation: row.statement, ...fields })) continue;
            if (row.status === "approved" && !decision(row, ref, sourceRef, who.uid)) continue;
            candidates.push({ question_id: ref, decision_id: row.id, request_id: info.request_id,
              interpretation: row.statement, ...fields, stage: row.status === "approved" ? "checkpoint" : "approval" });
          }
          const approved = candidates.filter(operation => operation.stage === "checkpoint");
          // Prefer the single already-approved operation over inert losing candidates.
          const unambiguous = approved.length === 1 ? approved : approved.length === 0 && candidates.length === 1 ? candidates : [];
          if (unambiguous.length) recoveries.push(unambiguous[0]);
        }
      }
    }
    const latestDecision = [...(path.steps || [])].reverse().map(step => decisions.find(d => d.id === step.entity_ref)).find(Boolean);
    const publicResult = { ok: true, found: true, contract: CONTRACT, path_id: path.path_id, revision_no: path.revision_no,
      source_ref: sourceRef, questions: questionRows, decisions, last_decision: latestDecision || null, pending_recoveries: recoveries,
      next_question: pending[0] || null, progress: { basis: "SELECTED_QUESTIONS_ONLY_NOT_CORPUS_COVERAGE", selected: queue.length, resolved: decisions.length, remaining: pending.length },
      completion: pending.length ? "question_open" : "selected_questions_complete" };
    return { ...publicResult, _path: path, _state: state, _objects: objects };
  }
  function project(result) {
    const { _path, _state, _objects, ...out } = result;
    return out;
  }
  async function checkpoint(who, { path = null, state, action, questionId, decisionId = null, requestId, fingerprint: requestFingerprint }) {
    const representation = { schema: "research-context-v1", context: { subject: { type: "research_object", id: questionId, label: "ראיון מקור-קשור 787" }, lens: "research" }, raziel_interview: state };
    return rpc(who, "fn_research_path_append_v1", {
      p_path_id: path?.path_id || null, p_expected_revision_no: path?.revision_no ?? null,
      p_save_key: `raziel-interview:${await fingerprint({ path_id: path?.path_id || null, action, questionId, decisionId, requestId, requestFingerprint })}`,
      p_steps: [{ step_index: 0, entity_type: "research_object", entity_ref: decisionId || questionId,
        capability_key: "research:interpretation_review", outcome_status: decisionId ? "executed" : "context_required",
        finding_refs: decisionId ? [decisionId] : [], source_refs: [state.source_ref],
        reason: "Human-selected bounded source interview; interpretation is not source fact" }],
      p_identity_metadata: { root_type: "research_object", root_ref: state.question_ids[0], root_label: "ראיון 787" },
      p_representation: representation,
      p_provenance: { source: "raziel-interview-pilot", action, question_ref: questionId, decision_ref: decisionId,
        request_id: requestId, request_fingerprint: requestFingerprint },
    }, "checkpoint");
  }
  async function fingerprint(value) {
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(stable(value))));
    return [...new Uint8Array(hash)].map(x => x.toString(16).padStart(2, "0")).join("");
  }
  async function handle(req, body) {
    let stage = "authorization";
    try {
      const who = await caller(req);
      if (body.action === "load") {
        const result = await load(who, body.path_id);
        if (body.path_id != null && !result.found) throw fail("path_not_found", "load", 404);
        return project(result);
      }
      if (!["start", "correct"].includes(body.action)) throw fail("invalid_action", "input", 400);
      const requestId = id(body.request_id);
      if (body.action === "start") {
        const queue = questions(body.question_ids), sourceRef = text(body.source_ref, 1000, true);
        const objects = await rows(queue, sourceRef);
        for (const ref of queue) {
          const q = objects.get(ref);
          if (!live(q) || q.kind !== "question" || q.value !== 787 || q.source_ref !== sourceRef || !["candidate", "approved"].includes(q.status)) throw fail("question_scope_mismatch");
        }
        const state = { contract: CONTRACT, source_ref: sourceRef, question_ids: queue, resolutions: {} };
        const fp = await fingerprint(state);
        const saved = await checkpoint(who, { state, action: "start", questionId: queue[0], requestId, fingerprint: fp });
        if (!equal(saved.representation?.raziel_interview, state)) throw fail("request_key_reused", "checkpoint");
        const result = await load(who, saved.path_id);
        return project(result);
      }
      const current = await load(who, id(body.path_id));
      if (!current.found) throw fail("path_not_found", "load", 404);
      const questionId = id(body.question_id), interpretation = text(body.interpretation, 1200, true), fields = decisionFields(body);
      if (!current._state.question_ids.includes(questionId)) throw fail("question_not_in_path", "input", 400);
      const fp = await fingerprint({ questionId, interpretation, ...fields });
      for (const row of current._objects.values()) {
        const info = envelope(row);
        if (info?.request_id !== requestId) continue;
        if (info.request_fingerprint !== fp || info.question_id !== questionId) throw fail("request_key_reused", "input");
        if (current.decisions.some(d => d.id === row.id)) return { ...project(current), idempotent_replay: true };
      }
      const provenance = current._path.provenance;
      if (provenance?.request_id === requestId) {
        if (provenance.request_fingerprint !== fp) throw fail("request_key_reused", "input");
        return { ...project(current), idempotent_replay: true };
      }
      if (!Number.isInteger(body.expected_revision_no) || current.revision_no !== body.expected_revision_no) throw fail("revision_conflict", "checkpoint");
      const predecessorId = current._state.resolutions[questionId] || null;
      const meta = { contract: CONTRACT, question_id: questionId, predecessor_id: predecessorId, created_by: who.uid,
        request_id: requestId, request_fingerprint: fp, domain: "source_interpretation", ...fields };
      stage = "artifact";
      const saved = await rpc(who, "research_artifact_save", {
        p_source_ref: current.source_ref, p_kind: "hypothesis", p_statement: interpretation, p_value: 787,
        p_terms: [], p_contributor: who.uid, p_engine_verified: false, p_engine_detail: null,
        p_meta: { ext: { raziel_interview: meta } },
      }, stage);
      const newId = id(saved.research_object_id), created = (await rows([newId], current.source_ref)).get(newId);
      // Existing identity dedup does not prove the existing row has this provenance.
      if (newId === predecessorId || created.kind !== "hypothesis" || created.source_ref !== current.source_ref || created.value !== 787
          || created.statement !== interpretation || !equal(envelope(created), meta)) throw fail("artifact_identity_conflict", stage);
      if (!live(created) || !["candidate", "approved"].includes(created.status)) throw fail("artifact_unavailable", stage);
      if (predecessorId) {
        stage = "predecessor_review";
        const previous = current._objects.get(predecessorId);
        if (previous?.meta?.governance?.approved_by !== who.uid) throw fail("decision_actor_mismatch", "authorization", 403);
        if (previous.status === "approved") {
          try { await rpc(who, "admin_research_review", { p_id: predecessorId, p_decision: "reject" }, stage); }
          catch (error) {
            // Only an already-saved SAME operation may resume after its rejection.
            if (error.message !== "invalid_transition" || !saved.already_existed) throw error;
          }
        } else if (!saved.already_existed || previous.status !== "rejected" || previous.meta?.governance?.rejected_by !== who.uid) throw fail("predecessor_unavailable", stage);
        const rejected = (await rows([predecessorId], current.source_ref)).get(predecessorId);
        if (rejected.status !== "rejected" || rejected.meta?.governance?.rejected_by !== who.uid) throw fail("predecessor_review_unconfirmed", stage);
      }
      stage = "approval";
      if (created.status === "candidate") {
        try { await rpc(who, "admin_research_review", { p_id: newId, p_decision: "approve" }, stage); }
        catch (error) { if (error.message !== "already_reviewed" || !saved.already_existed) throw error; }
      }
      const approved = (await rows([newId], current.source_ref)).get(newId);
      if (!decision(approved, questionId, current.source_ref, who.uid)) throw fail("approval_unconfirmed", stage);
      stage = "checkpoint";
      const state = { ...current._state, resolutions: { ...current._state.resolutions, [questionId]: newId } };
      const next = await checkpoint(who, { path: current._path, state, action: "correct", questionId, decisionId: newId, requestId, fingerprint: fp });
      if (next.path_id !== current.path_id) throw fail("request_key_reused", stage);
      const result = await load(who, next.path_id);
      if (result._path?.provenance?.request_fingerprint !== fp || result._state.resolutions[questionId] !== newId) throw fail("checkpoint_unconfirmed", stage);
      return project(result);
    } catch (error) {
      // No raw provider/DB errors, tokens, private row bodies or fabricated success.
      return { ok: false, error: error?.stage ? error.message : "owner_unavailable", stage: error?.stage || stage,
        status: error?.status || 503, saved: false,
        partial_write_possible: ["artifact", "predecessor_review", "approval", "checkpoint"].includes(error?.stage || stage), next_question: null };
    }
  }
  return { handle, async context(req, pathId) {
    const result = await handle(req, { action: "load", path_id: pathId });
    if (!result.ok || !result.found) return { ok: false, error: result.error || "interview_not_found", status: result.status || 404 };
    return { ok: true, result, text: interviewContext(result) };
  } };
}
