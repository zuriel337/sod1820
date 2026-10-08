// RESEARCH_2029_ADMIN_INTAKE_BATCH_V1 — admin intake over the EXISTING public.research_artifact_save RPC.
//
// One tree: this module is orchestration only. It adds no store, table, RPC or semantic layer. It reshapes frozen
// audit manifests (provenance artifacts) + the exact source text into the argument list of the existing RPC, and
// runs it sequentially with the signed-in admin's own client (so auth.uid() is the logged-in admin; the RPC
// itself refuses non-admins with admin_only). Everything saved is candidate + private BY THE RPC — nothing here
// approves, canonicalizes or publishes.
//
//   DRY RUN  : planCorpus()/summarizePlan() are pure — no RPC, no write.
//   EXECUTE  : executePlan() is the only function that calls rpc(); it only ever sends EXECUTABLE items and REUSE
//              provenance appends with a deterministically resolved target. Mismatch / HOLD / EXCLUDE /
//              DUPLICATE are visible read-only and are never sent.

import { buildResearchCase, buildIntakeMeta } from "../triage.js";
import {
  ZVI_ADMISSION_MANIFEST_V1, ZVI_CONTRIBUTOR_ID, ZVI_CONTRIBUTOR_LABEL, ZVI_SOURCE_TABLE,
} from "./intake/zviAdmissionManifestV1.js";
import { SOD_HASHMAL_ADMISSION_MANIFEST_V1, SOD_HASHMAL_SOURCE_WORK } from "./intake/sodHashmalAdmissionManifestV1.js";
import ZVI_SAVE_PAYLOADS_V1 from "./intake/zviSavePayloadsV1.json" with { type: "json" };
import ZVI_SOURCE_TEXTS_V1 from "./intake/zviSourceTextsV1.json" with { type: "json" };

export const INTAKE_BATCH_KEY = "RESEARCH_2029_ADMIN_INTAKE_BATCH_V1";
export const INTAKE_ASSIGNMENT_KEY = "RESEARCH_2029_ADMIN_INTAKE_V1";
export const ZVI_AUDIT_WORK_LOG_ID = "18f6c4a2-3959-446b-933d-5967fd9e2527";
export const SAVE_RPC = "research_artifact_save";
export const ADMITTED_EVENT = "sod29:research-admitted";
export const RPC_KINDS = Object.freeze(["fact", "relation", "observation", "hypothesis", "question"]);

export const EXECUTABLE_DISPOSITIONS = Object.freeze(["READY_ENGINE_VERIFIED", "READY_SOURCE_ATTESTED", "READY_MIXED"]);
export const REUSE_DISPOSITION = "REUSE_CLAIM_OCCURRENCE";
export const READ_ONLY_DISPOSITIONS = Object.freeze([
  "READY_TESTED_MISMATCH", "HOLD_CONTEXT_DEPENDENT", "EXCLUDE_NO_STANDALONE_FINDING", "DUPLICATE_REPRESENTATION",
]);

export const ITEM_STATE = Object.freeze({
  EXECUTABLE: "EXECUTABLE",
  REUSE: "REUSE",
  READ_ONLY: "READ_ONLY",
  BLOCKED: "BLOCKED",
});

export const RESULT_STATE = Object.freeze({
  INSERTED: "inserted",
  ALREADY_EXISTED: "already_existed",
  APPENDED: "appended",
  ALREADY_PRESENT: "already_present",
  PENDING: "pending_target_unresolved",
  FAILED: "failed",
});

const READ_ONLY_REASON = {
  READY_TESTED_MISMATCH: "המנוע הקנוני אינו תואם את טענת המקור — גלוי לקריאה בלבד, אינו נשמר",
  HOLD_CONTEXT_DEPENDENT: "תלוי-הקשר — נדרש ההקשר המקורי לפני חילוץ, אינו נשמר",
  EXCLUDE_NO_STANDALONE_FINDING: "אין ממצא עצמאי — אינו נשמר",
  DUPLICATE_REPRESENTATION: "כפילות סמנטית של רשומה אחרת — אינו נשמר",
};

