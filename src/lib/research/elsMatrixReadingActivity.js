import { ELS_MATRIX_READING_EXPECTED_MINUTES } from "../../../supabase/functions/_shared/elsMatrixReadingAction.js";
import { elsResearchReturnLoad } from "./elsResearchReturnSnapshot.js";
// A projection of the ONE global session. No requests, timers, storage or new job owner.
import { normalizeElsRazielMatrixContext } from "./elsRazielMatrixContext.js";
import { sameElsMatrixReadingAxis } from "./elsMatrixReadingPresentation.js";

const labels = {
  starting: "מתחיל סריקה", running: "סריקת מטריצה ברקע", cancelling: "ממתין לביטול הסריקה",
  COMPLETE: "תוצאות הסריקה מוכנות", INCOMPLETE: "הסריקה לא הושלמה",
  FAILED_WITH_REASON: "הסריקה לא הסתיימה בהצלחה", REFUSED: "הסריקה לא הופעלה",
  RUNNING: "המעקב נעצר — אפשר לחזור לסריקה", CANCEL_REQUESTED: "בקשת ביטול נשלחה",
  error: "המעקב נעצר — בדקו את הסריקה הקיימת",
};

function project(item, active = false) {
  if (item?.readingOp === "preview") return null;
  const context = normalizeElsRazielMatrixContext(item?.continuation?.contextSnapshot?.elsMatrixContext);
  const turnId = item?.turnId || item?.id;
  if (!context || typeof turnId !== "string" || !turnId || turnId.length > 160) return null;
  const result = item.elsMatrixReading;
  if (result?.axis && !sameElsMatrixReadingAxis(context.axis, {
    ...result.axis, corpusId: result.axis.corpus_id || result.axis.corpusId,
  })) return null;
  if (result?.state === "PREVIEW") return null;
  const phase = active ? item.progress?.phase || "starting" : result?.state || "error";
  const elapsed = active ? item.progress?.elapsedMs : result?.timing?.elapsed_ms;
  return {
    turnId, axis: context.axis, active,
    label: labels[phase] || "מצב הסריקה אינו ידוע",
    phase,
    minutes: Number.isFinite(elapsed) && elapsed >= 0 ? Math.floor(elapsed / 60000) : null,
    canCancel: active && !item.progress?.cancelling && phase !== "cancelling",
    fixture: result?.is_test_fixture === true || result?.provider?.kind === "test_double",
    saved: result?.saved_snapshot === true,
    ...(item.elsReturnSnapshot ? { hasReturnSnapshot: true } : {}),
  };
}

export function selectElsMatrixReadingActivity(session) {
  const turn = session?.currentTurn;
  if (session?.busy && turn?.kind === "els_matrix_reading") return project(turn, true);
  if (turn?.kind === "els_matrix_reading" && turn.status === "error") return project(turn);
  // An ordinary question or changing the current page does not replace the scan's origin.
  const last = [...(session?.thread || [])].reverse().find(item => item?.role === "raziel" && item.elsMatrixReading);
  return last ? project(last) : null;
}

// Only an opaque turn reference travels in router state, never the phrase, job token or coordinates.
// The destination resolves it against the current authenticated session and lets the canonical
// engine replay this load item. This is replay intent, NOT a new verification receipt.
export function elsMatrixReadingReturnLoad(session, turnId) {
  if (typeof turnId !== "string" || !turnId) return null;
  const turn = session?.currentTurn;
  const item = (session?.thread || []).find(row => row.role === "raziel" && row.turnId === turnId && row.elsMatrixReading)
    || (turn?.id === turnId && turn.kind === "els_matrix_reading" ? turn : null);
  const activity = item && project(item, session?.busy && item === turn);
  if (!activity) return null;
  const axis = activity.axis;
  if (item.elsReturnSnapshot) return { ...elsResearchReturnLoad({
    origin: { ...axis, corpus: axis.scope }, returnSnapshot: item.elsReturnSnapshot,
  }), researchNonce: turnId };
  return { term: axis.term, scope: axis.scope, corpusId: axis.corpusId, skip: axis.skip,
    dir: axis.dir, start: axis.start, hitId: axis.hitId, words: [], researchNonce: turnId };
}

// Bottom-bar projection of the same session: no state, persistence, network or polling.
// Keep the turn reference opaque; the existing Raziel surface owns opening and cancellation.
export function elsMatrixReadingIndicator(session, now = Date.now()) {
  const activity = selectElsMatrixReadingActivity(session);
  if (!activity) return null;
  const turn = session?.currentTurn;
  const item = activity.active || turn?.id === activity.turnId && turn?.status === 'error'
    ? turn : [...(session?.thread || [])].reverse().find(row => row.turnId === activity.turnId && row.elsMatrixReading);
  const result = item?.elsMatrixReading;
  const progress = item?.progress;
  const phase = activity.phase;
  const cancelled = result?.reason === 'batch_canceled';
  const status = activity.active ? 'RUNNING' : cancelled ? 'CANCELLED'
    : phase === 'COMPLETE' ? 'COMPLETE' : phase === 'INCOMPLETE' ? 'PARTIAL'
    : (['RUNNING', 'CANCEL_REQUESTED'].includes(phase) || phase === 'error' && (progress?.jobId || progress?.jobToken)) ? 'INTERRUPTED' : 'FAILED';
  const label = activity.active ? phase === 'starting' ? 'נשלחה' : phase === 'cancelling' ? 'ביטול התבקש'
    : phase === 'verifying' ? 'מאמת' : 'בעבודה אצל הספק'
    : cancelled ? 'נעצרה' : phase === 'COMPLETE' ? 'הושלמה' : phase === 'INCOMPLETE' ? 'הושלמה חלקית'
    : phase === 'CANCEL_REQUESTED' ? 'ביטול התבקש · המעקב נפסק'
    : status === 'INTERRUPTED' ? 'המעקב נפסק' : 'נכשלה';
  const started = Date.parse(item?.startedAt || (turn?.id === activity.turnId ? turn.startedAt : '') || result?.timing?.created_at);
  const elapsed = activity.active
    ? Math.max(0, (Number(progress?.elapsedMs) || 0) + (progress?.observedAt ? Math.max(0, now - progress.observedAt) : 0), Number.isFinite(started) ? now - started : 0)
    : Math.max(0, Number(result?.timing?.elapsed_ms) || (turn?.id === activity.turnId ? Date.parse(turn.completedAt) - Date.parse(turn.startedAt) : 0) || 0);
  return { id: activity.turnId, kind: 'els_matrix_reading', status, phase: label,
    origin: activity.axis, elapsedMs: elapsed, canCancel: activity.canCancel,
    estimate: activity.active ? elsMatrixReadingEstimate(elapsed) : null };
}

export function elsMatrixReadingEstimate(elapsedMs) {
  const { min, max } = ELS_MATRIX_READING_EXPECTED_MINUTES;
  const elapsedMinutes = Math.max(0, elapsedMs) / 60000;
  if (elapsedMinutes > max) return 'לוקח יותר מהרגיל';
  const low = Math.max(0, Math.ceil(min - elapsedMinutes));
  const high = Math.max(1, Math.ceil(max - elapsedMinutes));
  return `הערכה בלבד: עוד ${low}–${high} דקות`;
}
