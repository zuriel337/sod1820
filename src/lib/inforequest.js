// src/lib/inforequest.js — P1 · Information Request (internal-only) · reuse-first מעל research_items.
// ⚠️ אין schema חדש: bucket='info_request', entity_type='cc_info_request'. כל שדות-הבקשה חיים ב-metadata jsonb.
// חוקי-ברזל (חוזים status_governance_contract + research_pipeline_contract):
//   • Information Request ≠ Finding ≠ Fact ≠ handled. הוא מייצג *צורך במידע מאדם* הקשור לממצא.
//   • הפרדה מוחלטת: Finding → Request → Person → RAW Response → Extraction → Verification.
//   • תשובת-האדם נשמרת כ-reference ל-RAW בלבד (pointer) — לעולם לא הופכת אוטומטית ל-Fact.
//   • ⛔ אין outward/שליחה/Raziel/UI/Field-Map כאן. זה מודל-נתונים פנימי בלבד.
// אומת מול הסכמה החיה (14.8.2026): user_id/bucket/entity_type NOT NULL · metadata jsonb NOT NULL ·
//   RLS ri_select/insert/update/delete_own (user_id=auth.uid()) · GRANT authenticated CRUD · anon אין.
import { supabase } from "./supabase.js";

export const IR_BUCKET = "info_request";
export const IR_TYPE = "cc_info_request";

// ── מצבי-הבקשה (ציר-הבקשה בלבד — לא Governance, לא handled) ────────────────
export const IR_STATUS = ["draft", "pending", "sent", "answered", "verified", "cancelled"];
export const IR_STATUS_HE = {
  draft: "טיוטה", pending: "ממתין", sent: "נשלח",
  answered: "נענה", verified: "אומת", cancelled: "בוטל",
};
// מעברים חוקיים. 'sent' מגיע רק מ-P3 (outward/Raziel) — מוגדר כאן אך לא מופעל בשלב הפנימי.
// 'answered' אפשרי גם ישירות מ-pending (תשובה שהגיעה בערוץ אחר, בלי שליחה יזומה).
export const IR_TRANSITIONS = {
  draft: ["pending", "cancelled"],
  pending: ["sent", "answered", "cancelled"],
  sent: ["answered", "cancelled"],
  answered: ["verified", "cancelled"],
  verified: [],
  cancelled: [],
};
export function canTransition(from, to) {
  return Array.isArray(IR_TRANSITIONS[from]) && IR_TRANSITIONS[from].includes(to);
}

// ── בונה שורת-בקשה טהור (בלי רשת — ניתן-לבדיקה) ────────────────────────────
// req: {findingRef*, personRef?, missingKind?, why?, lang?, channel?, fieldPackageRef?, title?, link?, status?, id?}
//   findingRef = איזה ממצא ביקש (provenance — לא embed של הממצא עצמו · שומר את ההפרדה Finding≠Request).
export function buildRequestRow(uid, req) {
  if (!uid) throw new Error("Information Request דורשת התחברות");
  if (!req || !req.findingRef) throw new Error("חסר findingRef — בקשה חייבת להיות מקושרת לממצא");
  if (req.status && !IR_STATUS.includes(req.status)) throw new Error("status לא חוקי: " + req.status);
  const now = new Date().toISOString();
  const rid = (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function")
    ? globalThis.crypto.randomUUID()
    : (now + "_" + Math.abs((now + (req.findingRef || "")).split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)).toString(36));
  const entity_ref = req.id || ("ir_" + rid);
  const status = req.status || "draft";
  return {
    user_id: uid, bucket: IR_BUCKET, entity_type: IR_TYPE, entity_ref,
    title: String(req.title || req.why || "בקשת מידע").slice(0, 140),
    link: req.link || null,
    metadata: {
      kind: "info_request",
      status,
      findingRef: req.findingRef,                 // → הממצא שמבקש (לא Fact, לא embed)
      personRef: req.personRef || null,           // ← ממי נדרש (person_id / ref)
      missingKind: req.missingKind || null,       // מה חסר (נגזר מ-whatMissing)
      why: req.why || null,                       // למה נדרש
      lang: req.lang || null,                      // שפה
      channel: req.channel || null,                // ערוץ (תיוג בלבד — אין שליחה בשלב זה)
      fieldPackageRef: req.fieldPackageRef || null, // חומר-מסייע (read-model עתידי · G3)
      response: null,                              // reference ל-RAW בלבד (נמלא ב-linkRawResponse)
      provenance: { created_by: "cc-info-request", at: now, actor: "zuriel" },
      history: [{ status, at: now }],
    },
  };
}

