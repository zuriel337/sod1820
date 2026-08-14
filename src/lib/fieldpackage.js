// src/lib/fieldpackage.js — P2 · Field Package (read-model בלבד · reuse-first) · Command-Center-first.
// ⚠️ אין טבלה חדשה · אין מנוע חדש · אין Field-Map storage · אין קידום קנוני. הרכבה-על-קריאה בלבד.
// המקורות (כולם קיימים): RPC public.fn_gematria_pack(p_subject) — חבילת-מחקר דטרמיניסטית (tokens:0, used_llm:false)
//   הנושאת expression × method × value לכל השיטות (מספר דינמי — לא מקובע!) + גשרים בין-שיטתיים (cross) + convergences per-method
//   + פסוקים + מקורות-תנ״ך מלאים + פירוק (FACT מול INTERPRETATION מופרדים כבר במקור).
//   ובנוסף: listRequests (P1) — Information Requests משובצים בתוך ה-Package.
// חוקי-ברזל (research_pipeline_contract §2):
//   • ⛔ לא לצמצם גימטריה למספר-אחד. כל Finding שומר expression × method × value + גשרים + מקור-מלא.
//   • Field Package = *מפת-מצב* (ידוע/נטען/אומת/חסר/ניתן-לבדוק), לא «פרשנות רוחנית».
//   • פרשנות נשארת בשכבה נפרדת (interpretation), מסומנת isFact:false — לעולם לא מתמזגת ל-known/verified.
//   • תשובת Information Request מוצגת כ-RAW pointer, לא הופכת אוטומטית ל-Fact.
import { supabase } from "./supabase.js";
import { listRequests, IR_STATUS_HE } from "./inforequest.js";

// מיפוי מפתחות-שיטה של stage=convergence (לטיני) → שם-שיטה עברי ב-methods.evidence (לצירוף הערך).
const CONV_METHOD_HE = {
  ragil: "רגיל", gadol: "גדול", misratar: "מסתתר", miluy: "מילוי", kadmi: "קדמי",
  siduri: "סידורי", atbash: "אתבש", albam: "אלבם", atbach: "אטבח", ribua: "ריבוע",
};

// ── פרויקציה טהורה: fn_gematria_pack JSON → Finding (expression × method × value + גשרים + מקור) ──
export function projectFinding(pack) {
  const st = (pack && pack.stages) || {};
  const methodsEvidence = (st.methods && st.methods.evidence) || {};
  // כל השיטות — לא מספר-אחד. expression × method × value.
  const methods = Object.entries(methodsEvidence)
    .map(([method, value]) => ({ method, value }))
    .sort((a, b) => a.method.localeCompare(b.method, "he"));

  // גשרים בין-שיטתיים: (א) cross — שותף שנפגש ב-2+ שיטות עצמאיות · (ב) גשרי-סקאלה (אפס).
  const crossings = ((st.cross && st.cross.crossings) || []).map((c) => ({
    kind: "cross_method", partner: c.partner, nMethods: c.n_methods, detail: c.methods_detail,
  }));
  const scaleBridges = [];
  if (st.zero_scale && st.zero_scale.applicable) {
    scaleBridges.push({ kind: "zero_scale", root: st.zero_scale.core_root, chain: st.zero_scale.scale_chain,
      matches: (st.zero_scale.root_matches || []).map((m) => ({ phrase: m.phrase, value: m.ragil })) });
  }
  if (st.zero_navigation && st.zero_navigation.applicable) {
    scaleBridges.push({ kind: "zero_navigation", stripped: st.zero_navigation.stripped,
      matches: (st.zero_navigation.core_matches || []).map((m) => ({ phrase: m.phrase, value: m.ragil })) });
  }
  const bridges = [...crossings, ...scaleBridges];

  // convergences per-method — עם צירוף ערך-השיטה של הנושא (expression × method × value).
  const convergences = ((st.convergence && st.convergence.groups) || []).map((g) => {
    const he = CONV_METHOD_HE[g.method] || g.method;
    return { method: g.method, methodHe: he, value: methodsEvidence[he] ?? null,
      phrases: g.phrases || [], score: g.score, size: g.group_size, status: g.status };
  });

  // מקור מלא — פסוקים ששווים לערך + הופעות-תנ״ך של הביטוי.
  const verses = (st.verses && st.verses.evidence && st.verses.evidence.verses) || [];
  const sources = (st.sources && st.sources.evidence) || null;

  return { expression: pack?.subject ?? pack?.trace?.question ?? null,
    primaryValue: pack?.value ?? methodsEvidence["רגיל"] ?? null, // *אחת* מהשיטות — לא הזהות היחידה
    methods, bridges, convergences, verses, sources };
}