export function zviSourceRef(sourceId, idx = 0) {
  // Canonical channel_updates occurrence identity; `#aN` is the suffix fn_research_source_uid() strips, so the
  // DB identity is exactly channel_updates:<uuid> (+ claim) — the same convention the War Room save uses.
  return `${ZVI_SOURCE_TABLE}:${sourceId}#a${idx}`;
}

const sameText = (a, b) => String(a ?? "") === String(b ?? "");

// Method words that appear verbatim in the source occurrence. They are the SOURCE's own labels (source-attested) and are
// kept apart from the canonical method identity (engine_detail.method / Method Registry), which only the engine sets.
const SOURCE_METHOD_TOKENS = Object.freeze(["נוטריקון", "ראשי תיבות", "סופי תיבות", "אתב\"ש", "מילוי", "אחורית", "בגימטריא", "גימטריא", "כפל"]);
export function sourceAttestedMethodLabels(text) {
  const t = String(text || "");
  return SOURCE_METHOD_TOKENS.filter((tok) => t.includes(tok));
}

/** The WarRoom statement convention (TriageArtifactCard.save) so rows look like every other Intake row. */
function statementFromCandidate(c) {
  return c.text + (c.value != null ? ` = ${c.value}` : "") + (c.method ? ` (${c.method})` : "");
}

/**
 * Canonical extraction first: triage.js (analysisFlow + gematria) decides kind/value/terms/verification when it
 * resolves a routable candidate that does not contradict the audit. Otherwise the audit's normalized note is the
 * statement (kind 'observation', engine_verified false) — the audit result is preserved in meta, never promoted
 * to an engine verification the client did not run.
 */
export function buildZviPayload(entry, row) {
  const blockers = [];
  if (!row) return { ok: false, blockers: ["source_row_missing"] };
  if (!sameText(row.credit, ZVI_CONTRIBUTOR_LABEL)) blockers.push("contributor_label_mismatch");
  if (row.contributor_id !== ZVI_CONTRIBUTOR_ID) blockers.push("contributor_identity_mismatch");
  if (!String(row.text || "").trim()) blockers.push("source_text_empty");
  if (blockers.length) return { ok: false, blockers };

  const kase = buildResearchCase({ raw: row.text, meta: { credit: row.credit, channel: row.channel } });
  const arts = Array.isArray(kase.artifacts) ? kase.artifacts : [];
  const pick = arts.find((a) => a.verification?.engine_verified === true) || arts[0] || null;
  const triageUsable = !!pick && pick.verification?.engine_verified !== false;

  let kind; let statement; let value = null; let terms = []; let engineVerified = false; let engineDetail = {}; let kindBasis;
  let intakeMeta = {};
  if (triageUsable) {
    const c = pick.candidate;
    kind = pick.routing?.artifact_type === "relation" ? "relation" : "observation";
    statement = statementFromCandidate(c);
    value = c.value ?? null;
    terms = [c.norm || c.text];
    engineVerified = pick.verification?.engine_verified === true;
    engineDetail = pick.verification?.engine_detail || {};
    intakeMeta = buildIntakeMeta(kase, pick);
    kindBasis = "canonical_triage";
  } else {
    kind = "observation";
    statement = entry.note;
    engineDetail = {
      verification_state: "not_run_client",
      audit_disposition: entry.disposition,
      audit_attestation: { work_log_id: ZVI_AUDIT_WORK_LOG_ID, manifest: ZVI_ADMISSION_MANIFEST_V1.version, note: entry.note, rerun_here: false },
    };
    intakeMeta = buildIntakeMeta(kase, null);
    kindBasis = pick ? "manifest_note_triage_disagrees" : "manifest_note_no_routable_candidate";
  }

  const meta = {
    ...intakeMeta,
    intake: {
      batch: INTAKE_BATCH_KEY,
      manifest: ZVI_ADMISSION_MANIFEST_V1.version,
      source_id: entry.source_id,
      class: entry.class,
      disposition: entry.disposition,
      audit_note: entry.note,
      kind_basis: kindBasis,
      triage_artifacts_total: arts.length,
      assignment: INTAKE_ASSIGNMENT_KEY,
      audit: { version: ZVI_ADMISSION_MANIFEST_V1.version, generated_at: ZVI_ADMISSION_MANIFEST_V1.generated_at, work_log_id: ZVI_AUDIT_WORK_LOG_ID },
      extraction_fidelity: "exact_source_text",
      method: {
        canonical_method_key: engineDetail?.method ?? null,
        source_attested_labels: sourceAttestedMethodLabels(row.text),
      },
    },
    source_text: row.text,
    source_occurrence: { table: ZVI_SOURCE_TABLE, id: entry.source_id, channel: row.channel ?? null, created_at: row.created_at ?? null },
  };
  return {
    ok: true,
    blockers: [],
    payload: {
      p_source_ref: zviSourceRef(entry.source_id),
      p_kind: kind,
      p_statement: statement,
      p_value: value,
      p_terms: terms,
      p_contributor: ZVI_CONTRIBUTOR_LABEL,
      p_engine_verified: engineVerified,
      p_engine_detail: engineDetail,
      p_meta: meta,
    },
  };
}