// ── קריאות-רשת (RLS: user_id=auth.uid()) ──────────────────────────────────
// יצירה — insert שורה אחת. לא נוגע בממצא, לא ב-handled, לא ב-Governance.
export async function createRequest(uid, req) {
  const row = buildRequestRow(uid, req);
  const { data, error } = await supabase.from("research_items").insert(row).select("id, entity_ref").single();
  if (error) throw error;
  return { id: data.id, entity_ref: data.entity_ref };
}

// רשימת-בקשות של המשתמש, עם סינון אופציונלי לפי ממצא/אדם/סטטוס. נגזר → תצוגה בלבד.
export async function listRequests(uid, { findingRef, personRef, status } = {}) {
  if (!uid) return [];
  let q = supabase.from("research_items")
    .select("id, entity_ref, title, link, metadata, created_at")
    .eq("user_id", uid).eq("bucket", IR_BUCKET).eq("entity_type", IR_TYPE)
    .order("created_at", { ascending: false });
  if (findingRef) q = q.eq("metadata->>findingRef", findingRef);
  if (personRef) q = q.eq("metadata->>personRef", personRef);
  if (status) q = q.eq("metadata->>status", status);
  const { data, error } = await q;
  if (error) return [];
  return (data || []).map((r) => ({ id: r.id, ref: r.entity_ref, title: r.title, link: r.link, at: r.created_at, ...(r.metadata || {}) }));
}

// שליפת-בקשה בודדת (פנימי — לעדכוני-מצב).
async function fetchOne(uid, entity_ref) {
  const { data, error } = await supabase.from("research_items")
    .select("id, metadata").eq("user_id", uid).eq("bucket", IR_BUCKET)
    .eq("entity_type", IR_TYPE).eq("entity_ref", entity_ref).single();
  if (error) throw error;
  return data;
}

// עדכון-מצב עם אכיפת-מעבר-חוקי. שומר history. לא מקדם Governance ולא נוגע במקור.
export async function setStatus(uid, entity_ref, to) {
  if (!uid) throw new Error("דורש התחברות");
  if (!IR_STATUS.includes(to)) throw new Error("status לא חוקי: " + to);
  const row = await fetchOne(uid, entity_ref);
  const md = row.metadata || {};
  const from = md.status || "draft";
  if (from === to) return row.id;
  if (!canTransition(from, to)) throw new Error(`מעבר לא חוקי: ${from} → ${to}`);
  const nextMd = { ...md, status: to, history: [...(md.history || []), { status: to, at: new Date().toISOString() }] };
  const { error } = await supabase.from("research_items").update({ metadata: nextMd })
    .eq("user_id", uid).eq("bucket", IR_BUCKET).eq("entity_type", IR_TYPE).eq("entity_ref", entity_ref);
  if (error) throw error;
  return row.id;
}

// קישור תשובת-אדם כ-RAW (pointer בלבד — לא מעתיק תוכן, לא הופך Fact).
// resp: {rawTable*, rawId*, rawAt?} — מצביע ל-wa_vip_inbox / wa_deep_queue / research_items וכו'.
// מעביר את הבקשה ל-'answered' (אם המעבר חוקי). החילוץ/האימות מהתשובה = שלב נפרד (P-later), לא כאן.
export async function linkRawResponse(uid, entity_ref, resp) {
  if (!uid) throw new Error("דורש התחברות");
  if (!resp || !resp.rawTable || resp.rawId == null) throw new Error("תשובה חייבת reference ל-RAW (rawTable+rawId)");
  const row = await fetchOne(uid, entity_ref);
  const md = row.metadata || {};
  const from = md.status || "draft";
  const to = canTransition(from, "answered") ? "answered" : from;
  const response = { rawTable: resp.rawTable, rawId: resp.rawId, rawAt: resp.rawAt || null, linkedAt: new Date().toISOString() };
  const history = to !== from ? [...(md.history || []), { status: to, at: response.linkedAt }] : (md.history || []);
  const nextMd = { ...md, status: to, response, history };
  const { error } = await supabase.from("research_items").update({ metadata: nextMd })
    .eq("user_id", uid).eq("bucket", IR_BUCKET).eq("entity_type", IR_TYPE).eq("entity_ref", entity_ref);
  if (error) throw error;
  return { id: row.id, status: to, response };
}

// ביטול-בקשה — סטטוס='cancelled' (לא מחיקה; provenance נשמר). מחיקה-מלאה = deleteRequest.
export async function cancelRequest(uid, entity_ref) {
  return setStatus(uid, entity_ref, "cancelled");
}

// מחיקה קשיחה (אופציונלי — RLS ri_delete_own). משמש לניקוי טיוטות בלבד.
export async function deleteRequest(uid, entity_ref) {
  if (!uid) return;
  await supabase.from("research_items").delete()
    .eq("user_id", uid).eq("bucket", IR_BUCKET).eq("entity_type", IR_TYPE).eq("entity_ref", entity_ref);
}