// ── פרויקציה טהורה: pack → מפת-מצב (ידוע/נטען/אומת/חסר/ניתן-לבדוק) ──────────
// כל פריט: {layer, kind, label, ...}. עובדות-מנוע=known/verified · פרשנות לא נכנסת לכאן.
export function classifyState(pack, requests = []) {
  const st = (pack && pack.stages) || {};
  const known = [], claimed = [], verified = [], missing = [], checkable = [];

  // known — עובדות-מנוע קיימות (מקור-אמת דטרמיניסטי).
  if (st.methods && st.methods.found) known.push({ kind: "methods", label: `ערכים ב-${st.methods.method_count || Object.keys(st.methods.evidence || {}).length} שיטות`, source: st.methods.source_of_truth });
  if (st.sources && st.sources.found) known.push({ kind: "sources", label: `${st.sources.evidence?.count ?? 0} הופעות בתנ״ך`, source: st.sources.source_of_truth });
  if (st.decompose && st.decompose.found) known.push({ kind: "decompose_fact", label: "פירוק-מילה (FACT)", source: st.decompose.source_of_truth });

  // verified — יחסים שאומתו במנוע (2+ שיטות עצמאיות / convergence / סקאלה).
  if (st.cross && st.cross.found) verified.push({ kind: "cross", label: `${st.cross.cross_count} גשרים בין-שיטתיים (2+ שיטות)`, source: st.cross.source_of_truth });
  if (st.verses && st.verses.found) verified.push({ kind: "verses", label: `${st.verses.evidence?.count ?? 0} פסוקים = ${pack?.value}`, source: st.verses.source_of_truth });
  if (st.convergence && st.convergence.found) verified.push({ kind: "convergence", label: `${st.convergence.group_count} התכנסויות (per-method)`, source: st.convergence.source_of_truth });

  // missing — stages שנתבקשו ולא נמצאו + מה שחסר מבקשות-מידע פתוחות.
  const req = new Set(pack?.stages_requested || []);
  const found = new Set(pack?.stages_with_findings || []);
  for (const s of req) if (!found.has(s)) missing.push({ kind: "stage_absent", label: `לא נמצא: ${s}` });
  for (const r of requests) {
    if (r.status && !["verified", "cancelled", "answered"].includes(r.status) && r.missingKind)
      missing.push({ kind: "info_request", label: `נדרש מ${r.personRef || "מקור"}: ${r.missingKind}`, ref: r.ref });
  }

  // checkable — צעדים אפשריים (הצעה, לא עובדה): drill-down מילוי, בקשות-מידע פתוחות, שיטות שטרם הוצלבו.
  checkable.push({ kind: "miluy_drilldown", label: "drill-down מילוי per-אות (fn_miluy_letter)" });
  if (st.notarikon && st.notarikon.found === false) checkable.push({ kind: "notarikon", label: "נוטריקון — נבדק, אין; ניתן לבדוק ידנית" });
  for (const r of requests) if (r.status === "answered")
    checkable.push({ kind: "extract_response", label: `תשובה התקבלה — ניתן לחלץ/לאמת`, ref: r.ref });

  // claimed — טענות שטרם אומתו במנוע (מגיעות מבקשות-מידע שנענו · תשובת-אדם = RAW, לא Fact).
  for (const r of requests) if (r.response)
    claimed.push({ kind: "raw_response", label: `תשובה (RAW) מ${r.personRef || "מקור"}`, ref: r.ref, raw: r.response, isFact: false });

  return { known, claimed, verified, missing, checkable };
}