const FROZEN_ZVI = Object.freeze(Object.fromEntries(ZVI_SAVE_PAYLOADS_V1.entries.map((e) => [e.source_id, e])));

/**
 * Runtime Zvi builder: the payload that is shown, confirmed and saved is the FROZEN one (zviSavePayloadsV1.json), so
 * what the admin reviewed is exactly what the RPC receives. The live row only gates it: the contributor identity must
 * match and the live channel_updates text must still equal the frozen exact text, otherwise the item is BLOCKED
 * (source_text_drift) - the frozen artifact is never trusted over the canonical source occurrence.
 */
export function buildFrozenZviPayload(entry, row) {
  const frozen = FROZEN_ZVI[entry.source_id];
  const blockers = [];
  if (!frozen || !frozen.save) return { ok: false, blockers: ["no_frozen_payload"] };
  if (!row) return { ok: false, blockers: ["source_row_missing"] };
  if (!sameText(row.credit, ZVI_CONTRIBUTOR_LABEL)) blockers.push("contributor_label_mismatch");
  if (row.contributor_id !== ZVI_CONTRIBUTOR_ID) blockers.push("contributor_identity_mismatch");
  if (!sameText(row.text, ZVI_SOURCE_TEXTS_V1.rows[entry.source_id]?.text)) blockers.push("source_text_drift");
  if (blockers.length) return { ok: false, blockers };
  return { ok: true, blockers: [], payload: JSON.parse(JSON.stringify(frozen.save)) };
}

/** Everything the admin must see BEFORE a save: source work/contributor, exact wording, class, proposed kind/value/method, verification state, disposition. */
export function describeItem(item) {
  const e = item.entry;
  const pl = item.payload || null;
  const intake = pl?.p_meta?.intake || {};
  const frozenText = ZVI_SOURCE_TEXTS_V1.rows[e.source_id]?.text ?? pl?.p_meta?.source_text ?? null;
  return {
    key: item.key,
    state: item.state,
    disposition: item.disposition,
    candidate_class: e.class ?? null,
    source_work: pl?.p_meta?.source_work?.label ?? null,
    contributor: pl ? (pl.p_contributor ?? null) : (item.corpus === "zvi" ? ZVI_CONTRIBUTOR_LABEL : null),
    source_ref: pl?.p_source_ref ?? item.reuse?.source_ref ?? null,
    exact_source_text: pl?.p_meta?.source_text ?? frozenText,
    proposed: pl ? { kind: pl.p_kind, statement: pl.p_statement, value: pl.p_value, terms: pl.p_terms } : null,
    method: pl ? { canonical: intake.method?.canonical_method_key ?? pl.p_engine_detail?.method ?? null, source_attested: intake.method?.source_attested_labels ?? [] } : null,
    engine: pl ? { verified: pl.p_engine_verified === true, state: pl.p_engine_verified ? "engine_verified" : (pl.p_engine_detail?.verification_state || "not_engine_verified"), audit_disposition: e.disposition } : null,
    audit_note: e.note ?? null,
    reason: item.reason ?? null,
    saves_as: "candidate · private",
  };
}

/** PURE. What the explicit batch action would send right now (settled items excluded) - shown in the confirmation. */
export function batchPreview(items, previous = {}) {
  const settled = new Set([RESULT_STATE.INSERTED, RESULT_STATE.ALREADY_EXISTED, RESULT_STATE.APPENDED, RESULT_STATE.ALREADY_PRESENT]);
  const toSend = sendable(items).filter((it) => !(previous[it.key] && settled.has(previous[it.key].state)));
  const by_disposition = {};
  for (const it of toSend) bump(by_disposition, it.disposition);
  return { will_send: toSend.length, by_disposition, excluded: items.length - toSend.length, keys: toSend.map((it) => it.key) };
}

/** Per-entry Human-Gate action: the same sequential idempotent executor, restricted to exactly one sendable item. */
export function executeOne(item, deps) {
  return executePlan(sendable([item]), deps);
}

/**
 * Sod Hashmal is a SOURCE WORK, never a Person/Contributor: p_contributor is null and the work/post/locus travel
 * in meta. An entry without a deterministic payload (post_id, locus, exact statement, kind) is BLOCKED — never
 * inferred.
 */
export function buildSourceWorkPayload(entry) {
  const blockers = [];
  if (!entry?.post_id) blockers.push("post_id_missing");
  if (!entry?.locus) blockers.push("source_locus_missing");
  if (!String(entry?.statement || "").trim()) blockers.push("statement_missing");
  if (!String(entry?.exact_text || "").trim()) blockers.push("exact_source_text_missing");
  if (!RPC_KINDS.includes(entry?.kind)) blockers.push("kind_not_supplied");
  if (blockers.length) return { ok: false, blockers };
  return {
    ok: true,
    blockers: [],
    payload: {
      p_source_ref: `posts:${entry.post_id}#a${entry.locus_index ?? 0}`,
      p_kind: entry.kind,
      p_statement: entry.statement,
      p_value: entry.value ?? null,
      p_terms: entry.terms || [],
      p_contributor: null,
      p_engine_verified: entry.engine_verified === true,
      p_engine_detail: entry.engine_detail || {},
      p_meta: {
        intake: {
          batch: INTAKE_BATCH_KEY,
          manifest: SOD_HASHMAL_ADMISSION_MANIFEST_V1.version,
          disposition: entry.disposition,
          audit_note: entry.note ?? null,
        },
        source_work: { ...SOD_HASHMAL_SOURCE_WORK },
        source_post: { id: entry.post_id },
        source_locus: entry.locus,
        source_text: entry.exact_text,
      },
    },
  };
}