// ── פרויקציה טהורה: pack → שכבת-פרשנות נפרדת (לעולם לא Fact) ────────────────
export function projectInterpretation(pack) {
  const dec = pack?.stages?.decompose?.evidence?.INTERPRETATION;
  if (!dec) return null;
  return { isFact: false, note: dec.note || "פרשנות — לא עובדה",
    letters: dec.letters || [], mirror: dec.mirror || [], sparks: dec.sparks || null };
}

// ── פרויקציה טהורה: Information Requests (P1) → תצוגה בתוך ה-Package ─────────
// מה ביקשנו · ממי · למה · סטטוס · מה התקבל — התשובה RAW pointer, isFact:false.
export function projectRequests(requests = []) {
  return (requests || []).map((r) => ({
    ref: r.ref, what: r.why || r.title || "בקשת מידע", from: r.personRef || null,
    missingKind: r.missingKind || null, lang: r.lang || null, channel: r.channel || null,
    status: r.status || "draft", statusHe: IR_STATUS_HE[r.status] || r.status || "טיוטה",
    received: r.response ? { raw: r.response, isFact: false } : null, // RAW בלבד — לא Fact
  }));
}

// ── הרכבה טהורה (בלי רשת) — pack + requests → Field Package מלא. ניתן-לבדיקה. ──
export function buildFieldPackage(pack, requests = []) {
  return {
    subject: pack?.subject ?? null,
    finding: projectFinding(pack),
    stateMap: classifyState(pack, requests),
    interpretation: projectInterpretation(pack), // שכבה נפרדת · isFact:false
    requests: projectRequests(requests),
    provenance: {
      engine: "fn_gematria_pack", deterministic: true,
      cost: pack?.cost || { tokens: 0, used_llm: false }, // עובדות חינם — לא מאחורי AI
      stages_found: pack?.stages_with_findings || [],
      note: "מפת-מצב מעל מקורות קיימים · לא פרשנות רוחנית · פרשנות בשכבה נפרדת",
    },
  };
}

// ── הרכבה עם רשת (Command-Center) — דרך ה-wrapper האדמין field-pack → fn_gematria_pack + P1 requests. קריאה בלבד. ──
// expression: הביטוי (מחרוזת) · opts.uid: לשיבוץ Information Requests של המשתמש · opts.findingRef: לסינון הבקשות.
// ⛔ fn_gematria_pack מורשה ל-service_role בלבד — לכן קוראים דרך Edge Function אדמין-gated (field-pack),
//    שמחזיר את פלט-המנוע **verbatim** (כל השיטות, cross, convergence, metadata). אין reshape כאן.
export async function assembleFieldPackage(expression, { uid, findingRef } = {}) {
  if (!expression || !String(expression).trim()) return null;
  const { data: pack, error } = await supabase.functions.invoke("field-pack", { body: { subject: String(expression).trim() } });
  if (error) {
    // לחשוף את סיבת-השרת (denied / unauthenticated / engine_error) אם קיימת בגוף-התשובה.
    let reason = error.message || "engine_error";
    try { const ctx = await error.context?.json?.(); if (ctx?.error) reason = ctx.error; } catch { /* ignore */ }
    throw new Error(reason);
  }
  if (!pack || pack.error) throw new Error(pack?.error || "engine_error");
  let requests = [];
  if (uid) {
    try { requests = await listRequests(uid, { findingRef: findingRef || null }); } catch { requests = []; }
  }
  return buildFieldPackage(pack, requests); // buildFieldPackage/projectFinding אגנוסטיים למספר-שיטות (מבחן 21)
}