function itemKey(corpus, entry) { return `${corpus}:${entry.source_id || `${entry.post_id}#${entry.locus_index ?? 0}`}`; }

/** PURE. Classifies every manifest entry; never calls the RPC. */
export function planCorpus(corpus, manifest, { rowsById = {}, builder } = {}) {
  const items = (manifest?.entries || []).map((entry) => {
    const base = { key: itemKey(corpus, entry), corpus, entry, disposition: entry.disposition };
    if (READ_ONLY_DISPOSITIONS.includes(entry.disposition)) {
      return { ...base, state: ITEM_STATE.READ_ONLY, reason: READ_ONLY_REASON[entry.disposition] };
    }
    if (entry.disposition === REUSE_DISPOSITION) {
      const row = rowsById[entry.source_id];
      const blockers = [];
      if (!entry.reuse_of_source_id) blockers.push("reuse_target_not_declared");
      if (!row) blockers.push("source_row_missing");
      if (blockers.length) return { ...base, state: ITEM_STATE.BLOCKED, reason: blockers.join(","), blockers };
      return {
        ...base, state: ITEM_STATE.REUSE,
        reuse: { source_ref: zviSourceRef(entry.source_id), target_source_ref: `${ZVI_SOURCE_TABLE}:${entry.reuse_of_source_id}`, basis: `REUSE_CLAIM_OCCURRENCE ${INTAKE_BATCH_KEY}: ${entry.note}` },
      };
    }
    if (EXECUTABLE_DISPOSITIONS.includes(entry.disposition)) {
      const built = builder(entry, rowsById[entry.source_id]);
      if (!built.ok) return { ...base, state: ITEM_STATE.BLOCKED, reason: built.blockers.join(","), blockers: built.blockers };
      return { ...base, state: ITEM_STATE.EXECUTABLE, payload: built.payload };
    }
    return { ...base, state: ITEM_STATE.BLOCKED, reason: `unknown_disposition:${entry.disposition}`, blockers: ["unknown_disposition"] };
  });
  return items;
}

const bump = (o, k) => { o[k] = (o[k] || 0) + 1; };

/** PURE. DRY RUN summary by disposition / kind / verification / state. */
export function summarizePlan(items) {
  const out = { total: items.length, by_disposition: {}, by_state: {}, by_kind: {}, by_verification: {}, executable: 0, reuse: 0, read_only: 0, blocked: 0 };
  for (const it of items) {
    bump(out.by_disposition, it.disposition);
    bump(out.by_state, it.state);
    if (it.state === ITEM_STATE.EXECUTABLE) {
      out.executable += 1;
      bump(out.by_kind, it.payload.p_kind);
      bump(out.by_verification, it.payload.p_engine_verified ? "engine_verified" : "not_engine_verified");
    } else if (it.state === ITEM_STATE.REUSE) out.reuse += 1;
    else if (it.state === ITEM_STATE.READ_ONLY) out.read_only += 1;
    else out.blocked += 1;
  }
  return out;
}

export const sendable = (items) => items.filter((it) => it.state === ITEM_STATE.EXECUTABLE || it.state === ITEM_STATE.REUSE);

/** Read-only fetch of the exact Zvi source occurrences with the admin's own client (no RPC). */
export async function loadZviSourceRows(client, manifest = ZVI_ADMISSION_MANIFEST_V1) {
  const ids = manifest.entries.map((e) => e.source_id);
  const { data, error } = await client.from(ZVI_SOURCE_TABLE).select("id,channel,credit,contributor_id,created_at,text").in("id", ids);
  if (error) throw new Error(error.message || "source_rows_read_failed");
  return Object.fromEntries((data || []).map((r) => [r.id, r]));
}

export function buildCorpora(rowsByCorpus = {}) {
  return [
    { key: "zvi", label: "צבי (OPOC) · ZVI_ADMISSION_MANIFEST_V1", manifest: ZVI_ADMISSION_MANIFEST_V1, builder: buildFrozenZviPayload, rowsById: rowsByCorpus.zvi || {} },
    { key: "sod_hashmal", label: "סוד החשמל (Source Work) · Golden admission", manifest: SOD_HASHMAL_ADMISSION_MANIFEST_V1, builder: (e) => buildSourceWorkPayload(e), rowsById: rowsByCorpus.sod_hashmal || {} },
  ].map((c) => ({ ...c, items: planCorpus(c.key, c.manifest, c), blocker: c.manifest.entries_blocker || null }));
}

function classifyRpcResult(data, error) {
  if (error) return { state: RESULT_STATE.FAILED, error: error.message || String(error) };
  if (!data || data.ok !== true) return { state: RESULT_STATE.FAILED, error: data?.error || "rpc_not_ok" };
  if (data.appended === true) return { state: RESULT_STATE.APPENDED, id: data.research_object_id };
  if (data.already_present === true) return { state: RESULT_STATE.ALREADY_PRESENT, id: data.research_object_id };
  if (data.already_existed === true) return { state: RESULT_STATE.ALREADY_EXISTED, id: data.research_object_id };
  return { state: RESULT_STATE.INSERTED, id: data.research_object_id };
}

export function tallyResults(results) {
  const t = { inserted: 0, already_existed: 0, appended: 0, already_present: 0, pending: 0, failed: 0, total: 0 };
  for (const r of Object.values(results || {})) {
    t.total += 1;
    if (r.state === RESULT_STATE.INSERTED) t.inserted += 1;
    else if (r.state === RESULT_STATE.ALREADY_EXISTED) t.already_existed += 1;
    else if (r.state === RESULT_STATE.APPENDED) t.appended += 1;
    else if (r.state === RESULT_STATE.ALREADY_PRESENT) t.already_present += 1;
    else if (r.state === RESULT_STATE.PENDING) t.pending += 1;
    else t.failed += 1;
  }
  return t;
}

/**
 * Sequential, idempotent execution. `previous` is the result map of an earlier run: settled items (inserted /
 * already_existed / appended / already_present) are skipped, failed and pending ones are retried — the RPC's own
 * (source_uid, claim_uid) identity makes a re-send safe even if the client lost the previous response.
 *
 * rpc(name, args) -> {data, error}   resolveReuseTarget(sourceRef) -> id | null (deterministic, exactly one)
 * readBack(id) -> {status, privacy_scope} | null   (private-candidate postcondition for newly inserted rows)
 */
export async function executePlan(items, { rpc, resolveReuseTarget, readBack, previous = {}, onProgress } = {}) {
  const results = { ...previous };
  const settled = new Set([RESULT_STATE.INSERTED, RESULT_STATE.ALREADY_EXISTED, RESULT_STATE.APPENDED, RESULT_STATE.ALREADY_PRESENT]);
  for (const it of sendable(items)) {
    if (results[it.key] && settled.has(results[it.key].state)) continue;
    let res;
    try {
      if (it.state === ITEM_STATE.REUSE) {
        const targetId = resolveReuseTarget ? await resolveReuseTarget(it.reuse.target_source_ref) : null;
        if (!targetId) res = { state: RESULT_STATE.PENDING, error: "reuse_target_unresolved" };
        else {
          const { data, error } = await rpc(SAVE_RPC, {
            p_source_ref: it.reuse.source_ref, p_kind: "observation", p_statement: "reuse-provenance-append", p_value: null,
            p_terms: [], p_contributor: null, p_engine_verified: false, p_engine_detail: {}, p_meta: {},
            p_append_to_claim_id: targetId, p_convergence_actor_type: "deterministic", p_convergence_basis: it.reuse.basis,
          });
          res = classifyRpcResult(data, error);
        }
      } else {
        const { data, error } = await rpc(SAVE_RPC, it.payload);
        res = classifyRpcResult(data, error);
        if (res.state === RESULT_STATE.INSERTED && readBack) {
          const row = await readBack(res.id);
          if (!row || row.status !== "candidate" || row.privacy_scope !== "private") {
            res = { state: RESULT_STATE.FAILED, id: res.id, error: "postcondition_not_private_candidate" };
          }
        }
      }
    } catch (e) {
      res = { state: RESULT_STATE.FAILED, error: e?.message || String(e) };
    }
    results[it.key] = res;
    onProgress?.(it, res, tallyResults(results));
  }
  return results;
}

/** Deterministic REUSE target: exactly one candidate/approved row for the target occurrence, else null (stay pending). */
export function makeReuseTargetResolver(client) {
  return async (targetSourceRef) => {
    const { data, error } = await client.from("research_objects").select("id,status,source_ref").in("status", ["candidate", "approved"]).like("source_ref", `${targetSourceRef}%`);
    if (error || !Array.isArray(data) || data.length !== 1) return null;
    return data[0].id;
  };
}

export function makeReadBack(client) {
  return async (id) => {
    const { data } = await client.from("research_objects").select("status,privacy_scope").eq("id", id).maybeSingle();
    return data || null;
  };
}

/** Lets the existing World/Projector research loaders refresh — no second semantics layer, just a nudge. */
export function notifyResearchAdmitted(tally) {
  try { window.dispatchEvent(new CustomEvent(ADMITTED_EVENT, { detail: tally })); } catch { /* non-browser */ }
}
